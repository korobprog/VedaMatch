import { headers } from 'next/headers';
import TelegramAuthMiniAppClient from '@/components/telegram-auth-mini-app-client';
import { resolveLkmHostConfig } from '@/lib/host-config';

export const dynamic = 'force-dynamic';

export default async function TelegramAuthPage() {
  const headerStore = await headers();
  const host = headerStore.get('x-forwarded-host') || headerStore.get('host') || '';
  const config = resolveLkmHostConfig(host);

  return (
    <TelegramAuthMiniAppClient apiBaseUrl={config.apiBaseUrl} />
  );
}
