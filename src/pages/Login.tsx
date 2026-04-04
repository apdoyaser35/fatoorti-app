import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';
import { auth } from '../firebase';
import { motion } from 'motion/react';
import { LogIn, User, Lock, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (rememberMe) {
        await setPersistence(auth, browserLocalPersistence);
      } else {
        await setPersistence(auth, browserSessionPersistence);
      }

      const email = `${username.toLowerCase()}@invoice.app`;
      await signInWithEmailAndPassword(auth, email, password);
      
      navigate('/');
    } catch (err: any) {
      setError('خطأ في اسم المستخدم أو كلمة المرور');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md space-y-8"
      >
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-primary tracking-tight">فاتورتي</h1>
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">نظام إدارة الفواتير والطلبات</p>
          <p className="text-gray-500 font-medium pt-2">تسجيل الدخول للمتابعة</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-4">
            <div className="relative">
              <User className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="اسم المستخدم (رقم أو اسم إنجليزي)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-gray-50 border-none rounded-2xl px-12 py-4 text-lg focus:ring-2 focus:ring-primary transition-all outline-none"
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="password"
                placeholder="كلمة المرور"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-50 border-none rounded-2xl px-12 py-4 text-lg focus:ring-2 focus:ring-primary transition-all outline-none"
                required
              />
            </div>
          </div>

          <div className="flex items-center gap-2 px-2 mt-2">
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-5 h-5 rounded-md border-gray-300 text-primary focus:ring-primary accent-primary transition-colors cursor-pointer"
            />
            <label htmlFor="rememberMe" className="text-sm font-bold text-gray-600 cursor-pointer select-none">
              تذكرني
            </label>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 text-destructive text-sm font-medium bg-destructive/10 p-3 rounded-xl"
            >
              <AlertCircle size={18} />
              <span>{error}</span>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={cn(
              "w-full bg-primary text-white rounded-2xl py-4 text-lg font-bold shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-2",
              loading && "opacity-70 cursor-not-allowed"
            )}
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn size={20} />
                <span>دخول</span>
              </>
            )}
          </button>
        </form>

        <div className="text-center">
          <p className="text-gray-500">
            ليس لديك حساب؟{' '}
            <Link to="/signup" className="text-primary font-bold hover:underline">
              إنشاء حساب جديد
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
