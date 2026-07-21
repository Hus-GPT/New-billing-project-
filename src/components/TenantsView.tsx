import React, { useState } from 'react';
import { Tenant } from '../types';
import { 
  Users, UserPlus, Search, Trash2, FileText, CheckCircle, Upload, 
  Eye, FileCode, Check, AlertTriangle, ShieldAlert,
  MoreVertical, Edit3, User, X, Calendar, Barcode
} from 'lucide-react';

interface TenantsViewProps {
  tenants: Tenant[];
  onAddTenant: (tenant: Tenant) => void;
  onUpdateTenant: (tenant: Tenant) => void;
  onSoftDeleteTenant: (tenantId: string) => void;
  onLogAudit: (action: string, table: string, id: string, details: string) => void;
  playSound: (type: 'success' | 'alert' | 'click' | 'restore') => void;
  audioEnabled: boolean;
}

export default function TenantsView({
  tenants,
  onAddTenant,
  onUpdateTenant,
  onSoftDeleteTenant,
  onLogAudit,
  playSound,
  audioEnabled,
}: TenantsViewProps) {
  // Search & Autocomplete State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Add Tenant Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [unit, setUnit] = useState('');
  const [rent, setRent] = useState('');
  const [status, setStatus] = useState<'نشط' | 'نشط مؤقتاً'>('نشط');

  // Advanced Dropdowns and Popups States
  const [activeDropdownTenantId, setActiveDropdownTenantId] = useState<string | null>(null);
  const [selectedDetailTenant, setSelectedDetailTenant] = useState<Tenant | null>(null);
  const [selectedEditTenant, setSelectedEditTenant] = useState<Tenant | null>(null);
  
  // Edit fields state
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editRent, setEditRent] = useState('');
  const [editStatus, setEditStatus] = useState<'نشط' | 'نشط مؤقتاً'>('نشط');

  // Drag & Drop File State
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string; preview: string } | null>(null);

  const [addSuccess, setAddSuccess] = useState(false);

  // Bulk Selection States
  const [selectedTenantIds, setSelectedTenantIds] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Filter out soft-deleted tenants
  const activeTenants = tenants.filter(t => !t.is_deleted);

  // Auto-complete suggestion logic
  const getSuggestions = () => {
    if (!searchQuery.trim()) return [];
    return activeTenants.filter(t => 
      t.name.includes(searchQuery) || 
      t.unit_number.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 5); // top 5
  };

  const suggestions = getSuggestions();

  // Highlight matched search text
  const renderHighlightedText = (text: string, highlight: string) => {
    if (!highlight.trim()) return <span>{text}</span>;
    const regex = new RegExp(`(${highlight})`, 'gi');
    const parts = text.split(regex);
    return (
      <span>
        {parts.map((part, i) => 
          regex.test(part) ? <strong key={i} className="text-emerald-600 bg-emerald-50 px-0.5 rounded font-extrabold">{part}</strong> : <span key={i}>{part}</span>
        )}
      </span>
    );
  };

  // Handle Drag Events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handle Drop Event
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  };

  // Handle File Input Select
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      processFile(file);
    }
  };

  // Helper to read and process the uploaded file
  const processFile = (file: File) => {
    if (audioEnabled) playSound('click');
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setUploadedFile({
          name: file.name,
          size: `${(file.size / 1024).toFixed(1)} KB`,
          preview: event.target.result as string
        });
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Form Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !unit || !rent) return;

    const maxTenantId = tenants.reduce((max, t) => {
      const idNum = parseInt(t.tenant_id.replace(/\D/g, '')) || 0;
      return idNum > max ? idNum : max;
    }, 0);
    const newId = `T${maxTenantId + 1}`;
    const newTenant: Tenant = {
      tenant_id: newId,
      name,
      phone,
      unit_number: unit,
      rent_amount: Number(rent),
      status,
      join_date: new Date().toISOString().split('T')[0],
      is_deleted: false,
      advance_balance: 0,
    };

    onAddTenant(newTenant);
    
    // Log Audit Action
    onLogAudit(
      'تسجيل مستأجر جديد',
      'tenants',
      newId,
      `تم تسجيل مستأجر جديد باسم '${name}' للشقة رقم (${unit}) بقيمة إيجار شهري ${rent} ر.ي. مع رفع ملف وثيقة الهوية/العقد باسم (${uploadedFile?.name || 'بدون ملف مرفق'}).`
    );

    if (audioEnabled) playSound('success');
    setAddSuccess(true);
    
    // Clear Form
    setName('');
    setPhone('');
    setUnit('');
    setRent('');
    setUploadedFile(null);

    setTimeout(() => {
      setAddSuccess(false);
    }, 3000);
  };

  // Soft Delete Click
  const handleDeleteClick = (t: Tenant) => {
    if (audioEnabled) playSound('alert');
    const isConfirmed = window.confirm(`هل أنت متأكد من إلغاء تعاقد وحذف المستأجر ${t.name} (شقة {t.unit_number}) حذفاً ناعماً؟ سيتم نقله لسلة المهملات.`);
    if (isConfirmed) {
      onSoftDeleteTenant(t.tenant_id);
      onLogAudit(
        'حذف ناعم للمستأجر',
        'tenants',
        t.tenant_id,
        `تم نقل المستأجر '${t.name}' (شقة ${t.unit_number}) إلى سلة المهملات مع تجميد مركزه الإيجاري.`
      );
    }
  };

  // Toggle selection for a tenant
  const handleToggleSelectTenant = (tenantId: string) => {
    if (audioEnabled) playSound('click');
    setSelectedTenantIds(prev => 
      prev.includes(tenantId) ? prev.filter(id => id !== tenantId) : [...prev, tenantId]
    );
  };

  // Toggle selection for all visible filtered tenants
  const handleToggleSelectAllTenants = () => {
    if (audioEnabled) playSound('click');
    if (selectedTenantIds.length === filteredTenants.length) {
      setSelectedTenantIds([]);
    } else {
      setSelectedTenantIds(filteredTenants.map(t => t.tenant_id));
    }
  };

  // Perform bulk soft delete of selected tenants
  const handleBulkSoftDeleteTenants = () => {
    if (selectedTenantIds.length === 0) return;
    
    selectedTenantIds.forEach(id => {
      const t = tenants.find(tenant => tenant.tenant_id === id);
      if (t) {
        onSoftDeleteTenant(id);
        onLogAudit(
          'حذف مستأجر جماعي',
          'tenants',
          id,
          `تم إلغاء تعاقد وحذف المستأجر '${t.name}' (شقة ${t.unit_number}) ضمن عملية حذف جماعية سريعة.`
        );
      }
    });

    setSelectedTenantIds([]);
    setShowBulkDeleteConfirm(false);
    if (audioEnabled) playSound('alert');
  };

  // Render suggestion list with multi-criteria search and status filtering
  const filteredTenants = activeTenants.filter(t => {
    // 1. Filter by status selection dropdown
    if (statusFilter !== 'all' && t.status !== statusFilter) {
      return false;
    }

    // 2. Filter by search query (name, unit number, or status)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      return (
        t.name.toLowerCase().includes(query) ||
        t.unit_number.toLowerCase().includes(query) ||
        t.status.toLowerCase().includes(query) ||
        (t.tenant_id && t.tenant_id.toLowerCase().includes(query))
      );
    }

    return true;
  });

  return (
    <div className="space-y-6" id="tenants-view-wrapper">
      {/* 1. الترويسة وأدوات البحث التصفية المتعددة */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4" id="tenants-search-header">
        <div className="space-y-1">
          <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-1.5">
            <Users className="h-5 w-5 text-emerald-600" />
            دليل شؤون المستأجرين والعقود الإيجارية (Active Tenants)
          </h3>
          <p className="text-xs text-slate-500">إدارة تفاصيل عقود شقق GABER السكنية، مع البحث والفلترة الذكية وخاصية الحذف الناعم للأرشيف.</p>
        </div>

        {/* أدوات البحث والفلترة بحسب الاسم، رقم الشقة، والحالة */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto" id="predictive-search-box-container">
          
          {/* فلترة الحالة */}
          <div className="w-full sm:w-36">
            <select
              value={statusFilter}
              onChange={e => {
                setStatusFilter(e.target.value);
                if (audioEnabled) playSound('click');
              }}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-bold focus:outline-emerald-600"
              id="tenants-status-filter"
            >
              <option value="all">كل الحالات (All)</option>
              <option value="نشط">نشط (Active)</option>
              <option value="نشط مؤقتاً">نشط مؤقتاً (Temp)</option>
            </select>
          </div>

          {/* حقل البحث التنبئي (Predictive Autocomplete Search) */}
          <div className="relative w-full sm:w-64" id="predictive-search-box">
            <div className="relative">
              <input
                type="text"
                placeholder="ابحث بالاسم، الشقة، أو الحالة..."
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                className="w-full pl-3 pr-9 py-2 border border-slate-200 rounded-xl text-xs focus:outline-emerald-600 font-medium"
                id="tenants-autocomplete-input"
              />
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
            </div>

          {/* اقتراحات الإكمال التلقائي الفورية (Autocomplete Suggestions Dropdown) */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-lg z-30 overflow-hidden divide-y divide-slate-50">
              <div className="p-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50">اقتراحات البحث التنبؤي لـ GABER</div>
              {suggestions.map(s => (
                <div
                  key={s.tenant_id}
                  onClick={() => {
                    setSearchQuery(s.name);
                    setShowSuggestions(false);
                    if (audioEnabled) playSound('click');
                  }}
                  className="p-2.5 hover:bg-emerald-50/40 cursor-pointer flex justify-between items-center text-xs transition-colors"
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-700">{renderHighlightedText(s.name, searchQuery)}</span>
                    <span className="text-[10px] text-slate-400">رقم الهاتف: {s.phone}</span>
                  </div>
                  <span className="font-mono text-[10px] font-extrabold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                    شقة {renderHighlightedText(s.unit_number, searchQuery)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Close suggestion overlay */}
          {showSuggestions && searchQuery.trim() !== '' && (
            <div 
              className="fixed inset-0 z-20" 
              onClick={() => setShowSuggestions(false)} 
            />
          )}
        </div>
      </div>
    </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="tenants-main-grid">
        {/* 2. جدول دليل المستأجرين النشطين */}
        <div className="lg:col-span-8 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden" id="tenants-list-panel">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-600">المستأجرين المتعاقدين حالياً ({filteredTenants.length} مستأجرين)</span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-[10px] font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
              >
                تفريغ التصفية
              </button>
            )}
          </div>

          {/* شريط الإجراءات الجماعية الذكي (Bulk Action Bar) */}
          {selectedTenantIds.length > 0 && (
            <div className="bg-amber-50 border-b border-amber-200/60 p-3 px-4 flex items-center justify-between text-xs animate-in slide-in-from-top-1 duration-150" dir="rtl">
              <div className="flex items-center gap-2 text-amber-900 font-bold">
                <Users className="h-4 w-4 text-amber-700" />
                <span>تم تحديد {selectedTenantIds.length} مستأجرين لإجراء عملية جماعية</span>
              </div>
              <div className="flex items-center gap-2">
                {showBulkDeleteConfirm ? (
                  <div className="flex items-center gap-1.5 animate-in fade-in duration-100">
                    <span className="text-[10px] text-rose-700 font-bold">هل أنت متأكد؟</span>
                    <button
                      type="button"
                      onClick={handleBulkSoftDeleteTenants}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-lg text-[10px] cursor-pointer"
                    >
                      نعم، احذفهم
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowBulkDeleteConfirm(false)}
                      className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-[10px] cursor-pointer"
                    >
                      تراجع
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (audioEnabled) playSound('click');
                      setShowBulkDeleteConfirm(true);
                    }}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-lg text-[10px] flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                  >
                    <Trash2 className="h-3 w-3" />
                    إلغاء عقودهم وحذفهم دفعة واحدة
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedTenantIds([])}
                  className="px-2 py-1 text-slate-500 hover:text-slate-800 font-bold rounded text-[10px] cursor-pointer"
                >
                  إلغاء التحديد
                </button>
              </div>
            </div>
          )}

          {filteredTenants.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs sm:text-sm">
              لا يوجد مستأجرين مطابقين لمعايير البحث في شقق GABER الرقمية.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-400 border-b border-slate-100 font-bold">
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={filteredTenants.length > 0 && selectedTenantIds.length === filteredTenants.length}
                        onChange={handleToggleSelectAllTenants}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer h-3.5 w-3.5"
                      />
                    </th>
                    <th className="p-3">رقم الشقة</th>
                    <th className="p-3">الاسم الكامل</th>
                    <th className="p-3">رقم الهاتف</th>
                    <th className="p-3">تاريخ التعاقد</th>
                    <th className="p-3">الإيجار الشهري</th>
                    <th className="p-3 text-center">الإجراءات والخيارات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTenants.map(t => (
                    <tr key={t.tenant_id} className={`hover:bg-slate-50/30 transition-colors ${selectedTenantIds.includes(t.tenant_id) ? 'bg-emerald-50/20' : ''}`}>
                      <td className="p-3 text-center w-10">
                        <input
                          type="checkbox"
                          checked={selectedTenantIds.includes(t.tenant_id)}
                          onChange={() => handleToggleSelectTenant(t.tenant_id)}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer h-3.5 w-3.5"
                        />
                      </td>
                      <td className="p-3 font-mono font-extrabold text-slate-800 text-xs">شقة {t.unit_number}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{t.name}</span>
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border ${
                            t.status === 'نشط'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50'
                              : 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50'
                          }`}>
                            {t.status}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">ID: {t.tenant_id}</div>
                      </td>
                      <td className="p-3 font-mono text-slate-600 text-xs">{t.phone}</td>
                      <td className="p-3 text-slate-500 font-mono text-xs">{t.join_date}</td>
                      <td className="p-3 font-bold font-mono text-emerald-700">{t.rent_amount.toLocaleString()} ر.ي</td>
                      <td className="p-3 relative text-center">
                        <div className="inline-block text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveDropdownTenantId(activeDropdownTenantId === t.tenant_id ? null : t.tenant_id);
                              if (audioEnabled) playSound('click');
                            }}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer inline-flex items-center justify-center border border-slate-100 dark:border-slate-800"
                            title="عرض الإجراءات"
                          >
                            <MoreVertical className="h-4.5 w-4.5" />
                          </button>

                          {/* القائمة المنسدلة المتقدمة الاحترافية */}
                          {activeDropdownTenantId === t.tenant_id && (
                            <>
                              <div 
                                className="fixed inset-0 z-40" 
                                onClick={() => setActiveDropdownTenantId(null)}
                              />
                              <div className="absolute left-1/2 -translate-x-1/2 lg:left-auto lg:right-4 top-11 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 py-1.5 w-48 divide-y divide-slate-100 dark:divide-slate-800/60 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 text-right">
                                <div className="px-3 py-1.5 text-[9px] font-bold text-slate-400 dark:text-slate-500 tracking-wider">لوحة تحكم العقد</div>
                                
                                <div className="py-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedDetailTenant(t);
                                      setActiveDropdownTenantId(null);
                                      if (audioEnabled) playSound('click');
                                    }}
                                    className="w-full text-right px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center gap-2 cursor-pointer"
                                  >
                                    <User className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                    <span>عرض بطاقة العقد</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedEditTenant(t);
                                      setEditName(t.name);
                                      setEditPhone(t.phone);
                                      setEditUnit(t.unit_number);
                                      setEditRent(String(t.rent_amount));
                                      setEditStatus(t.status as 'نشط' | 'نشط مؤقتاً');
                                      setActiveDropdownTenantId(null);
                                      if (audioEnabled) playSound('click');
                                    }}
                                    className="w-full text-right px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center gap-2 cursor-pointer"
                                  >
                                    <Edit3 className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                    <span>تعديل البيانات</span>
                                  </button>
                                </div>

                                <div className="py-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveDropdownTenantId(null);
                                      handleDeleteClick(t);
                                    }}
                                    className="w-full text-right px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors flex items-center gap-2 cursor-pointer"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 shrink-0" />
                                    <span>إلغاء وحذف العقد</span>
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 3. نموذج تسجيل مستأجر جديد مع منطقة السحب والإفلات */}
        <div className="lg:col-span-4 space-y-4" id="add-tenant-panel">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4" id="add-tenant-card">
            <h4 className="font-bold text-slate-800 text-xs sm:text-sm flex items-center gap-1.5 border-b border-slate-50 pb-2">
              <UserPlus className="h-4.5 w-4.5 text-emerald-600" />
              تسجيل مستأجر وعقد جديد
            </h4>

            {addSuccess ? (
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-3 rounded-xl text-center text-xs font-bold animate-pulse">
                تم تسجيل المستأجر والملحق المرفق بنجاح في قاعدة البيانات!
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 block">الاسم الكامل للمستأجر</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: فيصل الحربي"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-emerald-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 block">رقم الجوال النشط</label>
                  <input
                    type="tel"
                    required
                    placeholder="مثال: 0501112222"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-emerald-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 block">رقم الشقة/الوحدة</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: E4"
                      value={unit}
                      onChange={e => setUnit(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-emerald-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 block">الإيجار الشهري (ر.ي)</label>
                    <input
                      type="number"
                      required
                      placeholder="مثال: 2500"
                      value={rent}
                      onChange={e => setRent(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-emerald-600"
                    />
                  </div>
                </div>

                {/* منطقة سحب وإفلات لرفع الهوية / العقد (Drag & Drop File Upload Zone) */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 block">وثيقة عقد الإيجار أو بطاقة الهوية</label>
                  
                  {uploadedFile ? (
                    <div className="border border-emerald-100 rounded-lg p-2.5 bg-emerald-50/30 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2 truncate">
                        <div className="w-8 h-8 rounded border border-emerald-200 overflow-hidden shrink-0">
                          <img src={uploadedFile.preview} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <div className="truncate text-right">
                          <span className="font-bold text-slate-700 block truncate">{uploadedFile.name}</span>
                          <span className="text-[9px] text-slate-400 font-mono">{uploadedFile.size}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 font-bold text-emerald-800">
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        جاهز!
                      </div>
                    </div>
                  ) : (
                    <div
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${
                        dragActive ? 'border-emerald-600 bg-emerald-50/20' : 'border-slate-200 hover:border-emerald-500 hover:bg-slate-50/50'
                      }`}
                      onClick={() => document.getElementById('contract-file-upload')?.click()}
                    >
                      <input
                        id="contract-file-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileSelect}
                      />
                      <Upload className="h-5 w-5 text-slate-400 mx-auto mb-1.5" />
                      <p className="text-[10px] font-bold text-slate-600">اسحب صورة الهوية أو عقد السكن هنا أو اضغط للاستعراض</p>
                      <span className="text-[8px] text-slate-400 mt-0.5 block">الامتدادات المدعومة: JPG, PNG • الحد الأقصى: ٤ ميجابايت</span>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold rounded-lg text-xs transition-colors shadow-sm cursor-pointer"
                >
                  تسجيل المستأجر وحفظ العقد
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* نافذة عرض تفاصيل العقد والبطاقة الذكية المنبثقة (Popup Tenant Card) */}
      {selectedDetailTenant && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 dark:border-slate-800/60 animate-modal-in">
            {/* Header */}
            <div className="bg-emerald-800 text-white p-4.5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-200" />
                <div>
                  <h4 className="font-extrabold text-xs sm:text-sm">بطاقة تعريف المستأجر والعقد</h4>
                  <p className="text-[9px] text-emerald-100">سجل رقمي موحد ومعتمد في نظام GABER</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedDetailTenant(null)} 
                className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-5 space-y-4 text-right">
              {/* Tenant Profile Banner */}
              <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80">
                <div className="h-11 w-11 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 flex items-center justify-center font-extrabold text-base border border-emerald-200 dark:border-emerald-900/40">
                  {selectedDetailTenant.name.charAt(0)}
                </div>
                <div className="flex-1 space-y-0.5">
                  <span className="font-extrabold text-slate-800 dark:text-slate-100 text-xs sm:text-sm block">{selectedDetailTenant.name}</span>
                  <span className="text-[10px] text-slate-400 block font-mono">ID: {selectedDetailTenant.tenant_id}</span>
                </div>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border shrink-0 ${
                  selectedDetailTenant.status === 'نشط'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50'
                    : 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50'
                }`}>
                  {selectedDetailTenant.status}
                </span>
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 gap-3.5 text-xs">
                <div className="bg-slate-50/50 dark:bg-slate-900/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/50">
                  <span className="text-[10px] text-slate-400 font-bold block mb-0.5">رقم الشقة والوحدة</span>
                  <span className="font-mono font-extrabold text-slate-800 dark:text-slate-100">شقة {selectedDetailTenant.unit_number}</span>
                </div>
                
                <div className="bg-slate-50/50 dark:bg-slate-900/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/50">
                  <span className="text-[10px] text-slate-400 font-bold block mb-0.5">قيمة الإيجار الشهري</span>
                  <span className="font-mono font-extrabold text-emerald-700 dark:text-emerald-400">{selectedDetailTenant.rent_amount.toLocaleString()} ر.ي</span>
                </div>

                <div className="bg-slate-50/50 dark:bg-slate-900/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/50">
                  <span className="text-[10px] text-slate-400 font-bold block mb-0.5">رقم الهاتف النشط</span>
                  <span className="font-mono text-slate-800 dark:text-slate-100">{selectedDetailTenant.phone}</span>
                </div>

                <div className="bg-slate-50/50 dark:bg-slate-900/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/50">
                  <span className="text-[10px] text-slate-400 font-bold block mb-0.5">تاريخ بدء التعاقد</span>
                  <span className="font-mono text-slate-800 dark:text-slate-100">{selectedDetailTenant.join_date}</span>
                </div>
              </div>

              {/* Barcode and validation */}
              <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center space-y-2.5 bg-slate-50/30 dark:bg-slate-900/10">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-1">
                  <Barcode className="h-4 w-4 text-slate-500" />
                  رقم عقد الإيجار الموحد الموثق
                </div>
                
                {/* Simulated Barcode Lines */}
                <div className="h-10 w-full flex items-center justify-center gap-[2px] bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                  {Array.from({ length: 42 }).map((_, i) => (
                    <div 
                      key={i} 
                      className={`h-full ${i % 3 === 0 ? 'w-[3px]' : i % 5 === 1 ? 'w-[1px]' : i % 4 === 2 ? 'w-[4px]' : 'w-[2px]'} ${
                        i % 7 === 0 ? 'bg-transparent' : 'bg-slate-800 dark:bg-slate-200'
                      }`} 
                    />
                  ))}
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-500 tracking-wider">GABER-T-{selectedDetailTenant.tenant_id}-SECURE</span>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="bg-slate-50 dark:bg-slate-900 p-4 border-t border-slate-100 dark:border-slate-800/60 flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedDetailTenant(null)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white font-extrabold rounded-lg text-xs transition-colors cursor-pointer"
              >
                إغلاق البطاقة
              </button>
            </div>
          </div>
        </div>
      )}

      {/*  نافذة تعديل بيانات المستأجر المنبثقة (Popup Edit Tenant Modal) */}
      {selectedEditTenant && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 dark:border-slate-800/60 animate-modal-in">
            {/* Header */}
            <div className="bg-slate-800 text-white p-4.5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Edit3 className="h-4.5 w-4.5 text-amber-400" />
                <div>
                  <h4 className="font-extrabold text-xs sm:text-sm">تعديل بيانات العقد للمستأجر</h4>
                  <p className="text-[9px] text-slate-300">تحديث فوري للسجلات الحية في النظام</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedEditTenant(null)} 
                className="text-slate-300 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Edit Form */}
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!editName || !editPhone || !editUnit || !editRent) return;
              
              const updated: Tenant = {
                ...selectedEditTenant,
                name: editName,
                phone: editPhone,
                unit_number: editUnit,
                rent_amount: Number(editRent),
                status: editStatus,
              };

              onUpdateTenant(updated);
              
              // Log Audit Action
              onLogAudit(
                'تحديث بيانات مستأجر',
                'tenants',
                selectedEditTenant.tenant_id,
                `تم تعديل بيانات المستأجر '${selectedEditTenant.name}' (سابقاً) إلى '${editName}'، رقم الهاتف: ${editPhone}، الشقة: ${editUnit}، الإيجار: ${editRent} ر.ي.`
              );

              setSelectedEditTenant(null);
            }} className="p-5 space-y-4 text-right">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 block">الاسم الكامل للمستأجر</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-xs focus:outline-emerald-600 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 block">رقم الجوال</label>
                <input
                  type="tel"
                  required
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-xs font-mono focus:outline-emerald-600 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 block">رقم الشقة/الوحدة</label>
                  <input
                    type="text"
                    required
                    value={editUnit}
                    onChange={e => setEditUnit(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-xs font-mono focus:outline-emerald-600 font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 block">الإيجار الشهري (ر.ي)</label>
                  <input
                    type="number"
                    required
                    value={editRent}
                    onChange={e => setEditRent(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-xs font-mono focus:outline-emerald-600 font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 block">حالة العقد الساري</label>
                <select
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value as 'نشط' | 'نشط مؤقتاً')}
                  className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-xs font-bold focus:outline-emerald-600 cursor-pointer text-slate-700"
                >
                  <option value="نشط">نشط (Active)</option>
                  <option value="نشط مؤقتاً">نشط مؤقتاً (Temporary)</option>
                </select>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800/60">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg text-xs transition-colors shadow-sm cursor-pointer"
                >
                  تأكيد وحفظ التعديلات
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedEditTenant(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  تراجع
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
