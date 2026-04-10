import React, { createContext, useContext, useState, useCallback, useMemo, useRef } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Branch, DeliveryCompany, UserProfile } from '../types';

interface DataContextType {
  branches: Branch[];
  branchesMap: Record<string, Branch>;
  loadingBranches: boolean;
  refreshBranches: () => Promise<void>;

  deliveryCompanies: DeliveryCompany[];
  deliveryMap: Record<string, DeliveryCompany>;
  loadingDelivery: boolean;
  refreshDelivery: () => Promise<void>;

  users: UserProfile[];
  usersMap: Record<string, UserProfile>;
  loadingUsers: boolean;
  refreshUsers: () => Promise<void>;

  prefetchData: () => Promise<void>;
  isPrefetched: boolean;
}

const DataContext = createContext<DataContextType>({
  branches: [],
  branchesMap: {},
  loadingBranches: true,
  refreshBranches: async () => {},

  deliveryCompanies: [],
  deliveryMap: {},
  loadingDelivery: true,
  refreshDelivery: async () => {},

  users: [],
  usersMap: {},
  loadingUsers: true,
  refreshUsers: async () => {},

  prefetchData: async () => {},
  isPrefetched: false,
});

export const useData = () => useContext(DataContext);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);

  const [deliveryCompanies, setDeliveryCompanies] = useState<DeliveryCompany[]>([]);
  const [loadingDelivery, setLoadingDelivery] = useState(true);

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [isPrefetched, setIsPrefetched] = useState(false);
  
  // Track fetching state to prevent duplicate parallel requests
  const fetchingRefs = useRef({
    branches: false,
    delivery: false,
    users: false
  });

  const refreshBranches = useCallback(async () => {
    if (fetchingRefs.current.branches) return;
    fetchingRefs.current.branches = true;
    setLoadingBranches(true);
    try {
      const snap = await getDocs(collection(db, 'branches'));
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Branch));
      setBranches(data);
    } catch (err) {
      console.error("Error fetching branches:", err);
    } finally {
      setLoadingBranches(false);
      fetchingRefs.current.branches = false;
    }
  }, []);

  const refreshDelivery = useCallback(async () => {
    if (fetchingRefs.current.delivery) return;
    fetchingRefs.current.delivery = true;
    setLoadingDelivery(true);
    try {
      const snap = await getDocs(collection(db, 'delivery_companies'));
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as DeliveryCompany));
      setDeliveryCompanies(data);
    } catch (err) {
      console.error("Error fetching delivery companies:", err);
    } finally {
      setLoadingDelivery(false);
      fetchingRefs.current.delivery = false;
    }
  }, []);

  const refreshUsers = useCallback(async () => {
    if (fetchingRefs.current.users) return;
    fetchingRefs.current.users = true;
    setLoadingUsers(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const data = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      setUsers(data);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoadingUsers(false);
      fetchingRefs.current.users = false;
    }
  }, []);

  const prefetchData = useCallback(async () => {
    if (isPrefetched) return;
    
    // Timeout fallback for iOS - force completion after 5 seconds
    const timeoutId = setTimeout(() => {
      console.warn('DataContext prefetch timeout reached');
      setIsPrefetched(true);
    }, 5000);
    
    // We start all non-blocking fetches independently
    // If they are already fetching, they will return immediately due to ref check
    Promise.all([
      refreshBranches(),
      refreshDelivery(),
      refreshUsers()
    ]).then(() => {
      clearTimeout(timeoutId);
      setIsPrefetched(true);
    }).catch((err) => {
      console.error('DataContext prefetch error:', err);
      clearTimeout(timeoutId);
      setIsPrefetched(true);
    });
  }, [isPrefetched, refreshBranches, refreshDelivery, refreshUsers]);

  const branchesMap = useMemo(() => {
    const map: Record<string, Branch> = {};
    branches.forEach(b => map[b.id] = b);
    return map;
  }, [branches]);

  const deliveryMap = useMemo(() => {
    const map: Record<string, DeliveryCompany> = {};
    deliveryCompanies.forEach(d => map[d.id] = d);
    return map;
  }, [deliveryCompanies]);

  const usersMap = useMemo(() => {
    const map: Record<string, UserProfile> = {};
    users.forEach(u => map[u.uid] = u);
    return map;
  }, [users]);

  return (
    <DataContext.Provider
      value={{
        branches,
        branchesMap,
        loadingBranches,
        refreshBranches,

        deliveryCompanies,
        deliveryMap,
        loadingDelivery,
        refreshDelivery,

        users,
        usersMap,
        loadingUsers,
        refreshUsers,

        prefetchData,
        isPrefetched
      }}
    >
      {children}
    </DataContext.Provider>
  );
};
