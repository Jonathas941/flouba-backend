import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { buildCorsOptions } from './config/cors.js';
import { getEnv } from './config/env.js';
import { MAX_JSON_BODY_BYTES } from './config/constants.js';
import { auditMiddleware } from './middleware/audit.middleware.js';
import { errorHandler } from './middleware/error-handler.middleware.js';
import { notFoundMiddleware } from './middleware/not-found.middleware.js';
import { requestIdMiddleware } from './middleware/request-id.middleware.js';
import { router } from './routes/index.js';

export function createApp(): Express {
  const app = express();
  app.disable('x-powered-by');
  if (getEnv().TRUST_PROXY) {
    app.set('trust proxy', 1);
  }
  app.use(helmet());
  app.use(cors(buildCorsOptions()));
  app.use(express.json({ limit: MAX_JSON_BODY_BYTES }));
  app.use(requestIdMiddleware);
  app.use(auditMiddleware);
  app.use(router);
  app.use(notFoundMiddleware);
  app.use(errorHandler);
  return app;
}
