export interface Tenant {
  tenant_id: string;
  name: string;
  phone: string;
  unit_number: string;
  rent_amount: number;
  status: 'نشط' | 'نشط مؤقتاً' | 'ملغى';
  join_date: string;
  id_type?: string;
  id_number?: string;
  email?: string;
  contract_start?: string;
  contract_end?: string;
  advance_balance?: number; // رصيد الدفعات المقدمة المتراكم للمستأجر
  is_deleted?: boolean;      // الحذف الناعم
}

export interface Bill {
  bill_id: string;
  tenant_id: string;
  billing_month: string;
  rent_bill: number;
  electricity_bill: number;
  water_bill: number;
  previous_arrears: number;
  total_amount: number;
  payment_status: 'مدفوع' | 'غير مدفوع' | 'مدفوع جزئياً';
  issue_date: string;
  bill_type?: string;
  due_date?: string;
  paid_amount?: number;
  service_charges?: number;
  shared_expense_share?: number; // حصة المستأجر من المصاريف المشتركة لشهر الفاتورة
  applied_advance?: number;       // المبلغ المخصوم من الرصيد المقدم لتسوية الفاتورة
  is_deleted?: boolean;          // الحذف الناعم
  is_archived?: boolean;         // حالة الجمود المحاسبي (مؤرشفة لا يمكن التعديل عليها)
}

export interface MeterReading {
  reading_id: string;
  tenant_id: string;
  reading_month: string;
  electricity_reading: number;
  water_reading: number;
  reading_date: string;
  bill_type?: string;
  reading_value?: number;
  is_deleted?: boolean;          // الحذف الناعم
  notes?: string;                // ملاحظات أو تعليق نصي مع القراءة
}

export interface PriceSettings {
  electricity_rate: number;
  water_rate: number;
  tax_rate: number;
  last_update: string;
  monthly_service_fee?: number;
  max_spike_default?: number;
  total_shared_expenses?: number; // إجمالي المصاريف المشتركة المراد توزيعها تلقائياً
  jeeb_phone?: string;             // رقم هاتف محفظة جيب لاستقبال التحويلات
  jeeb_barcode?: string;           // كود محفظة جيب
}

export interface Notification {
  notification_id: string;
  tenant_id: string;
  title: string;
  message: string;
  date: string;
  is_read: boolean;
  is_deleted?: boolean;
}

export interface AdvancePayment {
  payment_id: string;
  tenant_id: string;
  amount: number;
  payment_date: string;
  notes: string;
  is_deleted?: boolean;
}

export interface AuditLog {
  log_id: string;
  timestamp: string;
  action: string;
  table_name: string;
  record_id: string;
  details: string;
}

export interface AssistantMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}
