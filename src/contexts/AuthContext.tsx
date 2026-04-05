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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // Fallback: iOS Safari PWA sometimes clears indexedDB early or blocks it.
    // We enforce persistence if localStorage says the user wanted to be remembered.
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

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!isMounted) return;

      // Set loading=true at the start of every auth state change
      // to prevent any brief window where loading=false + profile=null
      setLoading(true);
      setUser(currentUser);

      // Fallback timeout: force loading=false after 3 seconds 
      // so iOS PWA never gets stuck on white screen
      const timeoutId = setTimeout(() => {
        if (isMounted) {
          console.warn('Auth state loading timeout reached');
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
          console.error("Error fetching user profile:", error);
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
