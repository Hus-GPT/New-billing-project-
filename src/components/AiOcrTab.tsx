import React, { useState, useRef } from 'react';
import { Camera, FileImage, Cpu, CheckCircle, Edit3, ArrowRight, Save } from 'lucide-react';
import { Tenant, MeterReading } from '../types';

interface AiOcrTabProps {
  tenants: Tenant[];
  readings: MeterReading[];
  onAddReading: (reading: MeterReading) => void;
  onNavigateToBilling: (tenantId: string, elec: string, water: string) => void;
}

export default function AiOcrTab({ tenants, readings, onAddReading, onNavigateToBilling }: AiOcrTabProps) {
  const [selectedTenant, setSelectedTenant] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('2026-07');
  const [selectedMeterType, setSelectedMeterType] = useState<'electricity' | 'water'>('electricity');
  
  // OCR Simulator States
  const [sampleImage, setSampleImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scannedResult, setScannedResult] = useState<number | null>(null);
  const [isEditable, setIsEditable] = useState(false);
  const [manualOverrideValue, setManualOverrideValue] = useState('');
  const [readingComment, setReadingComment] = useState('');
  const [ocrSuccess, setOcrSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 3 high-quality real-world sample images for testing
  const sampleMeters = [
    {
      id: 'elec1',
      title: 'عداد كهرباء ذكي (توضيحي)',
      type: 'electricity',
      baseValue: 1850,
      url: 'https://images.unsplash.com/photo-1590103514966-5e2a11c13e21?auto=format&fit=crop&q=80&w=400',
    },
    {
      id: 'water1',
      title: 'عداد مياه تناظري (توضيحي)',
      type: 'water',
      baseValue: 410,
      url: 'https://images.unsplash.com/photo-1585338107529-13afc5f02586?auto=format&fit=crop&q=80&w=400',
    },
  ];

  const handleSelectSample = (meter: typeof sampleMeters[0]) => {
    setSampleImage(meter.url);
    setSelectedMeterType(meter.type as 'electricity' | 'water');
    setScannedResult(null);
    setManualOverrideValue('');
    setReadingComment('');
  };

  const handleCustomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setSampleImage(event.target.result as string);
          setScannedResult(null);
          setManualOverrideValue('');
          setReadingComment('');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerScan = () => {
    if (!selectedTenant || !sampleImage) return;
    setIsScanning(true);
    setScanProgress(0);
    setScannedResult(null);

    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsScanning(false);
          
          // Generate a smart value based on past reading
          const sortedReadings = [...readings]
            .filter((r) => r.tenant_id === selectedTenant)
            .sort((a, b) => b.reading_month.localeCompare(a.reading_month));
          
          const prevValue = sortedReadings[0];
          let base = 0;
          if (selectedMeterType === 'electricity') {
            base = prevValue ? prevValue.electricity_reading : 1000;
          } else {
            base = prevValue ? prevValue.water_reading : 300;
          }
          
          // Add a logical consumption increment (e.g. 150-350 for elec, 15-40 for water)
          const increment = selectedMeterType === 'electricity' 
            ? Math.floor(Math.random() * 200) + 150 
            : Math.floor(Math.random() * 30) + 15;
          
          const finalResult = base + increment;
          setScannedResult(finalResult);
          setManualOverrideValue(String(finalResult));
          return 100;
        }
        return prev + 10;
      });
    }, 150);
  };

  const saveOcrReading = () => {
    if (!selectedTenant || !selectedMonth || !manualOverrideValue) return;

    const val = Number(manualOverrideValue);
    const prevReadings = readings.filter(r => r.tenant_id === selectedTenant && r.reading_month === selectedMonth);
    
    let currentElec = selectedMeterType === 'electricity' ? val : 0;
    let currentWater = selectedMeterType === 'water' ? val : 0;

    if (prevReadings.length > 0) {
      // Modify existing month reading
      if (selectedMeterType === 'electricity') {
        currentWater = prevReadings[0].water_reading;
      } else {
        currentElec = prevReadings[0].electricity_reading;
      }
    } else {
      // Get last reading as base fallback
      const sorted = [...readings]
        .filter((r) => r.tenant_id === selectedTenant)
        .sort((a, b) => b.reading_month.localeCompare(a.reading_month));
      if (selectedMeterType === 'electricity') {
        currentWater = sorted[0] ? sorted[0].water_reading : 100;
      } else {
        currentElec = sorted[0] ? sorted[0].electricity_reading : 1000;
      }
    }

    const newReadingId = `R${String(readings.length + 1).padStart(3, '0')}`;
    const newReading: MeterReading = {
      reading_id: newReadingId,
      tenant_id: selectedTenant,
      reading_month: selectedMonth,
      electricity_reading: currentElec,
      water_reading: currentWater,
      reading_date: new Date().toISOString().split('T')[0],
      notes: readingComment.trim() || undefined,
    };

    onAddReading(newReading);
    setOcrSuccess(true);
    setReadingComment('');
    setTimeout(() => {
      setOcrSuccess(false);
    }, 4000);
  };

  return (
    <div className="space-y-6" id="ai-ocr-container">
      <div className="border-b border-slate-100 pb-3">
        <h4 className="font-semibold text-slate-800 text-sm sm:text-base flex items-center gap-1.5">
          <Cpu className="h-5 w-5 text-emerald-600 animate-pulse" />
          محاكاة الذكاء الاصطناعي لقراءة العدادات من الصور (AI OCR Simulation)
        </h4>
        <p className="text-xs text-slate-500 mt-1">
          تمثل هذه اللوحة الطبقة الثالثة من البنية المقترحة. تختبر محاكاة التعرف البصري على الأرقام واستخراجها تلقائياً مع إتاحة خيار التصحيح والتعديل اليدوي قبل الحفظ النهائي.
        </p>
      </div>

      {ocrSuccess && (
        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl space-y-2" id="ocr-save-success">
          <div className="flex items-center gap-2 text-emerald-800 text-xs sm:text-sm">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
            <span>تم حفظ القراءة الجديدة المستخرجة بنجاح وتحديث قاعدة بيانات Pandas!</span>
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => {
                const tenant = tenants.find(t => t.tenant_id === selectedTenant);
                if (tenant) {
                  onNavigateToBilling(
                    selectedTenant,
                    selectedMeterType === 'electricity' ? manualOverrideValue : '',
                    selectedMeterType === 'water' ? manualOverrideValue : ''
                  );
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold transition-all cursor-pointer shadow-sm"
              id="navigate-billing-btn"
            >
              الانتقال إلى إصدار الفاتورة لهذه القراءة
              <ArrowRight className="h-3.5 w-3.5 rotate-180" />
            </button>
          </div>
        </div>
      )}

      {tenants.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-xs sm:text-sm">
          الرجاء شحن البيانات التجريبية أولاً من علامة تبويب "طبقة البيانات" لتجربة ماسح الذكاء الاصطناعي على الوحدات السكنية.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="ocr-simulation-box">
          {/* لوحة الاختيار والتحكم */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">1. حدد المستأجر المستهدف</label>
                <select
                  value={selectedTenant}
                  onChange={(e) => {
                    setSelectedTenant(e.target.value);
                    setScannedResult(null);
                    setSampleImage(null);
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm bg-white"
                  required
                  id="ocr-select-tenant"
                >
                  <option value="">-- اختر شقة أو مستأجر --</option>
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">نوع العداد</label>
                  <select
                    value={selectedMeterType}
                    onChange={(e) => {
                      setSelectedMeterType(e.target.value as 'electricity' | 'water');
                      setScannedResult(null);
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm bg-white"
                    id="ocr-meter-type"
                  >
                    <option value="electricity">كهرباء (Electricity)</option>
                    <option value="water">مياه (Water)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">شهر القراءة</label>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => {
                      setSelectedMonth(e.target.value);
                      setScannedResult(null);
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm font-mono bg-white"
                    id="ocr-reading-month"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">2. اختر صورة تجريبية أو ارفع ملفاً</label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {sampleMeters.map((meter) => (
                    <button
                      key={meter.id}
                      type="button"
                      onClick={() => handleSelectSample(meter)}
                      className={`relative border rounded-lg overflow-hidden h-20 text-right group transition-all ${
                        sampleImage === meter.url ? 'border-emerald-600 ring-2 ring-emerald-100' : 'border-slate-200 hover:border-slate-300'
                      }`}
                      id={`sample-btn-${meter.id}`}
                    >
                      <img src={meter.url} alt={meter.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" referrerPolicy="no-referrer" />
                      <div className="absolute inset-x-0 bottom-0 bg-slate-950/70 p-1 text-[9px] text-white truncate text-center">
                        {meter.title}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleCustomUpload}
                    className="hidden"
                    id="custom-meter-file"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition-all cursor-pointer"
                    id="upload-meter-btn"
                  >
                    <FileImage className="h-3.5 w-3.5 text-slate-500" />
                    تحميل صورة مخصصة
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={triggerScan}
                disabled={!selectedTenant || !sampleImage || isScanning}
                className={`w-full py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer ${
                  !selectedTenant || !sampleImage
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-slate-800 hover:bg-slate-900 text-white'
                }`}
                id="start-ocr-scan-btn"
              >
                <Camera className="h-4 w-4" />
                {isScanning ? 'جاري الفحص واستخراج الأرقام...' : 'ابدأ فحص العداد بالذكاء الاصطناعي'}
              </button>
            </div>
          </div>

          {/* شاشة العرض والمسح البصري */}
          <div className="lg:col-span-7 bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col justify-between min-h-[350px]" id="ocr-screen-panel">
            {sampleImage ? (
              <div className="space-y-4 h-full flex flex-col justify-between" id="ocr-active-simulation">
                
                {/* قسم معاينة الصورة قبل المعالجة */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <FileImage className="h-4 w-4 text-emerald-600" />
                      معاينة الصورة قبل المعالجة (Pre-processing Image Preview)
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      isScanning 
                        ? 'bg-amber-100 text-amber-700 animate-pulse'
                        : scannedResult !== null 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-blue-100 text-blue-700'
                    }`}>
                      {isScanning 
                        ? 'جاري الفحص الآن...' 
                        : scannedResult !== null 
                          ? 'تم الفحص بنجاح' 
                          : 'جاهز لبدء التحليل'}
                    </span>
                  </div>

                  <div className="relative rounded-lg overflow-hidden bg-black aspect-video max-h-56 flex items-center justify-center" id="ocr-image-view">
                    <img src={sampleImage} alt="Meter preview" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                    
                    {/* تأثير الليزر للمسح الضوئي */}
                    {isScanning && (
                      <div className="absolute inset-x-0 h-1.5 bg-emerald-500/80 shadow-[0_0_15px_#10b981] animate-bounce top-0" id="laser-scanning-line" />
                    )}

                    {isScanning && (
                      <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center">
                        <div className="bg-slate-900/90 rounded-lg p-3 text-center border border-emerald-500/30">
                          <span className="text-emerald-500 font-bold font-mono text-xs">{scanProgress}%</span>
                          <div className="w-24 bg-slate-800 h-1.5 rounded-full mt-1 overflow-hidden">
                            <div className="bg-emerald-500 h-full transition-all duration-150" style={{ width: `${scanProgress}%` }} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* حقل إدخال التعليق النصي المصاحب للقراءة */}
                <div className="bg-white border border-slate-100 rounded-xl p-3 space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-700">
                    ملاحظة أو تعليق نصي مرتبط بقراءة العداد (Reading Comment / Notes)
                  </label>
                  <textarea
                    rows={2}
                    value={readingComment}
                    onChange={(e) => setReadingComment(e.target.value)}
                    placeholder="مثال: تم تدقيق قفل العداد، العداد سليم، القراءة تتماشى مع الاستهلاك التاريخي، إلخ..."
                    className="w-full p-2 text-xs border border-slate-200 rounded-lg focus:outline-emerald-600 bg-slate-50/50"
                    id="ocr-reading-comment-textarea"
                  />
                </div>

                {/* نتيجة القراءة المستخرجة */}
                {scannedResult !== null && (
                  <div className="bg-white border border-slate-100 rounded-xl p-4 space-y-4" id="ocr-result-output-box">
                    <div className="flex items-center justify-between">
                      <h5 className="font-semibold text-slate-800 text-xs sm:text-sm flex items-center gap-1">
                        <Cpu className="h-4 w-4 text-emerald-500" />
                        النتيجة المستخرجة بواسطة (Mock OCR)
                      </h5>
                      <button
                        onClick={() => setIsEditable(!isEditable)}
                        className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-emerald-700 transition-colors"
                        id="toggle-edit-ocr-btn"
                      >
                        <Edit3 className="h-3 w-3" />
                        {isEditable ? 'قفل التعديل' : 'تعديل القراءة يدوياً'}
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <input
                           type="number"
                           disabled={!isEditable}
                           value={manualOverrideValue}
                           onChange={(e) => setManualOverrideValue(e.target.value)}
                           className={`w-full px-3 py-2 font-mono text-base font-bold rounded-lg border focus:outline-emerald-600 ${
                             isEditable ? 'bg-white border-emerald-500 text-slate-900' : 'bg-slate-50 border-slate-200 text-slate-500'
                           }`}
                           id="ocr-manual-override-input"
                        />
                      </div>
                      <span className="text-xs font-semibold text-slate-600 font-mono">
                        {selectedMeterType === 'electricity' ? 'kWh (كيلوواط)' : 'm³ (متر مكعب)'}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500">
                      {isEditable 
                        ? 'إنك تقوم الآن بتصحيح القراءة يدوياً للتغلب على أي أخطاء محتملة من الذكاء الاصطناعي.' 
                        : 'تم استخراج هذه القراءة تلقائياً بالاعتماد على القيم المسجلة مسبقاً.'}
                    </p>

                    <button
                      onClick={saveOcrReading}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                      id="save-ocr-to-pandas-btn"
                    >
                      <Save className="h-3.5 w-3.5" />
                      تثبيت القراءة في طبقة البيانات (DataFrame)
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-12 text-slate-400" id="ocr-empty-state">
                <Camera className="h-12 w-12 text-slate-300 mb-3" />
                <h5 className="font-semibold text-slate-700 text-xs sm:text-sm">لا توجد صورة محملة للفحص</h5>
                <p className="text-xs max-w-sm mt-1.5 leading-relaxed">
                  الرجاء تحديد مستأجر أولاً، ثم اختيار إحدى الصور التوضيحية أو تحميل صورة خاصة بك للعداد لبدء محاكاة عملية القراءة.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
