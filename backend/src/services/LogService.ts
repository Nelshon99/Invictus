import prisma from '../utils/database';
import { getRedisClient, setCache, getCache } from '../utils/redis';

// TTL en segundos para logs en Redis (30 días)
const LOG_TTL_SECONDS = 30 * 24 * 60 * 60;

export interface LogEntry {
  action: string;
  entity: string;
  entityId?: string;
  details?: string;
  operator: string;
  ipAddress?: string;
  userAgent?: string;
}

export class LogService {
  async logEvent(entry: LogEntry): Promise<void> {
    try {
      // Guardar en PostgreSQL para persistencia
      await prisma.auditLog.create({
        data: {
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId,
          details: entry.details,
          operator: entry.operator,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
        },
      });

      // Guardar en Redis para acceso rápido (si está disponible)
      const client = getRedisClient();
      if (client) {
        const logKey = `log:${Date.now()}:${Math.random().toString(36).substring(2, 9)}`;
        await setCache(logKey, JSON.stringify({ ...entry, timestamp: new Date().toISOString() }), LOG_TTL_SECONDS);
        await client.lpush('logs:stream', JSON.stringify({ ...entry, timestamp: new Date().toISOString() }));
        await client.ltrim('logs:stream', 0, 9999); // Mantener máximo 10,000 logs en memoria
      }
    } catch (error) {
      console.error('Error logging event:', error);
    }
  }

  async getRecentLogs(limit: number = 100): Promise<any[]> {
    try {
      const client = getRedisClient();
      if (!client) return [];
      const logs = await client.lrange('logs:stream', 0, limit - 1);
      return logs.map(log => JSON.parse(log));
    } catch (error) {
      console.error('Error getting recent logs:', error);
      return [];
    }
  }

  async getLogsByEntity(entity: string, limit: number = 50) {
    const logs = await prisma.auditLog.findMany({
      where: { entity },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return logs;
  }

  async getLogsByOperator(operator: string, limit: number = 50) {
    const logs = await prisma.auditLog.findMany({
      where: { operator },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return logs;
  }

  async getLogsByDateRange(startDate: Date, endDate: Date, limit: number = 100) {
    const logs = await prisma.auditLog.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return logs;
  }

  async getTodayLogs() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const logs = await prisma.auditLog.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return logs;
  }

  async archiveOldLogs(daysOld: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const count = await prisma.auditLog.count({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    // Los logs antiguos se mantienen en PostgreSQL para historial
    // Solo se limpian los logs de Redis
    try {
      const client = getRedisClient();
      if (client) {
        await client.del('logs:stream');
      }
    } catch (error) {
      console.error('Error archiving logs from Redis:', error);
    }

    return count;
  }
}

export const logService = new LogService();
