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
    <div className="flex flex-col h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-gray-50">

      {/* Header: بدون backdrop-blur لتفادي طبقات شفافة/بيضاء على WebKit (iOS) */}
      <header className="flex justify-between items-center bg-white sticky top-0 z-50 border-b border-gray-100 px-4 py-3 shrink-0 safe-area-top">
        <h1 className="text-lg font-bold text-primary tracking-tight">فاتورتي</h1>
        <button
          onClick={handleLogout}
          className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <LogOut size={20} />
        </button>
      </header>

      {/* min-h-0 مهم لـ flex + scroll على iOS */}
      <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollable bg-gray-50">
        <div className="px-4 py-4 w-full max-w-lg mx-auto pb-28">
          {children}
        </div>
      </main>

      <nav className="shrink-0 bg-white border-t border-gray-100 px-2 py-2 flex justify-around items-center safe-area-bottom z-50">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-0.5 min-w-[3.5rem] min-h-[3rem] py-1 px-2 rounded-xl transition-all duration-200 ios-tap-highlight relative touch-manipulation",
                  isActive ? "text-primary scale-105" : "text-gray-400 active:opacity-70"
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