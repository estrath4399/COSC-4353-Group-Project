import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserDashboard } from '../pages/UserDashboard';

export function UserDashboardRoute() {
  const { isAdmin } = useAuth();
  if (isAdmin) return <Navigate to="/admin" replace />;
  return <UserDashboard />;
}
