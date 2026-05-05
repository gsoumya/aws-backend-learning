import type { S3Event, S3Handler } from 'aws-lambda';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
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
    })
  );
};
