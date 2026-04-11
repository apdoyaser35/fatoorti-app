import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { uploadImageToCloudinary } from '../../lib/cloudinary';
import { Branch } from '../../types';
import { Plus, Trash2, Edit2, X, Check, Building2, MapPin, Camera, Loader2 } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import OptimizedImage from '../../components/OptimizedImage';

import { useData } from '../../contexts/DataContext';

const Branches: React.FC = () => {
  const { branches, loadingBranches: loading, refreshBranches, prefetchData, isPrefetched } = useData();
  const [submitting, setSubmitting] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  useEffect(() => {
    if (!isPrefetched) {
      prefetchData();
    }
  }, [isPrefetched, prefetchData]);

  const resetForm = () => {
    setShowAdd(false);
    setEditingBranch(null);
    setName('');
    setNumber('');
    setImageFile(null);
    setImagePreview('');
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
      });
      setImageFile(compressed);
      setImagePreview(URL.createObjectURL(compressed));
    }
  };

  const uploadImage = async (file: File) => {
    return await uploadImageToCloudinary(file);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !number) return;
    setSubmitting(true);
    
    try {
      let imageUrl = '';
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }
      await addDoc(collection(db, 'branches'), { name, number, image_url: imageUrl });
      resetForm();
      await refreshBranches();
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء حفظ الفرع');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBranch || !name || !number) return;
    setSubmitting(true);

    try {
      let imageUrl = editingBranch.image_url || '';
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }
      await updateDoc(doc(db, 'branches', editingBranch.id), { name, number, image_url: imageUrl });
      resetForm();
      await refreshBranches();
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء تحديث الفرع');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الفرع؟')) {
      await deleteDoc(doc(db, 'branches', id));
      await refreshBranches();
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">إدارة الفروع</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <>
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white p-3 md:p-4 rounded-[24px] md:rounded-[28px] border border-gray-100 shadow-sm flex items-center justify-between gap-3 md:gap-4 animate-pulse">
                <div className="flex items-center gap-4 w-full">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 shrink-0"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-5 bg-gray-100 rounded-md w-1/3"></div>
                    <div className="h-3 bg-gray-100 rounded-md w-1/4"></div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="w-8 h-8 bg-gray-100 rounded-full"></div>
                  <div className="w-8 h-8 bg-gray-100 rounded-full"></div>
                </div>
              </div>
            ))}
          </>
        ) : branches.length === 0 ? (
          <div className="md:col-span-2 text-center py-20 text-gray-400 font-bold">لا توجد فروع مضافة</div>
        ) : (
          branches.map((branch) => (
            <div
              key={branch.id}
              className="bg-white p-3 md:p-4 rounded-[24px] md:rounded-[28px] border border-gray-100 shadow-sm flex items-center justify-between gap-3 md:gap-4 active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-primary/10 flex items-center justify-center shrink-0 shadow-inner">
                  {branch.image_url ? (
                    <OptimizedImage src={branch.image_url} alt={branch.name} className="w-full h-full object-cover" cloudinaryWidth={128} />
                  ) : (
                    <Building2 size={28} className="text-primary" />
                  )}
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-lg text-gray-900 leading-tight">{branch.name}</h3>
                  <p className="text-xs text-gray-500 font-medium flex items-center gap-1">
                    <MapPin size={12} />
                    <span>فرع رقم: {branch.number}</span>
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    setEditingBranch(branch);
                    setName(branch.name);
                    setNumber(branch.number);
                    setImagePreview(branch.image_url || '');
                    setShowAdd(true);
                  }}
                  className="p-2.5 text-gray-400 bg-gray-50 rounded-full hover:bg-gray-100 hover:text-primary transition-colors"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(branch.id)}
                  className="p-2.5 text-gray-400 bg-red-50 rounded-full hover:bg-red-100 hover:text-destructive transition-colors"
                >
                  <Trash2 size={16} className="text-destructive" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Floating Action Button */}
      <button
        type="button"
        onClick={() => setShowAdd(true)}
        className="fixed z-40 w-14 h-14 bg-primary text-white rounded-full shadow-lg shadow-primary/30 flex items-center justify-center transition-all active:scale-90 touch-manipulation end-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))]"
      >
        <Plus size={28} />
      </button>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {(showAdd) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 flex items-end justify-center overscroll-contain"
            onClick={resetForm}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-white w-full max-w-md rounded-t-[40px] p-6 md:p-8 space-y-6 md:space-y-8 max-h-[min(90dvh,90vh)] min-h-0 overflow-y-auto scrollable"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl md:text-2xl font-bold">{editingBranch ? 'تعديل فرع' : 'فرع جديد'}</h3>
                <button onClick={resetForm} className="p-2 bg-gray-100 rounded-full active:scale-95">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={editingBranch ? handleUpdate : handleAdd} className="space-y-6">
                
                {/* Image Upload Area */}
                <div className="flex flex-col items-center gap-4">
                  <div className="relative w-32 h-32">
                    <div className="w-full h-full rounded-[2rem] overflow-hidden bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400">
                      {imagePreview ? (
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Camera size={32} />
                      )}
                    </div>
                    <label className="absolute inset-0 cursor-pointer rounded-[2rem]">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 font-medium">اضغط لاختيار صورة الفرع</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 ml-1">اسم الفرع</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="مثال: فرع الرياض"
                      className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 md:px-6 md:py-4 text-base md:text-lg focus:ring-2 focus:ring-primary outline-none"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 ml-1">رقم الفرع</label>
                    <input
                      type="text"
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                      placeholder="مثال: 001"
                      className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 md:px-6 md:py-4 text-base md:text-lg focus:ring-2 focus:ring-primary outline-none"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className={cn(
                    "w-full bg-primary text-white rounded-2xl py-3 md:py-4 text-base md:text-lg font-bold shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-2",
                    submitting && "opacity-70 cursor-not-allowed"
                  )}
                >
                  {submitting ? (
                    <Loader2 size={24} className="animate-spin" />
                  ) : (
                    <>
                      <Check size={24} />
                      <span>{editingBranch ? 'حفظ التعديلات' : 'إضافة الفرع'}</span>
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Branches;
