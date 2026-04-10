import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAuthReady: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAuthReady: false,
});

export const useAuth = () => useContext(AuthContext);

const CACHE_KEY = 'auth_user_cached';

const getCachedUser = (): boolean => {
  try {
    return (
      localStorage.getItem(CACHE_KEY) === 'true' ||
      sessionStorage.getItem(CACHE_KEY) === 'true'
    );
  } catch {
    return false;
  }
};

const setCachedUser = (value: boolean): void => {
  try {
    if (value) {
      localStorage.setItem(CACHE_KEY, 'true');
      sessionStorage.setItem(CACHE_KEY, 'true');
    } else {
      localStorage.removeItem(CACHE_KEY);
      sessionStorage.removeItem(CACHE_KEY);
    }
  } catch {
    // silent fail على iOS Private Browsing
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(getCachedUser() ? false : true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const enforcePersistence = async () => {
      try {
        if (localStorage.getItem('rememberedUser') === 'true') {
          await setPersistence(auth, browserLocalPersistence);
        }
      } catch (err) {
        console.error('Error enforcing persistence:', err);
      }
    };

    enforcePersistence();

    const forceRefresh = async () => {
      try {
        await auth.authStateReady();
      } catch (err) {
        console.error('Auth state ready error:', err);
      }
    };

    forceRefresh();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!isMounted) return;

      setCachedUser(!!currentUser);

      if (!getCachedUser()) {
        setLoading(true);
      }

      setUser(currentUser);

      const timeoutId = setTimeout(() => {
        if (isMounted) {
          setLoading(false);
          setIsAuthReady(true);
        }
      }, 3000);

      if (currentUser) {
        try {
          const profileDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (!isMounted) return;
          if (profileDoc.exists()) {
            setProfile(profileDoc.data() as UserProfile);
          } else {
            setProfile(null);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          if (!isMounted) return;
          setProfile(null);
        } finally {
          if (isMounted) {
            clearTimeout(timeoutId);
            setLoading(false);
            setIsAuthReady(true);
          }
        }
      } else {
        setProfile(null);
        if (isMounted) {
          clearTimeout(timeoutId);
          setLoading(false);
          setIsAuthReady(true);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAuthReady }}>
      {children}
    </AuthContext.Provider>
  );
};