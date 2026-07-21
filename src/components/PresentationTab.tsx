import React, { useState } from 'react';
import { Tenant, Bill, MeterReading, AssistantMessage } from '../types';
import { Monitor, Smartphone, MessageSquare, Send, Sparkles, Receipt, Download, Droplet, Zap } from 'lucide-react';

interface PresentationTabProps {
  tenants: Tenant[];
  bills: Bill[];
  readings: MeterReading[];
  onSendMessage: (text: string) => Promise<string>;
  messages: AssistantMessage[];
  isChatLoading: boolean;
}

export default function PresentationTab({
  tenants,
  bills,
  readings,
  onSendMessage,
  messages,
  isChatLoading,
}: PresentationTabProps) {
  const [selectedTenantId, setSelectedTenantId] = useState('T101');
  const [chatInput, setChatInput] = useState('');
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');

  const tenant = tenants.find((t) => t.tenant_id === selectedTenantId) || tenants[0];
  const tenantBills = bills.filter((b) => b.tenant_id === tenant?.tenant_id);
  const tenantReadings = readings.filter((r) => r.tenant_id === tenant?.tenant_id);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const txt = chatInput;
    setChatInput('');
    await onSendMessage(txt);
  };

  return (
    <div className="space-y-6" id="presentation-layer-container">
      <div className="border-b border-slate-100 pb-3">
        <h4 className="font-semibold text-slate-800 text-sm sm:text-base flex items-center gap-1.5">
          <Monitor className="h-5 w-5 text-emerald-600" />
          نموذج واجهة العرض التفاعلية ومساعد الذكاء الاصطناعي (Presentation Layer)
        </h4>
        <p className="text-xs text-slate-500 mt-1">
          تمثل هذه الشاشة الطبقة الرابعة المقترحة؛ حيث يتم تصدير وعرض قوالب HTML/CSS/JavaScript مدمجة في Colab لتصميم بطاقات فواتير تفاعلية للمستأجرين مع مساعد ذكي مدمج.
        </p>
      </div>

      <div className="flex items-center justify-between" id="viewmode-tenant-selectors">
        <div>
          <label className="text-xs font-semibold text-slate-700 ml-2">استعراض بوابة المستأجر لـ:</label>
          <select
            value={selectedTenantId}
            onChange={(e) => setSelectedTenantId(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white font-medium"
            id="presentation-select-tenant"
          >
            {tenants.map((t) => (
              <option key={t.tenant_id} value={t.tenant_id}>
                {t.name} (وحدة: {t.unit_number})
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-1 border border-slate-200 bg-slate-50 p-1 rounded-lg" id="view-mode-toggles">
          <button
            onClick={() => setViewMode('desktop')}
            className={`p-1.5 rounded-md transition-all ${viewMode === 'desktop' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-400'}`}
            title="عرض مكتبي"
            id="desktop-view-toggle"
          >
            <Monitor className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('mobile')}
            className={`p-1.5 rounded-md transition-all ${viewMode === 'mobile' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-400'}`}
            title="عرض الجوال"
            id="mobile-view-toggle"
          >
            <Smartphone className="h-4 w-4" />
          </button>
        </div>
      </div>

      {tenants.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-xs sm:text-sm">
          الرجاء شحن البيانات التجريبية أولاً من علامة تبويب "طبقة البيانات" لاستعراض قوالب واجهة العرض.
        </div>
      ) : (
        <div className={`grid grid-cols-1 ${viewMode === 'desktop' ? 'lg:grid-cols-12' : 'max-w-md mx-auto grid-cols-1'} gap-6`} id="presentation-viewport">
          
          {/* محاكي شاشة بوابة المستأجر التفاعلية */}
          <div className={`${viewMode === 'desktop' ? 'lg:col-span-8' : 'w-full'} border border-slate-100 rounded-2xl shadow-sm overflow-hidden bg-slate-50`} id="colab-html-sandbox">
            <div className="bg-slate-800 text-white p-3 px-4 text-xs font-mono flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                Colab Inline HTML Sandbox Frame
              </span>
              <span className="opacity-60 text-[10px]">tenant_portal.html</span>
            </div>

            <div className="p-4 sm:p-6 bg-white space-y-6" id="rendered-tenant-portal-ui">
              {/* ترويسة البوابة */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-emerald-800 text-white p-5 rounded-xl">
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-semibold opacity-80 block">مرحبا بك في بوابة المستأجر التفاعلية</span>
                  <h4 className="text-lg font-bold mt-0.5">{tenant?.name}</h4>
                  <p className="text-xs opacity-90 mt-1">الوحدة السكنية: {tenant?.unit_number} • تاريخ العقد: {tenant?.join_date}</p>
                </div>
                <div className="bg-white/10 px-3 py-2 rounded-lg text-xs">
                  <span className="block opacity-75">حالة الإيجار</span>
                  <span className="font-bold">{tenant?.status}</span>
                </div>
              </div>

              {/* بطاقات الفواتير الصادرة */}
              <div className="space-y-4" id="portal-invoices-section">
                <h5 className="font-bold text-slate-800 text-xs sm:text-sm flex items-center gap-1.5">
                  <Receipt className="h-4 w-4 text-emerald-600" />
                  الفواتير والمطالبات المالية الصادرة لشقتك
                </h5>

                {tenantBills.length === 0 ? (
                  <div className="border border-dashed border-slate-200 text-center py-8 rounded-xl text-xs text-slate-400">
                    لا توجد فواتير مصدرة حالياً لهذا المستأجر.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" id="tenant-portal-bills-grid">
                    {tenantBills.map((bill) => (
                      <div key={bill.bill_id} className="border border-slate-100 rounded-xl p-4 space-y-3 bg-slate-50/50 hover:shadow-md transition-all">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                          <span className="text-[10px] text-slate-400 font-mono">فاتورة: {bill.bill_id}</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-semibold ${
                            bill.payment_status === 'مدفوع' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {bill.payment_status}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between text-slate-500">
                            <span>قيمة الإيجار الشهري:</span>
                            <span className="font-mono text-slate-900">{bill.rent_bill.toLocaleString()} ر.ي</span>
                          </div>
                          <div className="flex justify-between text-slate-500">
                            <span>خدمات الكهرباء:</span>
                            <span className="font-mono text-slate-900 flex items-center gap-0.5"><Zap className="h-3 w-3 text-amber-500" /> {bill.electricity_bill} ر.ي</span>
                          </div>
                          <div className="flex justify-between text-slate-500">
                            <span>خدمات المياه:</span>
                            <span className="font-mono text-slate-900 flex items-center gap-0.5"><Droplet className="h-3 w-3 text-blue-500" /> {bill.water_bill} ر.ي</span>
                          </div>
                          {bill.previous_arrears > 0 && (
                            <div className="flex justify-between text-rose-600">
                              <span>المتأخرات السابقة:</span>
                              <span className="font-mono font-semibold">+{bill.previous_arrears.toLocaleString()} ر.ي</span>
                            </div>
                          )}
                          <div className="flex justify-between border-t border-slate-100 pt-2 text-xs sm:text-sm font-bold text-slate-900">
                            <span>المجموع الكلي:</span>
                            <span className="font-mono text-emerald-800">{bill.total_amount.toLocaleString()} ر.ي</span>
                          </div>
                        </div>

                        <div className="flex gap-1.5 pt-1">
                          <button
                            onClick={() => alert('تم توليد نسخة PDF جاهزة للتحميل!')}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded text-[10px] font-semibold text-slate-600 transition-colors cursor-pointer"
                          >
                            <Download className="h-3 w-3" />
                            تنزيل الفاتورة
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* بطاقة قراءات العدادات */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-3" id="portal-readings-section">
                <h5 className="font-bold text-slate-800 text-xs sm:text-sm">سجل قراءات الاستهلاك ومؤشرات العدادات</h5>
                {tenantReadings.length === 0 ? (
                  <p className="text-xs text-slate-400">لا توجد قراءات مسجلة.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="bg-white p-3 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-semibold">آخر قراءة للكهرباء</span>
                      <span className="text-sm font-bold font-mono text-slate-800 mt-1 block">
                        {tenantReadings[tenantReadings.length - 1]?.electricity_reading.toLocaleString()} kWh
                      </span>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-semibold">آخر قراءة للمياه</span>
                      <span className="text-sm font-bold font-mono text-slate-800 mt-1 block">
                        {tenantReadings[tenantReadings.length - 1]?.water_reading.toLocaleString()} m³
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* مساعد عقاري جانبي ذكي (Musaid GPT) */}
          <div className={`${viewMode === 'desktop' ? 'lg:col-span-4' : 'w-full'} border border-slate-100 rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between bg-white h-[450px]`} id="side-assistant-panel">
            <div className="bg-emerald-900 text-white p-3 px-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
              <div>
                <h5 className="font-bold text-xs sm:text-sm">المساعد الجانبي (مُساعد)</h5>
                <span className="text-[9px] opacity-75 block">مدعوم بالذكاء الاصطناعي لاستفسارات المستأجرين</span>
              </div>
            </div>

            {/* صندوق الرسائل */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs bg-slate-50/40" id="assistant-chat-history">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`max-w-[85%] rounded-lg p-2.5 leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-emerald-600 text-white mr-auto text-left'
                      : 'bg-white border border-slate-100 text-slate-800 ml-auto'
                  }`}
                >
                  <p>{msg.text}</p>
                  <span className="text-[8px] opacity-50 block mt-1 text-right">{msg.timestamp}</span>
                </div>
              ))}
              {isChatLoading && (
                <div className="bg-white border border-slate-100 text-slate-500 rounded-lg p-2.5 max-w-[85%] ml-auto animate-pulse">
                  جاري التفكير وصياغة الرد...
                </div>
              )}
            </div>

            {/* حقل الإدخال */}
            <form onSubmit={handleSend} className="p-3 border-t border-slate-100 flex gap-2" id="assistant-chat-form">
              <input
                type="text"
                placeholder="اسأل مساعد عن العقد، الفواتير، الاستهلاك..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-emerald-600"
                id="assistant-chat-input"
              />
              <button
                type="submit"
                disabled={isChatLoading || !chatInput.trim()}
                className="p-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg transition-colors cursor-pointer shrink-0 disabled:bg-slate-200"
                id="send-chat-msg-btn"
              >
                <Send className="h-3.5 w-3.5 rotate-180" />
              </button>
            </form>
          </div>

        </div>
      )}
    </div>
  );
}
