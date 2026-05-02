# Welcome to your CDK TypeScript project

This project exposes a Product Service through API Gateway and AWS Lambda.
The Lambda functions read product data from DynamoDB tables named `products` and `stock`.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template

## Architecture

The stack contains these backend components:

1. API Gateway REST API named `Product Service`
2. Lambda `getProductsList` for `GET /products`
3. Lambda `getProductsById` for `GET /products/{productId}`
4. DynamoDB table `products`
5. DynamoDB table `stock`

The API response model is a join of both DynamoDB tables:

```json
{
  "id": "19ba3d6a-f8ed-491b-a192-0a33b71b38c4",
  "title": "Short Sleeve Shirt",
  "description": "A comfortable cotton shirt",
  "price": 25,
  "count": 15
}
```

## Deployment

Deploy the backend with:

```bash
npx cdk deploy --require-approval never
```

After deployment, CDK prints an output similar to:

```text
AwsBackendLearningStack.ProductServiceApiEndpointE57F6293 = https://<api-id>.execute-api.us-east-1.amazonaws.com/prod/
```

That is the base API URL for this project.

## API Endpoints

Example deployed base URL:

```text
https://ayhfzo2pc9.execute-api.us-east-1.amazonaws.com/prod/
```

Available endpoints:

1. `GET /products`
2. `GET /products/{productId}`

Example requests:

```text
https://ayhfzo2pc9.execute-api.us-east-1.amazonaws.com/prod/products
https://ayhfzo2pc9.execute-api.us-east-1.amazonaws.com/prod/products/19ba3d6a-f8ed-491b-a192-0a33b71b38c4
```

## Where To Find It In AWS Console

This project uses an API Gateway URL, not a Lambda Function URL.

To find the deployed API URL in AWS Console:

1. Open AWS Console
2. Go to API Gateway
3. Open the API named `Product Service`
4. Open `Stages`
5. Open the `prod` stage
6. Copy the `Invoke URL`

To inspect the Lambda functions:

1. Open AWS Console
2. Go to Lambda
3. Open `getProductsList` or `getProductsById`
4. Check `Configuration` and `Environment variables` for `PRODUCTS_TABLE` and `STOCK_TABLE`

To inspect the DynamoDB tables:

1. Open AWS Console
2. Go to DynamoDB
3. Open `Tables`
4. Open `products` or `stock`
5. Open `Explore table items`

## Seed DynamoDB test data

1. Deploy the CDK stack to create/update resources:

```bash
npx cdk deploy
```

2. Copy `.env.example` to `.env`.
3. Keep these values for this task:
	- `AWS_REGION=us-east-1`
	- `PRODUCTS_TABLE=products`
	- `STOCK_TABLE=stock`
4. Run:

```bash
npm run build
npm run seed
```

Seeded table schema:

1. `products`
2. Primary key: `id` (uuid string)
3. Attributes: `title`, `description`, `price`

1. `stock`
2. Primary key: `product_id` (uuid string)
3. Attributes: `count`

The API reads from DynamoDB and returns a joined product model:

```json
{
  "id": "19ba3d6a-f8ed-491b-a192-0a33b71b38c4",
  "title": "Short Sleeve Shirt",
  "description": "A comfortable cotton shirt",
  "price": 25,
  "count": 15
}
```
