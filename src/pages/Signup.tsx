import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { motion } from 'motion/react';
import { UserPlus, User, Lock, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

const Signup: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const trimmedUsername = username.trim();
    const searchUsername = trimmedUsername.toLowerCase();

    // Validation
    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      setError('اسم المستخدم يجب أن يحتوي على أحرف إنجليزية أو أرقام فقط');
      return;
    }

    if (password !== confirmPassword) {
      setError('كلمات المرور غير متطابقة');
      return;
    }

    if (password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    setLoading(true);

    try {
      // 1. Prevent duplicate usernames:
      // We check both exact display matches and lowercase matches for extreme safety
      const usersRef = collection(db, 'users');
      const qExact = query(usersRef, where('username', '==', trimmedUsername));
      const qLowerExact = query(usersRef, where('username', '==', searchUsername));
      const qLower = query(usersRef, where('username_lowercase', '==', searchUsername));
      
      const [snapExact, snapLowerExact, snapLower] = await Promise.all([
        getDocs(qExact),
        getDocs(qLowerExact),
        getDocs(qLower)
      ]);

      if (!snapExact.empty || !snapLowerExact.empty || !snapLower.empty) {
        console.log("Username already exists");
        setError('اسم المستخدم مستخدم بالفعل');
        setLoading(false);
        return;
      }

      // 2. Safe account creation flow
      const email = `${searchUsername}@invoice.app`;
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log("Auth created");

      // 4. Clean data before saving: keeping original display in username
      const profileInfo = {
        uid: user.uid,
        username: trimmedUsername,
        username_lowercase: searchUsername, // For future lower case searches
        role: 'employee',
        active: true, // To align with Firestore allow create list rules
        createdAt: new Date().toISOString(),
      };

      try {
        await setDoc(doc(db, 'users', user.uid), profileInfo);
        console.log("Firestore saved");
      } catch (err) {
        console.error('Firestore write failed:', err);
        // 3. Handle Firestore failure properly
        console.log("Cleanup executed");
        await user.delete().catch(deleteErr => console.error("Failed to delete auth user:", deleteErr));
        setError('نجح إنشاء الحساب لكن تعذر حفظ بياناتك (Firestore). تم إزالة الحساب تفادياً للأخطاء. يرجى المحاولة مرة أخرى.');
        setLoading(false);
        return;
      }
      
      navigate('/');
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        console.log("Username already exists");
        setError('اسم المستخدم مستخدم بالفعل');
      } else {
        setError(err.message || 'حدث خطأ أثناء إنشاء الحساب');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-white flex flex-col items-center justify-center px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md space-y-8"
      >
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-primary tracking-tight">إنشاء حساب</h1>
          <p className="text-xs md:text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">نظام إدارة الفواتير والطلبات</p>
          <p className="text-gray-500 font-medium pt-2">انضم إلينا اليوم</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-6">
          <div className="space-y-4">
            <div className="relative">
              <User className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="اسم المستخدم (رقم أو اسم إنجليزي)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-gray-50 border-none rounded-2xl px-12 py-3 md:py-4 text-base md:text-lg focus:ring-2 focus:ring-primary transition-all outline-none"
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
                className="w-full bg-gray-50 border-none rounded-2xl px-12 py-3 md:py-4 text-base md:text-lg focus:ring-2 focus:ring-primary transition-all outline-none"
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="password"
                placeholder="تأكيد كلمة المرور"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-gray-50 border-none rounded-2xl px-12 py-3 md:py-4 text-base md:text-lg focus:ring-2 focus:ring-primary transition-all outline-none"
                required
              />
            </div>
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
              "w-full bg-primary text-white rounded-2xl py-3 md:py-4 text-base md:text-lg font-bold shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-2",
              loading && "opacity-70 cursor-not-allowed"
            )}
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <UserPlus size={20} />
                <span>إنشاء حساب</span>
              </>
            )}
          </button>
        </form>

        <div className="text-center">
          <p className="text-gray-500">
            لديك حساب بالفعل؟{' '}
            <Link to="/login" className="text-primary font-bold hover:underline">
              تسجيل الدخول
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Signup;
