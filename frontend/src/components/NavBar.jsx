import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Settings, ListOrdered, Users, History, LogOut, ListTodo, FileSpreadsheet, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getNotifications } from '../mock/api';
import styles from './NavBar.module.css';

export function NavBar() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user || isAdmin) return;
    let cancelled = false;
    const fetchCount = async () => {
      const notifs = await getNotifications(user.id);
      if (!cancelled) setUnreadCount(notifs.filter((n) => !n.read).length);
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [user, isAdmin]);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setOpen(false);
  };

  if (!user) return null;

  const iconSize = 18;

  return (
    <header className={styles.header}>
      <div className={styles.wrap}>
        <Link to={isAdmin ? '/admin' : '/dashboard'} className={styles.logo}>
          <ListTodo aria-hidden size={22} className={styles.logoIcon} />
          QueueSmart
        </Link>
        <button
          type="button"
          className={styles.toggle}
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label="Toggle menu"
        >
          <span className={styles.hamburger} />
          <span className={styles.hamburger} />
          <span className={styles.hamburger} />
        </button>
        <nav className={`${styles.nav} ${open ? styles.navOpen : ''}`}>
          <Link to={isAdmin ? '/admin' : '/dashboard'} onClick={() => setOpen(false)}>
            <LayoutDashboard size={iconSize} aria-hidden />
            <span>Dashboard</span>
          </Link>
          {isAdmin ? (
            <>
              <Link to="/admin/services" onClick={() => setOpen(false)}>
                <Settings size={iconSize} aria-hidden />
                <span>Service Management</span>
              </Link>
              <Link to="/admin/queue" onClick={() => setOpen(false)}>
                <ListOrdered size={iconSize} aria-hidden />
                <span>Queue Management</span>
              </Link>
              <Link to="/admin/reports" onClick={() => setOpen(false)}>
                <FileSpreadsheet size={iconSize} aria-hidden />
                <span>Reports</span>
              </Link>
            </>
          ) : (
            <>
              <Link to="/join-queue" onClick={() => setOpen(false)}>
                <Users size={iconSize} aria-hidden />
                <span>Join Queue</span>
              </Link>
              <Link to="/history" onClick={() => setOpen(false)}>
                <History size={iconSize} aria-hidden />
                <span>History</span>
              </Link>
              <Link to="/dashboard" onClick={() => setOpen(false)} className={styles.notifLink}>
                <Bell size={iconSize} aria-hidden />
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <span className={styles.badge}>{unreadCount}</span>
                )}
              </Link>
            </>
          )}
          <button type="button" className={styles.logoutBtn} onClick={handleLogout}>
            <LogOut size={iconSize} aria-hidden />
            <span>Logout</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
