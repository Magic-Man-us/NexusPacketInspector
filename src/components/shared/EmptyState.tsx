import { styles } from "../../styles/components";

interface EmptyStateProps {
  icon: string;
  message: string;
  subtext?: string;
}

export function EmptyState({ icon, message, subtext }: EmptyStateProps) {
  return (
    <div style={styles.emptyState}>
      <div style={styles.emptyIcon}>{icon}</div>
      <div>{message}</div>
      {subtext && <div style={styles.emptySubtext}>{subtext}</div>}
    </div>
  );
}
