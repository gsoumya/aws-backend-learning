import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import "dotenv/config";

type SeedProduct = {
  id: string;
  title: string;
  description: string;
  price: number;
  count: number;
};

const productsTable = process.env.PRODUCTS_TABLE ?? "products";
const stockTable = process.env.STOCK_TABLE ?? "stock";

const seedProducts: SeedProduct[] = [
  {
    id: "1",
    title: "Wireless Mouse",
    description: "2.4GHz ergonomic wireless mouse",
    price: 25,
    count: 120,
  },
  {
    id: "2",
    title: "Mechanical Keyboard",
    description: "Backlit keyboard with red switches",
    price: 79,
    count: 65,
  },
  {
    id: "3",
    title: "USB-C Hub",
    description: "6-in-1 USB-C hub with HDMI and PD",
    price: 45,
    count: 85,
  },
  {
    id: "4",
    title: "27-inch Monitor",
    description: "QHD IPS monitor, 75Hz refresh rate",
    price: 239,
    count: 32,
  },
  {
    id: "5",
    title: "Noise Cancelling Headphones",
    description: "Over-ear Bluetooth ANC headphones",
    price: 149,
    count: 48,
  },
  {
    id: "6",
    title: "Webcam 1080p",
    description: "Full HD USB webcam with dual microphones",
    price: 59,
    count: 74,
  },
];

async function seed(): Promise<void> {
  const client = new DynamoDBClient({
    region: process.env.AWS_REGION,
  });
  const docClient = DynamoDBDocumentClient.from(client);

  let inserted = 0;
  const skipped: string[] = [];

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
                ConditionExpression: "attribute_not_exists(id)",
              },
            },
            {
              Put: {
                TableName: stockTable,
                Item: {
                  product_id: id,
                  count: product.count,
                },
                ConditionExpression: "attribute_not_exists(product_id)",
              },
            },
          ],
        })
      );

      inserted += 1;
      console.log(`Inserted: ${product.title} (${id})`);
    } catch (error) {
      skipped.push(product.title);
      console.error(`Failed to insert ${product.title}:`, error);
    }
  }

  console.log("\nSeed completed");
  console.log(`Products table: ${productsTable}`);
  console.log(`Stock table: ${stockTable}`);
  console.log(`Inserted pairs: ${inserted}`);
  if (skipped.length > 0) {
    console.log(`Skipped: ${skipped.join(", ")}`);
  }
}

seed().catch((error) => {
  console.error("Seed script failed:", error);
  process.exit(1);
});
