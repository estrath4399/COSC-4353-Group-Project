import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Clock, ListOrdered, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getService, getMyQueueSlot, leaveQueue } from '../mock/api';
import { Card, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import styles from './QueueStatus.module.css';

const POLL_INTERVAL = 15000;

const STEPS = [
  { key: 'waiting', label: 'Waiting' },
  { key: 'almost_ready', label: 'Almost ready' },
  { key: 'served', label: 'Served' },
];

export function QueueStatus() {
  const { serviceId } = useParams();
  const { user } = useAuth();
  const [service, setService] = useState(null);
  const [entry, setEntry] = useState(null);
  const [position, setPosition] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!serviceId) return;
      const s = await getService(serviceId);
      if (!cancelled) setService(s);
    })();
    return () => { cancelled = true; };
  }, [serviceId]);

  const refreshStatus = useCallback(async () => {
    if (!serviceId || !user) return;
    const { entry: e, position: pos } = await getMyQueueSlot(user.id, serviceId);
    setEntry(e || null);
    setPosition(pos);
    setLastRefresh(new Date());
  }, [serviceId, user]);

  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [refreshStatus]);

  const handleLeave = async () => {
    if (!entry) return;
    setShowLeaveModal(false);
    setLoading(true);
    const ok = await leaveQueue(entry.id);
    setLoading(false);
    if (ok) {
      setEntry(null);
      setPosition(null);
    }
  };

  if (!service) return <div className={styles.page}>Loading…</div>;
  if (!entry) {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>
          <ListOrdered size={28} className={styles.pageIcon} aria-hidden />
          Queue status
        </h1>
        <Card>
          <p>You are not in this queue.</p>
          <Link to={`/join-queue?service=${encodeURIComponent(serviceId)}`}>Join queue</Link>
        </Card>
      </div>
    );
  }

  const stepIndex = Math.max(0, STEPS.findIndex((s) => s.key === entry.status));
  const estimatedWait = position && service ? (position - 1) * service.expectedDurationMinutes : 0;

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>
        <ListOrdered size={28} className={styles.pageIcon} aria-hidden />
        {service.name} — Queue status
      </h1>
      <Card>
        <CardTitle>
          <ListOrdered size={20} aria-hidden />
          Your position
        </CardTitle>
        <p className={styles.position}>
          You are <strong>#{position}</strong> in line.
        </p>
        <p className={styles.wait}>
          <Clock size={16} className={styles.waitIcon} aria-hidden />
          Estimated wait: ~{estimatedWait} minutes
        </p>

        <div className={styles.timeline} role="list" aria-label="Queue status">
          {STEPS.map((step, i) => (
            <div
              key={step.key}
              className={`${styles.step} ${i <= stepIndex ? styles.stepActive : ''}`}
              role="listitem"
            >
              <span className={styles.stepDot} />
              <span className={styles.stepLabel}>{step.label}</span>
              {i < STEPS.length - 1 && <span className={styles.stepLine} />}
            </div>
          ))}
        </div>

        <div className={styles.statusFooter}>
          <Button variant="outline" onClick={() => setShowLeaveModal(true)} disabled={loading} className={styles.leaveBtn}>
            Leave queue
          </Button>
          <button type="button" className={styles.refreshBtn} onClick={refreshStatus} title="Refresh now">
            <RefreshCw size={14} aria-hidden />
            {lastRefresh && (
              <span className={styles.refreshHint}>
                Updated {lastRefresh.toLocaleTimeString(undefined, { timeStyle: 'short' })}
              </span>
            )}
          </button>
        </div>
      </Card>

      <Modal
        open={showLeaveModal}
        title="Leave queue?"
        onClose={() => setShowLeaveModal(false)}
        actions={
          <>
            <Button variant="outline" onClick={() => setShowLeaveModal(false)}>
              Stay in queue
            </Button>
            <Button variant="danger" onClick={handleLeave} disabled={loading}>
              Leave queue
            </Button>
          </>
        }
      >
        <p>
          You are currently <strong>#{position}</strong> in line for{' '}
          <strong>{service.name}</strong>. If you leave, you will lose your place.
        </p>
      </Modal>
    </div>
  );
}
