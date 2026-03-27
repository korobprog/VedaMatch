import { getRequestSurface } from "@/lib/request-surface";
import { RegisterForm } from "@/components/register-form";

export default async function RegisterPage() {
  const { isSocial } = await getRequestSurface();
  return <RegisterForm entryVariant={isSocial ? "social" : "default"} />;
}
