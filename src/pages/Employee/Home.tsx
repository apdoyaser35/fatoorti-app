import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, where, getDocs, getCountFromServer, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { uploadImageToCloudinary } from '../../lib/cloudinary';
import { useAuth } from '../../contexts/AuthContext';
import { Branch, DeliveryCompany, Invoice } from '../../types';
import imageCompression from 'browser-image-compression';
import { Camera, Upload, X, CheckCircle2, AlertCircle, Loader2, FileText as FileIcon, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { format, startOfDay, endOfDay } from 'date-fns';
import { ar } from 'date-fns/locale/ar';

const Home: React.FC = () => {
  const { profile } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [deliveryCompanies, setDeliveryCompanies] = useState<DeliveryCompany[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>(profile?.branch_id || '');
  const [selectedDelivery, setSelectedDelivery] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>(profile?.phone_number || '');
  const [notes, setNotes] = useState<string>('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<{url: string, type: string, name: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const branchesSnap = await getDocs(collection(db, 'branches'));
        setBranches(branchesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Branch)));

        const deliverySnap = await getDocs(collection(db, 'delivery_companies'));
        setDeliveryCompanies(deliverySnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as DeliveryCompany)));
      } catch (err) {
        console.error(err);
        handleFirestoreError(err, OperationType.LIST, 'branches/delivery_companies');
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (profile?.branch_id) {
      setSelectedBranch(profile.branch_id);
    }
  }, [profile]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const processedFiles = await Promise.all(
        newFiles.map(async (file: File) => {
          if (file.type === 'application/pdf') return file;
          const compressed = await imageCompression(file, {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true
          });
          return compressed;
        })
      );
      setFiles(prev => [...prev, ...processedFiles]);

      const newPreviews = processedFiles.map(file => ({
        url: URL.createObjectURL(file),
        type: file.type,
        name: file.name
      }));
      setPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const handleReplaceFile = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      let processedFile = file;
      if (file.type !== 'application/pdf') {
        processedFile = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true });
      }
      
      setFiles(prev => {
        const newArr = [...prev];
        newArr[index] = processedFile as File;
        return newArr;
      });
      
      setPreviews(prev => {
        const newArr = [...prev];
        newArr[index] = {
          url: URL.createObjectURL(processedFile as File),
          type: file.type,
          name: file.name
        };
        return newArr;
      });
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const generateInvoiceNumber = async () => {
    const now = new Date();
    const start = startOfDay(now).toISOString();
    const end = endOfDay(now).toISOString();
    
    const invoicesRef = collection(db, 'invoices');
    const q = query(
      invoicesRef,
      where('date', '>=', start),
      where('date', '<=', end)
    );

    const snapshot = await getCountFromServer(q);
    const count = snapshot.data().count + 1;

    return String(count);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      setError('يجب تسجيل الدخول أولاً');
      return;
    }

    if (!selectedBranch || files.length === 0) {
      setError('يرجى اختيار الفرع وإرفاق ملف أو صورة واحدة على الأقل');
      return;
    }
    
    if (!profile?.phone_number && !phoneNumber) {
      setError('يرجى إدخال رقم الجوال');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const invoiceNumber = await generateInvoiceNumber();
      const attachmentUrls: string[] = [];

      for (const file of files) {
        const url = await uploadImageToCloudinary(file);
        attachmentUrls.push(url);
      }

      const now = new Date();
      const invoiceData: any = {
        invoice_number: invoiceNumber,
        date: now.toISOString(),
        branch_id: selectedBranch,
        employee_id: user.uid,
        attachments: attachmentUrls,
        createdAt: now.toISOString(),
        createdAtLocal: format(now, 'yyyy-MM-dd hh:mm a', { locale: ar }),
      };

      invoiceData.delivery_company_id = selectedDelivery || "";

      if (notes.trim()) {
        invoiceData.notes = notes.trim();
      }

      try {
        await addDoc(collection(db, 'invoices'), invoiceData);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'invoices');
      }

      // Update user profile fields if needed
      if (profile?.uid) {
        const updates: any = {};
        if (selectedBranch !== profile.branch_id) updates.branch_id = selectedBranch;
        if (!profile.phone_number && phoneNumber) updates.phone_number = phoneNumber;
        
        if (Object.keys(updates).length > 0) {
          try {
            await updateDoc(doc(db, 'users', profile.uid), updates);
          } catch (err) {
            console.warn('Could not update user profile', err);
          }
        }
      }

      setSuccess(true);
      setFiles([]);
      setPreviews([]);
      setSelectedDelivery('');
      setNotes('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'حدث خطأ أثناء رفع الفاتورة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-gray-900">رفع فاتورة جديدة</h2>
        <p className="text-gray-500">قم بتصوير الفاتورة أو الطلب ورفعه للنظام</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Phone Number Field */}
        {!profile?.phone_number && (
          <div className="space-y-3">
            <label className="text-sm font-bold text-gray-700 mr-1">رقم الجوال <span className="text-red-500">*</span></label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="مثال: 0500000000"
              className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-primary outline-none"
              required
            />
          </div>
        )}

        {/* Branch Selection */}
        <div className="space-y-3">
          <label className="text-sm font-bold text-gray-700 mr-1">الفرع</label>
          <div className="grid grid-cols-2 gap-3">
            {branches.map((branch) => (
              <button
                key={branch.id}
                type="button"
                onClick={() => setSelectedBranch(branch.id)}
                className={cn(
                  "relative p-4 rounded-[24px] border-2 transition-all text-right flex flex-col gap-3 overflow-hidden active:scale-95",
                  selectedBranch === branch.id
                    ? "border-primary bg-primary/5 ring-4 ring-primary/10"
                    : "border-gray-100 bg-white hover:border-gray-200"
                )}
              >
                <div className="w-12 h-12 shrink-0 rounded-[14px] bg-primary/10 flex items-center justify-center overflow-hidden">
                  {branch.image_url ? (
                    <img src={branch.image_url} alt={branch.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-6 h-6 rounded-md border-2 border-primary" />
                  )}
                </div>
                <div>
                  <div className="font-bold text-sm text-gray-900">{branch.name}</div>
                  <div className="text-[11px] text-gray-500 font-medium">رقم: {branch.number}</div>
                </div>
                {selectedBranch === branch.id && (
                  <div className="absolute top-3 left-3 w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center">
                    <CheckCircle2 size={12} />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Delivery Company Selection */}
        <div className="space-y-3">
          <label className="text-sm font-bold text-gray-700 mr-1">شركة التوصيل</label>
          <div className="grid grid-cols-2 gap-3">
            {deliveryCompanies.map((company) => (
              <button
                key={company.id}
                type="button"
                onClick={() => setSelectedDelivery(selectedDelivery === company.id ? '' : company.id)}
                className={cn(
                  "relative p-4 rounded-[24px] border-2 transition-all text-right flex flex-col gap-3 overflow-hidden active:scale-95",
                  selectedDelivery === company.id
                    ? "border-primary bg-primary/5 ring-4 ring-primary/10"
                    : "border-gray-100 bg-white hover:border-gray-200"
                )}
              >
                <div className="w-12 h-12 shrink-0 rounded-[14px] bg-primary/10 flex items-center justify-center overflow-hidden">
                  {company.image_url ? (
                    <img src={company.image_url} alt={company.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2 border-primary" />
                  )}
                </div>
                <div className="font-bold text-sm text-gray-900">{company.name}</div>
                {selectedDelivery === company.id && (
                  <div className="absolute top-3 left-3 w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center">
                    <CheckCircle2 size={12} />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Notes Field */}
        <div className="space-y-3">
          <label className="text-sm font-bold text-gray-700 mr-1">الملاحظات (اختياري)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="اكتب ملاحظة عن الأوردر (اختياري)"
            className="w-full bg-white border-2 border-gray-100 rounded-[24px] p-4 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none resize-none min-h-[100px]"
          />
        </div>

        {/* File Upload */}
        <div className="space-y-3">
          <label className="text-sm font-bold text-gray-700 mr-1">صور الفاتورة / ملفات PDF</label>
          <div className="grid grid-cols-3 gap-3">
            <AnimatePresence>
              {previews.map((preview, index) => (
                <motion.div
                  key={preview.url}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="relative aspect-square rounded-2xl overflow-hidden border-2 border-gray-100 shadow-sm flex flex-col items-center justify-center bg-gray-50"
                >
                  {preview.type === 'application/pdf' ? (
                    <div className="flex flex-col items-center gap-2 p-2 text-center w-full">
                      <FileIcon size={32} className="text-red-500" />
                      <span className="text-[10px] font-bold text-gray-600 truncate w-full px-2" dir="ltr">{preview.name}</span>
                    </div>
                  ) : (
                    <img src={preview.url} alt="preview" className="w-full h-full object-cover" />
                  )}
                  
                  <div className="absolute top-1 right-1 flex gap-1">
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="bg-black/50 text-white p-1 rounded-full backdrop-blur-sm hover:bg-black/70 transition"
                    >
                      <X size={14} />
                    </button>
                    <label className="bg-primary/80 text-white p-1 rounded-full backdrop-blur-sm cursor-pointer hover:bg-primary transition">
                      <RefreshCw size={14} />
                      <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => handleReplaceFile(index, e)} />
                    </label>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            <label className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-primary hover:text-primary transition-all cursor-pointer bg-gray-50/50">
              <Camera size={28} />
              <span className="text-[10px] font-bold">إضافة ملف</span>
              <input
                type="file"
                accept="image/*,application/pdf"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-destructive text-sm font-bold bg-destructive/10 p-4 rounded-2xl">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-green-600 text-sm font-bold bg-green-50 p-4 rounded-2xl"
          >
            <CheckCircle2 size={20} />
            <span>تم رفع الفاتورة بنجاح!</span>
          </motion.div>
        )}

        <button
          type="submit"
          disabled={loading}
          className={cn(
            "w-full bg-primary text-white rounded-2xl py-5 text-xl font-bold shadow-xl shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-3",
            loading && "opacity-70 cursor-not-allowed"
          )}
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={24} />
              <span>جاري الرفع...</span>
            </>
          ) : (
            <>
              <Upload size={24} />
              <span>إرسال الفاتورة</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default Home;
