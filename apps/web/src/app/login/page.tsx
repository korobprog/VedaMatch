import { getRequestSurface } from "@/lib/request-surface";
import { getMobileAppConfig } from "@/lib/mobile-app-config";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage() {
  const { host, isSocial } = await getRequestSurface();
  const mobileAppConfig = await getMobileAppConfig(host);

  return <LoginForm entryVariant={isSocial ? "social" : "default"} mobileAppConfig={mobileAppConfig} />;
}
