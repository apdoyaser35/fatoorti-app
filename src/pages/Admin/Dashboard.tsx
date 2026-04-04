import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, limit, startAfter, Timestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Invoice, Branch, DeliveryCompany, UserProfile } from '../../types';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { ar } from 'date-fns/locale/ar';
import { Search, Calendar, Filter, Download, FileSpreadsheet, Archive, ChevronLeft, ChevronRight, Eye, MoreVertical, X, ShieldAlert, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import JSZip from 'jszip';
import html2pdf from 'html2pdf.js';

const Dashboard: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [branches, setBranches] = useState<Record<string, Branch>>({});
  const [deliveryCompanies, setDeliveryCompanies] = useState<Record<string, DeliveryCompany>>({});
  const [employees, setEmployees] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [filterBranch, setFilterBranch] = useState<string>('');
  const [filterDelivery, setFilterDelivery] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Backup feature states
  const [backupStart, setBackupStart] = useState<string>(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [backupEnd, setBackupEnd] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupSuccess, setBackupSuccess] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSingleDeleteModal, setShowSingleDeleteModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

      const employeesSnap = await getDocs(collection(db, 'users'));
      const eMap: Record<string, UserProfile> = {};
      employeesSnap.forEach(doc => eMap[doc.id] = { uid: doc.id, ...doc.data() } as UserProfile);
      setEmployees(eMap);
    };
    fetchMetadata();
  }, []);

  useEffect(() => {
    const fetchInvoices = async () => {
      setLoading(true);
      try {
        let q = query(
          collection(db, 'invoices'),
          orderBy('date', 'desc'),
          limit(50)
        );

        if (filterDate) {
          const start = startOfDay(new Date(filterDate)).toISOString();
          const end = endOfDay(new Date(filterDate)).toISOString();
          q = query(q, where('date', '>=', start), where('date', '<=', end));
        }

        if (filterBranch) {
          q = query(q, where('branch_id', '==', filterBranch));
        }

        if (filterDelivery) {
          q = query(q, where('delivery_company_id', '==', filterDelivery));
        }

        const snap = await getDocs(q);
        setInvoices(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, [filterDate, filterBranch, filterDelivery]);



  const archiveImages = async () => {
    setLoading(true);
    const zip = new JSZip();
    const folder = zip.folder(`Invoices_Images_${filterDate}`);
    
    try {
      for (const inv of invoices) {
        for (let i = 0; i < inv.image_urls.length; i++) {
          const url = inv.image_urls[i];
          const response = await fetch(url);
          const blob = await response.blob();
          folder?.file(`${format(new Date(inv.date), 'yyyy-MM-dd')}_${inv.invoice_number}_${i}.jpg`, blob);
        }
      }
      
      const jsonData = invoices.map(inv => ({
        invoice_number: inv.invoice_number,
        date: inv.createdAtLocal || format(new Date(inv.date), 'yyyy-MM-dd hh:mm a', { locale: ar }),
        branch_name: branches[inv.branch_id]?.name || 'غير معروف',
        employee_name: employees[inv.employee_id]?.username || 'غير معروف',
        delivery_company_name: inv.delivery_company_id ? (deliveryCompanies[inv.delivery_company_id]?.name || 'غير معروف') : 'بدون',
        notes: inv.notes || 'لا يوجد',
        image_urls: inv.image_urls
      }));
      folder?.file('invoices.json', JSON.stringify(jsonData, null, 2));

      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `Invoices_Images_${filterDate}.zip`;
      link.click();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const preloadImages = (urls: string[]) => {
    return Promise.all(
      urls.map((url) => {
        return new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'Anonymous';
          img.onload = () => resolve();
          img.onerror = () => reject();
          img.src = url;
        });
      })
    );
  };

  const handleExportBackup = async () => {
    setBackupLoading(true);
    setBackupSuccess(false);
    
    try {
      const start = startOfDay(new Date(backupStart)).toISOString();
      const end = endOfDay(new Date(backupEnd)).toISOString();
      
      const q = query(
        collection(db, 'invoices'),
        where('date', '>=', start),
        where('date', '<=', end),
        orderBy('date', 'asc')
      );
      
      const snap = await getDocs(q);
      const backupInvoices = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice));
      
      if (backupInvoices.length === 0) {
        setToastMessage('لا توجد بيانات في هذه الفترة');
        setTimeout(() => setToastMessage(null), 3000);
        return;
      }
      
      setToastMessage('جاري تجهيز النسخة الاحتياطية (يرجى الانتظار)...');
      
      const branchGroups: Record<string, Invoice[]> = {};
      backupInvoices.forEach(inv => {
        if (!branchGroups[inv.branch_id]) branchGroups[inv.branch_id] = [];
        branchGroups[inv.branch_id].push(inv);
      });
      
      for (const [branchId, branchInvoices] of Object.entries(branchGroups)) {
        const branchName = branches[branchId]?.name || 'Unknown Branch';
        
        const allImageUrls = branchInvoices.flatMap(inv => inv.image_urls);
        try {
          await preloadImages(allImageUrls);
        } catch (e) {
          console.warn("Some images might not have loaded correctly");
        }
        
        const container = document.createElement('div');
        container.style.width = '800px';
        container.style.padding = '20px';
        container.style.backgroundColor = '#f9fafb';
        container.style.direction = 'rtl';
        
        container.innerHTML = `
          <div style="font-family: system-ui, -apple-system, sans-serif; color: #111827;">
            <div style="text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb;">
              <h1 style="font-size: 32px; font-weight: bold; margin: 0 0 12px 0; color: #111827;">النسخة الاحتياطية الأسبوعية</h1>
              <h2 style="font-size: 22px; color: #4b5563; margin: 0 0 12px 0;">فرع: ${branchName}</h2>
              <div style="display: inline-block; background: #f3f4f6; padding: 8px 16px; border-radius: 8px;">
                <p style="font-size: 16px; color: #4b5563; margin: 0; font-weight: 500;">الفترة: من <strong style="color: #111827;">${backupStart}</strong> إلى <strong style="color: #111827;">${backupEnd}</strong></p>
              </div>
              <p style="font-size: 16px; color: #111827; margin-top: 16px; font-weight: bold;">إجمالي عدد الفواتير: ${branchInvoices.length}</p>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 40px;">
              ${branchInvoices.map((inv, index) => `
                <div style="background: white; border: 2px solid #e5e7eb; border-radius: 16px; padding: 32px; page-break-inside: avoid;">
                  
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 2px solid #f3f4f6; padding-bottom: 20px;">
                    <div>
                      <h3 style="font-size: 22px; font-weight: bold; color: #111827; margin: 0 0 8px 0;">رقم الفاتورة: ${inv.invoice_number}</h3>
                      <p style="font-size: 16px; color: #6b7280; font-weight: bold; margin: 0;">الفرع: <span style="color: #111827;">${branchName}</span></p>
                    </div>
                    <div style="text-align: left; background: #f9fafb; padding: 12px 16px; border-radius: 8px; border: 1px solid #f3f4f6;">
                      <p style="font-size: 16px; color: #4b5563; margin: 0 0 8px 0; font-weight: bold;">التاريخ: <span style="color: #111827;">${format(new Date(inv.date), 'yyyy-MM-dd')}</span></p>
                      <p style="font-size: 16px; color: #4b5563; margin: 0; font-weight: bold;">الوقت: <span style="color: #111827;">${format(new Date(inv.createdAt || inv.date), 'hh:mm a', { locale: ar })}</span></p>
                    </div>
                  </div>
                  
                  <div style="display: flex; gap: 48px; margin-bottom: 24px;">
                     <div>
                       <p style="font-size: 14px; font-weight: bold; color: #6b7280; margin: 0 0 4px 0; text-transform: uppercase;">الموظف المسجل</p>
                       <p style="font-size: 18px; font-weight: bold; color: #111827; margin: 0;">${employees[inv.employee_id]?.username || 'غير معروف'}</p>
                     </div>
                     <div>
                       <p style="font-size: 14px; font-weight: bold; color: #6b7280; margin: 0 0 4px 0; text-transform: uppercase;">شركة التوصيل</p>
                       <p style="font-size: 18px; font-weight: bold; color: #111827; margin: 0;">${inv.delivery_company_id ? (deliveryCompanies[inv.delivery_company_id]?.name || 'غير معروف') : 'بدون التوصيل'}</p>
                     </div>
                  </div>
                  
                  ${inv.notes ? `
                  <div style="margin-bottom: 32px; background: #f9fafb; border-right: 4px solid #374151; padding: 16px 20px; border-radius: 8px 0 0 8px;">
                     <p style="font-size: 14px; font-weight: bold; color: #6b7280; margin: 0 0 8px 0; text-transform: uppercase;">تفاصيل وملاحظات إضافية</p>
                     <p style="font-size: 18px; color: #111827; margin: 0; line-height: 1.6;">${inv.notes}</p>
                  </div>
                  ` : ''}
                  
                  <div>
                    <h4 style="font-size: 18px; font-weight: bold; color: #111827; margin: 0 0 16px 0; padding-bottom: 8px; border-bottom: 2px solid #f3f4f6;">المرفقات الضوئية</h4>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
                      ${inv.image_urls.map(url => `
                        <div style="border: 2px solid #e5e7eb; border-radius: 12px; overflow: hidden; background: #f9fafb; display: flex; align-items: center; justify-content: center; height: 350px;">
                          <img src="${url}" crossorigin="anonymous" style="width: 100%; height: 100%; object-fit: contain;" />
                        </div>
                      `).join('')}
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
        
        document.body.appendChild(container);
        
        const opt = {
          margin:       10,
          filename:     `backup_${branchName.replace(/\s+/g, '_')}_${backupStart}_to_${backupEnd}.pdf`,
          image:        { type: 'jpeg' as const, quality: 1.0 },
          html2canvas:  { scale: 2, useCORS: true, logging: false },
          jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
        };
        
        await html2pdf().from(container).set(opt).save();
        container.remove();
      }
      
      setBackupSuccess(true);
      setToastMessage('تم إنشاء النسخة الاحتياطية بنجاح ✔️');
      
    } catch (err) {
      console.error(err);
      setToastMessage('حدث خطأ أثناء إعداد النسخة الأسبوعية');
    } finally {
      setBackupLoading(false);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleDeleteData = async () => {
    setBackupLoading(true);
    setShowDeleteModal(false);
    
    try {
      const start = startOfDay(new Date(backupStart)).toISOString();
      const end = endOfDay(new Date(backupEnd)).toISOString();
      
      const q = query(
        collection(db, 'invoices'),
        where('date', '>=', start),
        where('date', '<=', end)
      );
      
      const snap = await getDocs(q);
      const invoicesToDelete = snap.docs;
      
      let itemsDeleted = 0;
      
      for (const invDoc of invoicesToDelete) {
        await deleteDoc(doc(db, 'invoices', invDoc.id));
        itemsDeleted++;
      }
      
      setToastMessage(`تم الحذف بنجاح! تم مسح ${itemsDeleted} فاتورة`);
      setBackupSuccess(false);
      
      if ((filterDate >= backupStart && filterDate <= backupEnd) || !filterDate) {
        window.location.reload(); 
      }
    } catch (err) {
      console.error(err);
      setToastMessage('حدث خطأ أثناء الحذف');
    } finally {
      setBackupLoading(false);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleDeleteSingleInvoice = async () => {
    if (!selectedInvoice) return;
    setLoading(true);
    setShowSingleDeleteModal(false);
    
    try {
      await deleteDoc(doc(db, 'invoices', selectedInvoice.id));
      setToastMessage('تم حذف الفاتورة بنجاح!');
      setInvoices(prev => prev.filter(inv => inv.id !== selectedInvoice.id));
      setSelectedInvoice(null);
    } catch (error) {
      console.error(error);
      setToastMessage('حدث خطأ أثناء الحذف');
    } finally {
      setLoading(false);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900">لوحة التحكم</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "p-3 rounded-2xl transition-all shadow-sm",
              showFilters ? "bg-primary text-white" : "bg-white text-gray-500 border border-gray-100"
            )}
          >
            <Filter size={20} />
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
          <p className="text-gray-500 text-xs font-bold mb-1">إجمالي الفواتير</p>
          <p className="text-3xl font-bold text-primary">{invoices.length}</p>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
          <p className="text-gray-500 text-xs font-bold mb-1">تاريخ اليوم</p>
          <p className="text-lg font-bold text-gray-900">{format(new Date(), 'dd MMMM', { locale: ar })}</p>
        </div>
      </div>

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4 mb-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 mr-1">التاريخ</label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <button
                    onClick={() => setFilterDate(format(new Date(), 'yyyy-MM-dd'))}
                    className={cn(
                      "py-2 px-3 text-xs font-bold rounded-xl transition-all border",
                      filterDate === format(new Date(), 'yyyy-MM-dd') 
                        ? "bg-primary text-white border-primary" 
                        : "bg-gray-50 text-gray-600 border-gray-100 hover:bg-gray-100"
                    )}
                  >
                    اليوم
                  </button>
                  <button
                    onClick={() => setFilterDate(format(subDays(new Date(), 1), 'yyyy-MM-dd'))}
                    className={cn(
                      "py-2 px-3 text-xs font-bold rounded-xl transition-all border",
                      filterDate === format(subDays(new Date(), 1), 'yyyy-MM-dd') 
                        ? "bg-primary text-white border-primary" 
                        : "bg-gray-50 text-gray-600 border-gray-100 hover:bg-gray-100"
                    )}
                  >
                    الأمس
                  </button>
                  <button
                    onClick={() => setFilterDate('')}
                    className={cn(
                      "py-2 px-3 text-xs font-bold rounded-xl transition-all border",
                      filterDate === '' 
                        ? "bg-primary text-white border-primary" 
                        : "bg-gray-50 text-gray-600 border-gray-100 hover:bg-gray-100"
                    )}
                  >
                    الكل
                  </button>
                </div>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 mr-1">الفرع</label>
                  <select
                    value={filterBranch}
                    onChange={(e) => setFilterBranch(e.target.value)}
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                  >
                    <option value="">الكل</option>
                    {Object.values(branches).map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 mr-1">التوصيل</label>
                  <select
                    value={filterDelivery}
                    onChange={(e) => setFilterDelivery(e.target.value)}
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                  >
                    <option value="">الكل</option>
                    {Object.values(deliveryCompanies).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invoices List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
        {loading ? (
          <div className="lg:col-span-full flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-gray-400 font-bold">جاري تحميل الفواتير...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="lg:col-span-full text-center py-20 space-y-4">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
              <Search size={32} className="text-gray-300" />
            </div>
            <p className="text-gray-400 font-bold">لا توجد فواتير لهذا اليوم</p>
          </div>
        ) : (
          invoices.map((invoice) => (
            <motion.div
              key={invoice.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col h-full"
            >
              <div className="space-y-4 flex-1">
                <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-primary">{invoice.invoice_number}</p>
                  <h3 className="text-lg font-bold text-gray-900">{branches[invoice.branch_id]?.name}</h3>
                  <p className="text-xs text-gray-500">{format(new Date(invoice.date), 'hh:mm a', { locale: ar })}</p>
                </div>
                <div className="bg-gray-50 px-3 py-1 rounded-full flex items-center h-fit">
                  <span className="text-[10px] font-bold text-gray-500">{invoice.delivery_company_id ? deliveryCompanies[invoice.delivery_company_id]?.name : 'بدون توصيل'}</span>
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
              </div>
              
              <div className="flex justify-between items-center pt-4 border-t border-gray-50 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-[10px] font-bold text-primary">{employees[invoice.employee_id]?.username?.[0]?.toUpperCase()}</span>
                  </div>
                  <span className="text-xs font-bold text-gray-600">{employees[invoice.employee_id]?.username}</span>
                </div>
                <button
                  onClick={() => setSelectedInvoice(invoice)}
                  className="text-primary text-xs font-bold flex items-center gap-1"
                >
                  <Eye size={14} />
                  <span>عرض التفاصيل</span>
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Backup and Maintenance Section */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-5">
        <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
          <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center">
            <ShieldAlert size={20} className="text-indigo-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">النسخ الاحتياطي والصيانة</h3>
            <p className="text-xs text-gray-500 font-medium mt-1">تصدير الفواتير الأسبوعية كـ PDF وحذف البيانات القديمة</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 mr-1">من تاريخ</label>
            <input
              type="date"
              value={backupStart}
              onChange={(e) => { setBackupStart(e.target.value); setBackupSuccess(false); }}
              className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 mr-1">إلى تاريخ</label>
            <input
              type="date"
              value={backupEnd}
              onChange={(e) => { setBackupEnd(e.target.value); setBackupSuccess(false); }}
              className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-4">
          <button
            onClick={archiveImages}
            disabled={loading}
            className="w-full bg-amber-600 active:bg-amber-700 hover:bg-amber-700 text-white font-bold py-4 rounded-2xl transition-colors shadow-sm disabled:opacity-70 flex items-center justify-center gap-2"
          >
            <Archive size={20} />
            <span>تحميل بيانات وصور العرض الحالي (ZIP)</span>
          </button>

          <button
            onClick={handleExportBackup}
            disabled={backupLoading}
            className="w-full bg-indigo-600 active:bg-indigo-700 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl transition-colors shadow-sm disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {backupLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Download size={20} />
                <span>تصدير نسخة PDF الأسبوعية</span>
              </>
            )}
          </button>

          <button
            onClick={() => setShowDeleteModal(true)}
            disabled={!backupSuccess || backupLoading}
            className={cn(
              "w-full font-bold py-4 rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2 border",
              backupSuccess && !backupLoading
                ? "bg-red-50 text-red-600 border-red-100 hover:bg-red-100 active:bg-red-200"
                : "bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed"
            )}
          >
            <Trash2 size={20} />
            <span>حذف بيانات الأسبوع</span>
          </button>
          {!backupSuccess && (
             <p className="text-[10px] text-center text-amber-600 font-bold mt-1">يجب تصدير النسخة الاحتياطية بنجاح أولاً لتتمكن من الحذف</p>
          )}
        </div>
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
                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowSingleDeleteModal(true)} className="p-2 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition-colors">
                      <Trash2 size={20} />
                    </button>
                    <button onClick={() => setSelectedInvoice(null)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                      <X size={20} />
                    </button>
                  </div>
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
                      <p className="text-[10px] font-bold text-gray-400 mb-1">التاريخ</p>
                      <p className="font-bold text-gray-900">{format(new Date(selectedInvoice.date), 'yyyy-MM-dd')}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl">
                      <p className="text-[10px] font-bold text-gray-400 mb-1">الوقت</p>
                      <p className="font-bold text-gray-900">{format(new Date(selectedInvoice.createdAt || selectedInvoice.date), 'hh:mm a', { locale: ar })}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl">
                      <p className="text-[10px] font-bold text-gray-400 mb-1">الموظف</p>
                      <p className="font-bold text-gray-900">{employees[selectedInvoice.employee_id]?.username}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl">
                      <p className="text-[10px] font-bold text-gray-400 mb-1">شركة التوصيل</p>
                      <p className="font-bold text-gray-900">{selectedInvoice.delivery_company_id ? deliveryCompanies[selectedInvoice.delivery_company_id]?.name : 'بدون'}</p>
                    </div>
                  </div>

                  {selectedInvoice.notes && (
                    <div className="bg-yellow-50/50 border border-yellow-100 p-4 rounded-2xl">
                      <p className="text-[10px] font-bold text-yellow-600 mb-1">الملاحظات</p>
                      <p className="font-bold text-gray-900">{selectedInvoice.notes}</p>
                    </div>
                  )}

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

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl p-6"
            >
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              
              <h3 className="text-xl font-bold text-center text-gray-900 mb-2">تأكيد الحذف</h3>
              <p className="text-sm text-center text-red-600 font-bold mb-4 bg-red-50 p-3 rounded-xl border border-red-100 leading-relaxed">
                تحذير: هل أنت متأكد من حذف بيانات هذا الأسبوع؟ لن تتمكن من استرجاع هذه البيانات (الفواتير والصور) بعد الحذف.
              </p>
              
              <div className="grid grid-cols-2 gap-3 mt-6">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="py-3 bg-gray-100 text-gray-700 font-bold rounded-xl active:bg-gray-200 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleDeleteData}
                  className="py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl active:bg-red-800 transition-colors"
                >
                  نعم، احذف البيانات
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Single Delete Confirmation Modal */}
      <AnimatePresence>
        {showSingleDeleteModal && selectedInvoice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl p-6"
            >
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              
              <h3 className="text-xl font-bold text-center text-gray-900 mb-2">تأكيد حذف الفاتورة</h3>
              <p className="text-sm text-center text-red-600 font-bold mb-6 bg-red-50 p-3 rounded-xl border border-red-100 leading-relaxed">
                هل أنت متأكد من حذف هذه الفاتورة ({selectedInvoice.invoice_number})؟ لن تتمكن من استرجاع البيانات المرفقة.
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowSingleDeleteModal(false)}
                  className="py-3 bg-gray-100 text-gray-700 font-bold rounded-xl active:bg-gray-200 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleDeleteSingleInvoice}
                  className="py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl active:bg-red-800 transition-colors"
                >
                  نعم، احذف الفاتورة
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center justify-center gap-2"
          >
            <span className="text-sm font-bold text-center whitespace-nowrap">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
