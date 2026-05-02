import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import "dotenv/config";
import { products } from "../lib/products-lamda/products";

type SeedProduct = {
  id: string;
  title: string;
  description: string;
  price: number;
  count: number;
};

const productsTable = process.env.PRODUCTS_TABLE ?? "products";
const stockTable = process.env.STOCK_TABLE ?? "stock";

const stockByProductId: Record<string, number> = {
  "1": 15,
  "2": 9,
  "3": 18,
  "4": 24,
};

const seedProducts: SeedProduct[] = products.map((product) => ({
  ...product,
  count: stockByProductId[product.id] ?? 0,
}));

async function seed(): Promise<void> {
  if (!process.env.AWS_REGION) {
    throw new Error("AWS_REGION is required to run the seed script");
  }

  const client = new DynamoDBClient({
    region: process.env.AWS_REGION,
  });
  const docClient = DynamoDBDocumentClient.from(client);

  let seeded = 0;

  for (const product of seedProducts) {
    const id = product.id;

    try {
      await docClient.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              Put: {
                TableName: productsTable,
                Item: {
                  id,
                  title: product.title,
                  description: product.description,
                  price: product.price,
                },
              },
            },
            {
              Put: {
                TableName: stockTable,
                Item: {
                  product_id: id,
                  count: product.count,
                },
              },
            },
          ],
        })
      );

      seeded += 1;
      console.log(`Seeded: ${product.title} (${id})`);
    } catch (error) {
      console.error(`Failed to seed ${product.title}:`, error);
      throw error;
    }
  }

  console.log("\nSeed completed");
  console.log(`Products table: ${productsTable}`);
  console.log(`Stock table: ${stockTable}`);
  console.log(`Seeded pairs: ${seeded}`);
}

seed().catch((error) => {
  console.error("Seed script failed:", error);
  process.exit(1);
});
