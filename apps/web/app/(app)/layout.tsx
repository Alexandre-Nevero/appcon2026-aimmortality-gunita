import Link from "next/link";
import { DotGrid } from "@/src/components/ui/DotGrid";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <DotGrid className="appShell">
      <Link href="/home/settings" className="appShellMenu" aria-label="Settings">
        ⋯
      </Link>
      {children}
    </DotGrid>
  );
}
