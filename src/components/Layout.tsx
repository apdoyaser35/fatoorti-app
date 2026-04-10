import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, FileText, Users, Building2, Truck, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../firebase';
import { cn } from '../lib/utils';

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

  const handleLogout = async () => {
    localStorage.removeItem('auth_user_cached');
    sessionStorage.removeItem('auth_user_cached');
    await auth.signOut();
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-gray-50 w-full">

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100 px-4 py-3 md:px-6 md:py-4 flex justify-between items-center flex-shrink-0">
        <h1 className="text-lg md:text-xl font-bold text-primary tracking-tight">فاتورتي</h1>
        <button
          onClick={handleLogout}
          className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <LogOut size={20} />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overscroll-contain">
        <div
          key={location.pathname}
          className="px-4 py-4 md:py-6 max-w-lg mx-auto w-full pb-24"
        >
          {children}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="sticky bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-gray-100 px-4 py-2 md:px-6 md:py-3 flex justify-around items-center safe-area-bottom z-50">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 transition-all duration-200 ios-tap-highlight relative",
                  isActive ? "text-primary scale-110" : "text-gray-400"
                )
              }
            >
              <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{item.label}</span>
              {isActive && (
                <div className="absolute -bottom-1 w-1 h-1 bg-primary rounded-full" />
              )}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};

export default React.memo(Layout);