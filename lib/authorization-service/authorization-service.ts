import * as cdk from 'aws-cdk-lib/core';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as path from 'path';

export class AuthorizationServiceStack extends cdk.Stack {
	public readonly basicAuthorizerLambda: lambda.IFunction;

	constructor(scope: Construct, id: string, props?: cdk.StackProps) {
		super(scope, id, props);

		const credentials = Object.entries(process.env)
			.filter(([, value]) => value === 'TEST_PASSWORD')
			.reduce<Record<string, string>>((acc, [key, value]) => {
				if (typeof value === 'string') {
					acc[key] = value;
				}
				return acc;
			}, {});

		this.basicAuthorizerLambda = new lambda.Function(this, 'basicAuthorizer', {
			runtime: lambda.Runtime.NODEJS_22_X,
			code: lambda.Code.fromAsset(__dirname),
			handler: 'basicAuthorizer.handler',
			environment: credentials,
		});

		this.basicAuthorizerLambda.addPermission('AllowApiGatewayInvoke', {
			principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
			action: 'lambda:InvokeFunction',
		});

		new cdk.CfnOutput(this, 'BasicAuthorizerLambdaArn', {
			value: this.basicAuthorizerLambda.functionArn,
			description: 'ARN of basicAuthorizer Lambda',
		});
	}
}
