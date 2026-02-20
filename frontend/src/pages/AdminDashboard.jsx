import { useState, useEffect } from 'react';
import { LayoutDashboard, Settings, Users } from 'lucide-react';
import { getServices, getQueue, setServiceOpen } from '../mock/api';
import { Card, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import styles from './AdminDashboard.module.css';

export function AdminDashboard() {
  const [services, setServices] = useState([]);
  const [queueLengths, setQueueLengths] = useState({});
  const [toggling, setToggling] = useState(null);

  const refreshQueueLengths = (list) => {
    list.forEach((s) => {
      getQueue(s.id).then((q) => setQueueLengths((prev) => ({ ...prev, [s.id]: q.length })));
    });
  };

  useEffect(() => {
    getServices().then((list) => {
      setServices(list);
      refreshQueueLengths(list);
    });
  }, []);

  const handleToggle = async (service) => {
    setToggling(service.id);
    await setServiceOpen(service.id, !service.isOpen);
    getServices().then((list) => {
      setServices(list);
      refreshQueueLengths(list);
      setToggling(null);
    });
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>
        <LayoutDashboard size={28} className={styles.pageIcon} aria-hidden />
        Admin dashboard
      </h1>
      <p className={styles.subtitle}>Manage services and queues.</p>
      <div className={styles.grid}>
        {services.map((s) => (
          <Card key={s.id} className={styles.serviceCard}>
            <CardTitle>
              <Settings size={20} aria-hidden />
              {s.name}
            </CardTitle>
            <p className={styles.meta}>{s.description}</p>
            <p className={styles.queueLen}>
              <Users size={16} className={styles.queueIcon} aria-hidden />
              Queue: {queueLengths[s.id] ?? 0} waiting
            </p>
            <Button
              variant={s.isOpen ? 'danger' : 'secondary'}
              onClick={() => handleToggle(s)}
              disabled={toggling === s.id}
            >
              {s.isOpen ? 'Close queue' : 'Open queue'}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
