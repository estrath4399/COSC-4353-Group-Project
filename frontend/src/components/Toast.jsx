import { useNotification } from '../context/NotificationContext';
import styles from './Toast.module.css';

export function Toast() {
  const { notifications, removeNotification } = useNotification();

  if (notifications.length === 0) return null;

  return (
    <div className={styles.container} role="region" aria-label="Notifications">
      {notifications.map((n) => (
        <div
          key={n.id}
          className={`${styles.toast} ${styles[n.type] || ''}`}
          role="alert"
        >
          <span>{n.message}</span>
          <button
            type="button"
            className={styles.dismiss}
            onClick={() => removeNotification(n.id)}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
