import styles from './Input.module.css';

export function Input({ label, error, id, className = '', ...props }) {
  const inputId = id || `input-${Math.random().toString(36).slice(2, 9)}`;
  return (
    <div className={`${styles.wrap} ${className}`.trim()}>
      {label && <label htmlFor={inputId} className={styles.label}>{label}</label>}
      <input id={inputId} className={styles.input} {...props} />
      {error && <span className={styles.error} role="alert">{error}</span>}
    </div>
  );
}
