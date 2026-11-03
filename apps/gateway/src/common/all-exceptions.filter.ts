import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiError } from './api-error';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId =
      (request.headers['x-request-id'] as string) ||
      (request as any).requestId ||
      '';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL';
    let message = 'An unexpected internal error occurred';

    if (exception instanceof ApiError) {
      status = exception.getStatus();
      code = exception.code;
      message = exception.message;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        const errorObj = res as any;
        if (errorObj.error && typeof errorObj.error === 'object') {
          code = errorObj.error.code || code;
          message = errorObj.error.message || message;
        } else {
          message = Array.isArray(errorObj.message)
            ? errorObj.message.join(', ')
            : errorObj.message || exception.message;
          if (status === 400) code = 'VALIDATION_ERROR';
          else if (status === 401) code = 'UNAUTHORIZED';
          else if (status === 403) code = 'FORBIDDEN';
          else if (status === 404) code = 'NOT_FOUND';
          else if (status === 409) code = 'CONFLICT';
          else if (status === 429) code = 'RATE_LIMITED';
        }
      } else {
        message = String(res);
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled error: ${exception.message}`, exception.stack);
    }

    response.status(status).json({
      success: false,
      error: {
        code,
        message,
        requestId,
      },
    });
  }
}

