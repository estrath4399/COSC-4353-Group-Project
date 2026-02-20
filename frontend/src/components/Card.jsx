import styles from './Card.module.css';

export function Card({ children, className = '', ...props }) {
  return (
    <div className={`${styles.card} ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '' }) {
  return <h2 className={`${styles.title} ${className}`.trim()}>{children}</h2>;
}
