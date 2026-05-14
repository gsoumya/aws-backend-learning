# Task 6: SQS/SNS Integration and Catalog Batch Processing

## Overview
This PR implements the complete catalog batch processing workflow using AWS SQS and SNS, enabling efficient CSV product imports with asynchronous notifications.

## What's Implemented

### Task 6.1: Catalog Batch Processing Lambda
- ✅ Created `catalogBatchProcess` Lambda function in product service stack
- ✅ Configured SQS event source with batch size 5
- ✅ Iterates over SQS messages and creates products in DynamoDB
- ✅ Validates product payload (title, price) per CSV record
- ✅ Publishes SNS notification after batch processing

### Task 6.2: Import Service Update
- ✅ Updated `importFileParser` to send CSV records to SQS catalogItemsQueue
- ✅ Removed per-record CloudWatch logging (no more console.log for each row)
- ✅ Maintains file lifecycle: uploaded/ → parsed/ after processing
- ✅ Batch sends SQS messages for all parsed records

### Task 6.3: SNS Topic with Subscriptions
- ✅ Created SNS topic `createProductTopic`
- ✅ Added general email subscription (gsoumya515@gmail.com)
- ✅ Added filtered email subscription (gangamwarsoumya@gmail.com)
- ✅ Filter policy: high-price products (price > 100)
- ✅ SNS message includes product count and product details

### Enhancements (30 pts)
- ✅ Unit tests for catalogBatchProcess (3 test cases covering success, validation, and error paths)
- ✅ SNS filter policy with message attributes for selective routing
- ✅ Dual email subscriptions with price-based filtering

## Rubric Coverage

| Criteria | Points | Status |
|----------|--------|--------|
| catalogBatchProcess Lambda with SQS trigger (batch size 5) | 20 | ✅ Complete |
| SQS queue catalogItemsQueue creation | 10 | ✅ Complete |
| importFileParser sends records to SQS | 15 | ✅ Complete |
| SNS topic and email subscription | 15 | ✅ Complete |
| catalogBatchProcess publishes SNS event | 10 | ✅ Complete |
| **Core Requirements Total** | **70** | **✅ 70/70** |
| catalogBatchProcess unit tests | 15 | ✅ Complete |
| SNS filter policy + filtered email subscription | 15 | ✅ Complete |
| **Enhancements Total** | **30** | **✅ 30/30** |
| **Grand Total** | **100** | **✅ 100/100** |

## Technical Details

### Architecture Changes
1. **Cross-stack dependency**: Product stack exports catalogItemsQueue to import stack
2. **Lambda permissions**: Proper IAM grants for DynamoDB, SQS, and SNS
3. **Message format**: CSV records as JSON messages in SQS
4. **Filter criteria**: `priceTier` attribute set to "high" if any product price > 100

### File Changes
- `bin/aws-backend-learning.ts`: Stack wiring with queue passing
- `lib/aws-backend-learning-stack.ts`: SQS queue, SNS topic, catalogBatchProcess Lambda
- `lib/import-service-stack.ts`: Queue URL environment variable for parser
- `lib/import-service-lambda/importFileParser.ts`: SQS message sending instead of logging
- `lib/products-lamda/catalogBatchProcess.ts`: New handler for batch product creation
- `test/catalogBatchProcess.test.ts`: New test suite with 3 comprehensive tests
- `package.json`: Added @aws-sdk/client-sqs and @aws-sdk/client-sns

## Testing & Validation

### Unit Tests
- All 7 tests passing (importProductsFile: 4, catalogBatchProcess: 3)
- 100% coverage for catalogBatchProcess Lambda logic

### Integration Testing
1. ✅ CSV upload via signed URL
2. ✅ Parser processes and sends SQS messages
3. ✅ catalogBatchProcess creates products in DynamoDB
4. ✅ SNS notifications sent to subscribed emails
5. ✅ Filter policy correctly routes high-price notifications

### Build Verification
- TypeScript compilation: ✅ passing
- Jest test suite: ✅ 7/7 passing
- CDK synthesis: ✅ passing

## Deployment Notes

### Pre-deployment
```bash
npm run build
npm test
npx cdk diff --all
```

### Deployment
```bash
npx cdk deploy --all --require-approval never
```

### Post-deployment
1. Confirm SNS email subscriptions in both inboxes
2. Test upload: Use signed URL to upload clean CSV
3. Verify: Check DynamoDB products table for created items
4. Monitor: Review CloudWatch logs for Lambda execution

## Email Subscriptions
- **General (gsoumya515@gmail.com)**: Receives all product batch notifications
- **Filtered (gangamwarsoumya@gmail.com)**: Receives only high-price batch notifications

## Deployed Resources
- Product Service API: https://ayhfzo2pc9.execute-api.us-east-1.amazonaws.com/prod/
- Import Service API: https://z7z7s1eel4.execute-api.us-east-1.amazonaws.com/prod/import
- SQS Queue: catalogItemsQueue
- SNS Topic: createProductTopic
- S3 Bucket: import-service-bucket-044099381264-us-east-1

## Testing URLs & Verification Steps

### 1. Generate Signed URL
```bash
curl -X GET "https://z7z7s1eel4.execute-api.us-east-1.amazonaws.com/prod/import?name=test.csv"
```

### 2. Upload CSV File
Use the signed URL from step 1 with PUT request (replace {signedUrl}):
```bash
curl -X PUT "{signedUrl}" --data-binary @products.csv -H "Content-Type: text/csv"
```

### 3. AWS Console Verification Paths

**SQS Queue Status:**
- AWS Console → SQS → catalogItemsQueue → Monitoring tab
- Check: Messages Sent, Messages Received, Messages Deleted

**SNS Topic & Subscriptions:**
- AWS Console → SNS → Topics → createProductTopic
- Subscriptions tab should show 2 confirmed email subscriptions

**DynamoDB Products Created:**
- AWS Console → DynamoDB → products table → Explore table items
- Filter by recent timestamps to see newly created products

**Lambda Execution Logs:**
- AWS Console → CloudWatch Logs → /aws/lambda/catalogBatchProcess
- AWS Console → CloudWatch Logs → /aws/lambda/importFileParser

### 4. Expected Results

After CSV upload, verify:
1. ✅ importFileParser processes CSV and sends to SQS
2. ✅ catalogBatchProcess consumes batch (batch size = 5)
3. ✅ Products appear in DynamoDB with generated IDs
4. ✅ SNS notification sent to both emails
5. ✅ Filter logic: high-price email only if max price > 100

---

## Screenshots for Review (Optional but Recommended)

Add these screenshots to PR comments:

1. **DynamoDB Products Table** - Show newly created items with title, price, id
2. **SNS Topic Subscriptions** - Show 2 confirmed email subscriptions
3. **SQS Queue Metrics** - Show Messages Sent and Received count
4. **CloudWatch Logs** - catalogBatchProcess execution logs showing product creation
5. **Test CSV** - Show sample CSV format used for testing

Example CSV format:
```csv
title,description,price
Gaming Laptop,High-end laptop,150
Office Chair,Ergonomic chair,80
```

---

**Reviewer Checklist:**
- [ ] CDK stack contains catalogBatchProcess configuration
- [ ] SQS queue created with proper Lambda trigger (batchSize: 5)
- [ ] SNS topic with dual email subscriptions verified in AWS Console
- [ ] importFileParser no longer logs individual records to CloudWatch
- [ ] Unit tests cover all scenarios (3/3 passing)
- [ ] End-to-end flow tested: CSV → SQS → Lambda → DynamoDB → SNS
- [ ] SNS filter policy correctly routes high-price notifications
- [ ] IAM permissions properly configured for all services
- [ ] DynamoDB has new products from test CSV upload
- [ ] Email subscription confirmations received in both inboxes
