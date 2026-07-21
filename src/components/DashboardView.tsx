import React, { useState, useEffect } from 'react';
import { Tenant, Bill, MeterReading, Notification, PriceSettings, AuditLog } from '../types';
import { 
  Building2, Sparkles, TrendingUp, DollarSign, Users, AlertCircle, 
  Clock, CheckCircle, Smartphone, Send, Calendar, Landmark, 
  Volume2, VolumeX, ShieldAlert, X, ChevronLeft, Zap, Droplet, RefreshCw, Activity
} from 'lucide-react';

interface DashboardViewProps {
  tenants: Tenant[];
  bills: Bill[];
  readings: MeterReading[];
  prices: PriceSettings;
  notifications: Notification[];
  onMarkAllNotificationsRead: () => void;
  onAddReading: (reading: MeterReading) => void;
  onAddBill: (bill: Bill) => void;
  onRecordPayment: (billId: string, amount: number) => void;
  onAddAdvancePayment: (tenantId: string, amount: number, notes: string) => void;
  onLogAudit: (action: string, table: string, id: string, details: string) => void;
  playSound: (type: 'success' | 'alert' | 'click' | 'restore') => void;
  audioEnabled: boolean;
  autoRefreshEnabled: boolean;
  smartSummary: string;
  isSummaryLoading: boolean;
  onRefreshSmartSummary: () => Promise<void>;
}

export default function DashboardView({
  tenants,
  bills,
  readings,
  prices,
  notifications,
  onMarkAllNotificationsRead,
  onAddReading,
  onAddBill,
  onRecordPayment,
  onAddAdvancePayment,
  onLogAudit,
  playSound,
  audioEnabled,
  autoRefreshEnabled,
  smartSummary,
  isSummaryLoading,
  onRefreshSmartSummary,
}: DashboardViewProps) {
  const [selectedApartmentTenant, setSelectedApartmentTenant] = useState<Tenant | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showQuickEntry, setShowQuickEntry] = useState(false);
  const [quickReadings, setQuickReadings] = useState<Record<string, { elec: string; water: string }>>({});
  const [quickSuccessMsg, setQuickSuccessMsg] = useState('');

  // Local state for payment inside modal
  const [payAmount, setPayAmount] = useState('');
  const [paySuccess, setPaySuccess] = useState(false);

  // Local state for advance deposit inside modal
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceNotes, setAdvanceNotes] = useState('');
  const [advanceSuccess, setAdvanceSuccess] = useState(false);

  // Auto refresh spinner state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date().toLocaleTimeString('ar-EG'));

  // 1. Time-of-day greeting and dynamic advice
  const [greeting, setGreeting] = useState('');
  const [timeAdvice, setTimeAdvice] = useState('');
  
  useEffect(() => {
    const hour = new Date().getHours();
    const day = new Date().getDate();

    // Set Greeting
    if (hour >= 5 && hour < 12) {
      setGreeting('صباح الخير، أستاذ بليغ ☀️');
    } else if (hour >= 12 && hour < 17) {
      setGreeting('طاب يومك، أستاذ بليغ 🌤️');
    } else {
      setGreeting('مساء الخير، أستاذ بليغ 🌙');
    }

    // Set Day of Month Advice
    if (day >= 1 && day <= 10) {
      setTimeAdvice('⚠️ تنبيه دورة الفوترة: نحن الآن في بداية الشهر (فترة إصدار المطالبات وسداد الإيجارات وتحديث الدفعات المقدمة).');
    } else if (day > 10 && day <= 20) {
      setTimeAdvice('⏳ تنبيه قراءات العدادات: نحن في منتصف الشهر. يرجى مراجعة قراءات عدادات المياه والكهرباء والتحقق الآلي منها.');
    } else {
      setTimeAdvice('💡 تنبيه تدقيق المصاريف: نهاية الشهر قريبة. يرجى تجميع الفواتير المشتركة لتقسيمها بالتساوي قبل بدء الفوترة.');
    }
  }, [tenants, bills]);

  // Auto refresh effect
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const interval = setInterval(() => {
      setIsRefreshing(true);
      setTimeout(() => {
        setIsRefreshing(false);
        setLastRefresh(new Date().toLocaleTimeString('ar-EG'));
        if (audioEnabled) playSound('click');
      }, 1500);
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefreshEnabled, audioEnabled]);

  // Active records counts
  const activeTenants = tenants.filter(t => !t.is_deleted);
  const activeBills = bills.filter(b => !b.is_deleted);

  // Calculations for report
  const totalInvoiced = activeBills.reduce((sum, b) => sum + b.total_amount, 0);
  const totalPaid = activeBills.reduce((sum, b) => sum + (b.paid_amount || (b.payment_status === 'مدفوع' ? b.total_amount : b.payment_status === 'مدفوع جزئياً' ? b.total_amount * 0.5 : 0)), 0);
  const totalArrears = Math.max(0, totalInvoiced - totalPaid);

  const paidBillsCount = activeBills.filter(b => b.payment_status === 'مدفوع').length;
  const unpaidBillsCount = activeBills.filter(b => b.payment_status === 'غير مدفوع').length;
  const partialBillsCount = activeBills.filter(b => b.payment_status === 'مدفوع جزئياً').length;

  const getLastBill = (tenantId: string) => {
    const tenantBills = activeBills.filter(b => b.tenant_id === tenantId);
    return tenantBills[tenantBills.length - 1] || null;
  };

  const unreadNotifications = notifications.filter(n => !n.is_read);

  // Initialize quick entry readings
  const handleOpenQuickEntry = () => {
    if (audioEnabled) playSound('click');
    const initial: Record<string, { elec: string; water: string }> = {};
    activeTenants.forEach(t => {
      // Find latest reading
      const sortedR = [...readings].filter(r => r.tenant_id === t.tenant_id && !r.is_deleted)
        .sort((a, b) => b.reading_month.localeCompare(a.reading_month));
      const lastElec = sortedR[0]?.electricity_reading || 0;
      const lastWater = sortedR[0]?.water_reading || 0;
      initial[t.tenant_id] = {
        elec: String(lastElec + Math.floor(Math.random() * 150) + 50),
        water: String(lastWater + Math.floor(Math.random() * 20) + 5),
      };
    });
    setQuickReadings(initial);
    setShowQuickEntry(true);
  };

  const handleSaveQuickEntry = (e: React.FormEvent) => {
    e.preventDefault();
    
    activeTenants.forEach(t => {
      const vals = quickReadings[t.tenant_id];
      if (!vals || !vals.elec || !vals.water) return;

      const elecVal = Number(vals.elec);
      const waterVal = Number(vals.water);
      const currentMonth = '2026-07';

      // 1. Save Reading
      const newReadingId = `R${Date.now()}_${t.tenant_id.substring(1)}`;
      const newReading: MeterReading = {
        reading_id: newReadingId,
        tenant_id: t.tenant_id,
        reading_month: currentMonth,
        electricity_reading: elecVal,
        water_reading: waterVal,
        reading_date: new Date().toISOString().split('T')[0],
      };
      onAddReading(newReading);

      // 2. Find previous reading
      const sortedR = [...readings].filter(r => r.tenant_id === t.tenant_id && !r.is_deleted)
        .sort((a, b) => b.reading_month.localeCompare(a.reading_month));
      const prevElec = sortedR[0]?.electricity_reading || 0;
      const prevWater = sortedR[0]?.water_reading || 0;

      const consElec = Math.max(0, elecVal - prevElec);
      const consWater = Math.max(0, waterVal - prevWater);

      const costElec = consElec * prices.electricity_rate;
      const costWater = consWater * prices.water_rate;

      // Arrears
      const tenantUnpaid = activeBills.filter(b => b.tenant_id === t.tenant_id && b.payment_status !== 'مدفوع');
      const arrears = tenantUnpaid.reduce((sum, b) => sum + (b.total_amount - (b.paid_amount || 0)), 0);

      // Shared expenses
      const totalShared = prices.total_shared_expenses || 0;
      const share = activeTenants.length > 0 ? Number((totalShared / activeTenants.length).toFixed(2)) : 0;

      const subtotal = t.rent_amount + costElec + costWater + (prices.monthly_service_fee || 80) + share;
      const tax = subtotal * prices.tax_rate;
      const grandTotal = subtotal + tax + arrears;

      // Handle advanced payment deduction
      let finalTotal = grandTotal;
      let appliedAdvance = 0;
      let newAdvanceBal = t.advance_balance || 0;

      if (newAdvanceBal > 0) {
        if (newAdvanceBal >= grandTotal) {
          appliedAdvance = grandTotal;
          finalTotal = 0;
          newAdvanceBal = Number((newAdvanceBal - grandTotal).toFixed(2));
        } else {
          appliedAdvance = newAdvanceBal;
          finalTotal = Number((grandTotal - newAdvanceBal).toFixed(2));
          newAdvanceBal = 0;
        }
        t.advance_balance = newAdvanceBal; // Update in memory state reference
      }

      const newBillId = `B${Date.now()}_${t.tenant_id.substring(1)}`;
      const newBill: Bill = {
        bill_id: newBillId,
        tenant_id: t.tenant_id,
        billing_month: currentMonth,
        rent_bill: t.rent_amount,
        electricity_bill: Number(costElec.toFixed(2)),
        water_bill: Number(costWater.toFixed(2)),
        previous_arrears: Number(arrears.toFixed(2)),
        service_charges: prices.monthly_service_fee || 80,
        shared_expense_share: share,
        applied_advance: Number(appliedAdvance.toFixed(2)),
        total_amount: Number(finalTotal.toFixed(2)),
        payment_status: finalTotal <= 0 ? 'مدفوع' : 'غير مدفوع',
        paid_amount: finalTotal <= 0 ? grandTotal : 0,
        issue_date: new Date().toISOString().split('T')[0],
      };

      onAddBill(newBill);

      onLogAudit(
        'إصدار سريع للفاتورة',
        'bills',
        newBillId,
        `تم إصدار فاتورة شهرية عبر الإدخال السريع للمستأجر ${t.name}. المجموع الكلي: ${grandTotal} ر.ي. رصيد مقدم مطبق: ${appliedAdvance} ر.ي. المطلوب للدفع: ${finalTotal} ر.ي.`
      );
    });

    if (audioEnabled) playSound('success');
    setQuickSuccessMsg('تم حفظ قراءات كافة الشقق وإصدار الفواتير بنجاح لشهر يوليو 2026!');
    setTimeout(() => {
      setQuickSuccessMsg('');
      setShowQuickEntry(false);
    }, 3000);
  };

  // Click on apartment card
  const handleApartmentClick = (t: Tenant) => {
    if (audioEnabled) playSound('click');
    setSelectedApartmentTenant(t);
    // Find last bill
    const tenantBills = activeBills.filter(b => b.tenant_id === t.tenant_id);
    const lastBill = tenantBills[tenantBills.length - 1];
    setPayAmount(lastBill && lastBill.payment_status !== 'مدفوع' ? String(lastBill.total_amount - (lastBill.paid_amount || 0)) : '');
    setPaySuccess(false);
    setAdvanceAmount('');
    setAdvanceNotes('');
    setAdvanceSuccess(false);
    setShowSummaryModal(true);
  };

  // Pay Last Invoice Inside Modal
  const handleQuickPay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApartmentTenant || !payAmount) return;

    const tenantBills = activeBills.filter(b => b.tenant_id === selectedApartmentTenant.tenant_id && b.payment_status !== 'مدفوع');
    const lastBill = tenantBills[tenantBills.length - 1];
    if (!lastBill) return;

    const pAmt = Number(payAmount);
    onRecordPayment(lastBill.bill_id, pAmt);
    
    if (audioEnabled) playSound('success');
    setPaySuccess(true);
    setPayAmount('');
    setTimeout(() => {
      setPaySuccess(false);
      setShowSummaryModal(false);
    }, 2000);
  };

  // Deposit Advance Payment Inside Modal
  const handleQuickAdvance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApartmentTenant || !advanceAmount) return;

    const amt = Number(advanceAmount);
    onAddAdvancePayment(selectedApartmentTenant.tenant_id, amt, advanceNotes || 'دفعة مقدمة سريعة من بطاقة الشقة');
    
    if (audioEnabled) playSound('success');
    setAdvanceSuccess(true);
    setAdvanceAmount('');
    setAdvanceNotes('');
    setTimeout(() => {
      setAdvanceSuccess(false);
      setShowSummaryModal(false);
    }, 2000);
  };

  // Format WhatsApp message
  const getWhatsAppLink = (t: Tenant) => {
    const tenantBills = activeBills.filter(b => b.tenant_id === t.tenant_id && b.payment_status !== 'مدفوع');
    const lastBill = tenantBills[tenantBills.length - 1];
    if (!lastBill) return '';

    const msg = `مرحباً أستاذ ${t.name}،
نود تذكيركم بصدور فاتورة الخدمات المستحقة لشقة رقم (${t.unit_number}).
تفاصيل الفاتورة:
- الإيجار السكني: ${lastBill.rent_bill} ر.ي
- استهلاك الكهرباء: ${lastBill.electricity_bill} ر.ي
- استهلاك المياه: ${lastBill.water_bill} ر.ي
- رسوم الخدمات والتشغيل: ${lastBill.service_charges || 80} ر.ي
- المصاريف المشتركة الموزعة: ${lastBill.shared_expense_share || 0} ر.ي
- متأخرات سابقة: ${lastBill.previous_arrears || 0} ر.ي
- المجموع الكلي المطلوب: ${lastBill.total_amount} ر.ي

شاكرين لكم تعاونكم وسدادكم الطيب.`;
    return `https://api.whatsapp.com/send?phone=${t.phone.replace(/[^0-9]/g, '')}&text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="space-y-4" id="dashboard-view-wrapper">
      {/* 1. الترحيب الذكي وشريط الوقت والتحديث التلقائي */}
      <div className="bg-gradient-to-l from-slate-900 via-slate-900 to-teal-950 text-white rounded-xl p-4 sm:p-5 shadow-md border border-slate-800 relative overflow-hidden" id="smart-dashboard-header">
        <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4.5 w-4.5 text-amber-300 animate-pulse" />
              <h2 className="text-lg sm:text-xl font-bold tracking-tight">{greeting}</h2>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-300 mt-1.5 font-medium leading-relaxed">
              {timeAdvice}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Auto Refresh Status Badge */}
            <div className="flex items-center gap-1 px-2.5 py-1 bg-white/10 border border-white/10 rounded-full text-[10px]">
              <RefreshCw className={`h-2.5 w-2.5 text-emerald-300 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="text-[9px] text-slate-200 font-mono">تحديث آلي • {lastRefresh}</span>
            </div>

            {/* Quick Entry Button */}
            <button
              onClick={handleOpenQuickEntry}
              className="flex items-center gap-1 px-3 py-1 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-semibold rounded-lg text-[11px] transition-colors shadow-sm cursor-pointer"
              id="quick-entry-trigger"
            >
              <Zap className="h-3 w-3" />
              وضع الإدخال السريع للقراءات
            </button>
          </div>
        </div>
      </div>

      {/* 1.5 الذكاء الاصطناعي - الإحصائيات الذكية (Smart Stats) */}
      <div className="bg-emerald-50/55 dark:bg-emerald-950/25 border border-emerald-100/60 dark:border-emerald-900/30 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" id="smart-stats-ai-block">
        <div className="flex items-start gap-2.5">
          <div className="bg-emerald-600 text-white p-2 rounded-lg shrink-0 mt-0.5 sm:mt-0">
            <Sparkles className="h-4 w-4 text-amber-300 animate-pulse" />
          </div>
          <div>
            <span className="text-[9px] text-emerald-800 dark:text-emerald-400 font-bold block uppercase tracking-wider">التحليل الذكي اللحظي من مُساعد (Smart Stats)</span>
            {isSummaryLoading ? (
              <span className="text-xs text-slate-500 flex items-center gap-1 animate-pulse mt-0.5">
                <RefreshCw className="h-3 w-3 animate-spin text-emerald-600" />
                جاري تحليل المؤشرات المالية وتدقيق قراءات الاستهلاك...
              </span>
            ) : (
              <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 mt-0.5 leading-relaxed">
                {smartSummary || 'الأمور مستقرة يا عاقل، عقود المستأجرين سارية، وقراءات العدادات والتحصيلات تجري بانتظام ونشاط.'}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={onRefreshSmartSummary}
          disabled={isSummaryLoading}
          className="text-[10px] bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 text-emerald-800 px-2.5 py-1 rounded-lg transition-all font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50 shrink-0 self-end sm:self-center"
          title="إعادة التحديث بالذكاء الاصطناعي"
        >
          <RefreshCw className={`h-2.5 w-2.5 ${isSummaryLoading ? 'animate-spin' : ''}`} />
          تحديث التحليل
        </button>
      </div>

      {/* 2. الإحصائيات المالية المنسقة */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3" id="stats-grid">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800/60 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">إجمالي الفواتير الصادرة</span>
            <span className="text-base sm:text-lg font-bold font-mono text-slate-900 dark:text-slate-100">{totalInvoiced.toLocaleString()} ر.ي</span>
            <span className="text-[9px] text-slate-400 block mt-0.5 font-sans">تشمل المتأخرات والمصاريف الموزعة</span>
          </div>
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg text-emerald-600 dark:text-emerald-400">
            <DollarSign className="h-4.5 w-4.5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800/60 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">المبالغ المحصلة فعلياً</span>
            <span className="text-base sm:text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">+{totalPaid.toLocaleString()} ر.ي</span>
            <div className="flex gap-1.5 text-[9px] text-slate-400 mt-0.5 font-mono">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">{paidBillsCount} مدفوع</span>
              <span>•</span>
              <span className="text-amber-600 dark:text-amber-400 font-bold">{partialBillsCount} جزئي</span>
            </div>
          </div>
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="h-4.5 w-4.5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800/60 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">الذمم المعلقة والمستحقة</span>
            <span className="text-base sm:text-lg font-bold font-mono text-rose-600 dark:text-rose-400">{totalArrears.toLocaleString()} ر.ي</span>
            <span className="text-[9px] text-rose-500 font-bold block mt-0.5">{unpaidBillsCount} فواتير غير مدفوعة كلياً</span>
          </div>
          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 rounded-lg text-rose-600 dark:text-rose-400">
            <AlertCircle className="h-4.5 w-4.5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800/60 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">الوحدات السكنية النشطة</span>
            <span className="text-base sm:text-lg font-bold font-mono text-slate-900 dark:text-slate-100">{activeTenants.length} من {tenants.length} شقق</span>
            <span className="text-[9px] text-slate-400 block mt-0.5">نسبة الإشغال {(tenants.length > 0 ? (activeTenants.length / tenants.length * 100) : 0).toFixed(0)}% من الوحدات</span>
          </div>
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-slate-600 dark:text-slate-400">
            <Users className="h-4.5 w-4.5" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="dashboard-lower-layout">
        {/* 3. لوحة حالة الشقق (Apartments Status Grid) */}
        <div className="lg:col-span-8 space-y-4" id="apartments-board-panel">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-1.5">
                <Building2 className="h-4.5 w-4.5 text-emerald-600" />
                لوحة حالة شقق GABER الرقمية (Apartment Status Board)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">انقر على أي شقة لعرض بطاقة الملخص الفوري وتسجيل السداد أو الرصيد المسبق</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-slate-500 font-medium">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />نشط</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" />نشط مؤقتاً</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" />شاغرة/ملغى</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4" id="apartments-visual-grid">
            {tenants.map(t => {
              const lastBill = getLastBill(t.tenant_id);
              const isDeleted = t.is_deleted;
              if (isDeleted) return null;

              const statusColors = 
                t.status === 'نشط' ? 'border-emerald-200 hover:border-emerald-400 bg-emerald-50/20' : 
                t.status === 'نشط مؤقتاً' ? 'border-blue-200 hover:border-blue-400 bg-blue-50/20' : 
                'border-rose-200 hover:border-rose-400 bg-rose-50/10';

              const badgeColors = 
                t.status === 'نشط' ? 'bg-emerald-100 text-emerald-800' : 
                t.status === 'نشط مؤقتاً' ? 'bg-blue-100 text-blue-800' : 
                'bg-rose-100 text-rose-800';

              const billStatusText = lastBill ? lastBill.payment_status : 'لا فواتير';
              const billStatusColors = 
                lastBill?.payment_status === 'مدفوع' ? 'text-emerald-600 bg-emerald-50' : 
                lastBill?.payment_status === 'مدفوع جزئياً' ? 'text-amber-600 bg-amber-50' : 
                'text-rose-600 bg-rose-50';

              return (
                <div
                  key={t.tenant_id}
                  onClick={() => handleApartmentClick(t)}
                  className={`border rounded-xl p-4 space-y-3 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-sm ${statusColors}`}
                  id={`apartment-card-${t.unit_number}`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-extrabold text-slate-800 font-mono">شقة {t.unit_number}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${badgeColors}`}>{t.status}</span>
                  </div>

                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-slate-700 truncate">{t.name}</h4>
                    <p className="text-[10px] text-slate-400 font-mono">{t.phone}</p>
                  </div>

                  <div className="border-t border-slate-100 pt-2 flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 font-semibold">فاتورة آخر شهر:</span>
                    {lastBill ? (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${billStatusColors}`}>
                        {lastBill.total_amount} ر.ي ({billStatusText})
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-400">لا يوجد فواتير</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. مركز الإشعارات الداخلية ونشاط الذاكرة المباشر */}
        <div className="lg:col-span-4 space-y-4" id="notifications-and-audit-sidebar">
          {/* مركز الإشعارات الداخلية */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3 flex flex-col justify-between min-h-[220px]" id="internal-notification-center">
            <div className="flex justify-between items-center border-b border-slate-50 pb-2">
              <div className="flex items-center gap-1.5">
                <div className="relative">
                  <Activity className="h-4.5 w-4.5 text-emerald-600" />
                  {unreadNotifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-rose-600 animate-ping" />
                  )}
                </div>
                <h4 className="font-bold text-xs sm:text-sm text-slate-800">مركز الإشعارات والتحذيرات</h4>
              </div>
              {unreadNotifications.length > 0 && (
                <button
                  onClick={onMarkAllNotificationsRead}
                  className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
                >
                  قراءة الكل ({unreadNotifications.length})
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto max-h-[160px] space-y-2.5 pr-1 scrollbar-none">
              {(() => {
                const uniqueNotifications: Notification[] = [];
                const seenIds = new Set<string>();
                for (const n of notifications) {
                  if (n && n.notification_id) {
                    if (!seenIds.has(n.notification_id)) {
                      seenIds.add(n.notification_id);
                      uniqueNotifications.push(n);
                    }
                  }
                }
                
                if (uniqueNotifications.length === 0) {
                  return <p className="text-center py-6 text-[11px] text-slate-400">لا توجد إشعارات حالياً.</p>;
                }
                
                return uniqueNotifications.map(n => (
                  <div
                    key={n.notification_id}
                    className={`p-2.5 rounded-lg border text-xs leading-relaxed transition-colors ${
                      n.is_read ? 'bg-slate-50 border-slate-100 text-slate-500' : 'bg-emerald-50/40 border-emerald-100/60 text-slate-800'
                    }`}
                  >
                    <div className="flex justify-between items-center font-bold mb-1">
                      <span className="text-[10px] text-emerald-800">{n.title}</span>
                      <span className="text-[9px] text-slate-400 font-mono">{n.date}</span>
                    </div>
                    <p className="text-[11px] font-medium">{n.message}</p>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* محاكاة النشاط وأمن البيانات */}
          <div className="bg-emerald-50/30 border border-emerald-100/60 rounded-2xl p-4 text-xs space-y-2 text-slate-600 leading-relaxed" id="security-awareness-box">
            <h5 className="font-bold text-emerald-800 flex items-center gap-1.5">
              <Landmark className="h-4 w-4 text-emerald-700" />
              أمن البيانات وسجل التدقيق (Audit Log)
            </h5>
            <p className="text-[11px]">
              نظام GABER يسجل كافة العمليات التشغيلية والمالية مع منع الحذف والتلاعب المالي كلياً للمطالبات المؤرشفة. أي تعديل في العدادات يسجل آلياً ويخضع للمراجعة.
            </p>
          </div>
        </div>
      </div>

      {/* 5. وضع الإدخال السريع للقراءات (Quick Entry Table Overlay) */}
      {showQuickEntry && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4" id="quick-entry-overlay">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-100 animate-modal-in" id="quick-entry-card">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-4 px-5 flex justify-between items-center">
              <div>
                <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-300" />
                  وضع الإدخال الموحد والسريع لكافة العدادات (Quick Entry Mode)
                </h3>
                <p className="text-[11px] text-emerald-200 mt-0.5">أدخل قراءات شهر يوليو 2026 الحالية لكافة المستأجرين لإصدار الفواتير فوراً بضغطة واحدة</p>
              </div>
              <button
                onClick={() => { if (audioEnabled) playSound('click'); setShowQuickEntry(false); }}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveQuickEntry} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 flex flex-col justify-between">
              {quickSuccessMsg ? (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-6 text-center text-sm font-bold animate-pulse">
                  {quickSuccessMsg}
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-100 rounded-xl shadow-inner bg-slate-50/50">
                  <table className="w-full text-right border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold">
                        <th className="p-3">رقم الشقة</th>
                        <th className="p-3">اسم المستأجر</th>
                        <th className="p-3">القراءة السابقة (كهرباء)</th>
                        <th className="p-3 text-emerald-700">القراءة الحالية (كهرباء)</th>
                        <th className="p-3">القراءة السابقة (مياه)</th>
                        <th className="p-3 text-blue-700">القراءة الحالية (مياه)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {activeTenants.map(t => {
                        const sortedR = [...readings].filter(r => r.tenant_id === t.tenant_id && !r.is_deleted)
                          .sort((a, b) => b.reading_month.localeCompare(a.reading_month));
                        const prevElec = sortedR[0]?.electricity_reading || 0;
                        const prevWater = sortedR[0]?.water_reading || 0;

                        return (
                          <tr key={t.tenant_id} className="hover:bg-slate-50/50">
                            <td className="p-3 font-mono font-extrabold text-slate-800">شقة {t.unit_number}</td>
                            <td className="p-3 font-bold text-slate-700">{t.name}</td>
                            <td className="p-3 font-mono text-slate-400">{prevElec} kWh</td>
                            <td className="p-3">
                              <input
                                type="number"
                                required
                                value={quickReadings[t.tenant_id]?.elec || ''}
                                onChange={e => setQuickReadings(prev => ({
                                  ...prev,
                                  [t.tenant_id]: { ...prev[t.tenant_id], elec: e.target.value }
                                }))}
                                className="w-28 px-2.5 py-1.5 border border-emerald-200 focus:outline-emerald-600 rounded-lg text-xs font-mono font-bold"
                              />
                            </td>
                            <td className="p-3 font-mono text-slate-400">{prevWater} m³</td>
                            <td className="p-3">
                              <input
                                type="number"
                                required
                                value={quickReadings[t.tenant_id]?.water || ''}
                                onChange={e => setQuickReadings(prev => ({
                                  ...prev,
                                  [t.tenant_id]: { ...prev[t.tenant_id], water: e.target.value }
                                }))}
                                className="w-28 px-2.5 py-1.5 border border-blue-200 focus:outline-blue-600 rounded-lg text-xs font-mono font-bold"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {!quickSuccessMsg && (
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => { if (audioEnabled) playSound('click'); setShowQuickEntry(false); }}
                    className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-lg text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    إلغاء وتراجع
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold rounded-lg text-xs transition-colors shadow-sm cursor-pointer"
                  >
                    حفظ كافة القراءات وإصدار الفواتير آلياً
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* 6. واجهة ملخص الشقة (Apartment Summary Card Modal) */}
      {showSummaryModal && selectedApartmentTenant && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4" id="apartment-summary-modal">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-100 animate-modal-in" id="summary-modal-card">
            {/* Header */}
            <div className="bg-gradient-to-l from-emerald-800 to-teal-900 text-white p-4 px-5 flex justify-between items-center">
              <div>
                <span className="text-[10px] text-emerald-200 uppercase tracking-widest block font-mono">تفاصيل الوحدة السكنية GABER</span>
                <h3 className="text-base sm:text-lg font-bold">بطاقة ملخص الشقة رقم ({selectedApartmentTenant.unit_number})</h3>
              </div>
              <button
                onClick={() => { if (audioEnabled) playSound('click'); setShowSummaryModal(false); }}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
              {/* تفاصيل المستأجر الأساسية */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100" id="modal-tenant-details">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">اسم المستأجر</span>
                  <span className="text-sm font-extrabold text-slate-800 block mt-0.5">{selectedApartmentTenant.name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">رقم الهاتف</span>
                  <span className="text-sm font-semibold font-mono text-slate-700 block mt-0.5">{selectedApartmentTenant.phone}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">قيمة الإيجار الشهري الأساسي</span>
                  <span className="text-sm font-bold font-mono text-emerald-700 block mt-0.5">{selectedApartmentTenant.rent_amount.toLocaleString()} ر.ي</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">رصيد الدفعات المقدمة النشط</span>
                  <span className="text-sm font-bold font-mono text-blue-600 block mt-0.5">
                    {selectedApartmentTenant.advance_balance?.toLocaleString() || '0'} ر.ي
                  </span>
                </div>
              </div>

              {/* تفاصيل آخر فاتورة مستحقة */}
              <div className="space-y-3" id="modal-bill-details">
                <h4 className="font-bold text-xs sm:text-sm text-slate-800 border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-emerald-600" />
                  حالة آخر مطالبة مالية صادرة
                </h4>

                {getLastBill(selectedApartmentTenant.tenant_id) ? (
                  (() => {
                    const lastBill = getLastBill(selectedApartmentTenant.tenant_id)!;
                    const isOverdue = lastBill.payment_status === 'غير مدفوع';
                    return (
                      <div className="border border-slate-100 rounded-xl p-4 bg-white shadow-inner space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-600">الفاتورة رقم: <span className="font-mono text-[11px] text-slate-400">{lastBill.bill_id}</span></span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            lastBill.payment_status === 'مدفوع' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {lastBill.payment_status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-4 text-xs">
                          <div className="text-slate-500">الإيجار الشهري: <span className="font-bold text-slate-800 font-mono block mt-0.5">{lastBill.rent_bill} ر.ي</span></div>
                          <div className="text-slate-500">استهلاك الكهرباء: <span className="font-bold text-slate-800 font-mono block mt-0.5">{lastBill.electricity_bill} ر.s</span></div>
                          <div className="text-slate-500">استهلاك المياه: <span className="font-bold text-slate-800 font-mono block mt-0.5">{lastBill.water_bill} ر.ي</span></div>
                          {lastBill.service_charges && (
                            <div className="text-slate-500">رسوم الخدمات: <span className="font-bold text-slate-800 font-mono block mt-0.5">{lastBill.service_charges} ر.ي</span></div>
                          )}
                          {lastBill.shared_expense_share && (
                            <div className="text-slate-500">المصاريف الموزعة: <span className="font-bold text-slate-800 font-mono block mt-0.5">{lastBill.shared_expense_share} ر.ي</span></div>
                          )}
                          {lastBill.previous_arrears > 0 && (
                            <div className="text-rose-600">متأخرات سابقة: <span className="font-bold font-mono block mt-0.5">+{lastBill.previous_arrears} ر.ي</span></div>
                          )}
                        </div>

                        {lastBill.applied_advance && lastBill.applied_advance > 0 ? (
                          <div className="text-xs bg-blue-50 text-blue-800 p-2 rounded-lg font-semibold flex justify-between">
                            <span>خصم دفع مسبق مطبق:</span>
                            <span className="font-mono">-{lastBill.applied_advance} ر.ي</span>
                          </div>
                        ) : null}

                        <div className="border-t border-slate-100 pt-2.5 flex justify-between items-center text-xs sm:text-sm font-bold">
                          <span className="text-slate-700">المجموع المطلوب سداده:</span>
                          <span className="text-emerald-700 font-mono">{lastBill.total_amount} ر.ي</span>
                        </div>

                        {/* Quick pay subform inside modal */}
                        {lastBill.payment_status !== 'مدفوع' && (
                          <div className="border-t border-dashed border-slate-200 pt-3 space-y-2">
                            {paySuccess ? (
                              <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-2 rounded-lg text-center text-xs font-bold animate-pulse">
                                تم تسجيل الدفعة بنجاح وتحديث حالة الفاتورة!
                              </div>
                            ) : (
                              <form onSubmit={handleQuickPay} className="flex gap-2 items-center">
                                <label className="text-[10px] font-bold text-slate-500 shrink-0">تسجيل سداد سريع:</label>
                                <input
                                  type="number"
                                  required
                                  max={lastBill.total_amount - (lastBill.paid_amount || 0)}
                                  placeholder="المبلغ المسدد"
                                  value={payAmount}
                                  onChange={e => setPayAmount(e.target.value)}
                                  className="w-24 px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-emerald-600"
                                />
                                <button
                                  type="submit"
                                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                >
                                  تسجيل سداد
                                </button>
                              </form>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <p className="text-xs text-slate-400 text-center py-4">لم تصدر أي فواتير مستحقة لهذا المستأجر حتى الآن.</p>
                )}
              </div>

              {/* تسجيل دفعة إيجار مسبقة (Advanced Payment Deposit Form) */}
              <div className="border-t border-slate-100 pt-4 space-y-3" id="quick-advance-deposit-section">
                <h4 className="font-bold text-xs sm:text-sm text-slate-800 flex items-center gap-1.5">
                  <Landmark className="h-4 w-4 text-blue-600" />
                  تسجيل إيداع رصيد مسبق (Advance Deposit)
                </h4>

                {advanceSuccess ? (
                  <div className="bg-blue-50 border border-blue-100 text-blue-800 p-2.5 rounded-lg text-center text-xs font-bold animate-pulse">
                    تم إيداع الدفعة المقدمة بنجاح وتحديث الرصيد التراكمي للمستأجر!
                  </div>
                ) : (
                  <form onSubmit={handleQuickAdvance} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">المبلغ المودع مقدمًا</label>
                      <input
                        type="number"
                        required
                        placeholder="مثال: 1500"
                        value={advanceAmount}
                        onChange={e => setAdvanceAmount(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-blue-600"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">بيان الإيداع / ملاحظة</label>
                      <input
                        type="text"
                        placeholder="مثال: عربون الحجز المقدم"
                        value={advanceNotes}
                        onChange={e => setAdvanceNotes(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-blue-600"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      إيداع رصيد مقدم
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Footer buttons */}
            <div className="bg-slate-50 p-4 border-t border-slate-100 flex flex-wrap justify-between gap-3">
              <a
                href={getWhatsAppLink(selectedApartmentTenant)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold rounded-lg text-xs transition-colors shadow-sm"
              >
                <Send className="h-3.5 w-3.5" />
                تذكير بمطالبة الفاتورة (واتساب)
              </a>

              <button
                onClick={() => { if (audioEnabled) playSound('click'); setShowSummaryModal(false); }}
                className="px-4 py-1.5 border border-slate-200 text-slate-600 font-bold rounded-lg text-xs hover:bg-slate-100 transition-colors cursor-pointer"
              >
                إغلاق البطاقة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
