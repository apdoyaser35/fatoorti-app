import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { uploadImageToCloudinary } from '../../lib/cloudinary';
import { DeliveryCompany } from '../../types';
import { Plus, Trash2, Edit2, X, Check, Truck, Camera, Loader2 } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import OptimizedImage from '../../components/OptimizedImage';

const DeliveryCompanies: React.FC = () => {
  const [companies, setCompanies] = useState<DeliveryCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editingCompany, setEditingCompany] = useState<DeliveryCompany | null>(null);
  const [name, setName] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    setLoading(true);
    const snap = await getDocs(collection(db, 'delivery_companies'));
    setCompanies(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as DeliveryCompany)));
    setLoading(false);
  };

  const resetForm = () => {
    setShowAdd(false);
    setEditingCompany(null);
    setName('');
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
    if (!name) return;
    setSubmitting(true);
    
    try {
      let imageUrl = '';
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }
      await addDoc(collection(db, 'delivery_companies'), { name, image_url: imageUrl });
      resetForm();
      fetchCompanies();
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء إضافة الشركة');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany || !name) return;
    setSubmitting(true);

    try {
      let imageUrl = editingCompany.image_url || '';
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }
      await updateDoc(doc(db, 'delivery_companies', editingCompany.id), { name, image_url: imageUrl });
      resetForm();
      fetchCompanies();
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء تعديل بيانات الشركة');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذه الشركة؟')) {
      await deleteDoc(doc(db, 'delivery_companies', id));
      fetchCompanies();
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">شركات التوصيل</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="md:col-span-2 flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : companies.length === 0 ? (
          <div className="md:col-span-2 text-center py-20 text-gray-400 font-bold">لا توجد شركات مضافة</div>
        ) : (
          companies.map((company) => (
            <motion.div
              key={company.id}
              layout
              className="bg-white p-4 rounded-[28px] border border-gray-100 shadow-sm flex items-center justify-between gap-4 active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-primary/10 flex items-center justify-center shrink-0 shadow-inner">
                  {company.image_url ? (
                    <OptimizedImage src={company.image_url} alt={company.name} className="w-full h-full object-cover" cloudinaryWidth={128} />
                  ) : (
                    <Truck size={28} className="text-primary" />
                  )}
                </div>
                <h3 className="font-bold text-lg text-gray-900 leading-tight">{company.name}</h3>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    setEditingCompany(company);
                    setName(company.name);
                    setImagePreview(company.image_url || '');
                    setShowAdd(true);
                  }}
                  className="p-2.5 text-gray-400 bg-gray-50 rounded-full hover:bg-gray-100 hover:text-primary transition-colors"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(company.id)}
                  className="p-2.5 text-gray-400 bg-red-50 rounded-full hover:bg-red-100 hover:text-destructive transition-colors"
                >
                  <Trash2 size={16} className="text-destructive" />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-24 left-6 w-14 h-14 bg-primary text-white rounded-full shadow-lg shadow-primary/30 flex items-center justify-center transition-all active:scale-90 z-40"
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
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-end justify-center"
            onClick={resetForm}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-white w-full max-w-md rounded-t-[40px] p-8 space-y-8 max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold">{editingCompany ? 'تعديل شركة' : 'شركة جديدة'}</h3>
                <button onClick={resetForm} className="p-2 bg-gray-100 rounded-full active:scale-95">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={editingCompany ? handleUpdate : handleAdd} className="space-y-6">
                
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
                  <p className="text-xs text-gray-500 font-medium">اضغط لاختيار شعار الشركة</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 ml-1">اسم الشركة</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="مثال: هنقرستيشن"
                      className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-lg focus:ring-2 focus:ring-primary outline-none"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className={cn(
                    "w-full bg-primary text-white rounded-2xl py-4 text-lg font-bold shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-2",
                    submitting && "opacity-70 cursor-not-allowed"
                  )}
                >
                  {submitting ? (
                    <Loader2 size={24} className="animate-spin" />
                  ) : (
                    <>
                      <Check size={24} />
                      <span>{editingCompany ? 'حفظ التعديلات' : 'إضافة الشركة'}</span>
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

export default DeliveryCompanies;
