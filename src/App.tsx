import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';

import EmployeeHome from './pages/Employee/Home';
import EmployeeInvoices from './pages/Employee/Invoices';
import AdminDashboard from './pages/Admin/Dashboard';
import AdminBranches from './pages/Admin/Branches';
import AdminDelivery from './pages/Admin/DeliveryCompanies';
import AdminUsers from './pages/Admin/Users';

const Spinner = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-gray-50 z-[9999]">
    <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
  </div>
);

/** Layout + Outlet: يبقى الهيدر والناف ثابتين بين الصفحات (يقلل وميض iOS والشاشة البيضاء). */
const ProtectedLayout: React.FC<{ role: 'admin' | 'employee' }> = ({ role }) => {
  const { user, profile, loading } = useAuth();

  if (loading && !user) {
    return <Spinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (loading && !profile) {
    return <Spinner />;
  }

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  if (profile.role !== role) {
    return <Navigate to={profile.role === 'admin' ? '/admin' : '/employee'} replace />;
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
};

const RootRedirect: React.FC = () => {
  const { user, profile, loading } = useAuth();

  if (loading && !user) {
    return <Spinner />;
  }

  if (!user) return <Navigate to="/login" replace />;

  if (loading && !profile) {
    return <Spinner />;
  }

  if (!profile) return <Navigate to="/login" replace />;

  return <Navigate to={profile.role === 'admin' ? '/admin' : '/employee'} />;
};

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            <Route element={<ProtectedLayout role="employee" />}>
              <Route path="/employee" element={<EmployeeHome />} />
              <Route path="/employee/invoices" element={<EmployeeInvoices />} />
            </Route>

            <Route element={<ProtectedLayout role="admin" />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/branches" element={<AdminBranches />} />
              <Route path="/admin/delivery" element={<AdminDelivery />} />
              <Route path="/admin/users" element={<AdminUsers />} />
            </Route>

            <Route path="/" element={<RootRedirect />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Router>
      </DataProvider>
    </AuthProvider>
  );
}