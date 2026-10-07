import { Logger } from '@nestjs/common';
import { All, Controller, Inject, Param, Req, Res } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/nestjs-datapaas';
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { setPlatformDatabase } from './core/storage';
import { handleReport } from './core/routes/report';
import { handleCurrent } from './core/routes/current';
import { handleTimeline } from './core/routes/timeline';
import { handleHealth } from './core/routes/health';
import { handleHealthData, handleHealthDataQuery } from './core/routes/health-data';
import { handleHealthWebhook } from './core/routes/health-webhook';
import { handleConsentGet, handleConsentPost } from './core/routes/consent';
import { handleConfig } from './core/routes/config';
import { siteNicknameHandlers } from './core/routes/site-nickname';
import { handleProxy } from './core/routes/proxy';

@Controller('api')
export class DashboardController {
  constructor(@Inject(DRIZZLE_DATABASE) database: PostgresJsDatabase) {
    setPlatformDatabase(database);
  }

  @All(':endpoint')
  async handle(@Param('endpoint') endpoint: string, @Req() incoming: ExpressRequest, @Res() outgoing: ExpressResponse) {
    const query = incoming.originalUrl.includes('?') ? incoming.originalUrl.slice(incoming.originalUrl.indexOf('?')) : '';
    const url = new URL(`/api/${endpoint}${query}`, 'https://dashboard.invalid');
    const headers = new Headers();
    for (const name of ['authorization', 'content-type', 'user-agent']) {
      const value = incoming.headers[name];
      if (typeof value === 'string') headers.set(name, value);
    }
    const method = incoming.method;
    const request = new Request(url, {
      method, headers,
      ...(method !== 'GET' && method !== 'HEAD' ? { body: JSON.stringify(incoming.body ?? {}) } : {}),
    });
    let response: Response;
    try {
      if (method === 'OPTIONS') response = new Response(null, { status: 204 });
      else if (endpoint === 'report' && method === 'POST') response = await handleReport(request);
      else if (endpoint === 'current' && method === 'GET') {
        const address = incoming.headers['x-real-ip'];
        response = await handleCurrent(typeof address === 'string' ? address : incoming.ip || '', headers.get('user-agent') || undefined, url);
      }
      else if (endpoint === 'timeline' && method === 'GET') response = await handleTimeline(url);
      else if (endpoint === 'health' && method === 'GET') response = handleHealth();
      else if (endpoint === 'health-data' && method === 'GET') response = await handleHealthDataQuery(url);
      else if (endpoint === 'health-data' && method === 'POST') response = await handleHealthData(request);
      else if (endpoint === 'health-webhook' && method === 'POST') response = await handleHealthWebhook(request);
      else if (endpoint === 'consent' && method === 'GET') response = await handleConsentGet(request);
      else if (endpoint === 'consent' && method === 'POST') response = await handleConsentPost(request);
      else if (endpoint === 'config' && method === 'GET') response = await handleConfig();
      else if (endpoint === 'site-nickname' && method === 'GET') response = await siteNicknameHandlers.get(request);
      else if (endpoint === 'site-nickname' && method === 'POST') response = await siteNicknameHandlers.post(request);
      else if (endpoint === 'proxy' && method === 'GET') response = await handleProxy(url);
      else response = Response.json({ error: 'Not found' }, { status: 404 });
    } catch {
      Logger.error('[dashboard] Request failed', endpoint);
      response = Response.json({ error: 'Persistent storage unavailable' }, { status: 503 });
    }
    outgoing.status(response.status);
    response.headers.forEach((value, key) => outgoing.setHeader(key, value));
    outgoing.setHeader('Cache-Control', 'no-store');
    outgoing.setHeader('X-Content-Type-Options', 'nosniff');
    outgoing.setHeader('Referrer-Policy', 'no-referrer');
    outgoing.setHeader('Access-Control-Allow-Origin', '*');
    outgoing.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    outgoing.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  }
}
