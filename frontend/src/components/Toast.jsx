import { useNotification } from '../context/NotificationContext';
import styles from './Toast.module.css';

function ToastItem({ n, removeNotification, placement }) {
  return (
    <div
      className={`${styles.toast} ${styles[n.type] || ''} ${placement === 'top' ? styles.toastTop : ''}`}
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
  );
}

export function Toast() {
  const { notifications, removeNotification } = useNotification();

  const top = notifications.filter((n) => n.placement === 'top');
  const bottom = notifications.filter((n) => n.placement !== 'top');

  if (notifications.length === 0) return null;

  return (
    <>
      {top.length > 0 && (
        <div className={styles.containerTop} role="region" aria-label="Priority reminders">
          {top.map((n) => (
            <ToastItem key={n.id} n={n} removeNotification={removeNotification} placement="top" />
          ))}
        </div>
      )}
      {bottom.length > 0 && (
        <div className={styles.container} role="region" aria-label="Notifications">
          {bottom.map((n) => (
            <ToastItem key={n.id} n={n} removeNotification={removeNotification} placement="bottom" />
          ))}
        </div>
      )}
    </>
  );
}
