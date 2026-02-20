import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Briefcase, Bell, GraduationCap, DollarSign, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getServices, getQueueEntryByUserAndService, getUserPositionInQueue } from '../mock/api';
import { Card, CardTitle } from '../components/Card';
import styles from './UserDashboard.module.css';

function ServiceIcon({ name }) {
  const props = { size: 20, className: styles.serviceIcon, 'aria-hidden': true };
  if (name.toLowerCase().includes('advis')) return <GraduationCap {...props} />;
  if (name.toLowerCase().includes('financial')) return <DollarSign {...props} />;
  if (name.toLowerCase().includes('registrar')) return <FileText {...props} />;
  return <Briefcase {...props} />;
}

export function UserDashboard() {
  const { user } = useAuth();
  const [services, setServices] = useState([]);
  const [queueStatus, setQueueStatus] = useState(null);
  const [notifications, setNotifications] = useState([
    'Your turn is next!',
    'Queue delayed by 5 minutes',
  ]);

  useEffect(() => {
    getServices().then((list) => {
      setServices(list.filter((s) => s.isOpen));
      const inQueue = list
        .map((s) => {
          const entry = getQueueEntryByUserAndService(user.id, s.id);
          if (!entry) return null;
          const pos = getUserPositionInQueue(s.id, user.id);
          return { service: s, position: pos, entry };
        })
        .filter(Boolean);
      setQueueStatus(inQueue[0] || null);
    });
  }, [user.id]);

  return (
    <div className={styles.page}>
      <div className={styles.welcomeBanner}>
        <div className={styles.welcomeContent}>
          <h1 className={styles.heading}>Dashboard</h1>
          <p className={styles.greeting}>Hello, {user.name}. Welcome back.</p>
        </div>
        <div className={styles.welcomeImage}>
          <img src="/images/dashboard-welcome.png" alt="Student community" />
        </div>
      </div>

      {queueStatus && (
        <Card className={styles.overview}>
          <CardTitle>
            <ClipboardList size={20} aria-hidden />
            Current queue
          </CardTitle>
          <p className={styles.queueOverview}>
            You are <strong>{queueStatus.position}{queueStatus.position === 1 ? 'st' : queueStatus.position === 2 ? 'nd' : queueStatus.position === 3 ? 'rd' : 'th'}</strong> in line for {queueStatus.service.name}.
          </p>
          <Link to={`/queue/${queueStatus.service.id}`} className={styles.link}>
            View queue status →
          </Link>
        </Card>
      )}

      <Card className={styles.section}>
        <CardTitle>
          <Briefcase size={20} aria-hidden />
          Active services
        </CardTitle>
        <ul className={styles.serviceList}>
          {services.length === 0 ? (
            <li className={styles.empty}>No open services at the moment.</li>
          ) : (
            services.map((s) => (
              <li key={s.id} className={styles.serviceItem}>
                <Link to={`/queue/${s.id}`} className={styles.serviceName}>
                  <ServiceIcon name={s.name} />
                  {s.name}
                </Link>
                <span className={styles.meta}>
                  ~{s.estimatedWaitMinutes} min wait · {s.priorityLevel} priority
                </span>
                <Link to="/join-queue" className={styles.joinLink}>Join queue</Link>
              </li>
            ))
          )}
        </ul>
      </Card>

      <Card className={styles.section}>
        <CardTitle>
          <Bell size={20} aria-hidden />
          Notifications
        </CardTitle>
        <ul className={styles.notifList}>
          {notifications.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
