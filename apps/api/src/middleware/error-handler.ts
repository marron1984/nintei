import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ApplicationError, ERROR_HTTP_STATUS } from '@nintei/shared';
import { randomUUID } from 'crypto';

export function errorHandler(
  error: FastifyError | ApplicationError | Error,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const requestId = randomUUID();

  request.log.error({
    requestId,
    error: error.message,
    stack: error.stack,
    url: request.url,
    method: request.method,
  });

  if (error instanceof ApplicationError) {
    return reply.status(error.httpStatus).send({
      success: false,
      error: error.toAppError(),
      requestId,
    });
  }

  // Fastify validation error
  if ('validation' in error && error.validation) {
    return reply.status(400).send({
      success: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: error.message,
        details: error.validation,
        timestamp: new Date(),
      },
      requestId,
    });
  }

  // Unknown error
  const statusCode = (error as FastifyError).statusCode ?? 500;
  return reply.status(statusCode).send({
    success: false,
    error: {
      code: 'SYSTEM_INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
      timestamp: new Date(),
    },
    requestId,
  });
}
