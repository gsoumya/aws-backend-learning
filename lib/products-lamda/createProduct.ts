import { randomUUID } from "node:crypto";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

type CreateProductRequest = {
  title?: unknown;
  description?: unknown;
  price?: unknown;
};

type ProductItem = {
  id: string;
  title: string;
  description: string;
  price: number;
};

const productsTable = process.env.PRODUCTS_TABLE;

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const responseHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST",
};

function parseRequestBody(body: string | null): CreateProductRequest {
  if (!body) {
    throw new Error("Request body is required");
  }

  return JSON.parse(body) as CreateProductRequest;
}

function validateProductPayload(payload: CreateProductRequest): Omit<ProductItem, "id"> {
  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const description =
    typeof payload.description === "string" ? payload.description.trim() : "";
  const price = payload.price;

  if (!title) {
    throw new Error("title is required");
  }

  if (typeof price !== "number" || !Number.isInteger(price) || price < 0) {
    throw new Error("price must be a non-negative integer");
  }

  return {
    title,
    description,
    price,
  };
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (!productsTable) {
    return {
      statusCode: 500,
      headers: responseHeaders,
      body: JSON.stringify({ message: "Missing PRODUCTS_TABLE environment variable" }),
    };
  }

  let payload: Omit<ProductItem, "id">;

  try {
    payload = validateProductPayload(parseRequestBody(event.body ?? null));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request body";

    return {
      statusCode: 400,
      headers: responseHeaders,
      body: JSON.stringify({ message }),
    };
  }

  const product: ProductItem = {
    id: randomUUID(),
    ...payload,
  };

  await docClient.send(
    new PutCommand({
      TableName: productsTable,
      Item: product,
      ConditionExpression: "attribute_not_exists(id)",
    })
  );

  return {
    statusCode: 201,
    headers: responseHeaders,
    body: JSON.stringify(product),
  };
};
