import { getEnv } from '../config/env.js';
import { markOfflineStale } from '../repositories/robot.repository.js';
export function runRobotOfflineJob() { return markOfflineStale(new Date(Date.now() - getEnv().ROBOT_OFFLINE_TIMEOUT_SECONDS * 1000)); }
