import { DotGrid } from "@/src/components/ui/DotGrid";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <DotGrid className="appShell">{children}</DotGrid>;
}
