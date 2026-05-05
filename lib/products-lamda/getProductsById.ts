import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

type ProductItem = {
  id: string;
  title: string;
  description?: string;
  price: number;
};

type StockItem = {
  product_id: string;
  count: number;
};

type ProductResponse = {
  id: string;
  title: string;
  description: string;
  price: number;
  count: number;
};

const productsTable = process.env.PRODUCTS_TABLE;
const stockTable = process.env.STOCK_TABLE;

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const responseHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET",
};

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (!productsTable || !stockTable) {
    return {
      statusCode: 500,
      headers: responseHeaders,
      body: JSON.stringify({
        message: "Missing PRODUCTS_TABLE or STOCK_TABLE environment variable",
      }),
    };
  }

  const productId = event.pathParameters?.productId;

  if (!productId) {
    return {
      statusCode: 400,
      headers: responseHeaders,
      body: JSON.stringify({ message: "productId path parameter is required" }),
    };
  }

  const [productResult, stockResult] = await Promise.all([
    docClient.send(
      new GetCommand({
        TableName: productsTable,
        Key: { id: productId },
      })
    ),
    docClient.send(
      new GetCommand({
        TableName: stockTable,
        Key: { product_id: productId },
      })
    ),
  ]);

  if (!productResult.Item) {
    return {
      statusCode: 404,
      headers: responseHeaders,
      body: JSON.stringify({ message: `Product with id ${productId} not found` }),
    };
  }

  const product = productResult.Item as ProductItem;
  const stock = stockResult.Item as StockItem | undefined;

  const responseBody: ProductResponse = {
    id: product.id,
    title: product.title,
    description: product.description ?? "",
    price: product.price,
    count: stock?.count ?? 0,
  };

  return {
    statusCode: 200,
    headers: responseHeaders,
    body: JSON.stringify(responseBody),
  };
};
