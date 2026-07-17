import { socketServer } from './socket-server.js';
export function emitRobotStatus(robotId: string, payload: unknown) { socketServer()?.to(`robot:${robotId}`).emit('robot:status', payload); socketServer()?.to('role:base44').emit('robot:status', payload); }
export function emitHeartbeat(robotId: string, payload: unknown) { socketServer()?.to(`robot:${robotId}`).emit('robot:heartbeat', payload); }
export function emitCommand(robotId: string, payload: unknown) { socketServer()?.to(`robot:${robotId}`).emit('command:update', payload); socketServer()?.to('role:base44').emit('command:update', payload); }
export function emitEmergency(robotId: string, payload: unknown) { socketServer()?.to(`robot:${robotId}`).emit('robot:emergency', payload); socketServer()?.to('role:base44').emit('robot:emergency', payload); }
