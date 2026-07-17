import type { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
export function recordAudit(data: Prisma.AuditLogUncheckedCreateInput) { return prisma.auditLog.create({ data }); }
