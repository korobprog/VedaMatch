import { headers } from 'next/headers';
import LkmCabinetClient from '@/components/lkm-cabinet-client';
import { resolveLkmHostConfig } from '@/lib/host-config';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const headerStore = await headers();
  const host = headerStore.get('x-forwarded-host') || headerStore.get('host') || '';
  const config = resolveLkmHostConfig(host);

  return (
    <LkmCabinetClient
      initialHost={config.host}
      initialRegion={config.region}
      initialCurrency={config.currency}
      initialGatewayCode={config.gatewayCode}
      apiBaseUrl={config.apiBaseUrl}
    />
  );
}
