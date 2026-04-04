import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { Invoice, Branch, DeliveryCompany } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale/ar';
import { FileText, Calendar, Truck, Building2, Eye, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

const Invoices: React.FC = () => {
  const { profile } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [branches, setBranches] = useState<Record<string, Branch>>({});
  const [deliveryCompanies, setDeliveryCompanies] = useState<Record<string, DeliveryCompany>>({});
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    const fetchMetadata = async () => {
      const branchesSnap = await getDocs(collection(db, 'branches'));
      const bMap: Record<string, Branch> = {};
      branchesSnap.forEach(doc => bMap[doc.id] = { id: doc.id, ...doc.data() } as Branch);
      setBranches(bMap);

      const deliverySnap = await getDocs(collection(db, 'delivery_companies'));
      const dMap: Record<string, DeliveryCompany> = {};
      deliverySnap.forEach(doc => dMap[doc.id] = { id: doc.id, ...doc.data() } as DeliveryCompany);
      setDeliveryCompanies(dMap);
    };
    fetchMetadata();
  }, []);

  useEffect(() => {
    if (!profile?.uid) return;

    const fetchInvoices = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'invoices'),
          where('employee_id', '==', profile.uid),
          orderBy('date', 'desc'),
          limit(20)
        );
        const snap = await getDocs(q);
        setInvoices(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, [profile]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-gray-900">فواتيري</h2>
        <p className="text-gray-500">آخر الفواتير التي قمت برفعها</p>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
              <FileText size={32} className="text-gray-300" />
            </div>
            <p className="text-gray-400 font-bold">لم تقم برفع أي فواتير بعد</p>
          </div>
        ) : (
          invoices.map((invoice) => (
            <motion.div
              key={invoice.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-primary">{invoice.invoice_number}</p>
                  <h3 className="text-lg font-bold text-gray-900">{branches[invoice.branch_id]?.name}</h3>
                  <p className="text-xs text-gray-500">{format(new Date(invoice.date), 'dd MMMM yyyy - hh:mm a', { locale: ar })}</p>
                </div>
                <div className="bg-gray-50 px-3 py-1 rounded-full">
                  <span className="text-[10px] font-bold text-gray-500">{deliveryCompanies[invoice.delivery_company_id]?.name}</span>
                </div>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {invoice.image_urls.map((url, i) => (
                  <div
                    key={i}
                    onClick={() => setSelectedInvoice(invoice)}
                    className="flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-gray-100 cursor-pointer"
                  >
                    <img src={url} alt="invoice" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>

              <button
                onClick={() => setSelectedInvoice(invoice)}
                className="w-full py-3 bg-gray-50 rounded-2xl text-primary text-xs font-bold flex items-center justify-center gap-2"
              >
                <Eye size={14} />
                <span>عرض التفاصيل</span>
              </button>
            </motion.div>
          ))
        )}
      </div>

      {/* Invoice Detail Modal */}
      <AnimatePresence>
        {selectedInvoice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedInvoice(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-[40px] overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold">تفاصيل الفاتورة</h3>
                  <button onClick={() => setSelectedInvoice(null)} className="p-2 bg-gray-100 rounded-full">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-2xl">
                      <p className="text-[10px] font-bold text-gray-400 mb-1">رقم الفاتورة</p>
                      <p className="font-bold text-gray-900">{selectedInvoice.invoice_number}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl">
                      <p className="text-[10px] font-bold text-gray-400 mb-1">الفرع</p>
                      <p className="font-bold text-gray-900">{branches[selectedInvoice.branch_id]?.name}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl">
                      <p className="text-[10px] font-bold text-gray-400 mb-1">شركة التوصيل</p>
                      <p className="font-bold text-gray-900">{deliveryCompanies[selectedInvoice.delivery_company_id]?.name}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl">
                      <p className="text-[10px] font-bold text-gray-400 mb-1">التاريخ</p>
                      <p className="font-bold text-gray-900">{format(new Date(selectedInvoice.date), 'yyyy-MM-dd')}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-gray-400 mr-1">الصور</p>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedInvoice.image_urls.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noreferrer" className="rounded-2xl overflow-hidden border border-gray-100 aspect-square">
                          <img src={url} alt="invoice" className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Invoices;
