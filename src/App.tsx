import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';

// Employee Pages
import EmployeeHome from './pages/Employee/Home';
import EmployeeInvoices from './pages/Employee/Invoices';

// Admin Pages
import AdminDashboard from './pages/Admin/Dashboard';
import AdminBranches from './pages/Admin/Branches';
import AdminDelivery from './pages/Admin/DeliveryCompanies';
import AdminUsers from './pages/Admin/Users';

const ProtectedRoute: React.FC<{ children: React.ReactNode; role?: 'admin' | 'employee' }> = ({ children, role }) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
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
      <div className="min-h-screen flex items-center justify-center bg-white">
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
      <Router>
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
      </Router>
    </AuthProvider>
  );
}
