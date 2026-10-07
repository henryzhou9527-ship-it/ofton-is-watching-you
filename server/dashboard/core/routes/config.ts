import { getSiteConfig } from "../services/site-config";
import { readSiteNickname } from "../services/site-nickname";

export async function handleConfig(): Promise<Response> {
  const nickname = await readSiteNickname();
  return Response.json({
    ...getSiteConfig(),
    ...(nickname ? {
      displayName: nickname,
      siteDescription: process.env.SITE_DESC?.trim() || `${nickname} 此刻正在做什么？`,
    } : {}),
    nicknameConfigured: nickname !== null,
  });
}
