import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { UserDashboardRoute } from './components/UserDashboardRoute';
import { JoinQueue } from './pages/JoinQueue';
import { QueueStatus } from './pages/QueueStatus';
import { History } from './pages/History';
import { AdminDashboard } from './pages/AdminDashboard';
import { ServiceManagement } from './pages/ServiceManagement';
import { QueueManagement } from './pages/QueueManagement';
import { Reports } from './pages/Reports';

function PublicOnly({ children }) {
  const { isAuthenticated, isAdmin } = useAuth();
  if (isAuthenticated) return <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />;
  return children;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<ProtectedRoute><UserDashboardRoute /></ProtectedRoute>} />
        <Route path="join-queue" element={<ProtectedRoute><JoinQueue /></ProtectedRoute>} />
        <Route path="queue/:serviceId" element={<ProtectedRoute><QueueStatus /></ProtectedRoute>} />
        <Route path="history" element={<ProtectedRoute><History /></ProtectedRoute>} />
        <Route path="admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
        <Route path="admin/services" element={<ProtectedRoute adminOnly><ServiceManagement /></ProtectedRoute>} />
        <Route path="admin/queue" element={<ProtectedRoute adminOnly><QueueManagement /></ProtectedRoute>} />
        <Route path="admin/reports" element={<ProtectedRoute adminOnly><Reports /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
