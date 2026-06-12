import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

interface ErrorBody {
  statusCode: number;
  error: string;
  message: string;
  timestamp: string;
  path: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, message } = this.resolve(exception);

    const body: ErrorBody = {
      statusCode,
      error: HttpStatus[statusCode] ?? 'UNKNOWN',
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (statusCode >= 500) {
      this.logger.error({
        event: 'unhandled_exception',
        statusCode,
        path: request.url,
        method: request.method,
        error: exception instanceof Error ? exception.message : String(exception),
        stack: exception instanceof Error ? exception.stack : undefined,
      });
    } else {
      this.logger.warn({
        event: 'http_exception',
        statusCode,
        path: request.url,
        method: request.method,
        message,
      });
    }

    response.status(statusCode).json(body);
  }

  private resolve(exception: unknown): { statusCode: number; message: string } {
    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      const message =
        typeof res === 'object' && res !== null && 'message' in res
          ? Array.isArray((res as Record<string, unknown>)['message'])
            ? ((res as Record<string, unknown>)['message'] as string[]).join('; ')
            : String((res as Record<string, unknown>)['message'])
          : exception.message;
      return { statusCode: exception.getStatus(), message };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const prismaErr = exception as Prisma.PrismaClientKnownRequestError;
      // P2002 = unique constraint violation
      if (prismaErr.code === 'P2002') {
        return { statusCode: HttpStatus.CONFLICT, message: 'Resource already exists' };
      }
      // P2025 = record not found
      if (prismaErr.code === 'P2025') {
        return { statusCode: HttpStatus.NOT_FOUND, message: 'Resource not found' };
      }
      return { statusCode: HttpStatus.BAD_REQUEST, message: 'Database constraint violation' };
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return { statusCode: HttpStatus.BAD_REQUEST, message: 'Invalid data provided' };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    };
  }
}
