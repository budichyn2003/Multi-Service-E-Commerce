import { HttpException, HttpStatus } from '@nestjs/common';

export class ApiError extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super({ success: false, error: { code, message } }, statusCode);
    this.message = message;
  }

  static badRequest(message: string, code = 'VALIDATION_ERROR') {
    return new ApiError(code, message, HttpStatus.BAD_REQUEST);
  }

  static unauthorized(message = 'Unauthorized', code = 'UNAUTHORIZED') {
    return new ApiError(code, message, HttpStatus.UNAUTHORIZED);
  }

  static forbidden(message = 'Forbidden', code = 'FORBIDDEN') {
    return new ApiError(code, message, HttpStatus.FORBIDDEN);
  }

  static notFound(message = 'Resource not found', code = 'NOT_FOUND') {
    return new ApiError(code, message, HttpStatus.NOT_FOUND);
  }

  static conflict(message: string, code = 'CONFLICT') {
    return new ApiError(code, message, HttpStatus.CONFLICT);
  }

  static internal(message = 'Internal server error', code = 'INTERNAL') {
    return new ApiError(code, message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
