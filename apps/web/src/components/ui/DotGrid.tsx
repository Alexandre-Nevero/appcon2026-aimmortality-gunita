import type { HTMLAttributes } from "react";

export function DotGrid({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={["dot-grid", className].filter(Boolean).join(" ")} {...props}>
      {children}
    </div>
  );
}
