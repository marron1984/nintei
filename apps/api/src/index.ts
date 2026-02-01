import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { authRoutes } from './routes/auth.js';
import { userRoutes } from './routes/users.js';
import { workerRoutes } from './routes/workers.js';
import { companyRoutes } from './routes/companies.js';
import { supportPlanRoutes } from './routes/support-plans.js';
import { interviewRoutes } from './routes/interviews.js';
import { consultationRoutes } from './routes/consultations.js';
import { documentRoutes } from './routes/documents.js';
import { auditRoutes } from './routes/audit.js';
import { supportTaskRoutes } from './routes/support-tasks.js';
import { errorHandler } from './middleware/error-handler.js';
import { prisma } from './lib/prisma.js';

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const HOST = process.env.HOST ?? '0.0.0.0';

async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport:
        process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
  });

  // Plugins
  await fastify.register(cors, {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  });

  await fastify.register(helmet);

  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
  });

  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // Swagger
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'Nintei API',
        description: '登録支援機関DX API',
        version: '0.1.0',
      },
      servers: [
        {
          url: `http://localhost:${PORT}`,
          description: 'Development server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
  });

  // Error handler
  fastify.setErrorHandler(errorHandler);

  // Health check
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Routes
  await fastify.register(authRoutes, { prefix: '/api/auth' });
  await fastify.register(userRoutes, { prefix: '/api/users' });
  await fastify.register(workerRoutes, { prefix: '/api/workers' });
  await fastify.register(companyRoutes, { prefix: '/api/companies' });
  await fastify.register(supportPlanRoutes, { prefix: '/api/support-plans' });
  await fastify.register(interviewRoutes, { prefix: '/api/interviews' });
  await fastify.register(consultationRoutes, { prefix: '/api/consultations' });
  await fastify.register(documentRoutes, { prefix: '/api/documents' });
  await fastify.register(auditRoutes, { prefix: '/api/audit' });

  // V2 Routes (UseCase-based)
  await fastify.register(supportTaskRoutes, { prefix: '/api/v2' });

  return fastify;
}

async function main() {
  const server = await buildServer();

  // Graceful shutdown
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  signals.forEach((signal) => {
    process.on(signal, async () => {
      server.log.info(`Received ${signal}, shutting down...`);
      await server.close();
      await prisma.$disconnect();
      process.exit(0);
    });
  });

  try {
    await server.listen({ port: PORT, host: HOST });
    server.log.info(`🚀 Server listening on http://${HOST}:${PORT}`);
    server.log.info(`📚 API Documentation: http://${HOST}:${PORT}/docs`);
  } catch (err) {
    server.log.error(err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
