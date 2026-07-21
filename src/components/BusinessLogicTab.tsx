import React, { useState } from 'react';
import { Tenant, Bill, MeterReading, PriceSettings } from '../types';
import { Briefcase, UserPlus, FileText, CheckCircle2, TrendingUp, AlertTriangle, FileCheck } from 'lucide-react';

interface BusinessLogicTabProps {
  tenants: Tenant[];
  bills: Bill[];
  readings: MeterReading[];
  prices: PriceSettings;
  onAddTenant: (tenant: Tenant) => void;
  onAddBill: (bill: Bill) => void;
  onAddReading: (reading: MeterReading) => void;
}

export default function BusinessLogicTab({
  tenants,
  bills,
  readings,
  prices,
  onAddTenant,
  onAddBill,
  onAddReading,
}: BusinessLogicTabProps) {
  const [activeAction, setActiveAction] = useState<'add_tenant' | 'issue_bill' | 'unissued_check' | 'monthly_report'>('issue_bill');

  // Add Tenant Form State
  const [tenantName, setTenantName] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');
  const [tenantUnit, setTenantUnit] = useState('');
  const [tenantRent, setTenantRent] = useState('');
  const [tenantSuccess, setTenantSuccess] = useState(false);

  // Issue Bill State
  const [selectedTenant, setSelectedTenant] = useState('');
  const [billingMonth, setBillingMonth] = useState('2026-07');
  const [elecReading, setElecReading] = useState('');
  const [waterReading, setWaterReading] = useState('');
  const [billSuccess, setBillSuccess] = useState(false);
  const [calculatedDetails, setCalculatedDetails] = useState<{
    consumptionElec: number;
    costElec: number;
    consumptionWater: number;
    costWater: number;
    arrears: number;
    rent: number;
    tax: number;
    total: number;
  } | null>(null);

  // 1. Logic to handle Add Tenant
  const handleAddTenantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantName || !tenantPhone || !tenantUnit || !tenantRent) return;

    const newId = `T${100 + tenants.length + 1}`;
    const newTenant: Tenant = {
      tenant_id: newId,
      name: tenantName,
      phone: tenantPhone,
      unit_number: tenantUnit,
      rent_amount: Number(tenantRent),
      status: 'نشط',
      join_date: new Date().toISOString().split('T')[0],
    };

    onAddTenant(newTenant);
    setTenantSuccess(true);
    setTenantName('');
    setTenantPhone('');
    setTenantUnit('');
    setTenantRent('');
    setTimeout(() => setTenantSuccess(false), 3000);
  };

  // 2. Logic to calculate bill dynamically before issuing
  const handleCalculateBill = () => {
    if (!selectedTenant || !billingMonth || !elecReading || !waterReading) return;

    const tenant = tenants.find((t) => t.tenant_id === selectedTenant);
    if (!tenant) return;

    const inputElec = Number(elecReading);
    const inputWater = Number(waterReading);

    // Find previous reading for this tenant
    const sortedReadings = [...readings]
      .filter((r) => r.tenant_id === selectedTenant)
      .sort((a, b) => b.reading_month.localeCompare(a.reading_month)); // Latest first

    const previousReading = sortedReadings[0];
    const prevElec = previousReading ? previousReading.electricity_reading : 0;
    const prevWater = previousReading ? previousReading.water_reading : 0;

    const consumptionElec = Math.max(0, inputElec - prevElec);
    const consumptionWater = Math.max(0, inputWater - prevWater);

    const costElec = consumptionElec * prices.electricity_rate;
    const costWater = consumptionWater * prices.water_rate;

    // Calculate arrears: Sum of all UNPAID bills for this tenant
    const unpaidBills = bills.filter(
      (b) => b.tenant_id === selectedTenant && (b.payment_status === 'غير مدفوع' || b.payment_status === 'مدفوع جزئياً')
    );
    const arrears = unpaidBills.reduce((sum, b) => sum + (b.payment_status === 'مدفوع جزئياً' ? b.total_amount * 0.5 : b.total_amount), 0);

    const rent = tenant.rent_amount;
    const subtotal = rent + costElec + costWater;
    const tax = subtotal * prices.tax_rate;
    const total = subtotal + tax + arrears;

    setCalculatedDetails({
      consumptionElec,
      costElec,
      consumptionWater,
      costWater,
      arrears,
      rent,
      tax,
      total,
    });
  };

  // 3. Logic to issue bill
  const handleIssueBillSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant || !billingMonth || !elecReading || !waterReading || !calculatedDetails) return;

    const newBillId = `B${String(bills.length + 1).padStart(3, '0')}`;
    const newReadingId = `R${String(readings.length + 1).padStart(3, '0')}`;

    // Add reading record
    const newReading: MeterReading = {
      reading_id: newReadingId,
      tenant_id: selectedTenant,
      reading_month: billingMonth,
      electricity_reading: Number(elecReading),
      water_reading: Number(waterReading),
      reading_date: new Date().toISOString().split('T')[0],
    };

    // Add bill record
    const newBill: Bill = {
      bill_id: newBillId,
      tenant_id: selectedTenant,
      billing_month: billingMonth,
      rent_bill: calculatedDetails.rent,
      electricity_bill: Number(calculatedDetails.costElec.toFixed(2)),
      water_bill: Number(calculatedDetails.costWater.toFixed(2)),
      previous_arrears: Number(calculatedDetails.arrears.toFixed(2)),
      total_amount: Number(calculatedDetails.total.toFixed(2)),
      payment_status: 'غير مدفوع',
      issue_date: new Date().toISOString().split('T')[0],
    };

    onAddReading(newReading);
    onAddBill(newBill);

    setBillSuccess(true);
    setSelectedTenant('');
    setElecReading('');
    setWaterReading('');
    setCalculatedDetails(null);
    setTimeout(() => setBillSuccess(false), 3000);
  };

  // 4. Logic to list active tenants without bills for Selected Month
  const checkUnissuedBills = (month: string) => {
    return tenants.filter((t) => {
      if (t.status === 'ملغى') return false;
      // Check if a bill exists for this tenant and month
      const billExists = bills.some((b) => b.tenant_id === t.tenant_id && b.billing_month === month);
      return !billExists;
    });
  };

  const unissuedTenants = checkUnissuedBills('2026-07');

  // 5. Logic for monthly reports (aggregate calculations)
  const calculateMonthlyReport = () => {
    const totalRent = bills.reduce((sum, b) => sum + b.rent_bill, 0);
    const totalElec = bills.reduce((sum, b) => sum + b.electricity_bill, 0);
    const totalWater = bills.reduce((sum, b) => sum + b.water_bill, 0);
    const totalArrears = bills.reduce((sum, b) => sum + b.previous_arrears, 0);
    const grandTotal = bills.reduce((sum, b) => sum + b.total_amount, 0);

    const paidBills = bills.filter((b) => b.payment_status === 'مدفوع');
    const unpaidBills = bills.filter((b) => b.payment_status === 'غير مدفوع');
    const partialBills = bills.filter((b) => b.payment_status === 'مدفوع جزئياً');

    return {
      totalRent,
      totalElec,
      totalWater,
      totalArrears,
      grandTotal,
      paidCount: paidBills.length,
      unpaidCount: unpaidBills.length,
      partialCount: partialBills.length,
    };
  };

  const report = calculateMonthlyReport();

  return (
    <div className="space-y-6" id="business-logic-container">
      {/* رأس التنقل */}
      <div className="flex border-b border-slate-100 overflow-x-auto bg-slate-50 rounded-xl p-1" id="business-logic-menu-bar">
        <button
          onClick={() => setActiveAction('issue_bill')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
            activeAction === 'issue_bill' ? 'bg-white text-emerald-700 shadow-sm font-semibold' : 'text-slate-600 hover:bg-white/50'
          }`}
          id="action-btn-issue-bill"
        >
          <FileText className="h-4 w-4" />
          إصدار الفواتير الآلي (Issue Bills)
        </button>
        <button
          onClick={() => setActiveAction('add_tenant')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
            activeAction === 'add_tenant' ? 'bg-white text-emerald-700 shadow-sm font-semibold' : 'text-slate-600 hover:bg-white/50'
          }`}
          id="action-btn-add-tenant"
        >
          <UserPlus className="h-4 w-4" />
          إضافة مستأجر جديد (Add Tenant)
        </button>
        <button
          onClick={() => setActiveAction('unissued_check')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
            activeAction === 'unissued_check' ? 'bg-white text-emerald-700 shadow-sm font-semibold' : 'text-slate-600 hover:bg-white/50'
          }`}
          id="action-btn-unissued-check"
        >
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          الفواتير المعلقة (Unissued Bills)
        </button>
        <button
          onClick={() => setActiveAction('monthly_report')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
            activeAction === 'monthly_report' ? 'bg-white text-emerald-700 shadow-sm font-semibold' : 'text-slate-600 hover:bg-white/50'
          }`}
          id="action-btn-monthly-report"
        >
          <TrendingUp className="h-4 w-4" />
          التقارير الشهرية (Monthly Reports)
        </button>
      </div>

      {/* المحتوى التفاعلي */}
      <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm" id="business-logic-content-box">
        {activeAction === 'issue_bill' && (
          <div className="space-y-6" id="issue-bill-panel">
            <div className="border-b border-slate-100 pb-3">
              <h4 className="font-semibold text-slate-800 text-sm sm:text-base flex items-center gap-1.5">
                <Briefcase className="h-5 w-5 text-emerald-600" />
                إصدار فاتورة شهرية مع احتساب المتأخرات تلقائياً
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                تأخذ هذه العملية القراءات الحالية لتقارنها بالقراءات السابقة لضربها في إعدادات التعرفة وإضافة متأخرات الفواتير غير المدفوعة تلقائياً.
              </p>
            </div>

            {billSuccess && (
              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center gap-2 text-emerald-800 text-xs sm:text-sm">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span>تم احتساب وإصدار الفاتورة وتحديث قراءات العدادات في أرشيف CSV بنجاح!</span>
              </div>
            )}

            {tenants.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs sm:text-sm">
                الرجاء شحن البيانات التجريبية أولاً من علامة تبويب "طبقة البيانات" للبدء في إصدار الفواتير.
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (calculatedDetails) {
                    handleIssueBillSubmit(e);
                  } else {
                    handleCalculateBill();
                  }
                }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
                id="issue-bill-form"
              >
                {/* مدخلات الفاتورة */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">اختر المستأجر</label>
                    <select
                      value={selectedTenant}
                      onChange={(e) => {
                        setSelectedTenant(e.target.value);
                        setCalculatedDetails(null);
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm bg-white"
                      required
                      id="select-tenant-dropdown"
                    >
                      <option value="">-- اختر مستأجراً نشطاً --</option>
                      {tenants
                        .filter((t) => t.status !== 'ملغى')
                        .map((t) => (
                          <option key={t.tenant_id} value={t.tenant_id}>
                            {t.name} (وحدة: {t.unit_number})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">شهر الفاتورة</label>
                      <input
                        type="month"
                        value={billingMonth}
                        onChange={(e) => {
                          setBillingMonth(e.target.value);
                          setCalculatedDetails(null);
                        }}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm font-mono"
                        required
                        id="billing-month-input"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">تاريخ الإصدار</label>
                      <input
                        type="text"
                        value={new Date().toISOString().split('T')[0]}
                        disabled
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm font-mono text-slate-500"
                        id="issue-date-display"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">قراءة الكهرباء الحالية (kWh)</label>
                      <input
                        type="number"
                        placeholder="مثال: 1550"
                        value={elecReading}
                        onChange={(e) => {
                          setElecReading(e.target.value);
                          setCalculatedDetails(null);
                        }}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm font-mono"
                        required
                        id="electricity-reading-input"
                      />
                      {selectedTenant && (
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          القراءة السابقة:{' '}
                          {[...readings]
                            .filter((r) => r.tenant_id === selectedTenant)
                            .sort((a, b) => b.reading_month.localeCompare(a.reading_month))[0]?.electricity_reading || 0}{' '}
                          kWh
                        </span>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">قراءة المياه الحالية (m³)</label>
                      <input
                        type="number"
                        placeholder="مثال: 365"
                        value={waterReading}
                        onChange={(e) => {
                          setWaterReading(e.target.value);
                          setCalculatedDetails(null);
                        }}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm font-mono"
                        required
                        id="water-reading-input"
                      />
                      {selectedTenant && (
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          القراءة السابقة:{' '}
                          {[...readings]
                            .filter((r) => r.tenant_id === selectedTenant)
                            .sort((a, b) => b.reading_month.localeCompare(a.reading_month))[0]?.water_reading || 0}{' '}
                          m³
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCalculateBill}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer"
                    id="calc-bill-details-btn"
                  >
                    احتساب تفاصيل الاستهلاك والمتأخرات
                  </button>
                </div>

                {/* تفاصيل الاحتساب التلقائي */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col justify-between" id="calculated-invoice-box">
                  {calculatedDetails ? (
                    <div className="space-y-4">
                      <h5 className="font-semibold text-slate-800 text-xs sm:text-sm pb-2 border-b border-slate-200/60">
                        التفصيل المحسوب للفاتورة المؤقتة
                      </h5>
                      <div className="space-y-2 text-xs text-slate-600">
                        <div className="flex justify-between">
                          <span>الإيجار الأساسي المستحق:</span>
                          <span className="font-mono text-slate-950 font-semibold">{calculatedDetails.rent.toLocaleString()} ر.ي</span>
                        </div>
                        <div className="flex justify-between">
                          <span>استهلاك الكهرباء ({calculatedDetails.consumptionElec} kWh):</span>
                          <span className="font-mono text-slate-900">{calculatedDetails.costElec.toFixed(2)} ر.ي</span>
                        </div>
                        <div className="flex justify-between">
                          <span>استهلاك المياه ({calculatedDetails.consumptionWater} m³):</span>
                          <span className="font-mono text-slate-900">{calculatedDetails.costWater.toFixed(2)} ر.ي</span>
                        </div>
                        <div className="flex justify-between">
                          <span>المتأخرات السابقة المتراكمة:</span>
                          <span className="font-mono text-rose-600 font-medium">+{calculatedDetails.arrears.toLocaleString()} ر.ي</span>
                        </div>
                        <div className="flex justify-between">
                          <span>الضريبة والرسوم ({prices.tax_rate * 100}%):</span>
                          <span className="font-mono text-slate-900">{calculatedDetails.tax.toFixed(2)} ر.ي</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-200/60 pt-3 text-sm font-bold text-slate-900">
                          <span>المجموع الكلي المطلوب:</span>
                          <span className="font-mono text-emerald-700">{calculatedDetails.total.toFixed(2)} ر.ي</span>
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                        id="confirm-issue-invoice-btn"
                      >
                        <FileCheck className="h-4 w-4" />
                        تأكيد وإصدار الفاتورة للعميل
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center py-8 text-slate-400">
                      <FileText className="h-8 w-8 text-slate-300 mb-2" />
                      <p className="text-xs">يرجى ملء الحقول والنقر على زر "احتساب" لرؤية الفاتورة والرسوم التلقائية هنا.</p>
                    </div>
                  )}
                </div>
              </form>
            )}
          </div>
        )}

        {activeAction === 'add_tenant' && (
          <div className="space-y-6" id="add-tenant-panel">
            <div className="border-b border-slate-100 pb-3">
              <h4 className="font-semibold text-slate-800 text-sm sm:text-base flex items-center gap-1.5">
                <UserPlus className="h-5 w-5 text-emerald-600" />
                تسجيل مستأجر جديد في طبقة البيانات
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                تقوم هذه الدالة بإضافة السجل الجديد للـ DataFrame الخاص بالمستأجرين وتحديث ملف CSV المقابل.
              </p>
            </div>

            {tenantSuccess && (
              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center gap-2 text-emerald-800 text-xs sm:text-sm">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span>تم تسجيل العميل بنجاح في أرشيف CSV للمستأجرين!</span>
              </div>
            )}

            <form onSubmit={handleAddTenantSubmit} className="space-y-4 max-w-xl" id="add-tenant-form">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">الاسم الكامل</label>
                  <input
                    type="text"
                    placeholder="مثال: يوسف الحربي"
                    value={tenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm"
                    required
                    id="new-tenant-name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">رقم الهاتف</label>
                  <input
                    type="text"
                    placeholder="مثال: 0501234567"
                    value={tenantPhone}
                    onChange={(e) => setTenantPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm font-mono"
                    required
                    id="new-tenant-phone"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">رقم الشقة/الوحدة</label>
                  <input
                    type="text"
                    placeholder="مثال: E10"
                    value={tenantUnit}
                    onChange={(e) => setTenantUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm font-mono"
                    required
                    id="new-tenant-unit"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">قيمة الإيجار الشهري (ر.ي)</label>
                  <input
                    type="number"
                    placeholder="مثال: 2500"
                    value={tenantRent}
                    onChange={(e) => setTenantRent(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm font-mono"
                    required
                    id="new-tenant-rent"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs sm:text-sm font-bold transition-all shadow-sm cursor-pointer"
                id="submit-new-tenant-btn"
              >
                تسجيل وحفظ المستأجر
              </button>
            </form>
          </div>
        )}

        {activeAction === 'unissued_check' && (
          <div className="space-y-6" id="unissued-check-panel">
            <div className="border-b border-slate-100 pb-3">
              <h4 className="font-semibold text-slate-800 text-sm sm:text-base flex items-center gap-1.5">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                التحقق التلقائي من الفواتير المعلقة أو غير الصادرة
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                تبحث هذه الدالة عن كافة المستأجرين النشطين في النظام والذين لم تصدر لهم فاتورة في الشهر المختار (محاكاة لشهر يونيو/يوليو 2026).
              </p>
            </div>

            <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-4 text-xs text-amber-800" id="unissued-meta-info">
              <span>الفواتير غير الصادرة لشهر <strong>يوليو 2026</strong>:</span>
            </div>

            <div className="border border-slate-100 rounded-xl overflow-hidden" id="unissued-tenants-list">
              <table className="w-full text-right text-xs sm:text-sm">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="p-3">المستأجر المعلق</th>
                    <th className="p-3">رقم الوحدة</th>
                    <th className="p-3">الإيجار الأساسي</th>
                    <th className="p-3">حالة التحقق</th>
                    <th className="p-3">إجراء سريع</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {unissuedTenants.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400 text-xs">
                        رائع! كافة المستأجرين النشطين لديهم فواتير صادرة ومثبتة لهذا الشهر.
                      </td>
                    </tr>
                  ) : (
                    unissuedTenants.map((t) => (
                      <tr key={t.tenant_id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-semibold text-slate-900">{t.name}</td>
                        <td className="p-3 font-mono text-slate-700">{t.unit_number}</td>
                        <td className="p-3 font-mono text-slate-900">{t.rent_amount.toLocaleString()} ر.ي</td>
                        <td className="p-3 text-amber-600 flex items-center gap-1.5 mt-2">
                          <span className="h-2 w-2 rounded-full bg-amber-500" />
                          معلقة (Unissued)
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => {
                              setSelectedTenant(t.tenant_id);
                              setBillingMonth('2026-07');
                              setActiveAction('issue_bill');
                            }}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded transition-all"
                            id={`quick-issue-${t.tenant_id}`}
                          >
                            إصدار فوري
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeAction === 'monthly_report' && (
          <div className="space-y-6" id="monthly-report-panel">
            <div className="border-b border-slate-100 pb-3">
              <h4 className="font-semibold text-slate-800 text-sm sm:text-base flex items-center gap-1.5">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                لوحة تقارير الإيرادات والتحصيل التراكمية
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                توضح هذه اللوحة المجاميع الكلية المستحقة، المحصلة، والديون المترتبة في النظام استناداً إلى عمليات Pandas البرمجية.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4" id="report-stats-grid">
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                <span className="text-[11px] text-slate-500 font-semibold block">إجمالي قيمة عقود الإيجار الصادرة</span>
                <span className="text-lg sm:text-xl font-bold font-mono text-slate-900 mt-1 block">
                  {report.totalRent.toLocaleString()} ر.ي
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                <span className="text-[11px] text-slate-500 font-semibold block">إجمالي فواتير الخدمات (كهرباء/ماء)</span>
                <span className="text-lg sm:text-xl font-bold font-mono text-emerald-700 mt-1 block">
                  {(report.totalElec + report.totalWater).toLocaleString()} ر.ي
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                <span className="text-[11px] text-slate-500 font-semibold block">المتأخرات التراكمية والديون السابقة</span>
                <span className="text-lg sm:text-xl font-bold font-mono text-rose-600 mt-1 block">
                  {report.totalArrears.toLocaleString()} ر.ي
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                <span className="text-[11px] text-slate-500 font-semibold block">المجموع العام المطلوب تحصيله</span>
                <span className="text-lg sm:text-xl font-bold font-mono text-indigo-700 mt-1 block">
                  {report.grandTotal.toLocaleString()} ر.ي
                </span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-3" id="payment-statuses-breakdown">
              <h5 className="font-semibold text-slate-800 text-xs sm:text-sm border-b border-slate-200 pb-2">
                توزيع فواتير العقود حسب حالة الدفع
              </h5>
              <div className="flex items-center gap-6 text-xs text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  مدفوعة بالكامل: <strong>{report.paidCount} فواتير</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  مدفوعة جزئياً: <strong>{report.partialCount} فواتير</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                  غير مدفوعة ومستحقة: <strong>{report.unpaidCount} فواتير</strong>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
