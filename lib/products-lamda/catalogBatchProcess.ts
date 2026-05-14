import { randomUUID } from 'node:crypto';
import type { SQSHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';

type CatalogRecord = {
  title: string;
  description: string;
  price: number;
};

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const snsClient = new SNSClient({});

const parseCatalogRecord = (messageBody: string): CatalogRecord => {
  const payload = JSON.parse(messageBody) as Record<string, unknown>;

  const title = typeof payload.title === 'string' ? payload.title.trim() : '';
  const description =
    typeof payload.description === 'string' ? payload.description.trim() : '';
  const priceRaw =
    typeof payload.price === 'string' || typeof payload.price === 'number'
      ? Number(payload.price)
      : Number.NaN;

  if (!title) {
    throw new Error('title is required');
  }

  if (!Number.isInteger(priceRaw) || priceRaw < 0) {
    throw new Error('price must be a non-negative integer');
  }

  return {
    title,
    description,
    price: priceRaw,
  };
};

export const handler: SQSHandler = async (event) => {
  const productsTable = process.env.PRODUCTS_TABLE;
  const createProductTopicArn = process.env.CREATE_PRODUCT_TOPIC_ARN;

  if (!productsTable) {
    throw new Error('Missing PRODUCTS_TABLE environment variable');
  }

  if (!createProductTopicArn) {
    throw new Error('Missing CREATE_PRODUCT_TOPIC_ARN environment variable');
  }

  const createdProducts = [] as Array<CatalogRecord & { id: string }>;

  for (const record of event.Records) {
    const payload = parseCatalogRecord(record.body);

    const product = {
      id: randomUUID(),
      ...payload,
    };

    await dynamoClient.send(
      new PutCommand({
        TableName: productsTable,
        Item: product,
        ConditionExpression: 'attribute_not_exists(id)',
      })
    );

    createdProducts.push(product);
  }

  if (createdProducts.length > 0) {
    const hasHighPriceProduct = createdProducts.some((product) => product.price > 100);

    await snsClient.send(
      new PublishCommand({
        TopicArn: createProductTopicArn,
        Subject: `Created ${createdProducts.length} products`,
        Message: JSON.stringify({
          createdCount: createdProducts.length,
          products: createdProducts,
        }),
        MessageAttributes: {
          priceTier: {
            DataType: 'String',
            StringValue: hasHighPriceProduct ? 'high' : 'regular',
          },
        },
      })
    );
  }
};
