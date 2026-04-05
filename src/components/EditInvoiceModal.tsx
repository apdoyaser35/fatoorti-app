import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { uploadImageToCloudinary } from '../lib/cloudinary';
import { Branch, DeliveryCompany, Invoice } from '../types';
import imageCompression from 'browser-image-compression';
import { Camera, X, CheckCircle2, AlertCircle, Loader2, FileText as FileIcon, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface EditInvoiceModalProps {
  invoice: Invoice;
  branchesMap: Record<string, Branch>;
  deliveryMap: Record<string, DeliveryCompany>;
  onClose: () => void;
  onSuccess: (updated: Partial<Invoice>) => void;
}

export const EditInvoiceModal: React.FC<EditInvoiceModalProps> = ({ invoice, branchesMap, deliveryMap, onClose, onSuccess }) => {
  const branches = Object.values(branchesMap);
  const deliveryCompanies = Object.values(deliveryMap);

  const [selectedBranch, setSelectedBranch] = useState<string>(invoice.branch_id);
  const [selectedDelivery, setSelectedDelivery] = useState<string>(invoice.delivery_company_id || '');
  const [notes, setNotes] = useState<string>(invoice.notes || '');
  const [files, setFiles] = useState<(File | string)[]>([]);
  const [previews, setPreviews] = useState<{ url: string; type: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Load existing files
    const existingFiles = invoice.attachments?.length ? invoice.attachments : (invoice.image_urls || []);
    setFiles(existingFiles);
    
    setPreviews(existingFiles.map((url, i) => {
      const isPdf = url.toLowerCase().includes('.pdf');
      return {
        url,
        type: isPdf ? 'application/pdf' : 'image/jpeg',
        name: isPdf ? `ملف_سابق_${i + 1}.pdf` : `صورة_سابقة_${i + 1}.jpg`
      };
    }));
  }, [invoice]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const processedFiles = await Promise.all(
        newFiles.map(async (file: File) => {
          if (file.type === 'application/pdf') return file;
          return await imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1600, useWebWorker: true });
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
        processedFile = await imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1600, useWebWorker: true });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBranch || files.length === 0) {
      setError('يرجى اختيار الفرع وإرفاق ملف أو صورة واحدة على الأقل');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const finalAttachmentUrls = await Promise.all(
        files.map(file =>
          typeof file === 'string'
            ? Promise.resolve(file)
            : uploadImageToCloudinary(file)
        )
      );

      const updates: Partial<Invoice> = {
        branch_id: selectedBranch,
        delivery_company_id: selectedDelivery || "",
        notes: notes.trim(),
        attachments: finalAttachmentUrls,
      };

      await updateDoc(doc(db, 'invoices', invoice.id), updates);
      onSuccess(updates);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'حدث خطأ أثناء حفظ التعديلات');
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="bg-white w-full max-w-md rounded-t-[40px] p-6 md:p-8 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl md:text-2xl font-bold">تعديل الفاتورة</h3>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full active:scale-95">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
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
                    "relative p-3 md:p-4 rounded-[24px] border-2 transition-all text-right flex flex-col gap-2 md:gap-3 overflow-hidden active:scale-95",
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
                    "relative p-3 md:p-4 rounded-[24px] border-2 transition-all text-right flex flex-col gap-2 md:gap-3 overflow-hidden active:scale-95",
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
              className="w-full bg-white border-2 border-gray-100 rounded-[24px] p-3 md:p-4 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none resize-none min-h-[100px]"
            />
          </div>

          {/* File Upload */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-gray-700 mr-1">صور الفاتورة / ملفات PDF</label>
            <div className="grid grid-cols-3 gap-3">
              <AnimatePresence>
                {previews.map((preview, index) => (
                  <motion.div
                    key={`${preview.url}-${index}`}
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
            <div className="flex items-center gap-2 text-destructive text-sm font-bold bg-destructive/10 p-3 md:p-4 rounded-2xl">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
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
              <Loader2 className="animate-spin" size={24} />
            ) : (
              <>
                <CheckCircle2 size={24} />
                <span>حفظ التعديلات</span>
              </>
            )}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
};
