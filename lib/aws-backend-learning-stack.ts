import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as path from 'path';

export class AwsBackendLearningStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Product Service — getProductsList Lambda
    const getProductsList = new lambda.Function(this, 'getProductsList', {
      runtime: lambda.Runtime.NODEJS_22_X,
      code: lambda.Code.fromAsset(path.join(__dirname, 'products-lamda')),
      handler: 'getProducts.handler',
    });

    // Product Service — getProductsById Lambda
    const getProductsById = new lambda.Function(this, 'getProductsById', {
      runtime: lambda.Runtime.NODEJS_22_X,
      code: lambda.Code.fromAsset(path.join(__dirname, 'products-lamda')),
      handler: 'getProductsById.handler',
    });

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
