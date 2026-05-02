import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as path from 'path';

export class AwsBackendLearningStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const productsTableName = 'products';
    const stockTableName = 'stock';

    const productsTable = dynamodb.Table.fromTableName(
      this,
      'ProductsTable',
      productsTableName
    );

    const stockTable = dynamodb.Table.fromTableName(
      this,
      'StockTable',
      stockTableName
    );

    // Product Service — getProductsList Lambda
    const getProductsList = new lambda.Function(this, 'getProductsList', {
      runtime: lambda.Runtime.NODEJS_22_X,
      code: lambda.Code.fromAsset(path.join(__dirname, 'products-lamda')),
      handler: 'getProducts.handler',
      environment: {
        PRODUCTS_TABLE: productsTable.tableName,
        STOCK_TABLE: stockTable.tableName,
      },
    });

    // Product Service — getProductsById Lambda
    const getProductsById = new lambda.Function(this, 'getProductsById', {
      runtime: lambda.Runtime.NODEJS_22_X,
      code: lambda.Code.fromAsset(path.join(__dirname, 'products-lamda')),
      handler: 'getProductsById.handler',
      environment: {
        PRODUCTS_TABLE: productsTable.tableName,
        STOCK_TABLE: stockTable.tableName,
      },
    });

    productsTable.grantReadData(getProductsList);
    stockTable.grantReadData(getProductsList);
    productsTable.grantReadData(getProductsById);
    stockTable.grantReadData(getProductsById);

    // API Gateway REST API
    const api = new apigateway.RestApi(this, 'ProductServiceApi', {
      restApiName: 'Product Service',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: ['GET'],
      },
    });

    // GET /products
    const products = api.root.addResource('products');
    products.addMethod('GET', new apigateway.LambdaIntegration(getProductsList));

    // GET /products/{productId}
    const productById = products.addResource('{productId}');
    productById.addMethod('GET', new apigateway.LambdaIntegration(getProductsById));
  }
}
