import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  type ScanCommandOutput,
} from "@aws-sdk/lib-dynamodb";

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
  _event: APIGatewayProxyEvent
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

  const [productsResult, stockResult]: [ScanCommandOutput, ScanCommandOutput] =
    await Promise.all([
      docClient.send(new ScanCommand({ TableName: productsTable })),
      docClient.send(new ScanCommand({ TableName: stockTable })),
    ]);

  const products = (productsResult.Items ?? []) as ProductItem[];
  const stock = (stockResult.Items ?? []) as StockItem[];
  const countByProductId = new Map(stock.map((item) => [item.product_id, item.count]));

  const joinedProducts: ProductResponse[] = products.map((product) => ({
    id: product.id,
    title: product.title,
    description: product.description ?? "",
    price: product.price,
    count: countByProductId.get(product.id) ?? 0,
  }));

  return {
    statusCode: 200,
    headers: responseHeaders,
    body: JSON.stringify(joinedProducts),
  };
};
