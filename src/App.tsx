import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';

// Lazy-loaded pages — only loaded after login (not on critical path)
const EmployeeHome = React.lazy(() => import('./pages/Employee/Home'));
const EmployeeInvoices = React.lazy(() => import('./pages/Employee/Invoices'));
const AdminDashboard = React.lazy(() => import('./pages/Admin/Dashboard'));
const AdminBranches = React.lazy(() => import('./pages/Admin/Branches'));
const AdminDelivery = React.lazy(() => import('./pages/Admin/DeliveryCompanies'));
const AdminUsers = React.lazy(() => import('./pages/Admin/Users'));

const SuspenseFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-white z-[9999]" style={{ top: '0', left: '0', right: '0', bottom: '0' }}>
    <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode; role?: 'admin' | 'employee' }> = ({ children, role }) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white z-[9999]" style={{ top: '0', left: '0', right: '0', bottom: '0' }}>
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (!profile) {
    // If user exists but no profile, they might be in the middle of signup
    // or something went wrong. Allow them to stay on the page if it's signup
    // but otherwise redirect to login to try again.
    return <Navigate to="/login" />;
  }

  if (role && profile.role !== role) {
    return <Navigate to={profile.role === 'admin' ? '/admin' : '/employee'} />;
  }

  return <Layout>{children}</Layout>;
};

const RootRedirect: React.FC = () => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white z-[9999]" style={{ top: '0', left: '0', right: '0', bottom: '0' }}>
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;
  if (!profile) return <Navigate to="/login" />;

  return <Navigate to={profile.role === 'admin' ? '/admin' : '/employee'} />;
};

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <Router>
          <Suspense fallback={<SuspenseFallback />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          {/* Employee Routes */}
          <Route
            path="/employee"
            element={
              <ProtectedRoute role="employee">
                <EmployeeHome />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employee/invoices"
            element={
              <ProtectedRoute role="employee">
                <EmployeeInvoices />
              </ProtectedRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/branches"
            element={
              <ProtectedRoute role="admin">
                <AdminBranches />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/delivery"
            element={
              <ProtectedRoute role="admin">
                <AdminDelivery />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute role="admin">
                <AdminUsers />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<Navigate to="/" />} />
          </Routes>
          </Suspense>
        </Router>
      </DataProvider>
    </AuthProvider>
  );
}
