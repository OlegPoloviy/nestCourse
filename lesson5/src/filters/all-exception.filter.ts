import {
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponse {
  requestId: string;
  timestamp: string;
  path: string;
  method: string;
  statusCode: number;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

interface NormalizedException {
  statusCode: number;
  code: string;
  message: string;
  details?: any;
}

@Catch()
export class AllExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    console.error(exception);
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = (request as any).requestId || 'unknown';
    const timestamp = new Date().toISOString();
    const path = request.url;
    const method = request.method;

    const { statusCode, code, message, details } =
      this.normalizeException(exception);

    const payload: ErrorResponse = {
      requestId,
      timestamp,
      path,
      method,
      statusCode,
      error: {
        code,
        message,
        details,
      },
    };

    this.logException(exception, payload);

    response.status(statusCode).json(payload);
  }

  private normalizeException(exception: unknown): NormalizedException {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      const statusCode = exception.getStatus();

      if (typeof response === 'object') {
        return {
          statusCode,
          code: (response as any).error || HttpStatus[statusCode],
          message: (response as any).message || exception.message,
          details: (response as any).details,
        };
      }

      return {
        statusCode,
        code: HttpStatus[statusCode],
        message: typeof response === 'string' ? response : exception.message,
      };
    }

    if (exception instanceof Error) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        code: 'INTERNAL_ERROR',
        message: exception.message,
        details:
          process.env.NODE_ENV === 'development' ? exception.stack : undefined,
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' ? exception : undefined,
    };
  }

  private logException(exception: unknown, payload: ErrorResponse): void {
    const { statusCode, error, method, path } = payload;

    if (statusCode >= 500) {
      this.logger.error(
        `${method} ${path} - ${statusCode} ${error.code}: ${error.message}`,
        exception instanceof Error
          ? exception.stack
          : JSON.stringify(exception),
      );
    } else if (statusCode >= 400) {
      this.logger.warn(
        `${method} ${path} - ${statusCode} ${error.code}: ${error.message}, `,
      );
    } else {
      this.logger.log(
        `${method} ${path} - ${statusCode} ${error.code}: ${error.message}`,
      );
    }
  }
}
