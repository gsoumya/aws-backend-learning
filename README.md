# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template

## Seed DynamoDB test data

1. Copy `.env.example` to `.env`.
2. Keep these values for this task:
	- `AWS_REGION=us-east-1`
	- `PRODUCTS_TABLE=products`
	- `STOCK_TABLE=stock`
3. Run:

```bash
npm run build
npm run seed
```
