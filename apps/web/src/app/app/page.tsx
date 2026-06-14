import { redirect } from "next/navigation";
import { SocialAppHome } from "@/components/social-app-home";
import { getRequestSurface } from "@/lib/request-surface";

export default async function AppHomePage() {
  const { isUnion } = await getRequestSurface();
  if (isUnion) {
    redirect("/app/union");
  }

  return <SocialAppHome />;
}
