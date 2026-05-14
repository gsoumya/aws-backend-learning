import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { handler } from '../lib/products-lamda/catalogBatchProcess';

const dynamoMock = mockClient(DynamoDBDocumentClient);
const snsMock = mockClient(SNSClient);

describe('catalogBatchProcess handler', () => {
  beforeEach(() => {
    dynamoMock.reset();
    snsMock.reset();
    process.env.PRODUCTS_TABLE = 'products';
    process.env.CREATE_PRODUCT_TOPIC_ARN = 'arn:aws:sns:us-east-1:123456789012:createProductTopic';
  });

  afterEach(() => {
    delete process.env.PRODUCTS_TABLE;
    delete process.env.CREATE_PRODUCT_TOPIC_ARN;
  });

  test('creates products from SQS messages and publishes SNS notification', async () => {
    dynamoMock.on(PutCommand).resolves({});
    snsMock.on(PublishCommand).resolves({});

    await handler({
      Records: [
        {
          body: JSON.stringify({
            title: 'Hoodie',
            description: 'Warm hoodie',
            price: 65,
          }),
        },
        {
          body: JSON.stringify({
            title: 'Premium Jacket',
            description: 'Winter jacket',
            price: 150,
          }),
        },
      ],
    } as any, {} as any, () => undefined);

    expect(dynamoMock.commandCalls(PutCommand)).toHaveLength(2);
    expect(snsMock.commandCalls(PublishCommand)).toHaveLength(1);

    const publishInput = snsMock.commandCalls(PublishCommand)[0].args[0].input;
    expect(publishInput.TopicArn).toBe(
      'arn:aws:sns:us-east-1:123456789012:createProductTopic'
    );
    expect(publishInput.Subject).toBe('Created 2 products');
    expect(publishInput.MessageAttributes).toEqual({
      priceTier: {
        DataType: 'String',
        StringValue: 'high',
      },
    });

    const message = JSON.parse(publishInput.Message ?? '{}');
    expect(message.createdCount).toBe(2);
    expect(Array.isArray(message.products)).toBe(true);
    expect(message.products).toHaveLength(2);
  });

  test('throws when PRODUCTS_TABLE environment variable is missing', async () => {
    delete process.env.PRODUCTS_TABLE;

    await expect(
      handler({ Records: [] } as any, {} as any, () => undefined)
    ).rejects.toThrow('Missing PRODUCTS_TABLE environment variable');
  });

  test('throws when message payload is invalid', async () => {
    await expect(
      handler(
        {
          Records: [
            {
              body: JSON.stringify({ title: '', description: 'Bad', price: 50 }),
            },
          ],
        } as any,
        {} as any,
        () => undefined
      )
    ).rejects.toThrow('title is required');

    expect(dynamoMock.commandCalls(PutCommand)).toHaveLength(0);
    expect(snsMock.commandCalls(PublishCommand)).toHaveLength(0);
  });
});
