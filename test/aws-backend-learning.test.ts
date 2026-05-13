import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { handler } from '../lib/import-service-lambda/importProductsFile';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
	getSignedUrl: jest.fn(),
}));

const s3Mock = mockClient(S3Client);
const getSignedUrlMock = getSignedUrl as jest.MockedFunction<typeof getSignedUrl>;

describe('importProductsFile handler', () => {
	beforeEach(() => {
		s3Mock.reset();
		getSignedUrlMock.mockReset();
		process.env.IMPORT_BUCKET_NAME = 'test-import-bucket';
	});

	afterEach(() => {
		delete process.env.IMPORT_BUCKET_NAME;
	});

	test('returns signed url for a valid file name', async () => {
		getSignedUrlMock.mockResolvedValue('https://signed-url.example');

		const response = await handler({
			queryStringParameters: { name: 'products.csv' },
		} as any);

		expect(response.statusCode).toBe(200);
		expect(JSON.parse(response.body)).toEqual({
			signedUrl: 'https://signed-url.example',
		});
		expect(getSignedUrlMock).toHaveBeenCalledTimes(1);

		const [, command, options] = getSignedUrlMock.mock.calls[0];
		expect(command).toBeInstanceOf(PutObjectCommand);
		expect((command as PutObjectCommand).input).toMatchObject({
			Bucket: 'test-import-bucket',
			Key: 'uploaded/products.csv',
			ContentType: 'text/csv',
		});
		expect(options).toEqual({ expiresIn: 300 });
	});

	test('returns 400 when query parameter name is missing', async () => {
		const response = await handler({ queryStringParameters: null } as any);

		expect(response.statusCode).toBe(400);
		expect(JSON.parse(response.body)).toEqual({
			message: 'Missing required query parameter: name',
		});
		expect(getSignedUrlMock).not.toHaveBeenCalled();
	});

	test('returns 500 when IMPORT_BUCKET_NAME is missing', async () => {
		delete process.env.IMPORT_BUCKET_NAME;

		const response = await handler({
			queryStringParameters: { name: 'products.csv' },
		} as any);

		expect(response.statusCode).toBe(500);
		expect(JSON.parse(response.body)).toEqual({
			message: 'Missing IMPORT_BUCKET_NAME environment variable',
		});
		expect(getSignedUrlMock).not.toHaveBeenCalled();
	});

	test('returns 500 when signed url generation fails', async () => {
		getSignedUrlMock.mockRejectedValue(new Error('signing failed'));
		const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

		const response = await handler({
			queryStringParameters: { name: 'products.csv' },
		} as any);

		expect(response.statusCode).toBe(500);
		expect(JSON.parse(response.body)).toEqual({
			message: 'Failed to generate signed URL',
		});
		expect(consoleErrorSpy).toHaveBeenCalled();

		consoleErrorSpy.mockRestore();
	});
});
