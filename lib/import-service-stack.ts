import * as cdk from 'aws-cdk-lib/core';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import { Construct } from 'constructs';
import * as path from 'path';

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const importBucket = new s3.Bucket(this, 'ImportServiceBucket', {
      bucketName: `import-service-bucket-${this.account}-${this.region}`,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
        },
      ],
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    new s3deploy.BucketDeployment(this, 'UploadedFolderPlaceholder', {
      sources: [s3deploy.Source.data('uploaded/.gitkeep', '')],
      destinationBucket: importBucket,
    });

    const importProductsFile = new lambda.Function(this, 'importProductsFile', {
      runtime: lambda.Runtime.NODEJS_22_X,
      code: lambda.Code.fromAsset(path.join(__dirname, 'import-service-lambda')),
      handler: 'importProductsFile.handler',
      environment: {
        IMPORT_BUCKET_NAME: importBucket.bucketName,
      },
    });

    const csvParserLayer = new lambda.LayerVersion(this, 'CsvParserLayer', {
      code: lambda.Code.fromAsset(
        path.join(__dirname, 'import-service-lambda', 'csv-parser-layer')
      ),
      compatibleRuntimes: [lambda.Runtime.NODEJS_22_X],
      description: 'csv-parser dependency for importFileParser',
    });

    const importFileParser = new lambda.Function(this, 'importFileParser', {
      runtime: lambda.Runtime.NODEJS_22_X,
      code: lambda.Code.fromAsset(path.join(__dirname, 'import-service-lambda')),
      handler: 'importFileParser.handler',
      layers: [csvParserLayer],
    });

    importBucket.grantPut(importProductsFile, 'uploaded/*');
    importBucket.grantRead(importFileParser, 'uploaded/*');

    importBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(importFileParser),
      { prefix: 'uploaded/' }
    );

    const api = new apigateway.RestApi(this, 'ImportServiceApi', {
      restApiName: 'Import Service',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: ['GET', 'OPTIONS'],
      },
    });

    const importResource = api.root.addResource('import');
    importResource.addMethod('GET', new apigateway.LambdaIntegration(importProductsFile), {
      requestParameters: {
        'method.request.querystring.name': true,
      },
    });

    new cdk.CfnOutput(this, 'ImportBucketName', {
      value: importBucket.bucketName,
      description: 'Import Service S3 Bucket Name',
    });

    new cdk.CfnOutput(this, 'ImportServiceApiUrl', {
      value: `${api.url}import`,
      description: 'Import Service API endpoint — GET /import?name={fileName}',
    });
  }
}
