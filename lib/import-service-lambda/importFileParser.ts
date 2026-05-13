import type { S3Event, S3Handler } from 'aws-lambda';
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import csv from 'csv-parser';
import { Readable } from 'stream';

const s3Client = new S3Client({});

const parseCsvStream = (stream: Readable): Promise<void> =>
  new Promise((resolve, reject) => {
    stream
      .pipe(csv())
      .on('data', (record) => {
        console.log('Parsed record:', JSON.stringify(record));
      })
      .on('end', resolve)
      .on('error', reject);
  });

export const handler: S3Handler = async (event: S3Event): Promise<void> => {
  await Promise.all(
    event.Records.map(async (record) => {
      const bucketName = record.s3.bucket.name;
      const objectKey = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
      const parsedKey = objectKey.replace(/^uploaded\//, 'parsed/');

      const response = await s3Client.send(
        new GetObjectCommand({
          Bucket: bucketName,
          Key: objectKey,
        })
      );

      const body = response.Body;

      if (!(body instanceof Readable)) {
        throw new Error(`S3 object ${objectKey} did not return a readable stream`);
      }

      await parseCsvStream(body);

      await s3Client.send(
        new CopyObjectCommand({
          Bucket: bucketName,
          CopySource: `${bucketName}/${encodeURIComponent(objectKey).replace(/%2F/g, '/')}`,
          Key: parsedKey,
        })
      );

      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: bucketName,
          Key: objectKey,
        })
      );

      console.log(`Moved file from ${objectKey} to ${parsedKey}`);
    })
  );
};
