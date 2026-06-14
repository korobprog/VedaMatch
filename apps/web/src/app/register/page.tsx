import { getRequestSurface } from "@/lib/request-surface";
import { getMobileAppConfig } from "@/lib/mobile-app-config";
import { RegisterForm } from "@/components/register-form";

export default async function RegisterPage() {
  const { host, isSocial, isUnion } = await getRequestSurface();
  const mobileAppConfig = await getMobileAppConfig(host);

  return <RegisterForm entryVariant={isUnion ? "union" : isSocial ? "social" : "default"} mobileAppConfig={mobileAppConfig} />;
}
