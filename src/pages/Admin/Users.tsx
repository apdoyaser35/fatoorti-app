import React, { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { UserProfile, Branch } from '../../types';
import { User, Shield, UserCircle, Edit2, Trash2, X, Check, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

import { useData } from '../../contexts/DataContext';

const Users: React.FC = () => {
  const { users, branches, loadingUsers: loading, refreshUsers, prefetchData, isPrefetched } = useData();
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedRole, setSelectedRole] = useState<'admin' | 'employee'>('employee');

  useEffect(() => {
    if (!isPrefetched) prefetchData();
  }, [isPrefetched, prefetchData]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    await updateDoc(doc(db, 'users', editingUser.uid), {
      role: selectedRole,
      branch_id: selectedBranch
    });
    setEditingUser(null);
    await refreshUsers();
  };

  const handleDelete = async (uid: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المستخدم؟')) {
      await deleteDoc(doc(db, 'users', uid));
      await refreshUsers();
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">إدارة الموظفين</h2>
        <p className="text-sm text-gray-500">ملاحظة: يجب على الموظف إنشاء حساب أولاً ثم يمكنك تعيين الفرع له.</p>
      </div>

      <div className="space-y-4">
        {loading ? (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white p-4 md:p-5 rounded-2xl md:rounded-3xl border border-gray-100 shadow-sm flex justify-between items-center animate-pulse">
                <div className="flex items-center gap-4 w-full">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-5 bg-gray-100 rounded-md w-1/3"></div>
                    <div className="flex gap-2">
                      <div className="h-4 bg-gray-100 rounded-full w-12"></div>
                      <div className="h-4 bg-gray-100 rounded-full w-16"></div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="w-8 h-8 bg-gray-100 rounded-full"></div>
                  <div className="w-8 h-8 bg-gray-100 rounded-full"></div>
                </div>
              </div>
            ))}
          </>
        ) : users.length === 0 ? (
          <div className="text-center py-20 text-gray-400 font-bold">لا يوجد مستخدمين مسجلين</div>
        ) : (
          users.map((user) => (
            <motion.div
              key={user.uid}
              className="bg-white p-4 md:p-5 rounded-2xl md:rounded-3xl border border-gray-100 shadow-sm flex justify-between items-center"
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center",
                  user.role === 'admin' ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"
                )}>
                  {user.role === 'admin' ? <Shield size={24} /> : <UserCircle size={24} />}
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-lg text-gray-900">{user.username}</h3>
                  <div className="flex gap-2">
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full",
                      user.role === 'admin' ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                    )}>
                      {user.role === 'admin' ? 'مدير' : 'موظف'}
                    </span>
                    {user.branch_id && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-50 text-gray-500">
                        {branches.find(b => b.id === user.branch_id)?.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingUser(user);
                    setSelectedRole(user.role);
                    setSelectedBranch(user.branch_id || '');
                  }}
                  className="p-2 text-gray-400 hover:text-primary transition-colors"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => handleDelete(user.uid)}
                  className="p-2 text-gray-400 hover:text-destructive transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end justify-center"
            onClick={() => setEditingUser(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-white w-full max-w-md rounded-t-[40px] p-6 md:p-8 space-y-6 md:space-y-8"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl md:text-2xl font-bold">تعديل صلاحيات: {editingUser.username}</h3>
                <button
                  onClick={() => setEditingUser(null)}
                  className="p-2 bg-gray-100 rounded-full"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleUpdate} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 mr-1">الدور الوظيفي</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedRole('employee')}
                        className={cn(
                          "p-3 md:p-4 rounded-2xl border-2 transition-all font-bold text-sm md:text-base",
                          selectedRole === 'employee' ? "border-primary bg-primary/5 text-primary" : "border-gray-100 text-gray-400"
                        )}
                      >
                        موظف
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedRole('admin')}
                        className={cn(
                          "p-3 md:p-4 rounded-2xl border-2 transition-all font-bold text-sm md:text-base",
                          selectedRole === 'admin' ? "border-primary bg-primary/5 text-primary" : "border-gray-100 text-gray-400"
                        )}
                      >
                        مدير
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 mr-1">الفرع المعين</label>
                    <select
                      value={selectedBranch}
                      onChange={(e) => setSelectedBranch(e.target.value)}
                      className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 md:px-6 md:py-4 text-base md:text-lg focus:ring-2 focus:ring-primary outline-none appearance-none"
                    >
                      <option value="">غير معين</option>
                      {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-primary text-white rounded-2xl py-3 md:py-4 text-base md:text-lg font-bold shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Check size={20} />
                  <span>حفظ التعديلات</span>
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Users;
