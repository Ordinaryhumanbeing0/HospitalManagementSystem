import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const startTime = Date.now();
  try {
    // Ping Neon PostgreSQL database
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - startTime;

    return NextResponse.json(
      {
        status: 'HEALTHY',
        database: {
          status: 'CONNECTED',
          provider: 'PostgreSQL (Neon)',
          latencyMs,
        },
        system: {
          uptimeSeconds: Math.floor(process.uptime()),
          nodeVersion: process.version,
          memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          timestamp: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    return NextResponse.json(
      {
        status: 'DEGRADED',
        database: {
          status: 'DISCONNECTED',
          error: error.message || 'Database ping failed',
          latencyMs,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
