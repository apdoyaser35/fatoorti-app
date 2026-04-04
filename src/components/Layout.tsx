import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, FileText, Settings, Users, Building2, Truck, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../firebase';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  const location = useLocation();

  const isAdmin = profile?.role === 'admin';

  const navItems = isAdmin
    ? [
        { path: '/admin', icon: Home, label: 'الرئيسية' },
        { path: '/admin/branches', icon: Building2, label: 'الفروع' },
        { path: '/admin/delivery', icon: Truck, label: 'التوصيل' },
        { path: '/admin/users', icon: Users, label: 'الموظفين' },
      ]
    : [
        { path: '/employee', icon: Home, label: 'الرئيسية' },
        { path: '/employee/invoices', icon: FileText, label: 'فواتيري' },
      ];

  const handleLogout = () => {
    auth.signOut();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-20">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100 px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-primary tracking-tight">فاتورتي</h1>
        <button
          onClick={handleLogout}
          className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <LogOut size={20} />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 max-w-lg mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-gray-100 px-6 py-3 flex justify-around items-center safe-area-bottom z-50">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 transition-all duration-200 ios-tap-highlight",
                  isActive ? "text-primary scale-110" : "text-gray-400"
                )
              }
            >
              <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{item.label}</span>
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -bottom-1 w-1 h-1 bg-primary rounded-full"
                />
              )}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};

export default Layout;
