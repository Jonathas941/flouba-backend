import type { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
export function recordSecurityEvent(data: Prisma.SecurityEventUncheckedCreateInput) { return prisma.securityEvent.create({ data }); }
