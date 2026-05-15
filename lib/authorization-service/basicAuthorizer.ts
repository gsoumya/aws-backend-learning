import type {
  APIGatewayAuthorizerResult,
  APIGatewayTokenAuthorizerEvent,
  Statement,
} from 'aws-lambda';

const buildPolicy = (
  principalId: string,
  effect: 'Allow' | 'Deny',
  resource: string
): APIGatewayAuthorizerResult => {
  const statement: Statement = {
    Action: 'execute-api:Invoke',
    Effect: effect,
    Resource: resource,
  };

  return {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [statement],
    },
  };
};

export const handler = async (
  event: APIGatewayTokenAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> => {
  const authorizationHeader = event.authorizationToken;

  if (!authorizationHeader) {
    throw new Error('Unauthorized');
  }

  const [scheme, encodedCredentials] = authorizationHeader.split(' ');

  if (scheme !== 'Basic' || !encodedCredentials) {
    return buildPolicy('unauthorized-user', 'Deny', event.methodArn);
  }

  const decodedCredentials = Buffer.from(encodedCredentials, 'base64').toString('utf-8');
  const [login, password] = decodedCredentials.split(':');

  if (!login || !password) {
    return buildPolicy('unauthorized-user', 'Deny', event.methodArn);
  }

  const expectedPassword = process.env[login];

  if (!expectedPassword || expectedPassword !== password) {
    return buildPolicy(login, 'Deny', event.methodArn);
  }

  return buildPolicy(login, 'Allow', event.methodArn);
};
