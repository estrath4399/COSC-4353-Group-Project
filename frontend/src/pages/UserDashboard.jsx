import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Briefcase, Bell, GraduationCap, DollarSign, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getServices, getMyActiveQueues, getNotifications } from '../mock/api';
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
  const [activeQueues, setActiveQueues] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await getServices();
      const open = list.filter((s) => s.isOpen);
      if (cancelled) return;
      setServices(open);

      const queues = await getMyActiveQueues();
      if (!cancelled) setActiveQueues(queues);

      const notifs = await getNotifications(user.id);
      if (!cancelled) {
        setNotifications(notifs.map((n) => n.message || n.type).filter(Boolean));
      }
    })();
    return () => {
      cancelled = true;
    };
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

      {activeQueues.length > 0 && (
        <Card className={styles.overview}>
          <CardTitle>
            <ClipboardList size={20} aria-hidden />
            {activeQueues.length === 1 ? 'Current queue' : 'Current queues'}
          </CardTitle>
          <ul className={styles.activeQueueList}>
            {activeQueues.map((q) => (
              <li key={q.entry.id} className={styles.activeQueueItem}>
                <p className={styles.queueOverview}>
                  You are{' '}
                  <strong>
                    {q.position}
                    {q.position === 1 ? 'st' : q.position === 2 ? 'nd' : q.position === 3 ? 'rd' : 'th'}
                  </strong>{' '}
                  in line for {q.service.name}
                  {q.estimatedWaitMinutes != null && q.estimatedWaitMinutes > 0 && (
                    <span className={styles.waitHint}> (~{q.estimatedWaitMinutes} min wait)</span>
                  )}
                  .
                </p>
                <Link to={`/queue/${q.service.id}`} className={styles.link}>
                  View queue status →
                </Link>
              </li>
            ))}
          </ul>
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
                <Link to={`/join-queue?service=${encodeURIComponent(s.id)}`} className={styles.joinLink}>
                  Join queue
                </Link>
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
          {notifications.length === 0 ? (
            <li className={styles.empty}>No notifications yet.</li>
          ) : (
            notifications.map((n, i) => <li key={i}>{n}</li>)
          )}
        </ul>
      </Card>
    </div>
  );
}
