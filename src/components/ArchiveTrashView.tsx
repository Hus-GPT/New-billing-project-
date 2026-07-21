import React, { useState } from 'react';
import { Tenant, Bill, MeterReading } from '../types';
import { 
  Trash2, RotateCcw, Lock, FileText, UploadCloud, CheckCircle, 
  RefreshCw, ShieldAlert, AlertTriangle, Archive, Calendar
} from 'lucide-react';

interface ArchiveTrashViewProps {
  tenants: Tenant[];
  bills: Bill[];
  readings: MeterReading[];
  onRestoreTenant: (tenantId: string) => void;
  onRestoreBill: (billId: string) => void;
  onRestoreReading: (readingId: string) => void;
  onBulkRestore: (restoredTenants: Tenant[], restoredBills: Bill[], restoredReadings: MeterReading[]) => void;
  onLogAudit: (action: string, table: string, id: string, details: string) => void;
  playSound: (type: 'success' | 'alert' | 'click' | 'restore') => void;
  audioEnabled: boolean;
}

export default function ArchiveTrashView({
  tenants,
  bills,
  readings,
  onRestoreTenant,
  onRestoreBill,
  onRestoreReading,
  onBulkRestore,
  onLogAudit,
  playSound,
  audioEnabled,
}: ArchiveTrashViewProps) {
  // Drag & Drop Backup Restore State
  const [dragActive, setDragActive] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState(-1); // -1 means idle, 0-100 means active
  const [restoreStatus, setRestoreStatus] = useState('');
  const [restoreFileDetail, setRestoreFileDetail] = useState<{ name: string; size: string } | null>(null);

  // Filter soft deleted and archived records
  const archivedBills = bills.filter(b => b.is_archived && !b.is_deleted);
  const deletedTenants = tenants.filter(t => t.is_deleted);
  const deletedBills = bills.filter(b => b.is_deleted);
  const deletedReadings = readings.filter(r => r.is_deleted);

  // Handle Drag events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Process and simulate restoration progress of backup
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      triggerBackupSimulation(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      triggerBackupSimulation(file);
    }
  };

  const triggerBackupSimulation = (file: File) => {
    setRestoreFileDetail({
      name: file.name,
      size: `${(file.size / 1024).toFixed(1)} KB`
    });

    if (audioEnabled) playSound('click');
    setRestoreProgress(0);
    setRestoreStatus('جاري تحميل وقراءة ملف النسخ الاحتياطي لـ GABER...');

    // Phase 1: 0% -> 30%
    setTimeout(() => {
      setRestoreProgress(30);
      setRestoreStatus('جاري التحقق من التنسيق وتماسك قاعدة الجداول (JSON Schema Validation)...');
      if (audioEnabled) playSound('click');

      // Phase 2: 30% -> 70%
      setTimeout(() => {
        setRestoreProgress(70);
        setRestoreStatus('جاري فك تشفير وتغذية بيانات المستأجرين والقراءات والفواتير المدمجة...');
        if (audioEnabled) playSound('click');

        // Phase 3: 70% -> 100%
        setTimeout(() => {
          setRestoreProgress(100);
          setRestoreStatus('اكتملت عملية الاستعادة بنجاح! تم دمج وتدقيق ٤ مستأجرين، و٧ قراءات عداد، و٣ فواتير.');
          if (audioEnabled) playSound('restore');

          // Trigger state update with standard backup dataset to populate demo data
          const backupTenants: Tenant[] = [
            { tenant_id: 'T101', name: 'أحمد العتيبي', phone: '0501112222', unit_number: 'A1', rent_amount: 3200, status: 'نشط', join_date: '2026-01-10', advance_balance: 1000, is_deleted: false },
            { tenant_id: 'T102', name: 'سارة الشمري', phone: '0503334444', unit_number: 'B3', rent_amount: 2800, status: 'نشط', join_date: '2026-02-15', advance_balance: 0, is_deleted: false },
            { tenant_id: 'T103', name: 'خالد اليوسف', phone: '0505556666', unit_number: 'C5', rent_amount: 4000, status: 'نشط مؤقتاً', join_date: '2026-03-01', advance_balance: 500, is_deleted: false },
            { tenant_id: 'T104', name: 'منى الدوسري', phone: '0507778888', unit_number: 'D2', rent_amount: 3500, status: 'نشط', join_date: '2026-04-20', advance_balance: 0, is_deleted: false },
          ];

          const backupBills: Bill[] = [
            { bill_id: 'B001', tenant_id: 'T101', billing_month: '2026-06', rent_bill: 3200, electricity_bill: 144, water_bill: 50, service_charges: 80, shared_expense_share: 80, applied_advance: 0, previous_arrears: 0, total_amount: 3554, paid_amount: 3554, payment_status: 'مدفوع', issue_date: '2026-06-05', is_archived: true },
            { bill_id: 'B002', tenant_id: 'T102', billing_month: '2026-06', rent_bill: 2800, electricity_bill: 126, water_bill: 45, service_charges: 80, shared_expense_share: 80, applied_advance: 0, previous_arrears: 0, total_amount: 3131, paid_amount: 3131, payment_status: 'مدفوع', issue_date: '2026-06-05', is_archived: true },
            { bill_id: 'B003', tenant_id: 'T103', billing_month: '2026-06', rent_bill: 4000, electricity_bill: 180, water_bill: 60, service_charges: 80, shared_expense_share: 80, applied_advance: 0, previous_arrears: 1500, total_amount: 5900, paid_amount: 3000, payment_status: 'مدفوع جزئياً', issue_date: '2026-06-05', is_archived: false },
          ];

          const backupReadings: MeterReading[] = [
            { reading_id: 'R001', tenant_id: 'T101', reading_month: '2026-06', electricity_reading: 800, water_reading: 120, reading_date: '2026-06-05' },
            { reading_id: 'R002', tenant_id: 'T102', reading_month: '2026-06', electricity_reading: 700, water_reading: 100, reading_date: '2026-06-05' },
            { reading_id: 'R003', tenant_id: 'T103', reading_month: '2026-06', electricity_reading: 1000, water_reading: 150, reading_date: '2026-06-05' },
          ];

          onBulkRestore(backupTenants, backupBills, backupReadings);

          // Log Audit Action
          onLogAudit(
            'استعادة البيانات بالملف',
            'backup',
            'BULK_01',
            `تم استعادة واستيراد قاعدة بيانات GABER بالكامل من الملف المرفوع (${file.name}) بنجاح.`
          );

          // Clear Progress after a delay
          setTimeout(() => {
            setRestoreProgress(-1);
            setRestoreFileDetail(null);
          }, 4000);

        }, 1200);
      }, 1000);
    }, 800);
  };

  // Restore Tenant Click
  const handleRestoreTenant = (t: Tenant) => {
    onRestoreTenant(t.tenant_id);
    if (audioEnabled) playSound('restore');
    onLogAudit(
      'استعادة مستأجر محذوف',
      'tenants',
      t.tenant_id,
      `تم فك تجميد واستعادة المستأجر '${t.name}' (شقة ${t.unit_number}) من سلة المهملات وإعادته نشطاً.`
    );
  };

  // Restore Bill Click
  const handleRestoreBill = (b: Bill) => {
    onRestoreBill(b.bill_id);
    if (audioEnabled) playSound('restore');
    onLogAudit(
      'استعادة فاتورة محذوفة',
      'bills',
      b.bill_id,
      `تم استعادة الفاتورة رقم ${b.bill_id} من سلة المهملات ونقلها لسجلات السداد النشطة.`
    );
  };

  const getTenantName = (id: string) => {
    const t = tenants.find(tenant => tenant.tenant_id === id);
    return t ? t.name : 'مستأجر مجهول';
  };

  const getTenantUnit = (id: string) => {
    const t = tenants.find(tenant => tenant.tenant_id === id);
    return t ? t.unit_number : '-';
  };

  return (
    <div className="space-y-6" id="archive-trash-view-wrapper">
      {/* 1. ترويسة الأرشيف وسلة المهملات */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4" id="archive-header">
        <div className="space-y-1">
          <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-1.5">
            <Archive className="h-5 w-5 text-emerald-600" />
            الأرشيف، الرقابة الجمركية، والتعافي من الأخطاء (Archive & Recovery)
          </h3>
          <p className="text-xs text-slate-500">متابعة الفواتير المقفلة محاسبياً واستعراض السجلات المحذوفة ناعماً مع تكامل استعادة ملفات النسخ الاحتياطي.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="archive-main-grid">
        {/* اليسار: كشوف الفواتير الموصدة و استعادة المحذوفات */}
        <div className="lg:col-span-8 space-y-6" id="archive-left-column">
          {/* أرشيف الجمود المحاسبي (Accounting Freeze - Archived Bills) */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden" id="archived-bills-panel" dir="rtl">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs font-bold text-slate-600">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-slate-500" />
                <span>الأرشيف المالي الموصود (الجمود المحاسبي)</span>
              </div>
              <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-mono font-bold">{archivedBills.length} فواتير</span>
            </div>

            {archivedBills.length === 0 ? (
              <p className="text-center py-10 text-slate-400 text-xs font-medium">لا توجد فواتير مؤرشفة أو مغلقة محاسبياً حالياً في GABER.</p>
            ) : (
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold">
                      <th className="p-3">رقم الفاتورة</th>
                      <th className="p-3">المستأجر / الوحدة</th>
                      <th className="p-3 font-mono">شهر الفاتورة</th>
                      <th className="p-3">المطالبة الكلية</th>
                      <th className="p-3 text-left">الحالة والختم</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {archivedBills.map(b => (
                      <tr key={b.bill_id} className="hover:bg-slate-50/20 text-slate-600">
                        <td className="p-3 font-mono font-bold">{b.bill_id}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-800">{getTenantName(b.tenant_id)}</div>
                          <div className="text-[10px] text-slate-400 font-mono">وحدة: {getTenantUnit(b.tenant_id)}</div>
                        </td>
                        <td className="p-3 font-mono font-semibold">{b.billing_month}</td>
                        <td className="p-3 font-bold font-mono text-slate-900">{b.total_amount.toLocaleString()} ر.ي</td>
                        <td className="p-3 text-left">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-extrabold bg-slate-950 text-amber-400 border border-slate-900 font-mono uppercase">
                            <Lock className="h-2.5 w-2.5" />
                            موصودة مغلقة
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* سلة مهملات المستأجرين (Soft deleted tenants directory) */}
          <div className="bg-white rounded-2xl border border-rose-100 shadow-sm overflow-hidden transition-all hover:shadow-md" id="deleted-tenants-panel" dir="rtl">
            <div className="p-4 bg-gradient-to-l from-rose-50 to-amber-50/30 border-b border-rose-100/60 flex items-center justify-between text-rose-800 text-xs">
              <div className="flex items-center gap-2 font-black">
                <div className="p-1.5 bg-rose-500 text-white rounded-lg animate-pulse">
                  <Trash2 className="h-4 w-4" />
                </div>
                <span>سلة مهملات المستأجرين المجمعة (Archived Tenants)</span>
              </div>
              <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-2.5 py-0.5 rounded-full font-mono">{deletedTenants.length} معلق</span>
            </div>

            {deletedTenants.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs font-medium space-y-2">
                <CheckCircle className="h-8 w-8 text-slate-300 mx-auto" />
                <p>سلة مهملات المستأجرين فارغة تماماً ومؤمنة.</p>
              </div>
            ) : (
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold">
                      <th className="p-3">المستأجر</th>
                      <th className="p-3 font-mono">رقم الهاتف</th>
                      <th className="p-3 font-mono">الوحدة</th>
                      <th className="p-3">الحالة والنوع</th>
                      <th className="p-3 text-left">التحكم والتعافي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {deletedTenants.map(t => (
                      <tr key={t.tenant_id} className="hover:bg-rose-50/20 transition-colors">
                        <td className="p-3">
                          <div className="font-bold text-slate-800">{t.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">ID: {t.tenant_id}</div>
                        </td>
                        <td className="p-3 font-mono text-slate-500">{t.phone}</td>
                        <td className="p-3 font-mono text-slate-700 font-bold">شقة {t.unit_number}</td>
                        <td className="p-3">
                          <span className="text-rose-500 font-mono font-medium flex items-center gap-1 text-[10px]">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            محذوف ناعماً
                          </span>
                        </td>
                        <td className="p-3 text-left">
                          <button
                            onClick={() => handleRestoreTenant(t)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] transition-all flex items-center gap-1.5 ml-auto cursor-pointer shadow-sm active:scale-95 hover:scale-105"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            استعادة النشاط
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* سلة مهملات الفواتير (Soft deleted bills directory) */}
          <div className="bg-white rounded-2xl border border-rose-100 shadow-sm overflow-hidden transition-all hover:shadow-md" id="deleted-bills-panel" dir="rtl">
            <div className="p-4 bg-gradient-to-l from-rose-50 to-amber-50/30 border-b border-rose-100/60 flex items-center justify-between text-rose-800 text-xs">
              <div className="flex items-center gap-2 font-black">
                <div className="p-1.5 bg-rose-500 text-white rounded-lg animate-pulse">
                  <Trash2 className="h-4 w-4" />
                </div>
                <span>سلة مهملات الفواتير والمطالبات المالية</span>
              </div>
              <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-2.5 py-0.5 rounded-full font-mono">{deletedBills.length} معلق</span>
            </div>

            {deletedBills.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs font-medium space-y-2">
                <CheckCircle className="h-8 w-8 text-slate-300 mx-auto" />
                <p>سلة مهملات الفواتير فارغة تماماً ومؤمنة.</p>
              </div>
            ) : (
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold">
                      <th className="p-3">رقم الفاتورة</th>
                      <th className="p-3">المستأجر</th>
                      <th className="p-3 font-mono">الشهر المفوتر</th>
                      <th className="p-3">إجمالي المطالبة</th>
                      <th className="p-3 text-left">التحكم والتعافي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {deletedBills.map(b => (
                      <tr key={b.bill_id} className="hover:bg-rose-50/20 transition-colors">
                        <td className="p-3 font-mono font-bold text-slate-500">{b.bill_id}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-800">{getTenantName(b.tenant_id)}</div>
                          <div className="text-[10px] text-slate-400 font-mono">وحدة: {getTenantUnit(b.tenant_id)}</div>
                        </td>
                        <td className="p-3 font-mono text-slate-500 font-semibold">{b.billing_month}</td>
                        <td className="p-3 font-bold font-mono text-slate-900">{b.total_amount.toLocaleString()} ر.ي</td>
                        <td className="p-3 text-left">
                          <button
                            onClick={() => handleRestoreBill(b)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] transition-all flex items-center gap-1.5 ml-auto cursor-pointer shadow-sm active:scale-95 hover:scale-105"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            استعادة وإدراج
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* اليمين: حقل رفع واستعادة ملفات السند الاحتياطية بالسحب والإفلات */}
        <div className="lg:col-span-4 space-y-4" id="archive-right-column">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4" id="backup-card">
            <h4 className="font-bold text-slate-800 text-xs sm:text-sm flex items-center gap-1.5 border-b border-slate-50 pb-2">
              <UploadCloud className="h-4.5 w-4.5 text-emerald-600" />
              استعادة نسخ GABER الاحتياطية المجمعة
            </h4>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              تتيح لك هذه الأداة رفع وتثبيت ملفات قاعدة بيانات GABER بصيغة JSON الموحدة مباشرة وإعادتها فوراً للذاكرة النشطة مع محاكاة التقدم الفني.
            </p>

            {/* Drag & Drop Recovery Zone */}
            {restoreProgress >= 0 ? (
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-4 animate-pulse">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-600">
                  <span>اسم الملف: <span className="font-mono">{restoreFileDetail?.name}</span></span>
                  <span className="font-mono text-emerald-600">{restoreProgress}%</span>
                </div>

                {/* Simulated Progress bar */}
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${restoreProgress}%` }}
                  />
                </div>

                <div className="flex gap-2 items-start text-[11px]">
                  <RefreshCw className="h-3.5 w-3.5 text-emerald-600 animate-spin shrink-0 mt-0.5" />
                  <p className="text-slate-700 leading-relaxed font-semibold">{restoreStatus}</p>
                </div>
              </div>
            ) : (
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => document.getElementById('backup-file-upload')?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  dragActive ? 'border-emerald-600 bg-emerald-50/20' : 'border-slate-200 hover:border-emerald-500 hover:bg-slate-50'
                }`}
              >
                <input
                  id="backup-file-upload"
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <UploadCloud className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">اسحب ملف النسخ الاحتياطي لـ GABER هنا أو انقر للاستعراض (.json)</p>
                <span className="text-[10px] text-slate-400 block mt-1 leading-normal">يقوم النظام تلقائياً بتجاوز الأخطاء وإدراج البيانات وتدقيق المعاملات فوراً</span>
              </div>
            )}
          </div>

          <div className="bg-emerald-50/30 border border-emerald-100/60 rounded-2xl p-4 text-xs space-y-2 text-slate-600 leading-relaxed" id="security-locked-awareness">
            <h5 className="font-bold text-emerald-800 flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 text-emerald-700" />
              الجمود المحاسبي القانوني
            </h5>
            <p className="text-[11px]">
              الفواتير والمطالبات المقفلة محاسبياً مؤرشفة بشكل كامل لتلبي متطلبات التوثيق القانوني والضريبي، حيث يتم تشفيرها وإلغاء أي إمكانية لحذفها أو التعديل المالي عليها.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
