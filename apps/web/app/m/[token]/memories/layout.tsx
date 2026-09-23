import styles from "@/src/components/memories/memories.module.css";

export default function PhotoMemoriesLayout({ children }: { children: React.ReactNode }) {
  return <div className={styles.shell}>{children}</div>;
}
