import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Clock, Zap, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getServices, getMyQueueSlot, joinQueue, leaveQueue } from '../mock/api';
import { Card, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import styles from './JoinQueue.module.css';

export function JoinQueue() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [currentEntry, setCurrentEntry] = useState(null);
  const [loading, setLoading] = useState(false);

  const selected = services.find((s) => s.id === selectedId);

  useEffect(() => {
    let cancelled = false;
    getServices().then((list) => {
      if (cancelled) return;
      const open = list.filter((s) => s.isOpen);
      setServices(open);
      if (open.length) setSelectedId((prev) => prev || open[0].id);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!selectedId || !user) return;
      const { entry } = await getMyQueueSlot(user.id, selectedId);
      if (!cancelled) setCurrentEntry(entry || null);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId, user]);

  const handleJoin = async () => {
    if (!selectedId) return;
    setLoading(true);
    const entry = await joinQueue(selectedId, user.id, user.name);
    setLoading(false);
    if (entry) {
      setCurrentEntry(entry);
      navigate(`/queue/${selectedId}`);
    }
  };

  const handleLeave = async () => {
    if (!currentEntry) return;
    setLoading(true);
    const ok = await leaveQueue(currentEntry.id);
    setLoading(false);
    if (ok) setCurrentEntry(null);
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>
        <Users size={28} className={styles.pageIcon} aria-hidden />
        Join a queue
      </h1>
      <Card>
        <CardTitle>
          <Users size={20} aria-hidden />
          Select service
        </CardTitle>
        <div className={styles.form}>
          <label htmlFor="service-select" className={styles.label}>Service</label>
          <select
            id="service-select"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className={styles.select}
          >
            <option value="">Select a service</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {selected && (
            <div className={styles.meta}>
              <p>
                <Clock size={16} className={styles.metaIcon} aria-hidden />
                Estimated wait: ~{selected.estimatedWaitMinutes} minutes
              </p>
              <p>
                <Zap size={16} className={styles.metaIcon} aria-hidden />
                Priority level: {selected.priorityLevel}
              </p>
            </div>
          )}
          {currentEntry ? (
            <div className={styles.actions}>
              <p className={styles.inQueue}>You are in this queue.</p>
              <Button variant="outline" onClick={handleLeave} disabled={loading}>
                Leave queue
              </Button>
              <Button variant="primary" onClick={() => navigate(`/queue/${selectedId}`)}>
                View status
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="primary"
              onClick={handleJoin}
              disabled={!selectedId || loading}
              className={styles.joinBtn}
            >
              <UserPlus size={18} aria-hidden />
              Join queue
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
