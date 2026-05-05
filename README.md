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
3. Lambda `createProduct` for `POST /products`
4. Lambda `getProductsById` for `GET /products/{productId}`
5. DynamoDB table `products`
6. DynamoDB table `stock`

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
Store that URL for task 4.3 submission and PR description, because it is the URL used to execute the Lambda functions through API Gateway.

## API Endpoints

Example deployed base URL:

```text
https://ayhfzo2pc9.execute-api.us-east-1.amazonaws.com/prod/
```

Available endpoints:

1. `GET /products`
2. `POST /products`
3. `GET /products/{productId}`

Example requests:

```text
https://ayhfzo2pc9.execute-api.us-east-1.amazonaws.com/prod/products
https://ayhfzo2pc9.execute-api.us-east-1.amazonaws.com/prod/products/19ba3d6a-f8ed-491b-a192-0a33b71b38c4
```

Example POST body:

```json
{
  "title": "Hoodie",
  "description": "Warm cotton hoodie",
  "price": 65
}
```

## Frontend Application

CloudFront frontend URL:

```text
https://d360sx6lq5b25q.cloudfront.net/
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

## Task 5: Import Service (CSV File Upload & Parsing)

The Import Service enables clients to upload CSV files via S3 signed URLs and automatically processes them via AWS Lambda.

### Architecture Components

1. **API Gateway REST API** named `Import Service`
   - Endpoint: `GET /import`
   - Returns: Pre-signed S3 URL for uploading CSV files

2. **S3 Bucket** named `import-service-bucket-{ACCOUNT_ID}-{REGION}`
   - Auto-created with CORS enabled for cross-origin file uploads
   - Directory: `uploaded/` stores all imported CSV files
   - Auto-deletes objects after 1 day (lifecycle rule)

3. **Lambda: importProductsFile** (API-triggered)
   - Purpose: Generate signed S3 upload URLs
   - Runtime: Node.js 22.x
   - Input: API Gateway query parameter `name` (filename)
   - Output: JSON with pre-signed PUT URL (valid for 5 minutes)
   - HTTP Response:
     - `200 OK` with signed URL on success
     - `400 Bad Request` if filename missing
     - `500 Internal Server Error` if signing fails

4. **Lambda: importFileParser** (S3-triggered)
   - Purpose: Parse and process uploaded CSV files
   - Runtime: Node.js 22.x
   - Trigger: S3 `OBJECT_CREATED` event on `uploaded/` prefix
   - Dependencies: [csv-parser](https://www.npmjs.com/package/csv-parser) v3.2.0 (via Lambda Layer)
   - Behavior: Streams CSV file, parses records, logs to CloudWatch Logs

5. **Lambda Layer: CsvParserLayer**
   - Node.js dependencies for csv-parser package
   - Attached to importFileParser Lambda for stream-based CSV parsing

### Deployment

Deploy the complete stack (existing products service + import service):

```bash
npm run build
npx cdk bootstrap
npx cdk deploy --all --require-approval=never
```

After deployment, CDK outputs include:

```text
ImportServiceStack.ImportServiceApiEndpoint = https://<api-id>.execute-api.us-east-1.amazonaws.com/prod/
ImportServiceStack.S3BucketName = import-service-bucket-<account-id>-<region>
```

### API Usage: Generate Signed URL

**Request:**

```bash
curl -X GET "https://<api-id>.execute-api.us-east-1.amazonaws.com/prod/import?name=products.csv"
```

**Response (HTTP 200):**

```json
{
  "signedUrl": "https://import-service-bucket-044099381264-us-east-1.s3.us-east-1.amazonaws.com/uploaded/products.csv?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Date=20260505T064639Z&X-Amz-Expires=300&..."
}
```

**Query Parameters:**

| Parameter | Required | Type   | Description                     |
|-----------|----------|--------|----------------------------------|
| `name`    | Yes      | string | Filename for upload (e.g., `products.csv`) |

### Upload CSV File

**Using the signed URL from previous request:**

```bash
curl -X PUT \
  -H "Content-Type: text/csv" \
  --upload-file products.csv \
  "https://import-service-bucket-...amazonaws.com/uploaded/products.csv?X-Amz-Algorithm=..."
```

**Response:**

```
HTTP/1.1 200 OK
```

### CSV Format Specification

The CSV file must include a header row and comma-separated values.

**Example: products.csv**

```csv
title,description,price,count
Jacket,Lightweight jacket,110,7
Shoes,Trail running shoes,95,12
T-Shirt,Cotton crew neck t-shirt,25,30
Cap,Baseball cap,18,40
```

**Required Headers:**

| Column      | Type   | Description          |
|-------------|--------|----------------------|
| `title`     | string | Product name         |
| `description` | string | Product details      |
| `price`     | number | Product price in USD |
| `count`     | number | Stock quantity       |

### End-to-End Workflow

1. Client requests signed URL: `GET /import?name=products.csv`
2. importProductsFile Lambda returns pre-signed PUT URL
3. Client uploads CSV file to signed URL using PUT request
4. S3 triggers importFileParser Lambda automatically
5. importFileParser streams and parses CSV records
6. Each record logged to CloudWatch Logs (JSON format)

### Verify Processing

**CloudWatch Logs:**

1. Open AWS Console
2. Go to **CloudWatch** > **Logs** > **Log groups**
3. Find `/aws/lambda/importFileParser*` (exact name in stack output)
4. Open the latest log stream
5. View parsed records in JSON format:

```json
{"level":"info","message":"Parsed record:","record":{"title":"Jacket","description":"Lightweight jacket","price":"110","count":"7"}}
{"level":"info","message":"Parsed record:","record":{"title":"Shoes","description":"Trail running shoes","price":"95","count":"12"}}
```

**AWS Console Steps:**

1. Open AWS Console
2. Go to **Lambda**
3. Open the `importFileParser*` function
4. Open the **Monitor** tab
5. Click **View CloudWatch Logs**
6. Select the latest log stream
7. Search for `"Parsed record"` to verify CSV parsing

### Local Testing

Create a test CSV file locally:

```bash
# Create test file
cat > products.csv << 'EOF'
title,description,price,count
Jacket,Lightweight jacket,110,7
Shoes,Trail running shoes,95,12
T-Shirt,Cotton crew neck t-shirt,25,30
Cap,Baseball cap,18,40
EOF

# Deploy stack
npm run build
npx cdk deploy --all --require-approval=never

# Get signed URL and upload
API_URL="https://<api-id>.execute-api.us-east-1.amazonaws.com/prod"
SIGNED_URL=$(curl -s "$API_URL/import?name=products.csv" | jq -r '.signedUrl')
curl -X PUT -H "Content-Type: text/csv" --upload-file products.csv "$SIGNED_URL"

# Check CloudWatch for parsing results (wait ~2-3 seconds for Lambda execution)
# See "Verify Processing" section above
```

### Infrastructure Code Files

- **Stack Definition:** [lib/import-service-stack.ts](lib/import-service-stack.ts)
- **API Lambda:** [lib/import-service-lambda/importProductsFile.ts](lib/import-service-lambda/importProductsFile.ts)
- **Parser Lambda:** [lib/import-service-lambda/importFileParser.ts](lib/import-service-lambda/importFileParser.ts)
- **CSV Parser Layer:** [lib/import-service-lambda/csv-parser-layer/nodejs/package.json](lib/import-service-lambda/csv-parser-layer/nodejs/package.json)
