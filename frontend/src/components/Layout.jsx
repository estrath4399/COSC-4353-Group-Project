import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { NavBar } from './NavBar';
import { Toast } from './Toast';
import { useNotification } from '../context/NotificationContext';
import { setNotificationCallback } from '../mock/api';
import styles from './Layout.module.css';

export function Layout() {
  const { addNotification } = useNotification();
  useEffect(() => {
    setNotificationCallback(({ message, type, placement }) =>
      addNotification({ message, type, placement: placement === 'top' ? 'top' : 'bottom' }));
  }, [addNotification]);

  return (
    <div className={styles.layout}>
      <NavBar />
      <main className={styles.main}>
        <Outlet />
      </main>
      <Toast />
    </div>
  );
}
