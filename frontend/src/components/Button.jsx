import styles from './Button.module.css';

export function Button({ children, variant = 'primary', type = 'button', className = '', ...props }) {
  return (
    <button
      type={type}
      className={`${styles.btn} ${styles[variant]} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
