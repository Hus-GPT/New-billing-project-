import React, { useState } from 'react';
import { Tenant, Bill, MeterReading, PriceSettings } from '../types';
import { Database, FileSpreadsheet, RefreshCw, Plus, Trash2, CheckCircle, Info, Settings, ShieldAlert } from 'lucide-react';

interface DataLayerTabProps {
  tenants: Tenant[];
  bills: Bill[];
  readings: MeterReading[];
  prices: PriceSettings;
  onLoadDemo: () => void;
  onReset: () => void;
  onUpdatePrices: (prices: PriceSettings) => void;
  onAddTenant: (tenant: Tenant) => void;
}

export default function DataLayerTab({
  tenants,
  bills,
  readings,
  prices,
  onLoadDemo,
  onReset,
  onUpdatePrices,
}: DataLayerTabProps) {
  const [subTab, setSubTab] = useState<'tenants' | 'bills' | 'readings' | 'prices'>('tenants');
  const [copiedCSV, setCopiedCSV] = useState<string | null>(null);

  // State to edit prices
  const [electricity, setElectricity] = useState(prices.electricity_rate);
  const [water, setWater] = useState(prices.water_rate);
  const [tax, setTax] = useState(prices.tax_rate);
  const [isSaved, setIsSaved] = useState(false);

  // Generate simulated CSV string
  const generateCSV = (type: 'tenants' | 'bills' | 'readings' | 'prices') => {
    if (type === 'tenants') {
      const headers = 'tenant_id,name,phone,unit_number,rent_amount,status,join_date\n';
      const rows = tenants
        .map(
          (t) =>
            `"${t.tenant_id}","${t.name}","${t.phone}","${t.unit_number}",${t.rent_amount},"${t.status}","${t.join_date}"`
        )
        .join('\n');
      return headers + rows;
    } else if (type === 'bills') {
      const headers = 'bill_id,tenant_id,billing_month,rent_bill,electricity_bill,water_bill,previous_arrears,total_amount,payment_status,issue_date\n';
      const rows = bills
        .map(
          (b) =>
            `"${b.bill_id}","${b.tenant_id}","${b.billing_month}",${b.rent_bill},${b.electricity_bill},${b.water_bill},${b.previous_arrears},${b.total_amount},"${b.payment_status}","${b.issue_date}"`
        )
        .join('\n');
      return headers + rows;
    } else if (type === 'readings') {
      const headers = 'reading_id,tenant_id,reading_month,electricity_reading,water_reading,reading_date\n';
      const rows = readings
        .map(
          (r) =>
            `"${r.reading_id}","${r.tenant_id}","${r.reading_month}",${r.electricity_reading},${r.water_reading},"${r.reading_date}"`
        )
        .join('\n');
      return headers + rows;
    } else {
      const headers = 'electricity_rate,water_rate,tax_rate,last_update\n';
      const rows = `${prices.electricity_rate},${prices.water_rate},${prices.tax_rate},"${prices.last_update}"`;
      return headers + rows;
    }
  };

  const copyCSVToClipboard = (type: 'tenants' | 'bills' | 'readings' | 'prices') => {
    const csv = generateCSV(type);
    navigator.clipboard.writeText(csv);
    setCopiedCSV(type);
    setTimeout(() => setCopiedCSV(null), 2000);
  };

  const handleSavePrices = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdatePrices({
      electricity_rate: Number(electricity),
      water_rate: Number(water),
      tax_rate: Number(tax),
      last_update: new Date().toISOString().replace('T', ' ').substring(0, 19),
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="space-y-6" id="data-layer-container">
      {/* التحكم والأرشفة */}
      <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4" id="archive-control-box">
        <div>
          <h4 className="font-semibold text-slate-800 flex items-center gap-2 text-sm sm:text-base">
            <Database className="h-4 w-4 text-emerald-600" />
            طبقة إدارة البيانات والأرشفة اليدوية (Data Archive Control)
          </h4>
          <p className="text-xs text-slate-500 mt-1">
            وفقاً لطلبك، لا يتم تفعيل البيانات التجريبية تلقائياً. يمكنك شحن البيانات نموذجياً أو مسحها لاختبار التعافي التلقائي.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2" id="action-buttons-group">
          <button
            onClick={onLoadDemo}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors shadow-sm cursor-pointer"
            id="load-demo-data-btn"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            شحن البيانات التجريبية (يدوياً)
          </button>
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            id="reset-recovery-btn"
          >
            <Trash2 className="h-3.5 w-3.5" />
            تفريغ البيانات واختبار التعافي
          </button>
        </div>
      </div>

      {/* الحالة العامة */}
      {tenants.length === 0 ? (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-start gap-3" id="empty-state-notice">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h5 className="font-semibold text-amber-800 text-xs sm:text-sm">وضع التعافي من الأخطاء مفعل (Data Recovery Mode Active)</h5>
            <p className="text-xs text-amber-700 mt-1 leading-relaxed">
              أرشيف البيانات فارغ أو مفقود! قام النظام تلقائياً بإنشاء مجموعات بيانات (Pandas DataFrames) فارغة وهياكل برمجية سليمة لتفادي انهيار التطبيق. انقر على زر "شحن البيانات التجريبية" أعلاه لمحاكاة تحميل الأرشيف المحفوظ.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3 px-4 text-xs text-emerald-800 flex items-center gap-2" id="data-loaded-notice">
          <CheckCircle className="h-4 w-4 text-emerald-600" />
          <span>تم تحميل البيانات بنجاح من الذاكرة المحاكية (أرشيف CSV نشط).</span>
        </div>
      )}

      {/* الهيكل التنظيمي لمجموعات البيانات */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6" id="data-tables-grid">
        {/* التنقل الجانبي بين الجداول الأربعة */}
        <div className="lg:col-span-1 flex flex-row lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0 border-b lg:border-b-0 lg:border-l border-slate-100" id="tables-navigation-menu">
          <button
            onClick={() => setSubTab('tenants')}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all text-right w-full whitespace-nowrap ${
              subTab === 'tenants'
                ? 'bg-emerald-50 text-emerald-700 font-semibold'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
            id="subtab-btn-tenants"
          >
            <div className="h-2 w-2 rounded-full bg-emerald-600" />
            المستأجرين (Tenants)
            <span className="mr-auto px-1.5 py-0.5 text-[10px] bg-slate-200/60 rounded-full font-mono text-slate-600">
              {tenants.length} صفوف
            </span>
          </button>
          <button
            onClick={() => setSubTab('bills')}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all text-right w-full whitespace-nowrap ${
              subTab === 'bills'
                ? 'bg-emerald-50 text-emerald-700 font-semibold'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
            id="subtab-btn-bills"
          >
            <div className="h-2 w-2 rounded-full bg-blue-600" />
            الفواتير (Bills)
            <span className="mr-auto px-1.5 py-0.5 text-[10px] bg-slate-200/60 rounded-full font-mono text-slate-600">
              {bills.length} صفوف
            </span>
          </button>
          <button
            onClick={() => setSubTab('readings')}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all text-right w-full whitespace-nowrap ${
              subTab === 'readings'
                ? 'bg-emerald-50 text-emerald-700 font-semibold'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
            id="subtab-btn-readings"
          >
            <div className="h-2 w-2 rounded-full bg-amber-600" />
            عدادات الاستهلاك (Readings)
            <span className="mr-auto px-1.5 py-0.5 text-[10px] bg-slate-200/60 rounded-full font-mono text-slate-600">
              {readings.length} صفوف
            </span>
          </button>
          <button
            onClick={() => setSubTab('prices')}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all text-right w-full whitespace-nowrap ${
              subTab === 'prices'
                ? 'bg-emerald-50 text-emerald-700 font-semibold'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
            id="subtab-btn-prices"
          >
            <div className="h-2 w-2 rounded-full bg-indigo-600" />
            إعدادات الأسعار (Prices)
            <span className="mr-auto px-1.5 py-0.5 text-[10px] bg-slate-200/60 rounded-full font-mono text-slate-600">
              نشط
            </span>
          </button>
        </div>

        {/* عرض الجدول المختار */}
        <div className="lg:col-span-3 space-y-4" id="table-display-container">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-slate-800 text-xs sm:text-sm flex items-center gap-1.5">
              <span>هيكل DataFrame:</span>
              <span className="font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                {subTab === 'tenants' && 'tenants_df'}
                {subTab === 'bills' && 'bills_df'}
                {subTab === 'readings' && 'meter_readings_df'}
                {subTab === 'prices' && 'price_settings_df'}
              </span>
            </h4>
            <button
              onClick={() => copyCSVToClipboard(subTab)}
              className="flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-emerald-700 hover:bg-slate-50 border border-slate-200 rounded-md text-[11px] font-medium transition-all"
              id={`export-csv-btn-${subTab}`}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              {copiedCSV === subTab ? 'تم نسخ ملف CSV!' : 'تصدير كملف CSV'}
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm" id="table-view-box">
            {subTab === 'tenants' && (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs sm:text-sm" id="tenants-data-table">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                    <tr>
                      <th className="p-3">رقم المستأجر</th>
                      <th className="p-3">الاسم كامل</th>
                      <th className="p-3">رقم الهاتف</th>
                      <th className="p-3">رقم الوحدة</th>
                      <th className="p-3">قيمة الإيجار</th>
                      <th className="p-3">الحالة</th>
                      <th className="p-3">تاريخ الانضمام</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {tenants.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400">
                          لا توجد بيانات مستأجرين حالياً.
                        </td>
                      </tr>
                    ) : (
                      tenants.map((t) => (
                        <tr key={t.tenant_id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-mono font-medium text-slate-700">{t.tenant_id}</td>
                          <td className="p-3 font-medium text-slate-900">{t.name}</td>
                          <td className="p-3 text-slate-600 font-mono">{t.phone}</td>
                          <td className="p-3 font-mono text-slate-700">{t.unit_number}</td>
                          <td className="p-3 text-slate-900 font-mono">{t.rent_amount.toLocaleString()} ر.ي</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              t.status === 'نشط' ? 'bg-emerald-50 text-emerald-700' :
                              t.status === 'نشط مؤقتاً' ? 'bg-amber-50 text-amber-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {t.status}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500 font-mono">{t.join_date}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {subTab === 'bills' && (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs sm:text-sm" id="bills-data-table">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                    <tr>
                      <th className="p-3">رقم الفاتورة</th>
                      <th className="p-3">المستأجر</th>
                      <th className="p-3">الشهر</th>
                      <th className="p-3">الإيجار</th>
                      <th className="p-3">الكهرباء</th>
                      <th className="p-3">الماء</th>
                      <th className="p-3">متأخرات سابقة</th>
                      <th className="p-3">المجموع الكلي</th>
                      <th className="p-3">حالة الدفع</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {bills.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-400">
                          لا توجد فواتير صادرة حالياً.
                        </td>
                      </tr>
                    ) : (
                      bills.map((b) => (
                        <tr key={b.bill_id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-mono font-medium text-slate-700">{b.bill_id}</td>
                          <td className="p-3 font-mono text-slate-600">{b.tenant_id}</td>
                          <td className="p-3 font-mono text-slate-700">{b.billing_month}</td>
                          <td className="p-3 text-slate-900 font-mono">{b.rent_bill.toLocaleString()} ر.ي</td>
                          <td className="p-3 text-emerald-600 font-mono">{b.electricity_bill} ر.ي</td>
                          <td className="p-3 text-blue-600 font-mono">{b.water_bill} ر.ي</td>
                          <td className="p-3 text-rose-600 font-mono">{b.previous_arrears.toLocaleString()} ر.ي</td>
                          <td className="p-3 font-bold text-slate-900 font-mono">{(b.total_amount).toLocaleString()} ر.ي</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              b.payment_status === 'مدفوع' ? 'bg-emerald-50 text-emerald-700' :
                              b.payment_status === 'مدفوع جزئياً' ? 'bg-amber-50 text-amber-700' :
                              'bg-rose-50 text-rose-700'
                            }`}>
                              {b.payment_status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {subTab === 'readings' && (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs sm:text-sm" id="readings-data-table">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                    <tr>
                      <th className="p-3">رقم القراءة</th>
                      <th className="p-3">معرف المستأجر</th>
                      <th className="p-3">شهر القراءة</th>
                      <th className="p-3">عداد الكهرباء (kWh)</th>
                      <th className="p-3">عداد المياه (m³)</th>
                      <th className="p-3">تاريخ التسجيل</th>
                      <th className="p-3">ملاحظات / تعليق</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {readings.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400">
                          لا توجد قراءات عدادات مسجلة حالياً.
                        </td>
                      </tr>
                    ) : (
                      readings.map((r) => (
                        <tr key={r.reading_id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-mono font-medium text-slate-700">{r.reading_id}</td>
                          <td className="p-3 font-mono text-slate-600">{r.tenant_id}</td>
                          <td className="p-3 font-mono text-slate-700">{r.reading_month}</td>
                          <td className="p-3 text-emerald-700 font-mono font-medium">{r.electricity_reading.toLocaleString()}</td>
                          <td className="p-3 text-blue-700 font-mono font-medium">{r.water_reading.toLocaleString()}</td>
                          <td className="p-3 text-slate-500 font-mono">{r.reading_date}</td>
                          <td className="p-3 text-slate-500 font-sans max-w-[150px] truncate" title={r.notes}>{r.notes || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {subTab === 'prices' && (
              <div className="p-6">
                <form onSubmit={handleSavePrices} className="space-y-4" id="prices-edit-form">
                  <div className="flex items-center gap-2 text-indigo-800 bg-indigo-50/70 p-3 rounded-lg text-xs">
                    <Info className="h-4 w-4 shrink-0" />
                    <span>تتحكم هذه الإعدادات في تعرفة الاستهلاك الشهري لحساب الفواتير تلقائياً.</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">تعرفة الكهرباء (للكيلوواط)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={electricity}
                        onChange={(e) => setElectricity(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm font-mono focus:outline-emerald-600"
                        id="electricity-rate-input"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">تعرفة المياه (للمتر المكعب)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={water}
                        onChange={(e) => setWater(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm font-mono focus:outline-emerald-600"
                        id="water-rate-input"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">نسبة الضريبة والخدمات (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={tax}
                        onChange={(e) => setTax(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm font-mono focus:outline-emerald-600"
                        id="tax-rate-input"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <span className="text-[10px] text-slate-400 font-mono">آخر تحديث: {prices.last_update}</span>
                    <button
                      type="submit"
                      className="flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-all shadow-sm cursor-pointer"
                      id="save-prices-btn"
                    >
                      <Settings className="h-3.5 w-3.5" />
                      {isSaved ? 'تم التحديث!' : 'حفظ إعدادات الأسعار'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
