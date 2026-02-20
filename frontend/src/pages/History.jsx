import { useState, useEffect } from 'react';
import { History as HistoryIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getHistory } from '../mock/api';
import { Card, CardTitle } from '../components/Card';
import styles from './History.module.css';

function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { dateStyle: 'medium' }) + ' ' + d.toLocaleTimeString(undefined, { timeStyle: 'short' });
  } catch {
    return iso;
  }
}

export function History() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);

  useEffect(() => {
    getHistory(user.id).then(setItems);
  }, [user.id]);

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>
        <HistoryIcon size={28} className={styles.pageIcon} aria-hidden />
        History
      </h1>
      <Card>
        <CardTitle>
          <HistoryIcon size={20} aria-hidden />
          Past queues
        </CardTitle>
        {items.length === 0 ? (
          <p className={styles.empty}>No history yet.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Service</th>
                  <th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id}>
                    <td>{formatDate(row.date)}</td>
                    <td>{row.serviceName}</td>
                    <td>{row.outcome}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {items.length > 0 && (
      <div className={styles.cards}>
        {items.map((row) => (
          <div key={row.id} className={styles.cardItem}>
            <div className={styles.cardDate}>{formatDate(row.date)}</div>
            <div className={styles.cardService}>{row.serviceName}</div>
            <div className={styles.cardOutcome}>{row.outcome}</div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}
