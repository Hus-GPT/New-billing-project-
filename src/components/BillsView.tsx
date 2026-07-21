import React, { useState } from 'react';
import { Tenant, Bill, MeterReading, PriceSettings } from '../types';
import { 
  Receipt, Plus, Send, Zap, Droplet, CreditCard, Lock, Unlock, 
  Trash2, Landmark, Check, AlertCircle, Sparkles, AlertTriangle, BellRing
} from 'lucide-react';

interface BillsViewProps {
  tenants: Tenant[];
  bills: Bill[];
  readings: MeterReading[];
  prices: PriceSettings;
  onAddReading: (reading: MeterReading) => void;
  onAddBill: (bill: Bill) => void;
  onRecordPayment: (billId: string, amount: number) => void;
  onArchiveBill: (billId: string) => void;
  onSoftDeleteBill: (billId: string) => void;
  onLogAudit: (action: string, table: string, id: string, details: string) => void;
  playSound: (type: 'success' | 'alert' | 'click' | 'restore') => void;
  audioEnabled: boolean;
}

export default function BillsView({
  tenants,
  bills,
  readings,
  prices,
  onAddReading,
  onAddBill,
  onRecordPayment,
  onArchiveBill,
  onSoftDeleteBill,
  onLogAudit,
  playSound,
  audioEnabled,
}: BillsViewProps) {
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [billingMonth, setBillingMonth] = useState('2026-07');
  const [elecInput, setElecInput] = useState('');
  const [waterInput, setWaterInput] = useState('');
  
  // Issuance detail calculations
  const [isCalculated, setIsCalculated] = useState(false);
  const [billDetails, setBillDetails] = useState<{
    prevElec: number;
    prevWater: number;
    consumptionElec: number;
    consumptionWater: number;
    costElec: number;
    costWater: number;
    arrears: number;
    serviceFee: number;
    sharedExpense: number;
    tax: number;
    subtotal: number;
    grandTotal: number;
    appliedAdvance: number;
    finalTotal: number;
  } | null>(null);

  const [billSuccess, setBillSuccess] = useState(false);
  const [paymentModalBill, setPaymentModalBill] = useState<Bill | null>(null);
  const [payInputAmount, setPayInputAmount] = useState('');
  const [jeepModalBill, setJeepModalBill] = useState<Bill | null>(null);

  const [showBulkSuccess, setShowBulkSuccess] = useState(false);
  const [bulkAlertCount, setBulkAlertCount] = useState(0);

  // Bulk Selection for Bills
  const [selectedBillIds, setSelectedBillIds] = useState<string[]>([]);
  const [showBulkBillDeleteConfirm, setShowBulkBillDeleteConfirm] = useState(false);
  const [showBulkBillArchiveConfirm, setShowBulkBillArchiveConfirm] = useState(false);

  const activeTenants = tenants.filter(t => !t.is_deleted);
  const activeBills = bills.filter(b => !b.is_deleted);

  // Calculate days overdue based on issue date
  const getDaysOverdue = (issueDate: string) => {
    const today = new Date();
    const issue = new Date(issueDate);
    const diffTime = today.getTime() - issue.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  // Filter bills that are overdue by more than 15 days and are unpaid
  const overdueBills = activeBills.filter(b => {
    if (b.payment_status === 'مدفوع') return false;
    const days = getDaysOverdue(b.issue_date);
    return days > 15;
  });

  // Handle individual payment reminder simulation
  const handleSendReminder = (bill: Bill) => {
    const t = tenants.find(tenant => tenant.tenant_id === bill.tenant_id);
    const tenantName = t ? t.name : 'مستأجر مجهول';
    onLogAudit(
      'إرسال تذكير فردي بالدفع',
      'bills',
      bill.bill_id,
      `تم إرسال تذكير بالدفع (محاكاة) للمستأجر ${tenantName} للفاتورة رقم ${bill.bill_id}.`
    );
    if (audioEnabled) playSound('success');
    alert(`🔔 تم إرسال تذكير بالدفع للمستأجر (${tenantName}) للوحدة (${t?.unit_number || '-'}) بنجاح عبر النظام والرسائل النصية!`);
  };

  // Handle sending simulated bulk notifications to all tenants overdue by > 15 days
  const handleSendBulkAlerts = () => {
    if (overdueBills.length === 0) return;
    overdueBills.forEach(b => {
      const t = tenants.find(tenant => tenant.tenant_id === b.tenant_id);
      const tenantName = t ? t.name : 'مستأجر مجهول';
      onLogAudit(
        'إرسال تذكير متأخرات جماعي',
        'bills',
        b.bill_id,
        `تنبيه فوري تلقائي: تم إرسال إشعار سداد عاجل للمستأجر ${tenantName} لتأخر الفاتورة رقم ${b.bill_id} لأكثر من 15 يوماً.`
      );
    });

    setBulkAlertCount(overdueBills.length);
    setShowBulkSuccess(true);
    if (audioEnabled) playSound('success');

    setTimeout(() => {
      setShowBulkSuccess(false);
    }, 4000);
  };

  // Toggle selection for individual bills
  const handleToggleSelectBill = (billId: string) => {
    if (audioEnabled) playSound('click');
    setSelectedBillIds(prev => 
      prev.includes(billId) ? prev.filter(id => id !== billId) : [...prev, billId]
    );
  };

  // Toggle selection for all currently listed active bills
  const handleToggleSelectAllBills = () => {
    if (audioEnabled) playSound('click');
    if (selectedBillIds.length === activeBills.length) {
      setSelectedBillIds([]);
    } else {
      setSelectedBillIds(activeBills.map(b => b.bill_id));
    }
  };

  // Bulk Delete Selected Bills
  const handleBulkSoftDeleteBills = () => {
    if (selectedBillIds.length === 0) return;
    
    selectedBillIds.forEach(id => {
      const b = bills.find(bill => bill.bill_id === id);
      if (b && !b.is_archived) {
        onSoftDeleteBill(id);
        const tenantName = getTenantName(b.tenant_id);
        onLogAudit(
          'حذف فاتورة جماعي',
          'bills',
          id,
          `تم حذف الفاتورة رقم ${id} للمستأجر ${tenantName} لشهر ${b.billing_month} بقيمة ${b.total_amount} ر.ي ضمن عملية حذف جماعية سريعة.`
        );
      }
    });

    setSelectedBillIds([]);
    setShowBulkBillDeleteConfirm(false);
    if (audioEnabled) playSound('alert');
  };

  // Bulk Archive Selected Bills
  const handleBulkArchiveBills = () => {
    if (selectedBillIds.length === 0) return;

    selectedBillIds.forEach(id => {
      const b = bills.find(bill => bill.bill_id === id);
      if (b && !b.is_archived) {
        onArchiveBill(id);
        const tenantName = getTenantName(b.tenant_id);
        onLogAudit(
          'أرشفة فاتورة جماعية',
          'bills',
          id,
          `تم أرشفة الفاتورة رقم ${id} للمستأجر ${tenantName} لشهر ${b.billing_month} بقيمة ${b.total_amount} ر.ي ضمن عملية أرشفة جماعية سريعة.`
        );
      }
    });

    setSelectedBillIds([]);
    setShowBulkBillArchiveConfirm(false);
    if (audioEnabled) playSound('success');
  };

  // Bulk Mark as Fully Paid
  const handleBulkMarkPaidBills = () => {
    if (selectedBillIds.length === 0) return;

    let payCount = 0;
    selectedBillIds.forEach(id => {
      const b = bills.find(bill => bill.bill_id === id);
      if (b && b.payment_status !== 'مدفوع' && !b.is_archived) {
        const remainingAmount = b.total_amount - (b.paid_amount || 0);
        if (remainingAmount > 0) {
          onRecordPayment(id, remainingAmount);
          payCount++;
          const tenantName = getTenantName(b.tenant_id);
          onLogAudit(
            'تسوية سداد جماعي',
            'bills',
            id,
            `تم سداد كامل المبلغ المتبقي (${remainingAmount} ر.ي) للفاتورة رقم ${id} للمستأجر ${tenantName} ضمن تسوية جماعية سريعة.`
          );
        }
      }
    });

    setSelectedBillIds([]);
    if (audioEnabled) playSound('success');
    alert(`💳 تم تسديد كامل المستحقات لـ ${payCount} فاتورة معلقة محددة بنجاح!`);
  };

  // 1. Calculate dynamic offsets
  const handleCalculate = () => {
    if (!selectedTenantId || !elecInput || !waterInput) return;

    const t = tenants.find(tenant => tenant.tenant_id === selectedTenantId);
    if (!t) return;

    const currentElec = Number(elecInput);
    const currentWater = Number(waterInput);

    // Find previous readings
    const sortedR = [...readings]
      .filter(r => r.tenant_id === selectedTenantId && !r.is_deleted)
      .sort((a, b) => b.reading_month.localeCompare(a.reading_month));
    const prevElec = sortedR[0]?.electricity_reading || 0;
    const prevWater = sortedR[0]?.water_reading || 0;

    const consumptionElec = Math.max(0, currentElec - prevElec);
    const consumptionWater = Math.max(0, currentWater - prevWater);

    const costElec = consumptionElec * prices.electricity_rate;
    const costWater = consumptionWater * prices.water_rate;

    // Calculate arrears (unpaid bills)
    const unpaidBills = activeBills.filter(b => b.tenant_id === selectedTenantId && b.payment_status !== 'مدفوع');
    const arrears = unpaidBills.reduce((sum, b) => sum + (b.total_amount - (b.paid_amount || 0)), 0);

    const serviceFee = prices.monthly_service_fee || 80;
    
    // Shared expenses
    const totalShared = prices.total_shared_expenses || 0;
    const sharedExpense = activeTenants.length > 0 ? Number((totalShared / activeTenants.length).toFixed(2)) : 0;

    const subtotal = t.rent_amount + costElec + costWater + serviceFee + sharedExpense;
    const tax = subtotal * prices.tax_rate;
    const grandTotal = subtotal + tax + arrears;

    // Prepaid Rent Deduction (Advance Rent balance)
    let finalTotal = grandTotal;
    let appliedAdvance = 0;
    const currentAdvanceBal = t.advance_balance || 0;

    if (currentAdvanceBal > 0) {
      if (currentAdvanceBal >= grandTotal) {
        appliedAdvance = grandTotal;
        finalTotal = 0;
      } else {
        appliedAdvance = currentAdvanceBal;
        finalTotal = Number((grandTotal - currentAdvanceBal).toFixed(2));
      }
    }

    setBillDetails({
      prevElec,
      prevWater,
      consumptionElec,
      consumptionWater,
      costElec: Number(costElec.toFixed(2)),
      costWater: Number(costWater.toFixed(2)),
      arrears: Number(arrears.toFixed(2)),
      serviceFee,
      sharedExpense,
      tax: Number(tax.toFixed(2)),
      subtotal: Number(subtotal.toFixed(2)),
      grandTotal: Number(grandTotal.toFixed(2)),
      appliedAdvance: Number(appliedAdvance.toFixed(2)),
      finalTotal: Number(finalTotal.toFixed(2)),
    });
    setIsCalculated(true);
    if (audioEnabled) playSound('click');
  };

  // 2. Issue invoice
  const handleIssueBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantId || !elecInput || !waterInput || !billDetails) return;

    const maxBillId = bills.reduce((max, b) => {
      const idNum = parseInt(b.bill_id.replace(/\D/g, '')) || 0;
      return idNum > max ? idNum : max;
    }, 0);
    const newBillId = `B${String(maxBillId + 1).padStart(3, '0')}`;

    const maxReadingId = readings.reduce((max, r) => {
      const idNum = parseInt(r.reading_id.replace(/\D/g, '')) || 0;
      return idNum > max ? idNum : max;
    }, 0);
    const newReadingId = `R${String(maxReadingId + 1).padStart(3, '0')}`;

    const t = tenants.find(tenant => tenant.tenant_id === selectedTenantId);
    if (!t) return;

    // Insert meter reading
    const newReading: MeterReading = {
      reading_id: newReadingId,
      tenant_id: selectedTenantId,
      reading_month: billingMonth,
      electricity_reading: Number(elecInput),
      water_reading: Number(waterInput),
      reading_date: new Date().toISOString().split('T')[0],
      is_deleted: false,
    };
    onAddReading(newReading);

    // Apply advance payment to tenant profile in state
    if (billDetails.appliedAdvance > 0) {
      t.advance_balance = Number(((t.advance_balance || 0) - billDetails.appliedAdvance).toFixed(2));
    }

    // Insert bill
    const newBill: Bill = {
      bill_id: newBillId,
      tenant_id: selectedTenantId,
      billing_month: billingMonth,
      rent_bill: t.rent_amount,
      electricity_bill: billDetails.costElec,
      water_bill: billDetails.costWater,
      previous_arrears: billDetails.arrears,
      service_charges: billDetails.serviceFee,
      shared_expense_share: billDetails.sharedExpense,
      applied_advance: billDetails.appliedAdvance,
      total_amount: billDetails.finalTotal,
      payment_status: billDetails.finalTotal <= 0 ? 'مدفوع' : 'غير مدفوع',
      paid_amount: billDetails.finalTotal <= 0 ? billDetails.grandTotal : 0,
      issue_date: new Date().toISOString().split('T')[0],
      is_archived: false,
      is_deleted: false,
    };
    onAddBill(newBill);

    // Audit and notify
    onLogAudit(
      'إصدار فاتورة مستقلة',
      'bills',
      newBillId,
      `تم إصدار فاتورة مستقلة لشهر ${billingMonth} للمستأجر ${t.name}. المجموع الكلي: ${billDetails.grandTotal} ر.ي. رصيد مقدم مطبق: ${billDetails.appliedAdvance} ر.ي. المبلغ المطلوب للدفع: ${billDetails.finalTotal} ر.ي.`
    );

    if (audioEnabled) playSound('success');
    setBillSuccess(true);
    setSelectedTenantId('');
    setElecInput('');
    setWaterInput('');
    setIsCalculated(false);
    setBillDetails(null);

    setTimeout(() => {
      setBillSuccess(false);
    }, 3000);
  };

  // 3. Register payment
  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalBill || !payInputAmount) return;

    const amt = Number(payInputAmount);
    onRecordPayment(paymentModalBill.bill_id, amt);

    onLogAudit(
      'تسجيل سداد دفعة',
      'bills',
      paymentModalBill.bill_id,
      `تم تسجيل سداد يدوي بقيمة ${amt} ر.ي للفاتورة رقم ${paymentModalBill.bill_id}.`
    );

    if (audioEnabled) playSound('success');
    setPayInputAmount('');
    setPaymentModalBill(null);
  };

  // 4. Archive bill (lock)
  const handleArchiveClick = (bill: Bill) => {
    if (bill.is_archived) return;
    if (audioEnabled) playSound('alert');
    const isConfirmed = window.confirm(`هل أنت متأكد من أرشفة وتفعيل الجمود المحاسبي للفاتورة ${bill.bill_id}؟ هذا الإجراء أمني ويقفل الفاتورة تماماً ضد التعديل أو الحذف المالي نهائياً.`);
    if (isConfirmed) {
      onArchiveBill(bill.bill_id);
    }
  };

  // 5. Soft delete bill
  const handleSoftDeleteClick = (bill: Bill) => {
    if (bill.is_archived) {
      alert('⚠️ خطأ أمني: الفاتورة مؤرشفة ومغلقة محاسبياً. يمنع حذفها نهائياً لتأمين الحسابات!');
      return;
    }
    if (audioEnabled) playSound('alert');
    const isConfirmed = window.confirm(`هل أنت متأكد من حذف الفاتورة ${bill.bill_id} حذفاً ناعماً ونقلها لسلة المهملات؟`);
    if (isConfirmed) {
      onSoftDeleteBill(bill.bill_id);
      onLogAudit(
        'حذف ناعم للفاتورة',
        'bills',
        bill.bill_id,
        `تم نقل الفاتورة ${bill.bill_id} إلى سلة المهملات وتصفير مبالغها المفوترة.`
      );
    }
  };

  const getTenantName = (id: string) => {
    const t = tenants.find(tenant => tenant.tenant_id === id);
    return t ? t.name : 'مستأجر مجهول';
  };

  const getTenantUnit = (id: string) => {
    const t = tenants.find(tenant => tenant.tenant_id === id);
    return t ? t.unit_number : '-';
  };

  // Format WhatsApp Link
  const getWhatsAppLink = (bill: Bill) => {
    const t = tenants.find(tenant => tenant.tenant_id === bill.tenant_id);
    if (!t) return '#';

    const msg = `عزيزي المستأجر ${t.name}،
نود إبلاغك بصدور فاتورة الخدمات المستحقة لشقة رقم (${t.unit_number}) لشهر ${bill.billing_month}.
تفاصيل المطالبة:
- الإيجار السكني: ${bill.rent_bill} ر.ي
- استهلاك الكهرباء: ${bill.electricity_bill} ر.ي
- استهلاك المياه: ${bill.water_bill} ر.ي
- رسوم التشغيل والخدمات: ${bill.service_charges || 80} ر.ي
- حصة المصاريف المشتركة: ${bill.shared_expense_share || 0} ر.ي
- متأخرات سابقة: ${bill.previous_arrears} ر.ي
- رصيد دفعات مقدمة مخصوم: -${bill.applied_advance || 0} ر.ي
--------------------------------------
إجمالي المبلغ المطلوب للدفع: ${bill.total_amount} ر.ي

يرجى التحويل المباشر والآمن عبر محفظة جيب JEEP السعودية للرقم: ${prices.jeeb_phone || '0505559999'}
شكراً لتعاونكم،
إدارة عقارات GABER.`;

    return `https://api.whatsapp.com/send?phone=${t.phone.replace(/^0/, '+966')}&text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="space-y-6" id="bills-view-wrapper">
      {/* 1. الترويسة الفنية للمطالبات */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4" id="bills-header">
        <div className="space-y-1">
          <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-1.5">
            <Receipt className="h-5 w-5 text-emerald-600" />
            إدارة المطالبات المالية والفوترة الذكية (Billing Management)
          </h3>
          <p className="text-xs text-slate-500">إصدار ومتابعة الفواتير الموحدة للوحدات السكنية مع احتساب الفروقات، المتأخرات، ومطابقة السداد عبر بوابة جيب.</p>
        </div>
      </div>

      {/* 🚨 قسم تنبيهات المتأخرين لأكثر من 15 يوماً (Overdue Invoices > 15 Days) */}
      {overdueBills.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in" id="overdue-alerts-panel" dir="rtl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-sm">
              <AlertTriangle className="h-5 w-5 animate-pulse" />
            </div>
            <div className="text-right">
              <h4 className="font-bold text-slate-800 text-xs sm:text-sm flex items-center gap-1.5">
                تنبيه: مستأجرين متأخرين عن السداد لأكثر من ١٥ يوماً!
                <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold">عاجل</span>
              </h4>
              <p className="text-[11px] text-slate-600 mt-0.5">يوجد حالياً {overdueBills.length} فواتير معلقة تجاوزت فترة سماح السداد المحددة (١٥ يوماً) في نظام GABER.</p>
            </div>
          </div>
          <button
            onClick={handleSendBulkAlerts}
            className="w-full sm:w-auto px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
          >
            <BellRing className="h-4 w-4" />
            إرسال تنبيهات جماعية عاجلة ({overdueBills.length})
          </button>
        </div>
      )}

      {showBulkSuccess && (
        <div className="bg-emerald-50 border border-emerald-200/60 p-4 rounded-2xl flex items-center gap-3 animate-bounce-short text-emerald-900 text-xs font-bold" id="bulk-alert-success" dir="rtl">
          <Sparkles className="h-5 w-5 text-emerald-600" />
          <div className="text-right">
            <span>تم إرسال {bulkAlertCount} تنبيه سداد عاجل محاكى بنجاح!</span>
            <span className="block text-[10px] text-slate-500 font-normal mt-0.5">تم تسجيل إشعارات التحذير في سجل التدقيق الأمني للرقابة المالية بنجاح.</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="bills-main-layout">
        {/* 2. جدول الفواتير الصادرة */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden" id="bills-list-panel">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center text-xs font-bold text-slate-600">
            <span>سجل الفواتير والمستحقات العقارية ({activeBills.length} فواتير)</span>
          </div>

          {/* شريط الإجراءات الجماعية للفواتير (Bills Bulk Action Bar) */}
          {selectedBillIds.length > 0 && (
            <div className="bg-amber-50 border-b border-amber-200/60 p-3 px-4 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-3 animate-in slide-in-from-top-1 duration-150" dir="rtl">
              <div className="flex items-center gap-2 text-amber-900 font-bold">
                <Receipt className="h-4 w-4 text-amber-700 animate-pulse" />
                <span>تم تحديد {selectedBillIds.length} فواتير لإجراء عملية دفعة واحدة</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {/* 1. Bulk Pay Button */}
                <button
                  type="button"
                  onClick={handleBulkMarkPaidBills}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg text-[10px] cursor-pointer shadow-sm transition-all"
                >
                  تسجيل سداد كامل
                </button>

                {/* 2. Bulk Archive Action */}
                {showBulkBillArchiveConfirm ? (
                  <div className="flex items-center gap-1 bg-amber-100/50 p-1 rounded-lg border border-amber-200/50">
                    <span className="text-[9px] text-amber-800 font-bold">تأكيد الأرشفة؟</span>
                    <button
                      type="button"
                      onClick={handleBulkArchiveBills}
                      className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded text-[9px] cursor-pointer"
                    >
                      نعم
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowBulkBillArchiveConfirm(false)}
                      className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded text-[9px] cursor-pointer"
                    >
                      لا
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (audioEnabled) playSound('click');
                      setShowBulkBillArchiveConfirm(true);
                    }}
                    className="px-2.5 py-1 bg-slate-700 hover:bg-slate-800 text-white font-extrabold rounded-lg text-[10px] cursor-pointer flex items-center gap-1"
                  >
                    <Lock className="h-3 w-3" />
                    أرشفة الفواتير
                  </button>
                )}

                {/* 3. Bulk Delete Action */}
                {showBulkBillDeleteConfirm ? (
                  <div className="flex items-center gap-1 bg-rose-100/50 p-1 rounded-lg border border-rose-200/50">
                    <span className="text-[9px] text-rose-800 font-bold">تأكيد الحذف؟</span>
                    <button
                      type="button"
                      onClick={handleBulkSoftDeleteBills}
                      className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded text-[9px] cursor-pointer"
                    >
                      نعم
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowBulkBillDeleteConfirm(false)}
                      className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded text-[9px] cursor-pointer"
                    >
                      لا
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (audioEnabled) playSound('click');
                      setShowBulkBillDeleteConfirm(true);
                    }}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-lg text-[10px] cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    حذف الفواتير
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedBillIds([])}
                  className="px-2 py-1 text-slate-500 hover:text-slate-800 font-bold rounded text-[10px] cursor-pointer"
                >
                  إلغاء التحديد
                </button>
              </div>
            </div>
          )}

          {activeBills.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs sm:text-sm">
              لا توجد فواتير صادرة حالياً في نظام GABER.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold">
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={activeBills.length > 0 && selectedBillIds.length === activeBills.length}
                        onChange={handleToggleSelectAllBills}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer h-3.5 w-3.5"
                      />
                    </th>
                    <th className="p-3">رقم الفاتورة</th>
                    <th className="p-3">المستأجر / الوحدة</th>
                    <th className="p-3 font-mono">شهر الفاتورة</th>
                    <th className="p-3">المطالبة الكلية</th>
                    <th className="p-3">المبلغ المسدد</th>
                    <th className="p-3">الحالة والمؤشرات</th>
                    <th className="p-3 text-left">الإجراءات والتحويلات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeBills.map(b => {
                    const statusColors = 
                      b.payment_status === 'مدفوع' ? 'bg-emerald-100 text-emerald-800' : 
                      b.payment_status === 'مدفوع جزئياً' ? 'bg-amber-100 text-amber-800' : 
                      'bg-rose-100 text-rose-800';

                    return (
                      <tr key={b.bill_id} className={`hover:bg-slate-50/40 transition-colors ${selectedBillIds.includes(b.bill_id) ? 'bg-emerald-50/20' : ''}`}>
                        <td className="p-3 text-center w-10">
                          <input
                            type="checkbox"
                            checked={selectedBillIds.includes(b.bill_id)}
                            onChange={() => handleToggleSelectBill(b.bill_id)}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer h-3.5 w-3.5"
                          />
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-500">{b.bill_id}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-800">{getTenantName(b.tenant_id)}</div>
                          <div className="text-[10px] text-slate-400 font-mono">وحدة: {getTenantUnit(b.tenant_id)}</div>
                        </td>
                        <td className="p-3 font-mono text-slate-500 font-bold">{b.billing_month}</td>
                        <td className="p-3 font-bold font-mono text-slate-900">{b.total_amount.toLocaleString()} ر.ي</td>
                        <td className="p-3 font-bold font-mono text-emerald-700">{b.paid_amount?.toLocaleString() || '0'} ر.ي</td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${statusColors}`}>{b.payment_status}</span>
                            {b.is_archived ? (
                              <Lock className="h-3 w-3 text-slate-400" title="مؤرشفة محاسبياً مغلقة" />
                            ) : (
                              <Unlock className="h-3 w-3 text-emerald-500/60" title="مفتوحة للتسوية" />
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-left space-x-1.5 space-x-reverse">
                          {/* JEEP Wallet Payment Info */}
                          <button
                            onClick={() => { if (audioEnabled) playSound('click'); setJeepModalBill(b); }}
                            className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded text-[10px] transition-colors cursor-pointer"
                            title="تفاصيل دفع محفظة جيب"
                          >
                            محفظة جيب JEEP
                          </button>

                          {/* WhatsApp Direct Share */}
                          <a
                            href={getWhatsAppLink(b)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded text-[10px] transition-colors"
                            title="ارسل المطالبة عبر واتساب"
                          >
                            واتساب
                          </a>

                          {/* Pay Action */}
                          {b.payment_status !== 'مدفوع' && !b.is_archived && (
                            <button
                              onClick={() => { if (audioEnabled) playSound('click'); setPaymentModalBill(b); setPayInputAmount(String(b.total_amount - (b.paid_amount || 0))); }}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[10px] transition-colors cursor-pointer"
                            >
                              تسديد
                            </button>
                          )}

                          {/* Send Simulated Reminder Action */}
                          {b.payment_status !== 'مدفوع' && (
                            <button
                              onClick={() => handleSendReminder(b)}
                              className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded text-[10px] transition-colors cursor-pointer inline-flex items-center gap-1"
                              title="إرسال تذكير فوري بالسداد"
                            >
                              <BellRing className="h-3 w-3 animate-pulse" />
                              تذكير
                            </button>
                          )}

                          {/* Lock / Archive Action */}
                          {!b.is_archived && (
                            <button
                              onClick={() => handleArchiveClick(b)}
                              className="p-1 text-slate-400 hover:text-slate-600 rounded"
                              title="أرشفة الفاتورة محاسبياً"
                            >
                              <Lock className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {/* Soft Delete */}
                          <button
                            onClick={() => handleSoftDeleteClick(b)}
                            disabled={b.is_archived}
                            className={`p-1 rounded ${b.is_archived ? 'text-slate-200 cursor-not-allowed' : 'text-rose-500 hover:bg-rose-50 hover:text-rose-600 cursor-pointer'}`}
                            title={b.is_archived ? 'مؤرشفة لا يمكن حذفها' : 'حذف الفاتورة'}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 3. نموذج إصدار الفاتورة المستقلة الحسابي الفوري */}
        <div className="lg:col-span-4 space-y-4" id="issue-bill-panel">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4" id="issue-bill-card">
            <h4 className="font-bold text-slate-800 text-xs sm:text-sm flex items-center gap-1.5 border-b border-slate-50 pb-2">
              <Plus className="h-4.5 w-4.5 text-emerald-600" />
              إصدار مطالبة وفاتورة مستقلة
            </h4>

            {billSuccess ? (
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-3 rounded-xl text-center text-xs font-bold animate-pulse">
                تم احتساب وحفظ الفاتورة بنجاح في سجلات النظام!
              </div>
            ) : (
              <form onSubmit={handleIssueBill} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 block">اختر المستأجر المستهدف</label>
                  <select
                    required
                    value={selectedTenantId}
                    onChange={e => { setSelectedTenantId(e.target.value); setIsCalculated(false); }}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white font-medium"
                  >
                    <option value="">-- اضغط لتحديد المستأجر --</option>
                    {activeTenants.map(t => (
                      <option key={t.tenant_id} value={t.tenant_id}>
                        {t.name} (وحدة: {t.unit_number})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 block">شهر المطالبة</label>
                    <input
                      type="month"
                      required
                      value={billingMonth}
                      onChange={e => setBillingMonth(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-400 font-bold block mt-6 text-center">دورة يوليو ٢٠٢٦</span>
                  </div>
                </div>

                {/* حقول القراءات الحالية للعدادات */}
                <div className="grid grid-cols-2 gap-3 border-t border-slate-50 pt-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                      <Zap className="h-3 w-3 text-amber-500" />
                      عداد الكهرباء الحالي
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="مثال: 1550"
                      value={elecInput}
                      onChange={e => { setElecInput(e.target.value); setIsCalculated(false); }}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold focus:outline-emerald-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-blue-700 flex items-center gap-1">
                      <Droplet className="h-3 w-3 text-blue-500" />
                      عداد المياه الحالي
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="مثال: 365"
                      value={waterInput}
                      onChange={e => { setWaterInput(e.target.value); setIsCalculated(false); }}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold focus:outline-blue-600"
                    />
                  </div>
                </div>

                {/* كشف الحساب والعمليات الحسابية التقديرية (Intermediate breakdown) */}
                {isCalculated && billDetails ? (
                  <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100 space-y-2 text-xs">
                    <div className="flex justify-between border-b border-slate-100 pb-1 font-bold text-slate-600">
                      <span>بيان البند</span>
                      <span>المبلغ المستحق</span>
                    </div>

                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>قيمة إيجار الشقة السكني:</span>
                      <span className="font-mono text-slate-800">+{tenants.find(tenant => tenant.tenant_id === selectedTenantId)?.rent_amount.toLocaleString()} ر.ي</span>
                    </div>

                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>استهلاك كهرباء ({billDetails.consumptionElec} kWh):</span>
                      <span className="font-mono text-slate-800">+{billDetails.costElec} ر.ي</span>
                    </div>

                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>استهلاك مياه ({billDetails.consumptionWater} m³):</span>
                      <span className="font-mono text-slate-800">+{billDetails.costWater} ر.ي</span>
                    </div>

                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>رسوم تشغيل دورية ثابتة:</span>
                      <span className="font-mono text-slate-800">+{billDetails.serviceFee} ر.ي</span>
                    </div>

                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>حصة الشقة من المصاريف المشتركة:</span>
                      <span className="font-mono text-slate-800">+{billDetails.sharedExpense} ر.ي</span>
                    </div>

                    <div className="flex justify-between text-rose-500 text-[11px] font-semibold">
                      <span>متأخرات إيجارية وديون سابقة:</span>
                      <span className="font-mono">+{billDetails.arrears} ر.ي</span>
                    </div>

                    {billDetails.appliedAdvance > 0 && (
                      <div className="flex justify-between text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-[11px] font-bold">
                        <span>رصيد دفع مسبق مخصوم:</span>
                        <span className="font-mono">-{billDetails.appliedAdvance} ر.ي</span>
                      </div>
                    )}

                    <div className="border-t border-slate-100 pt-1.5 flex justify-between font-bold text-slate-900 text-xs sm:text-sm">
                      <span>الصافي المطلوب للدفع:</span>
                      <span className="font-mono text-emerald-800">{billDetails.finalTotal} ر.ي</span>
                    </div>

                    <button
                      type="submit"
                      className="w-full mt-2 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg text-xs transition-colors shadow-sm cursor-pointer"
                    >
                      تأكيد إصدار الفاتورة الموحدة
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={!selectedTenantId || !elecInput || !waterInput}
                    onClick={handleCalculate}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-200 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
                  >
                    حساب تكاليف الاستهلاك والفاتورة
                  </button>
                )}
              </form>
            )}
          </div>
        </div>
      </div>

      {/* 4. نافذة تسجيل سداد مبلغ يدوي (Quick payment modal) */}
      {paymentModalBill && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-modal-in">
            <div className="bg-emerald-800 text-white p-4 flex justify-between items-center">
              <h4 className="font-bold text-xs sm:text-sm">تسجيل سداد يدوي للفاتورة {paymentModalBill.bill_id}</h4>
              <button onClick={() => setPaymentModalBill(null)} className="text-white hover:bg-white/10 p-1 rounded-lg cursor-pointer">×</button>
            </div>
            <form onSubmit={handlePaymentSubmit} className="p-5 space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1 text-xs">
                <div>المستأجر: <span className="font-bold text-slate-800">{getTenantName(paymentModalBill.tenant_id)}</span></div>
                <div>المطالبة الكلية: <span className="font-bold text-slate-800 font-mono">{paymentModalBill.total_amount} ر.ي</span></div>
                <div>المسدد سابقاً: <span className="font-bold text-slate-800 font-mono">{paymentModalBill.paid_amount || 0} ر.ي</span></div>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 block">المبلغ المدفوع حالياً (ر.ي)</label>
                <input
                  type="number"
                  required
                  max={paymentModalBill.total_amount - (paymentModalBill.paid_amount || 0)}
                  value={payInputAmount}
                  onChange={e => setPayInputAmount(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold focus:outline-emerald-600"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg text-xs transition-colors shadow-sm cursor-pointer"
              >
                تأكيد الدفع اليدوي والحفظ
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 5. نافذة تكامل محفظة جيب JEEP السعودية (JEEP wallet payment integration modal) */}
      {jeepModalBill && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-modal-in">
            <div className="bg-blue-900 text-white p-4 flex justify-between items-center">
              <h4 className="font-bold text-xs sm:text-sm flex items-center gap-1.5">
                <Landmark className="h-4.5 w-4.5 text-blue-300" />
                تكامل بوابة الدفع جيب JEEP السعودية
              </h4>
              <button onClick={() => setJeepModalBill(null)} className="text-white hover:bg-white/10 p-1 rounded-lg cursor-pointer">×</button>
            </div>
            <div className="p-5 space-y-4 text-center">
              <p className="text-xs text-slate-600 leading-relaxed">
                سدد الفاتورة فوراً عبر تحويل آمن بنظام الدفع الفوري (جيب) باستخدام تفاصيل التاجر GABER الموحدة.
              </p>

              {/* QR Code Simulation Area */}
              <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-blue-200 w-48 h-48 mx-auto flex flex-col justify-between items-center shadow-inner">
                <div className="text-[9px] font-bold text-blue-900 tracking-wider">GABER JEEP QR PAY</div>
                <div className="border-4 border-slate-900 p-2 bg-white rounded-lg">
                  {/* Visual simulated barcode representation */}
                  <div className="w-24 h-24 bg-slate-100 flex flex-wrap gap-1 p-1">
                    {Array.from({ length: 36 }).map((_, i) => (
                      <div key={i} className={`w-3 h-3 ${i % 3 === 0 || i % 4 === 1 ? 'bg-slate-900' : 'bg-white'}`} />
                    ))}
                  </div>
                </div>
                <span className="text-[8px] font-mono font-bold text-slate-400">{prices.jeeb_barcode || 'JEEP-SANAD-MERCHANT-8871'}</span>
              </div>

              <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 text-right text-xs space-y-1.5 text-blue-950 font-medium">
                <div>التاجر المعتمد: <span className="font-bold text-slate-800">نظام GABER للإدارة العقارية</span></div>
                <div>رقم الجوال للتحويل المباشر: <span className="font-bold font-mono text-slate-800">{prices.jeeb_phone || '0505559999'}</span></div>
                <div>المجموع المطلوب سداده: <span className="font-bold text-emerald-800 font-mono">{jeepModalBill.total_amount} ر.ي</span></div>
              </div>

              <button
                onClick={() => setJeepModalBill(null)}
                className="w-full py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                إغلاق نافذة جيب
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
