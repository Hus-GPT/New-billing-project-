import React, { useState } from 'react';
import { PriceSettings, AuditLog, Tenant, Bill } from '../types';
import { 
  Settings, Save, Volume2, VolumeX, RefreshCw, Landmark, 
  ShieldAlert, Database, HelpCircle, Check, Eye, Trash2,
  Download, FileSpreadsheet, Type, Languages
} from 'lucide-react';
import { translations } from '../lib/translations';

interface SettingsViewProps {
  prices: PriceSettings;
  auditLogs: AuditLog[];
  tenants: Tenant[];
  bills: Bill[];
  fontFamily: string;
  onUpdateFontFamily: (font: string) => void;
  lang: 'ar' | 'en';
  onUpdateLang: (l: 'ar' | 'en') => void;
  onUpdatePrices: (newPrices: PriceSettings) => void;
  onLogAudit: (action: string, table: string, id: string, details: string) => void;
  playSound: (type: 'success' | 'alert' | 'click' | 'restore') => void;
  audioEnabled: boolean;
  setAudioEnabled: (val: boolean) => void;
  autoRefreshEnabled: boolean;
  setAutoRefreshEnabled: (val: boolean) => void;
  onLoadDemo: () => void;
  onReset: () => void;
}

export default function SettingsView({
  prices,
  auditLogs,
  tenants,
  bills,
  fontFamily,
  onUpdateFontFamily,
  lang,
  onUpdateLang,
  onUpdatePrices,
  onLogAudit,
  playSound,
  audioEnabled,
  setAudioEnabled,
  autoRefreshEnabled,
  setAutoRefreshEnabled,
  onLoadDemo,
  onReset,
}: SettingsViewProps) {
  const [electricityRate, setElectricityRate] = useState(String(prices.electricity_rate));
  const [waterRate, setWaterRate] = useState(String(prices.water_rate));
  const [serviceFee, setServiceFee] = useState(String(prices.monthly_service_fee || 80));
  const [totalSharedExpenses, setTotalSharedExpenses] = useState(String(prices.total_shared_expenses || 320));
  const [jeebPhone, setJeebPhone] = useState(prices.jeeb_phone || '0505559999');
  const [jeebBarcode, setJeebBarcode] = useState(prices.jeeb_barcode || 'JEEP-SANAD-MERCHANT-8871');

  const [saveSuccess, setSaveSuccess] = useState(false);

  const triggerDownload = (content: string, filename: string) => {
    // Adding UTF-8 BOM for Microsoft Excel compatibility (important for Arabic characters)
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (audioEnabled) playSound('success');
  };

  const exportTenantsCSV = () => {
    const headers = [
      'معرف المستأجر (Tenant ID)',
      'الاسم (Name)',
      'رقم الهاتف (Phone)',
      'رقم الشقة/الوحدة (Unit Number)',
      'الإيجار الشهري (Monthly Rent)',
      'الحالة (Status)',
      'تاريخ الانضمام (Join Date)',
      'نوع الهوية (ID Type)',
      'رقم الهوية (ID Number)',
      'البريد الإلكتروني (Email)',
      'تاريخ بدء العقد (Contract Start)',
      'تاريخ انتهاء العقد (Contract End)',
      'رصيد الدفعات المقدمة (Advance Balance)',
    ];

    const activeTenants = tenants.filter(t => !t.is_deleted);
    const rows = activeTenants.map(t => [
      t.tenant_id,
      t.name,
      t.phone,
      t.unit_number,
      t.rent_amount,
      t.status,
      t.join_date,
      t.id_type || '',
      t.id_number || '',
      t.email || '',
      t.contract_start || '',
      t.contract_end || '',
      t.advance_balance || 0
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    triggerDownload(csvContent, 'sanad_tenants_export.csv');
    
    onLogAudit(
      'تصدير مستأجرين',
      'tenants',
      'all',
      `تم تصدير سجلات المستأجرين النشطين (العدد: ${activeTenants.length}) بنجاح بصيغة CSV.`
    );
  };

  const exportBillsCSV = () => {
    const headers = [
      'معرف الفاتورة (Bill ID)',
      'معرف المستأجر (Tenant ID)',
      'شهر الفوترة (Billing Month)',
      'الإيجار الأساسي (Base Rent)',
      'فاتورة الكهرباء (Electricity Bill)',
      'فاتورة المياه (Water Bill)',
      'رسوم الخدمات (Service Fee)',
      'حصة المصاريف المشتركة (Shared Expense Share)',
      'متأخرات سابقة (Previous Arrears)',
      'إجمالي مبلغ المطالبة (Total Claim)',
      'رصيد مقدم مطبق (Applied Advance)',
      'المطلوب سداده بعد التخصيم (Net Payable)',
      'المبلغ المسدد (Paid Amount)',
      'حالة السداد (Payment Status)',
      'تاريخ الإصدار (Issue Date)',
      'مؤرشفة (Archived)',
    ];

    const activeBills = bills.filter(b => !b.is_deleted);
    const rows = activeBills.map(b => [
      b.bill_id,
      b.tenant_id,
      b.billing_month,
      b.rent_bill,
      b.electricity_bill,
      b.water_bill,
      b.service_charges || 0,
      b.shared_expense_share || 0,
      b.previous_arrears,
      (b.rent_bill + b.electricity_bill + b.water_bill + (b.service_charges || 0) + (b.shared_expense_share || 0) + b.previous_arrears),
      b.applied_advance || 0,
      b.total_amount,
      b.paid_amount || 0,
      b.payment_status,
      b.issue_date,
      b.is_archived ? 'نعم' : 'لا'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    triggerDownload(csvContent, 'sanad_bills_export.csv');

    onLogAudit(
      'تصدير فواتير',
      'bills',
      'all',
      `تم تصدير كشوف الفواتير النشطة (العدد: ${activeBills.length}) بنجاح بصيغة CSV.`
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const updated: PriceSettings = {
      electricity_rate: Number(electricityRate),
      water_rate: Number(waterRate),
      tax_rate: prices.tax_rate, // 5%
      monthly_service_fee: Number(serviceFee),
      total_shared_expenses: Number(totalSharedExpenses),
      jeeb_phone: jeebPhone,
      jeeb_barcode: jeebBarcode,
      last_update: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    onUpdatePrices(updated);
    
    onLogAudit(
      'تحديث إعدادات النظام',
      'settings',
      '1',
      `تم تحديث تعرفة الخدمات (كهرباء: ${electricityRate}، مياه: ${waterRate}، رسوم تشغيل: ${serviceFee}، مصاريف مشتركة موزعة: ${totalSharedExpenses}، جيب: ${jeebPhone}).`
    );

    if (audioEnabled) playSound('success');
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 2500);
  };

  return (
    <div className="space-y-6" id="settings-view-wrapper">
      {/* 1. ترويسة الإعدادات */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4" id="settings-header">
        <div className="space-y-1">
          <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-1.5">
            <Settings className="h-5 w-5 text-emerald-600" />
            {translations[lang].settings_title}
          </h3>
          <p className="text-xs text-slate-500">{translations[lang].settings_subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="settings-main-grid">
        {/* 2. نموذج التحكم بالتعرفة وتكامل جيب والمنطق الصوتي */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-5" id="settings-form-panel">
          <h4 className="font-bold text-slate-800 text-xs sm:text-sm flex items-center gap-1.5 border-b border-slate-50 pb-2">
            <Database className="h-4.5 w-4.5 text-emerald-600" />
            {translations[lang].settings_rates_title}
          </h4>

          {saveSuccess ? (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-3 rounded-xl text-center text-xs font-bold animate-pulse">
              {lang === 'ar' ? 'تم حفظ الإعدادات التشغيلية الجديدة وتوثيقها في سجلات الأمان بنجاح!' : 'New operational settings successfully saved and logged!'}
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 block">{translations[lang].settings_electricity_rate}</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={electricityRate}
                    onChange={e => setElectricityRate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold focus:outline-emerald-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 block">{translations[lang].settings_water_rate}</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={waterRate}
                    onChange={e => setWaterRate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold focus:outline-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 block">{translations[lang].settings_service_fee}</label>
                  <input
                    type="number"
                    required
                    value={serviceFee}
                    onChange={e => setServiceFee(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold focus:outline-emerald-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 block">{translations[lang].settings_shared_expenses}</label>
                  <input
                    type="number"
                    required
                    value={totalSharedExpenses}
                    onChange={e => setTotalSharedExpenses(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold focus:outline-emerald-600"
                  />
                  <span className="text-[9px] text-slate-400 block leading-tight mt-0.5">{lang === 'ar' ? 'تُقسم آلياً بالتساوي بين الوحدات النشطة فقط' : 'Automatically divided equally between active units only'}</span>
                </div>
              </div>

              <div className="border-t border-slate-50 pt-3 grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 block">{translations[lang].settings_wallet_phone}</label>
                  <input
                    type="text"
                    required
                    value={jeebPhone}
                    onChange={e => setJeebPhone(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-emerald-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 block">{translations[lang].settings_wallet_barcode}</label>
                  <input
                    type="text"
                    required
                    value={jeebBarcode}
                    onChange={e => setJeebBarcode(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-emerald-600"
                  />
                </div>
              </div>

              {/* مفاتيح التفضيلات للنظام الصوتي وتحديث البيانات */}
              <div className="border-t border-slate-50 pt-3 space-y-3">
                <h5 className="font-bold text-[11px] text-slate-400 block uppercase tracking-wider">تفضيلات التفاعل والمؤشرات الصوتية</h5>
                
                <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <div>
                    <span className="text-xs font-bold text-slate-700 block">{translations[lang].settings_audio_title}</span>
                    <span className="text-[10px] text-slate-400 block">{translations[lang].settings_audio_desc}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAudioEnabled(!audioEnabled);
                      playSound('click');
                    }}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      audioEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  </button>
                </div>

                <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <div>
                    <span className="text-xs font-bold text-slate-700 block">{translations[lang].settings_auto_refresh}</span>
                    <span className="text-[10px] text-slate-400 block">{translations[lang].settings_auto_refresh_desc}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAutoRefreshEnabled(!autoRefreshEnabled);
                      if (audioEnabled) playSound('click');
                    }}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      autoRefreshEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    <RefreshCw className={`h-4 w-4 ${autoRefreshEnabled ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {/* لغة النظام واجهة العرض */}
                <div className="flex flex-col gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100" id="lang-customizer">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold text-slate-700 block">{translations[lang].settings_system_lang}</span>
                      <span className="text-[10px] text-slate-400 block">{translations[lang].settings_system_lang_desc}</span>
                    </div>
                    <Languages className="h-4.5 w-4.5 text-emerald-600" />
                  </div>
                  <select
                    value={lang}
                    onChange={(e) => {
                      const newLang = e.target.value as 'ar' | 'en';
                      onUpdateLang(newLang);
                      playSound('click');
                      onLogAudit(
                        newLang === 'ar' ? 'تغيير لغة النظام' : 'Change System Language',
                        'settings',
                        'language',
                        newLang === 'ar' ? 'تم تحويل لغة واجهة النظام إلى العربية.' : 'System UI language switched to English.'
                      );
                    }}
                    className="w-full mt-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-bold focus:outline-emerald-600 bg-white dark:bg-slate-800 cursor-pointer text-slate-700"
                  >
                    <option value="ar">العربية (Arabic)</option>
                    <option value="en">English (English)</option>
                  </select>
                </div>

                {/* تخصيص نوع خط النظام */}
                <div className="flex flex-col gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100" id="font-customizer">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold text-slate-700 block">{translations[lang].settings_font_title}</span>
                      <span className="text-[10px] text-slate-400 block">{translations[lang].settings_font_desc}</span>
                    </div>
                    <Type className="h-4.5 w-4.5 text-emerald-600" />
                  </div>
                  <select
                    value={fontFamily}
                    onChange={(e) => {
                      onUpdateFontFamily(e.target.value);
                      playSound('click');
                      onLogAudit(
                        lang === 'ar' ? 'تحديث نوع خط النظام' : 'Update System Font',
                        'settings',
                        'font',
                        lang === 'ar' ? `تم تغيير نوع الخط الافتراضي للنظام إلى: ${e.target.value}.` : `System font changed to: ${e.target.value}.`
                      );
                    }}
                    className="w-full mt-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-bold focus:outline-emerald-600 bg-white dark:bg-slate-800 cursor-pointer text-slate-700"
                  >
                    <option value="Tajawal">Tajawal (خط التجول الأنيق - Tajawal)</option>
                    <option value="Cairo">Cairo (خط القاهرة العصري - Cairo)</option>
                    <option value="Almarai">Almarai (خط المراعي الناعم - Almarai)</option>
                    <option value="Readex Pro">Readex Pro (خط ريدكس برو الهندسي - Readex Pro)</option>
                    <option value="Vazirmatn">Vazirmatn (خط وزير متن المطور - Vazirmatn)</option>
                    <option value="IBM Plex Sans Arabic">IBM Plex Sans Arabic (IBM Plex Arabic)</option>
                    <option value="Amiri">Amiri (خط أميري النسخ الكلاسيكي - Amiri)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold rounded-lg text-xs transition-colors shadow-sm cursor-pointer"
              >
                {lang === 'ar' ? 'حفظ كافة المحددات والأسعار' : 'Save All Settings & Rates'}
              </button>

              {/* تصدير البيانات إلى ملفات خارجية */}
              <div className="border-t border-slate-100 pt-4 mt-4 space-y-3">
                <h5 className="font-bold text-[11px] text-emerald-700 dark:text-emerald-400 block uppercase tracking-wider flex items-center gap-1">
                  <FileSpreadsheet className="h-4 w-4" />
                  {lang === 'ar' ? 'تصدير كشوف الحسابات والبيانات (Export Financial Records)' : 'Export Financial Records & Data'}
                </h5>
                <p className="text-[10px] text-slate-500 leading-normal">
                  {lang === 'ar' 
                    ? 'تصدير كافة سجلات المستأجرين والفواتير والمطالبات المالية الجارية بصيغة CSV المتوافقة بالكامل مع Microsoft Excel وتطبيقات التدقيق المالي الخارجي.' 
                    : 'Export all active tenant records, invoices and current financial claims to CSV format fully compatible with Microsoft Excel and external financial auditing apps.'}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={exportTenantsCSV}
                    className="py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-extrabold rounded-lg text-xs transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
                    {lang === 'ar' ? 'تصدير المستأجرين' : 'Export Tenants'}
                  </button>
                  <button
                    type="button"
                    onClick={exportBillsCSV}
                    className="py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-extrabold rounded-lg text-xs transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
                    {lang === 'ar' ? 'تصدير الفواتير' : 'Export Invoices'}
                  </button>
                </div>
              </div>

              {/* Database reset and demo data section */}
              <div className="border-t border-slate-100 pt-4 mt-4 space-y-3">
                <h5 className="font-bold text-[11px] text-rose-700 block uppercase tracking-wider">{lang === 'ar' ? 'التحكم في قاعدة الجداول والبيانات التجريبية' : 'Database & Demo Data Controls'}</h5>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onLoadDemo();
                      if (audioEnabled) playSound('restore');
                    }}
                    className="flex-1 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold rounded-lg text-xs transition-colors border border-emerald-200 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Database className="h-4 w-4" />
                    {lang === 'ar' ? 'شحن البيانات التجريبية' : 'Load Demo Data'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(lang === 'ar' ? 'هل أنت متأكد من رغبتك في تصفير قاعدة بيانات GABER بالكامل؟' : 'Are you sure you want to reset the entire GABER database?')) {
                        onReset();
                        if (audioEnabled) playSound('alert');
                      }
                    }}
                    className="flex-1 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 font-extrabold rounded-lg text-xs transition-colors border border-rose-200 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="h-4 w-4" />
                    {lang === 'ar' ? 'تصفير النظام بالكامل' : 'Reset System Entirely'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* 3. سجل الأمان والتدقيق الفني المباشر (Audit Trail Log) */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4 flex flex-col justify-between" id="audit-logs-panel">
          <div className="border-b border-slate-50 pb-2">
            <h4 className="font-bold text-slate-800 text-xs sm:text-sm flex items-center gap-1.5">
              <ShieldAlert className="h-4.5 w-4.5 text-slate-700" />
              سجل حركات التدقيق والأمان الفني المتكامل (Audit Log)
            </h4>
            <p className="text-[10px] text-slate-400 mt-0.5">مسار كامل يوثق جميع التعديلات والإلغاءات وإصدار المبالغ في النظام لأغراض المطابقة القانونية والمالية.</p>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[340px] space-y-2.5 pr-1 scrollbar-none font-mono">
            {auditLogs.length === 0 ? (
              <p className="text-center py-12 text-slate-400 text-xs font-sans">لا توجد سجلات أمان حالياً.</p>
            ) : (
              [...auditLogs].reverse().map(l => (
                <div
                  key={l.log_id}
                  className="bg-slate-900 text-slate-200 p-2.5 rounded-lg border border-slate-800 text-[10px] leading-relaxed space-y-1"
                >
                  <div className="flex justify-between items-center text-[9px] text-emerald-400 font-bold">
                    <span>📝 [{l.action}]</span>
                    <span>{l.timestamp}</span>
                  </div>
                  <div className="text-slate-300 text-[10px]">
                    الجدول: <span className="text-blue-300">{l.table_name}</span> • السجل: <span className="text-amber-300 font-mono">{l.record_id}</span>
                  </div>
                  <p className="text-slate-400 font-sans text-[11px] leading-relaxed">{l.details}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
