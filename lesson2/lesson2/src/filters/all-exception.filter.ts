import {
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

// Інтерфейс для відповіді з помилкою
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

// Нормалізована структура exception
interface NormalizedException {
  statusCode: number;
  code: string;
  message: string;
  details?: any;
}

@Catch() // ✅ Ловить ВСІ exception (без параметрів)
export class AllExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    // ✅ unknown, не ExceptionFilter

    console.error(exception);
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Витягуємо дані з request
    const requestId = (request as any).requestId || 'unknown';
    const timestamp = new Date().toISOString(); // ✅ ISO формат
    const path = request.url;
    const method = request.method;

    // Нормалізуємо exception до єдиного формату
    const { statusCode, code, message, details } =
      this.normalizeException(exception);

    // Формуємо payload
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

    // Логуємо помилку
    this.logException(exception, payload);

    // ✅ Відправляємо відповідь клієнту
    response.status(statusCode).json(payload);
  }

  // Метод для нормалізації різних типів exception
  private normalizeException(exception: unknown): NormalizedException {
    // 1. HttpException від NestJS
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      const statusCode = exception.getStatus();

      // Якщо response - об'єкт з деталями
      if (typeof response === 'object') {
        return {
          statusCode,
          code: (response as any).error || HttpStatus[statusCode],
          message: (response as any).message || exception.message,
          details: (response as any).details,
        };
      }

      // Якщо response - просто строка
      return {
        statusCode,
        code: HttpStatus[statusCode],
        message: typeof response === 'string' ? response : exception.message,
      };
    }

    // 2. Стандартні JavaScript Error
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

  // Метод для логування
  private logException(exception: unknown, payload: ErrorResponse): void {
    const { statusCode, error, method, path } = payload;

    // Різні рівні логування залежно від статус коду
    if (statusCode >= 500) {
      // Серверні помилки - error
      this.logger.error(
        `${method} ${path} - ${statusCode} ${error.code}: ${error.message}`,
        exception instanceof Error
          ? exception.stack
          : JSON.stringify(exception),
      );
    } else if (statusCode >= 400) {
      // Клієнтські помилки - warn
      this.logger.warn(
        `${method} ${path} - ${statusCode} ${error.code}: ${error.message}`,
      );
    } else {
      // Інші - log
      this.logger.log(
        `${method} ${path} - ${statusCode} ${error.code}: ${error.message}`,
      );
    }
  }
}
