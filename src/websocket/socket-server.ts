import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { getEnv } from '../config/env.js';
import { verifySocketToken, type SocketPrincipal } from './socket-auth.js';
let io: Server | null = null;
export function createSocketServer(server: HttpServer) {
  if (!getEnv().ENABLE_WEBSOCKET) return null;
  io = new Server(server, { cors: { origin: getEnv().ALLOWED_ORIGINS, credentials: true } });
  io.use((socket, next) => { try { socket.data.principal = verifySocketToken(String(socket.handshake.auth.token ?? '')); next(); } catch (error) { next(error as Error); } });
  io.on('connection', (socket) => { const p = socket.data.principal as SocketPrincipal; socket.join(`role:${p.role}`); if (p.robotId) socket.join(`robot:${p.robotId}`); });
  return io;
}
export function socketServer() { return io; }
