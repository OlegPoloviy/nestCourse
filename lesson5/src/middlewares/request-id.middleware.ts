import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';

export const REQUEST_ID = 'x-request-id';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // Отримуємо header (може бути string | string[] | undefined)
    const incoming = req.headers[REQUEST_ID];

    // Нормалізуємо до string
    let headerValue: string | undefined;
    if (Array.isArray(incoming)) {
      headerValue = incoming[0]; // Беремо перше значення
    } else {
      headerValue = incoming;
    }

    // Генеруємо або використовуємо існуючий ID
    const requestId =
      headerValue && headerValue.trim().length > 0 ? headerValue : randomUUID();

    // Зберігаємо в request
    req.requestId = requestId;

    // Додаємо в response headers
    res.setHeader(REQUEST_ID, requestId);

    next();
  }
}
