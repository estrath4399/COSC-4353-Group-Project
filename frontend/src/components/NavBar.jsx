import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Settings, ListOrdered, Users, History, LogOut, ListTodo } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import styles from './NavBar.module.css';

export function NavBar() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

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
