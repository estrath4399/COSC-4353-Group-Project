import { useState, useEffect } from 'react';
import { ListOrdered, UserCheck } from 'lucide-react';
import {
  getServices,
  getQueue,
  serveNext,
  removeUser,
  reorderQueue,
} from '../mock/api';
import { useNotification } from '../context/NotificationContext';
import { Card, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import styles from './QueueManagement.module.css';

export function QueueManagement() {
  const [services, setServices] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [queue, setQueue] = useState([]);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [loading, setLoading] = useState(false);
  const { addNotification } = useNotification();

  const notifyUser = (userId, message) => addNotification({ message, type: 'info' });

  const loadServices = () => getServices().then(setServices);
  const loadQueue = () => {
    if (!selectedId) return;
    getQueue(selectedId).then(setQueue);
  };

  useEffect(() => {
    loadServices();
  }, []);

  useEffect(() => {
    loadQueue();
  }, [selectedId]);

  const handleServeNext = async () => {
    if (!selectedId) return;
    setLoading(true);
    const served = await serveNext(selectedId, notifyUser);
    setLoading(false);
    if (served) {
      addNotification({ message: `Served ${served.userName}`, type: 'success' });
      loadQueue();
    }
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    setLoading(true);
    const ok = await removeUser(removeTarget.id, notifyUser);
    setLoading(false);
    setRemoveTarget(null);
    if (ok) {
      addNotification({ message: 'User removed from queue', type: 'info' });
      loadQueue();
    }
  };

  const handleReorder = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= queue.length) return;
    const next = [...queue];
    const [removed] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, removed);
    setQueue(next);
    reorderQueue(selectedId, next.map((e) => e.id));
  };

  const selected = services.find((s) => s.id === selectedId);

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>
        <ListOrdered size={28} className={styles.pageIcon} aria-hidden />
        Queue management
      </h1>
      <Card>
        <CardTitle>
          <ListOrdered size={20} aria-hidden />
          Select service
        </CardTitle>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className={styles.select}
        >
          <option value="">Select a service</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </Card>

      {selected && (
        <Card>
          <CardTitle>
            <ListOrdered size={20} aria-hidden />
            Queue for {selected.name}
          </CardTitle>
          <div className={styles.actions}>
            <Button
              variant="primary"
              onClick={handleServeNext}
              disabled={queue.length === 0 || loading}
            >
              <UserCheck size={18} aria-hidden />
              Serve next
            </Button>
          </div>
          {queue.length === 0 ? (
            <p className={styles.empty}>No one in queue.</p>
          ) : (
            <ul className={styles.queueList}>
              {queue.map((entry, i) => (
                <li key={entry.id} className={styles.queueItem}>
                  <span className={styles.dragHandle} aria-hidden>⋮⋮</span>
                  <div className={styles.entryInfo}>
                    <strong>{entry.userName}</strong>
                    <span className={styles.meta}>
                      {entry.priority} · joined {new Date(entry.joinedAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className={styles.entryActions}>
                    <Button
                      variant="outline"
                      onClick={() => setRemoveTarget(entry)}
                    >
                      Remove
                    </Button>
                    {i > 0 && (
                      <Button
                        variant="outline"
                        onClick={() => handleReorder(i, i - 1)}
                      >
                        ↑
                      </Button>
                    )}
                    {i < queue.length - 1 && (
                      <Button
                        variant="outline"
                        onClick={() => handleReorder(i, i + 1)}
                      >
                        ↓
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <Modal
        open={!!removeTarget}
        title="Remove user"
        onClose={() => setRemoveTarget(null)}
        actions={
          <>
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleRemove} disabled={loading}>
              Remove
            </Button>
          </>
        }
      >
        {removeTarget && (
          <p>
            Remove <strong>{removeTarget.userName}</strong> from the queue?
          </p>
        )}
      </Modal>
    </div>
  );
}
