import type { HTMLAttributes } from "react";
import styles from "./Sheet.module.css";

export function Sheet({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={[styles.sheet, className].filter(Boolean).join(" ")} {...props}>
      {children}
    </div>
  );
}
