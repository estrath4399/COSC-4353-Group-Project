import { useEffect } from 'react';
import { Button } from './Button';
import styles from './Modal.module.css';

export function Modal({ open, title, children, onClose, actions }) {
  useEffect(() => {
    if (open) {
      const handle = (e) => e.key === 'Escape' && onClose?.();
      document.addEventListener('keydown', handle);
      return () => document.removeEventListener('keydown', handle);
    }
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {title && <h2 id="modal-title" className={styles.title}>{title}</h2>}
        <div className={styles.body}>{children}</div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </div>
  );
}
