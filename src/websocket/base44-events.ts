import { socketServer } from './socket-server.js';
export function emitBase44Event(event: string, payload: unknown) { socketServer()?.to('role:base44').emit(event, payload); }
