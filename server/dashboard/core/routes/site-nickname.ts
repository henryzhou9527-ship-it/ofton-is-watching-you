import { authenticateToken } from '../middleware/auth';
import { getSiteConfig } from '../services/site-config';
import { readSiteNickname, writeSiteNickname } from '../services/site-nickname';

type Dependencies = {
  authenticate: (header: string | null) => boolean;
  read: () => Promise<string | null>;
  write: (name: string) => Promise<void>;
  defaultName: () => string;
};

// The paired client uses its existing device credential. Public viewers only read /api/config.
export function createNicknameHandlers(deps: Dependencies) {
  return {
    async get(request: Request): Promise<Response> {
      if (!deps.authenticate(request.headers.get('authorization'))) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return Response.json({ displayName: await deps.read() ?? deps.defaultName() });
    },
    async post(request: Request): Promise<Response> {
      if (!deps.authenticate(request.headers.get('authorization'))) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
      let body: unknown;
      try { body = await request.json(); }
      catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }
      const value = body && typeof body === 'object' && !Array.isArray(body)
        ? (body as Record<string, unknown>).displayName : undefined;
      if (typeof value !== 'string' || /[\u0000-\u001f\u007f]/.test(value)) {
        return Response.json({ error: 'Invalid nickname' }, { status: 400 });
      }
      const name = value.trim();
      if (!name || Array.from(name).length > 24) {
        return Response.json({ error: 'Nickname must be 1 to 24 characters' }, { status: 400 });
      }
      await deps.write(name);
      return Response.json({ ok: true, displayName: name });
    },
  };
}

export const siteNicknameHandlers = createNicknameHandlers({
  authenticate: header => authenticateToken(header) !== null,
  read: readSiteNickname,
  write: writeSiteNickname,
  defaultName: () => getSiteConfig().displayName,
});
