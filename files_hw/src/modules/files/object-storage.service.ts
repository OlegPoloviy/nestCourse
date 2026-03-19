import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  S3ClientConfig,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class ObjectStorageService {
  private readonly s3: S3Client;
  private readonly region: string;
  private readonly bucket: string;
  private readonly endpoint: string;

  constructor(private readonly configService: ConfigService) {
    this.region = configService.getOrThrow<string>('AWS_REGION');
    this.bucket = configService.getOrThrow<string>('AWS_BUCKET');

    this.endpoint = configService.getOrThrow<string>('AWS_ENDPOINT');

    const accessKeyId =
      this.configService.getOrThrow<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.getOrThrow<string>(
      'AWS_SECRET_ACCESS_KEY',
    );

    const clientConfig: S3ClientConfig = {
      region: this.region,
      endpoint: this.endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',

      forcePathStyle: true,
    };

    this.s3 = new S3Client(clientConfig);
  }

  async createPresignedUploadUrl(
    key: string,
    contentType: string,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    return getSignedUrl(this.s3, command, { expiresIn: 900 });
  }

  async objectExists(key: string): Promise<boolean> {
    const command = new HeadObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    try {
      await this.s3.send(command);
      return true;
    } catch (error: unknown) {
      const err = error as { name?: string; $metadata?: { httpStatusCode?: number } };
      const statusCode = err.$metadata?.httpStatusCode;

      if (
        statusCode === 404 ||
        err.name === 'NotFound' ||
        err.name === 'NoSuchKey'
      ) {
        return false;
      }

      throw error;
    }
  }

  getFileViewUrl(key: string): string {
    const baseUrl =
      this.configService.get<string>('CLOUDFRONT_BASE_URL') ||
      `http://localhost:9000/${this.configService.get<string>('AWS_BUCKET')}`;

    const cleanBaseUrl = baseUrl.replace(/\/$/, '');

    return `${cleanBaseUrl}/${key}`;
  }
}
