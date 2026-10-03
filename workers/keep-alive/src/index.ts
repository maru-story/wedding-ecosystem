export interface Env {
  TARGET_URL?: string;
}

export interface ScheduledController {
  scheduledTime: number;
  cron: string;
}

export interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

export default {
  /**
   * Cron Trigger Handler (Automated ping every 10 minutes)
   */
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    const target = env.TARGET_URL || 'https://api.maruplanner.my.id/health';
    const start = Date.now();
    try {
      const response = await fetch(target, {
        headers: {
          'User-Agent': 'Cloudflare-Worker-KeepAlive/1.0',
        },
      });
      const latency = Date.now() - start;
      console.log(`[KeepAlive] Pinged ${target} -> Status: ${response.status} (${latency}ms)`);
    } catch (error) {
      console.error(`[KeepAlive] Error pinging ${target}:`, error);
    }
  },

  /**
   * HTTP Fetch Handler (Allows manual invocation and status checking)
   */
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const target = env.TARGET_URL || 'https://api.maruplanner.my.id/health';
    const start = Date.now();
    try {
      const response = await fetch(target, {
        headers: {
          'User-Agent': 'Cloudflare-Worker-KeepAlive/1.0',
        },
      });
      const latency = Date.now() - start;
      const data = await response.json().catch(() => null);

      return new Response(
        JSON.stringify(
          {
            success: response.ok,
            message: 'Keep-alive ping completed successfully',
            target,
            status: response.status,
            latencyMs: latency,
            targetData: data,
            cronSchedule: '*/10 * * * * (Every 10 minutes)',
            timestamp: new Date().toISOString(),
          },
          null,
          2
        ),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error: any) {
      return new Response(
        JSON.stringify(
          {
            success: false,
            error: error.message || 'Ping failed',
            target,
            timestamp: new Date().toISOString(),
          },
          null,
          2
        ),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  },
};
