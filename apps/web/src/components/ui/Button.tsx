import type { ButtonHTMLAttributes } from "react";
import styles from "./Button.module.css";

type Variant = "primary" | "dark" | "ghost";

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const variantClass =
    variant === "dark"
      ? styles.dark
      : variant === "ghost"
        ? styles.ghost
        : styles.primary;
  return (
    <button
      type="button"
      className={[variantClass, className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}
