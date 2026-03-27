import { getRequestSurface } from "@/lib/request-surface";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage() {
  const { isSocial } = await getRequestSurface();
  return <LoginForm entryVariant={isSocial ? "social" : "default"} />;
}
