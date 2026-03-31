import { ReactNode } from 'react';
import LilaAdminShell from '@/components/games/lila/LilaAdminShell';

export default function LilaLayout({ children }: { children: ReactNode }) {
  return <LilaAdminShell>{children}</LilaAdminShell>;
}
