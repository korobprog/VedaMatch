import { AppFrame } from "@/components/app-frame";
import { UnionAppFrame } from "@/components/union-app-frame";
import { getRequestSurface } from "@/lib/request-surface";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { isUnion } = await getRequestSurface();
  return isUnion ? <UnionAppFrame>{children}</UnionAppFrame> : <AppFrame>{children}</AppFrame>;
}
