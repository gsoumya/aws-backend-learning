import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const bucketName = process.env.IMPORT_BUCKET_NAME;
const s3Client = new S3Client({});

const responseHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (!bucketName) {
    return {
      statusCode: 500,
      headers: responseHeaders,
      body: JSON.stringify({ message: 'Missing IMPORT_BUCKET_NAME environment variable' }),
    };
  }

  const fileName = event.queryStringParameters?.name?.trim();

  if (!fileName) {
    return {
      statusCode: 400,
      headers: responseHeaders,
      body: JSON.stringify({ message: 'Missing required query parameter: name' }),
    };
  }

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: `uploaded/${fileName}`,
    ContentType: 'text/csv',
  });

  try {
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    return {
      statusCode: 200,
      headers: responseHeaders,
      body: JSON.stringify(signedUrl),
    };
  } catch (error) {
    console.error('Failed to generate signed URL', error);

    return {
      statusCode: 500,
      headers: responseHeaders,
      body: JSON.stringify({ message: 'Failed to generate signed URL' }),
    };
  }
};
