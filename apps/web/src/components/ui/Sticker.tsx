import type { HTMLAttributes } from "react";
import styles from "./Sticker.module.css";

export function Sticker({
  label,
  highlight,
  rotate = 0,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  label: string;
  highlight?: boolean;
  rotate?: number;
}) {
  return (
    <div
      className={[styles.sticker, highlight ? styles.highlight : "", className]
        .filter(Boolean)
        .join(" ")}
      style={{ transform: `rotate(${rotate}deg)` }}
      {...props}
    >
      {children}
      <span>{label}</span>
    </div>
  );
}
