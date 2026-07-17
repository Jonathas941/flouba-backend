import type { RequestHandler } from 'express';
import { validate as isUuid, v4 as uuidv4 } from 'uuid';

export const requestIdMiddleware: RequestHandler = (req, res, next) => {
  const provided = req.header('x-request-id');
  const requestId = provided && isUuid(provided) ? provided : uuidv4();
  req.requestId = requestId;
  res.locals.requestId = requestId;
  res.locals.startTime = Date.now();
  res.setHeader('x-request-id', requestId);
  next();
};
