export interface Dictionary {
  // Navigation & Tabs
  nav_dashboard: string;
  nav_tenants: string;
  nav_bills: string;
  nav_archive: string;
  nav_ocr: string;
  nav_assistant: string;
  nav_settings: string;
  app_title: string;
  app_subtitle: string;

  // Common buttons & states
  btn_save: string;
  btn_cancel: string;
  btn_add: string;
  btn_edit: string;
  btn_delete: string;
  btn_restore: string;
  status_active: string;
  status_inactive: string;
  currency_yer: string;

  // Settings translations
  settings_title: string;
  settings_subtitle: string;
  settings_system_lang: string;
  settings_system_lang_desc: string;
  settings_select_lang: string;
  settings_font_title: string;
  settings_font_desc: string;
  settings_audio_title: string;
  settings_audio_desc: string;
  settings_auto_refresh: string;
  settings_auto_refresh_desc: string;
  settings_rates_title: string;
  settings_electricity_rate: string;
  settings_water_rate: string;
  settings_service_fee: string;
  settings_shared_expenses: string;
  settings_wallet_phone: string;
  settings_wallet_barcode: string;
  settings_audit_logs: string;
  settings_audit_action: string;
  settings_audit_table: string;
  settings_audit_details: string;
  settings_audit_time: string;

  // Dashboard View
  db_overdue_alert: string;
  db_overdue_desc: string;
  db_unpaid_bills: string;
  db_all_paid: string;
  db_smart_summary: string;
  db_quick_stats: string;
  db_total_rents: string;
  db_total_collected: string;
  db_total_remaining: string;
  db_unpaid_count: string;
  db_analytics: string;
  db_billing_overview: string;
  db_recent_activities: string;

  // Tenants View
  tenants_title: string;
  tenants_list: string;
  tenants_add_new: string;
  tenant_name: string;
  tenant_phone: string;
  tenant_unit: string;
  tenant_rent: string;
  tenant_advance: string;
  tenant_join_date: string;
  tenant_status: string;
  tenant_actions: string;

  // Bills View
  bills_title: string;
  bills_list: string;
  bills_unpaid_alert_title: string;
  bills_unpaid_alert_desc: string;
  bills_btn_send_bulk: string;
  bills_bill_id: string;
  bills_month: string;
  bills_rent: string;
  bills_elec: string;
  bills_water: string;
  bills_arrears: string;
  bills_total: string;
  bills_status: string;
  bills_due_date: string;
}

export const translations: Record<'ar' | 'en', Dictionary> = {
  ar: {
    nav_dashboard: "الرئيسية",
    nav_tenants: "المستأجرين",
    nav_bills: "الفواتير والمطالبات",
    nav_archive: "الأرشيف والمهملات",
    nav_ocr: "العدادات OCR",
    nav_assistant: "مساعد GABER",
    nav_settings: "إعدادات النظام والرقابة",
    app_title: "سند",
    app_subtitle: "المنظومة الرقمية الشاملة لإدارة العقارات والمستحقات بالجمهورية اليمنية",

    btn_save: "حفظ التغييرات",
    btn_cancel: "إلغاء",
    btn_add: "إضافة جديد",
    btn_edit: "تعديل",
    btn_delete: "حذف",
    btn_restore: "استعادة",
    status_active: "نشط",
    status_inactive: "ملغى",
    currency_yer: "ر.ي",

    settings_title: "إعدادات النظام والرقابة الذاتية للعمليات",
    settings_subtitle: "إدارة تعرفة الخدمات، الحوكمة المالية، ومراجعة سجل العمليات الأمني",
    settings_system_lang: "لغة النظام واجهة العرض (Language)",
    settings_system_lang_desc: "اختر لغة عرض النصوص والواجهات الخاصة بالنظام بالكامل",
    settings_select_lang: "اختر اللغة لتبديل العرض فوراً",
    settings_font_title: "نوع الخط العربي المستخدم (System Font)",
    settings_font_desc: "تخصيص نمط الخط لعرض واجهات وتقارير نظام GABER بالكامل",
    settings_audio_title: "المؤثرات الصوتية التفاعلية",
    settings_audio_desc: "تفعيل التنبيهات الصوتية للتأكيدات التحذيرية والمالية",
    settings_auto_refresh: "تحديث البيانات التلقائي المستمر",
    settings_auto_refresh_desc: "مزامنة دورية ذكية لآخر قراءات العدادات والعمليات المستجدة",
    settings_rates_title: "تعرفة استهلاك الخدمات (المياه والكهرباء والرسوم)",
    settings_electricity_rate: "سعر الكيلوواط للكهرباء الإضافي (ر.ي)",
    settings_water_rate: "سعر وحدة المياه الإضافية (ر.ي)",
    settings_service_fee: "رسوم الخدمات والصيانة الشهرية الثابتة",
    settings_shared_expenses: "إجمالي المصاريف المشتركة الموزعة تلقائياً",
    settings_wallet_phone: "رقم هاتف محفظة جيب لربط الفواتير",
    settings_wallet_barcode: "رابط باركود محفظة جيب المعتمدة للتحصيل",
    settings_audit_logs: "سجل التدقيق والرقابة الأمنية (Audit Logs)",
    settings_audit_action: "الإجراء المالي التشغيلي",
    settings_audit_table: "الجدول المتأثر",
    settings_audit_details: "تفاصيل الرقابة الفنية والمبالغ الموثقة",
    settings_audit_time: "توقيت الإجراء",

    db_overdue_alert: "تنبيه: مستأجرين متأخرين عن السداد لأكثر من ١٥ يوماً!",
    db_overdue_desc: "يوجد حالياً {count} فواتير معلقة تجاوزت فترة سماح السداد المحددة (١٥ يوماً) في نظام GABER.",
    db_unpaid_bills: "الأمور تحت السيطرة يا عاقل، يوجد حالياً {count} مطالبات معلقة تحتاج متابعة سداد خفيفة وتنبيه للمستأجرين.",
    db_all_paid: "تبارك الله يا عاقل! كافة المطالبات الإيجارية والخدمية مدفوعة بالكامل لشهرنا هذا، والأمور طيبة ومستقرة تماماً.",
    db_smart_summary: "التلخيص المالي والتشغيلي الذكي من المساعد مُساعد",
    db_quick_stats: "الإحصائيات المالية السريعة للعقار",
    db_total_rents: "إجمالي قيمة الإيجارات المفروضة",
    db_total_collected: "إجمالي المبالغ المحصلة والمسواة",
    db_total_remaining: "إجمالي الذمم المعلقة والمديونيات",
    db_unpaid_count: "عدد الفواتير غير المدفوعة",
    db_analytics: "التحليلات والمؤشرات الرقابية للمستحقات",
    db_billing_overview: "مخطط توزيع المستحقات الإيجارية والخدمية لشهر الجاري",
    db_recent_activities: "آخر التحركات والعمليات المالية المعتمدة للعقار",

    tenants_title: "دليل المستأجرين وعقود الإيجار الموثقة",
    tenants_list: "سجل المستأجرين النشطين بالعقار",
    tenants_add_new: "تسجيل مستأجر وعقد جديد",
    tenant_name: "الاسم الرباعي للمستأجر",
    tenant_phone: "رقم الهاتف الفعال",
    tenant_unit: "رقم الوحدة العقارية",
    tenant_rent: "قيمة الإيجار الشهري",
    tenant_advance: "الرصيد المقدم (دفعات)",
    tenant_join_date: "تاريخ بداية التعاقد",
    tenant_status: "الحالة التعاقدية",
    tenant_actions: "التحكم",

    bills_title: "نظام الفواتير والمطالبات والتحصيل المالي الرقمي",
    bills_list: "سجل الفواتير والمطالبات المعتمدة شهرياً",
    bills_unpaid_alert_title: "تنبيه: مستأجرين متأخرين عن السداد لأكثر من ١٥ يوماً!",
    bills_unpaid_alert_desc: "يوجد حالياً {count} فواتير معلقة تجاوزت فترة سماح السداد المحددة (١٥ يوماً) في نظام GABER.",
    bills_btn_send_bulk: "إرسال تنبيهات جماعية عاجلة ({count})",
    bills_bill_id: "رقم المطالبة",
    bills_month: "شهر الدورة المالية",
    bills_rent: "قيمة الإيجار",
    bills_elec: "قيمة الكهرباء",
    bills_water: "قيمة المياه",
    bills_arrears: "متأخرات سابقة",
    bills_total: "المجموع الكلي",
    bills_status: "حالة السداد والتحصيل",
    bills_due_date: "تاريخ الاستحقاق المعين"
  },
  en: {
    nav_dashboard: "Dashboard",
    nav_tenants: "Tenants",
    nav_bills: "Bills & Claims",
    nav_archive: "Archive & Trash",
    nav_ocr: "Meter OCR",
    nav_assistant: "GABER Assistant",
    nav_settings: "System Settings",
    app_title: "Sanad",
    app_subtitle: "Comprehensive Digital System for Real Estate & Receivables Management in Yemen",

    btn_save: "Save Changes",
    btn_cancel: "Cancel",
    btn_add: "Add New",
    btn_edit: "Edit",
    btn_delete: "Delete",
    btn_restore: "Restore",
    status_active: "Active",
    status_inactive: "Cancelled",
    currency_yer: "YER",

    settings_title: "System Settings & Operation Self-Audit",
    settings_subtitle: "Manage service tariffs, financial governance, and review security log audits",
    settings_system_lang: "System Language",
    settings_system_lang_desc: "Choose the language of text and user interfaces of the entire system",
    settings_select_lang: "Select language to change instantly",
    settings_font_title: "Arabic System Font",
    settings_font_desc: "Customize the font style to display GABER interfaces and reports completely",
    settings_audio_title: "Interactive Sound Effects",
    settings_audio_desc: "Activate audio alerts for warnings and financial confirmations",
    settings_auto_refresh: "Continuous Auto Data Refresh",
    settings_auto_refresh_desc: "Smart periodic synchronization for latest meter readings and current operations",
    settings_rates_title: "Service Tariffs (Water, Electricity, Fees)",
    settings_electricity_rate: "Additional Electricity Rate per kWh (YER)",
    settings_water_rate: "Additional Water Unit Rate (YER)",
    settings_service_fee: "Fixed Monthly Service & Maintenance Fee",
    settings_shared_expenses: "Total Automatically Distributed Shared Expenses",
    settings_wallet_phone: "Jeeb Wallet Phone Number",
    settings_wallet_barcode: "Approved Jeeb Wallet Barcode link",
    settings_audit_logs: "Security Audit Logs",
    settings_audit_action: "Operational Action",
    settings_audit_table: "Affected Table",
    settings_audit_details: "Technical Control Details & Documented Amounts",
    settings_audit_time: "Timestamp",

    db_overdue_alert: "Warning: Tenants overdue by more than 15 days!",
    db_overdue_desc: "There are currently {count} pending invoices that have exceeded the specified grace period (15 days) in GABER.",
    db_unpaid_bills: "Everything is under control! There are currently {count} outstanding invoices needing light follow-up and tenant reminders.",
    db_all_paid: "Praise be to God! All rent and service invoices are fully paid for this month, everything is stable.",
    db_smart_summary: "AI Financial & Operational Summary from assistant",
    db_quick_stats: "Quick Financial Stats",
    db_total_rents: "Total Imposed Rents Value",
    db_total_collected: "Total Collected & Settled",
    db_total_remaining: "Total Pending Claims & Debt",
    db_unpaid_count: "Number of Unpaid Invoices",
    db_analytics: "Claims Analytics & Indicators",
    db_billing_overview: "Distribution Chart of Rent & Service Claims for the Current Month",
    db_recent_activities: "Latest Activities & Confirmed Financial Actions",

    tenants_title: "Tenants Registry & Certified Rental Contracts",
    tenants_list: "Active Tenants Directory",
    tenants_add_new: "Register Tenant & New Contract",
    tenant_name: "Tenant Full Name",
    tenant_phone: "Active Phone Number",
    tenant_unit: "Unit Number",
    tenant_rent: "Monthly Rent Amount",
    tenant_advance: "Advance Balance",
    tenant_join_date: "Contract Start Date",
    tenant_status: "Contractual Status",
    tenant_actions: "Control Actions",

    bills_title: "Digital Invoicing, Billing & Financial Collection System",
    bills_list: "Monthly Certified Invoices & Receivables",
    bills_unpaid_alert_title: "Warning: Tenants overdue by more than 15 days!",
    bills_unpaid_alert_desc: "There are currently {count} pending invoices that have exceeded the specified grace period (15 days) in GABER.",
    bills_btn_send_bulk: "Send Urgent Bulk Alerts ({count})",
    bills_bill_id: "Claim ID",
    bills_month: "Billing Cycle Month",
    bills_rent: "Rent Value",
    bills_elec: "Electricity Value",
    bills_water: "Water Value",
    bills_arrears: "Previous Arrears",
    bills_total: "Grand Total",
    bills_status: "Payment Status",
    bills_due_date: "Assigned Due Date"
  }
};
