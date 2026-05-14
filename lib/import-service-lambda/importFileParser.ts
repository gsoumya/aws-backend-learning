import type { S3Event, S3Handler } from 'aws-lambda';
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import csv from 'csv-parser';
import { Readable } from 'stream';

const s3Client = new S3Client({});
const sqsClient = new SQSClient({});
const catalogItemsQueueUrl = process.env.CATALOG_ITEMS_QUEUE_URL;

const parseCsvStream = (stream: Readable, queueUrl: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const sendMessageTasks: Promise<unknown>[] = [];

    stream
      .pipe(csv())
      .on('data', (record) => {
        sendMessageTasks.push(
          sqsClient.send(
            new SendMessageCommand({
              QueueUrl: queueUrl,
              MessageBody: JSON.stringify(record),
            })
          )
        );
      })
      .on('end', () => {
        Promise.all(sendMessageTasks)
          .then(() => resolve())
          .catch(reject);
      })
      .on('error', reject);
  });

export const handler: S3Handler = async (event: S3Event): Promise<void> => {
  if (!catalogItemsQueueUrl) {
    throw new Error('Missing CATALOG_ITEMS_QUEUE_URL environment variable');
  }

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

      await parseCsvStream(body, catalogItemsQueueUrl);

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
