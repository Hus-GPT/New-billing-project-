# -*- coding: utf-8 -*-
"""
ملف: data_layer.py
الوصف: طبقة البيانات (Data Layer) لنظام إدارة العقارات "سند" مع معالجة الأرشفة، والتعافي التلقائي، والـ 5 ميزات الجديدة.
إدارة 7 مجموعات بيانات أساسية باستخدام مكتبة Pandas:
1. المستأجرين (Tenants) + الحذف الناعم ورصيد الدفعات المقدمة.
2. الفواتير (Bills) + المصاريف المشتركة ورصيد الدفعات المقدمة وحالة الأرشفة (الجمود المحاسبي).
3. قراءات العدادات (Meter Readings) + الحذف الناعم.
4. إعدادات الأسعار ومحفظة جيب والمصاريف المشتركة (Settings).
5. مركز الإشعارات الداخلية (Notifications).
6. الدفعات المقدمة والمسبقة (Advance Payments).
7. سجل التدقيق وحركات النظام (Audit Log).
"""

import os
import pandas as pd
from datetime import datetime

class DataLayer:
    def __init__(self, backup_dir="data_backup"):
        """
        تهيئة طبقة البيانات وتحديد مجلد النسخ الاحتياطي والأرشفة.
        """
        self.backup_dir = backup_dir
        
        # تحديد مسارات ملفات CSV في المجلد الاحتياطي لكل جدول من الجداول السبعة
        self.file_paths = {
            "tenants": os.path.join(backup_dir, "tenants.csv"),
            "bills": os.path.join(backup_dir, "bills.csv"),
            "readings": os.path.join(backup_dir, "readings.csv"),
            "settings": os.path.join(backup_dir, "settings.csv"),
            "notifications": os.path.join(backup_dir, "notifications.csv"),
            "advance_payments": os.path.join(backup_dir, "advance_payments.csv"),
            "audit_log": os.path.join(backup_dir, "audit_log.csv")
        }
        
        # تهيئة مجموعات البيانات (DataFrames) في الذاكرة
        self.tenants_df = None
        self.bills_df = None
        self.readings_df = None
        self.settings_df = None
        self.notifications_df = None
        self.advance_payments_df = None
        self.audit_log_df = None
        
        # استدعاء دالة التحميل التلقائي لتجهيز البيانات عند البدء
        self.load_data()

    def _create_empty_structures(self):
        """
        إنشاء هياكل جداول Pandas فارغة بالمسميات المطلوبة في حال عدم وجود أرشيف مسبق.
        """
        self._create_empty_tenants_only()
        self._create_empty_bills_only()
        self._create_empty_readings_only()
        self._create_default_settings_only()
        self._create_empty_notifications_only()
        self._create_empty_advance_payments_only()
        self._create_empty_audit_log_only()

    def load_data(self):
        """
        استعادة وتحميل جداول البيانات من ملفات CSV في مجلد النسخ الاحتياطي.
        في حال فقدان أي ملف، يتم تفعيل آلية التعافي التلقائي لإنشاء هيكل فارغ وتأمين استمرار النظام.
        """
        # التحقق من وجود مجلد الأرشفة
        if not os.path.exists(self.backup_dir):
            print(f"[تنبيـه] مجلد النسخ الاحتياطي '{self.backup_dir}' غير موجود.")
            try:
                os.makedirs(self.backup_dir)
                print(f"[معلومات] تم إنشاء مجلد جديد تلقائياً: '{self.backup_dir}'")
            except Exception as e:
                print(f"[خطأ] تعذر إنشاء مجلد النسخ الاحتياطي: {e}")

        # 1. تحميل المستأجرين
        if os.path.exists(self.file_paths["tenants"]):
            try:
                self.tenants_df = pd.read_csv(self.file_paths["tenants"])
                self.tenants_df = self.tenants_df.astype({"tenant_id": str})
                
                # التحقق من توفر الأعمدة الجديدة
                if "advance_balance" not in self.tenants_df.columns:
                    self.tenants_df["advance_balance"] = 0.0
                if "is_deleted" not in self.tenants_df.columns:
                    self.tenants_df["is_deleted"] = 0
                    
                self.tenants_df = self.tenants_df.astype({
                    "tenant_id": str, "name": str, "phone": str, "id_type": str, "id_number": str,
                    "apartment_number": str, "electricity_meter": str, "water_meter": str,
                    "security_deposit": float, "email": str, "contract_start": str, "contract_end": str, 
                    "status": str, "advance_balance": float, "is_deleted": int
                })
                print("[معلومات] تم استيراد جدول المستأجرين بنجاح.")
            except Exception as e:
                print(f"[تحذير] تعذر قراءة ملف المستأجرين: {e}. سيتم إنشاء جدول فارغ.")
                self._create_empty_tenants_only()
        else:
            self._create_empty_tenants_only()

        # 2. تحميل الفواتير
        if os.path.exists(self.file_paths["bills"]):
            try:
                self.bills_df = pd.read_csv(self.file_paths["bills"])
                self.bills_df = self.bills_df.astype({"bill_id": str, "tenant_id": str})
                
                # إضافة الأعمدة الجديدة مع قيم افتراضية لضمان التوافق السلس
                if "paid_amount" not in self.bills_df.columns:
                    self.bills_df["paid_amount"] = 0.0
                    self.bills_df.loc[self.bills_df["status"] == "مدفوع", "paid_amount"] = self.bills_df["total"]
                    self.bills_df.loc[self.bills_df["status"] == "مدفوع جزئياً", "paid_amount"] = self.bills_df["total"] * 0.5
                
                if "service_charges" not in self.bills_df.columns:
                    self.bills_df["service_charges"] = 0.0
                if "shared_expense_share" not in self.bills_df.columns:
                    self.bills_df["shared_expense_share"] = 0.0
                if "applied_advance" not in self.bills_df.columns:
                    self.bills_df["applied_advance"] = 0.0
                if "is_archived" not in self.bills_df.columns:
                    self.bills_df["is_archived"] = 0
                if "is_deleted" not in self.bills_df.columns:
                    self.bills_df["is_deleted"] = 0
                
                self.bills_df = self.bills_df.astype({
                    "bill_id": str, "tenant_id": str, "bill_type": str, "amount": float,
                    "arrears": float, "service_charges": float, "total": float, "due_date": str, 
                    "status": str, "paid_amount": float, "shared_expense_share": float,
                    "applied_advance": float, "is_archived": int, "is_deleted": int
                })
                print("[معلومات] تم استيراد جدول الفواتير وتحديث الأعمدة بنجاح.")
            except Exception as e:
                print(f"[تحذير] تعذر قراءة ملف الفواتير: {e}. سيتم إنشاء جدول فارغ.")
                self._create_empty_bills_only()
        else:
            self._create_empty_bills_only()

        # 3. تحميل قراءات العدادات
        if os.path.exists(self.file_paths["readings"]):
            try:
                self.readings_df = pd.read_csv(self.file_paths["readings"])
                self.readings_df = self.readings_df.astype({"reading_id": str, "tenant_id": str})
                
                if "is_deleted" not in self.readings_df.columns:
                    self.readings_df["is_deleted"] = 0
                    
                self.readings_df = self.readings_df.astype({
                    "reading_id": str, "tenant_id": str, "bill_type": str,
                    "reading_value": float, "reading_date": str, "is_deleted": int
                })
                print("[معلومات] تم استيراد جدول قراءات العدادات بنجاح.")
            except Exception as e:
                print(f"[تحذير] تعذر قراءة ملف قراءات العدادات: {e}. سيتم إنشاء جدول فارغ.")
                self._create_empty_readings_only()
        else:
            self._create_empty_readings_only()

        # 4. تحميل إعدادات الأسعار والتعرفة
        if os.path.exists(self.file_paths["settings"]):
            try:
                self.settings_df = pd.read_csv(self.file_paths["settings"])
                
                # التأكد من توفر إعدادات المصاريف المشتركة وتنبؤات الطفرات وجيب ومحفظة جيب
                if "monthly_service_fee" not in self.settings_df.columns:
                    self.settings_df["monthly_service_fee"] = 80.0
                if "max_spike_default" not in self.settings_df.columns:
                    self.settings_df["max_spike_default"] = 2000.0
                if "total_shared_expenses" not in self.settings_df.columns:
                    self.settings_df["total_shared_expenses"] = 0.0
                if "jeeb_phone" not in self.settings_df.columns:
                    self.settings_df["jeeb_phone"] = ""
                if "jeeb_barcode" not in self.settings_df.columns:
                    self.settings_df["jeeb_barcode"] = ""
                    
                self.settings_df = self.settings_df.astype({
                    "electricity_rate": float, "water_rate": float, "monthly_service_fee": float,
                    "max_spike_default": float, "total_shared_expenses": float,
                    "jeeb_phone": str, "jeeb_barcode": str, "last_updated": str
                })
                print("[معلومات] تم استيراد جدول إعدادات الأسعار بنجاح.")
            except Exception as e:
                print(f"[تحذير] تعذر قراءة ملف الإعدادات: {e}. سيتم تهيئة القيم الافتراضية.")
                self._create_default_settings_only()
        else:
            self._create_default_settings_only()

        # 5. تحميل جدول الإشعارات
        if os.path.exists(self.file_paths["notifications"]):
            try:
                self.notifications_df = pd.read_csv(self.file_paths["notifications"])
                self.notifications_df = self.notifications_df.astype({
                    "notification_id": str, "tenant_id": str, "title": str, "message": str, 
                    "date": str, "is_read": int, "is_deleted": int
                })
                print("[معلومات] تم استيراد جدول الإشعارات بنجاح.")
            except Exception as e:
                print(f"[تحذير] تعذر قراءة جدول الإشعارات: {e}. سيتم إنشاء جدول فارغ.")
                self._create_empty_notifications_only()
        else:
            self._create_empty_notifications_only()

        # 6. تحميل جدول الدفعات المقدمة
        if os.path.exists(self.file_paths["advance_payments"]):
            try:
                self.advance_payments_df = pd.read_csv(self.file_paths["advance_payments"])
                self.advance_payments_df = self.advance_payments_df.astype({
                    "payment_id": str, "tenant_id": str, "amount": float, 
                    "payment_date": str, "notes": str, "is_deleted": int
                })
                print("[معلومات] تم استيراد جدول الدفعات المقدمة بنجاح.")
            except Exception as e:
                print(f"[تحذير] تعذر قراءة جدول الدفعات المقدمة: {e}. سيتم إنشاء جدول فارغ.")
                self._create_empty_advance_payments_only()
        else:
            self._create_empty_advance_payments_only()

        # 7. تحميل جدول سجل التدقيق واللوجز
        if os.path.exists(self.file_paths["audit_log"]):
            try:
                self.audit_log_df = pd.read_csv(self.file_paths["audit_log"])
                self.audit_log_df = self.audit_log_df.astype({
                    "log_id": str, "timestamp": str, "action": str, 
                    "table_name": str, "record_id": str, "details": str
                })
                print("[معلومات] تم استيراد جدول سجل التدقيق بنجاح.")
            except Exception as e:
                print(f"[تحذير] تعذر قراءة سجل التدقيق: {e}. سيتم إنشاء جدول فارغ.")
                self._create_empty_audit_log_only()
        else:
            self._create_empty_audit_log_only()

        print("[نجاح] اكتملت عملية فحص البيانات وجاهزية طبقة البيانات للعمل بالكامل.")

    # دوال الإنشاء الفردية لتوفير الدعم المرن للتعافي التلقائي
    def _create_empty_tenants_only(self):
        tenants_cols = [
            "tenant_id", "name", "phone", "id_type", "id_number", 
            "apartment_number", "electricity_meter", "water_meter", 
            "security_deposit", "email", "contract_start", "contract_end", "status",
            "advance_balance", "is_deleted"
        ]
        self.tenants_df = pd.DataFrame(columns=tenants_cols)
        self.tenants_df = self.tenants_df.astype({
            "tenant_id": str, "name": str, "phone": str, "id_type": str, "id_number": str,
            "apartment_number": str, "electricity_meter": str, "water_meter": str,
            "security_deposit": float, "email": str, "contract_start": str, "contract_end": str, 
            "status": str, "advance_balance": float, "is_deleted": int
        })

    def _create_empty_bills_only(self):
        bills_cols = [
            "bill_id", "tenant_id", "bill_type", "amount", "arrears", 
            "service_charges", "total", "due_date", "status", "paid_amount",
            "shared_expense_share", "applied_advance", "is_archived", "is_deleted"
        ]
        self.bills_df = pd.DataFrame(columns=bills_cols)
        self.bills_df = self.bills_df.astype({
            "bill_id": str, "tenant_id": str, "bill_type": str, "amount": float,
            "arrears": float, "service_charges": float, "total": float, "due_date": str, 
            "status": str, "paid_amount": float, "shared_expense_share": float,
            "applied_advance": float, "is_archived": int, "is_deleted": int
        })

    def _create_empty_readings_only(self):
        readings_cols = ["reading_id", "tenant_id", "bill_type", "reading_value", "reading_date", "is_deleted"]
        self.readings_df = pd.DataFrame(columns=readings_cols)
        self.readings_df = self.readings_df.astype({
            "reading_id": str, "tenant_id": str, "bill_type": str,
            "reading_value": float, "reading_date": str, "is_deleted": int
        })

    def _create_default_settings_only(self):
        settings_data = {
            "electricity_rate": [0.18],
            "water_rate": [2.50],
            "monthly_service_fee": [80.0],
            "max_spike_default": [2000.0],
            "total_shared_expenses": [0.0],
            "jeeb_phone": [""],
            "jeeb_barcode": [""],
            "last_updated": [datetime.now().strftime("%Y-%m-%d %H:%M:%S")]
        }
        self.settings_df = pd.DataFrame(settings_data)

    def _create_empty_notifications_only(self):
        notif_cols = ["notification_id", "tenant_id", "title", "message", "date", "is_read", "is_deleted"]
        self.notifications_df = pd.DataFrame(columns=notif_cols)
        self.notifications_df = self.notifications_df.astype({
            "notification_id": str, "tenant_id": str, "title": str, "message": str, 
            "date": str, "is_read": int, "is_deleted": int
        })

    def _create_empty_advance_payments_only(self):
        adv_cols = ["payment_id", "tenant_id", "amount", "payment_date", "notes", "is_deleted"]
        self.advance_payments_df = pd.DataFrame(columns=adv_cols)
        self.advance_payments_df = self.advance_payments_df.astype({
            "payment_id": str, "tenant_id": str, "amount": float, 
            "payment_date": str, "notes": str, "is_deleted": int
        })

    def _create_empty_audit_log_only(self):
        audit_cols = ["log_id", "timestamp", "action", "table_name", "record_id", "details"]
        self.audit_log_df = pd.DataFrame(columns=audit_cols)
        self.audit_log_df = self.audit_log_df.astype({
            "log_id": str, "timestamp": str, "action": str, 
            "table_name": str, "record_id": str, "details": str
        })

    # دالة تسجيل التدقيق واللوجز الفورية والآمنة
    def add_audit_log(self, action, table_name, record_id, details):
        """
        تسجيل حركة تدقيق جديدة للنظام لضمان الشفافية والأمن.
        """
        log_id = f"L{100 + len(self.audit_log_df) + 1}"
        new_log = {
            "log_id": log_id,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "action": action,
            "table_name": table_name,
            "record_id": str(record_id),
            "details": details
        }
        self.audit_log_df = pd.concat([self.audit_log_df, pd.DataFrame([new_log])], ignore_index=True)
        # حفظ التغييرات لسجل التدقيق
        try:
            self.audit_log_df.to_csv(self.file_paths["audit_log"], index=False)
        except Exception as e:
            print(f"[تحذير] فشل حفظ سجل التدقيق: {e}")
        return log_id

    # دالة إضافة إشعار لمركز الإشعارات العقارية
    def add_notification(self, tenant_id, title, message):
        """
        إضافة إشعار داخلي جديد للمستأجر مع شارة تنبيه نشطة.
        """
        notification_id = f"N{100 + len(self.notifications_df) + 1}"
        new_notif = {
            "notification_id": notification_id,
            "tenant_id": str(tenant_id),
            "title": title,
            "message": message,
            "date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "is_read": 0,
            "is_deleted": 0
        }
        self.notifications_df = pd.concat([self.notifications_df, pd.DataFrame([new_notif])], ignore_index=True)
        try:
            self.notifications_df.to_csv(self.file_paths["notifications"], index=False)
        except Exception as e:
            print(f"[تحذير] فشل حفظ الإشعارات: {e}")
        return notification_id

    # دالة تسجيل حركة دفع مقدم وحفظها
    def add_advance_payment(self, tenant_id, amount, payment_date, notes):
        """
        تسجيل دفعة مقدمة جديدة من المستأجر وإضافتها لرصيده المتراكم تلقائياً.
        """
        tenant_id = str(tenant_id)
        amount = float(amount)
        
        # 1. التحقق من وجود المستأجر وغير محذوف
        idx = self.tenants_df[(self.tenants_df["tenant_id"] == tenant_id) & (self.tenants_df["is_deleted"] == 0)].index
        if idx.empty:
            print(f"[خطأ] تعذر تسجيل دفعة مقدمة: المستأجر {tenant_id} غير موجود أو تم حذفه.")
            return None
            
        # 2. إنشاء معرف الدفعة وتسجيلها
        payment_id = f"P{100 + len(self.advance_payments_df) + 1}"
        new_payment = {
            "payment_id": payment_id,
            "tenant_id": tenant_id,
            "amount": amount,
            "payment_date": payment_date,
            "notes": notes,
            "is_deleted": 0
        }
        self.advance_payments_df = pd.concat([self.advance_payments_df, pd.DataFrame([new_payment])], ignore_index=True)
        
        # 3. تحديث رصيد المستأجر المتراكم في tenants_df
        current_bal = float(self.tenants_df.at[idx[0], "advance_balance"])
        self.tenants_df.at[idx[0], "advance_balance"] = round(current_bal + amount, 2)
        
        # 4. تسجيل لوج التدقيق
        tenant_name = self.tenants_df.at[idx[0], "name"]
        self.add_audit_log(
            action="تسجيل دفعة مقدمة",
            table_name="advance_payments",
            record_id=payment_id,
            details=f"تلقي مبلغ {amount} ر.ي دفعة مقدمة من المستأجر {tenant_name} ({tenant_id})، الرصيد الإجمالي الحالي: {self.tenants_df.at[idx[0], 'advance_balance']} ر.ي"
        )
        
        # 5. حفظ البيانات
        self.save_data()
        return payment_id

    # آلية الحذف الناعم (Soft Delete) لحماية البيانات من الحذف العشوائي
    def soft_delete_record(self, table_name, record_id_col, record_id):
        """
        القيام بعملية حذف ناعم (تحديث is_deleted إلى 1) لضمان حماية المعاملات والأرشيف التاريخي.
        """
        record_id = str(record_id)
        
        # الحصول على الـ DataFrame المناسب
        df_attr = f"{table_name}_df"
        if not hasattr(self, df_attr):
            # بعض الجداول مثل meter_readings_df باسم readings_df
            if table_name == "readings":
                df_attr = "readings_df"
            else:
                print(f"[خطأ] الجدول '{table_name}' غير مدعوم للحذف الناعم.")
                return False
                
        df = getattr(self, df_attr)
        idx = df[df[record_id_col] == record_id].index
        
        if idx.empty:
            print(f"[خطأ] تعذر العثور على السجل {record_id} في الجدول {table_name}.")
            return False
            
        # التحقق في حال كانت الفاتورة مؤرشفة يمنع حذفها تماماً
        if table_name == "bills" and "is_archived" in df.columns:
            if int(df.at[idx[0], "is_archived"]) == 1:
                print(f"[خطأ أمني] لا يمكن حذف الفاتورة {record_id} لأنها مؤرشفة ومحمية من التعديل.")
                return False

        # إجراء الحذف الناعم
        df.at[idx[0], "is_deleted"] = 1
        setattr(self, df_attr, df)
        
        # في حال حذف المستأجر، يتم تحديث حالته إلى "ملغى" تلقائياً
        if table_name == "tenants":
            df.at[idx[0], "status"] = "ملغى"
        
        # تسجيل الحركة في سجل التدقيق
        self.add_audit_log(
            action="حذف ناعم",
            table_name=table_name,
            record_id=record_id,
            details=f"تم حذف السجل ذو المعرف {record_id} ناعماً وتجنب الإزالة الفيزيائية من الأرشيف."
        )
        
        # حفظ التغييرات
        self.save_data()
        print(f"[نجاح] تم حذف السجل {record_id} ناعماً بنجاح من جدول {table_name}.")
        return True

    def save_data(self):
        """
        حفظ وأرشفة كافة مجموعات البيانات (Pandas DataFrames) السبعة الحالية في ملفات CSV داخل مجلد النسخ الاحتياطي.
        """
        if not os.path.exists(self.backup_dir):
            os.makedirs(self.backup_dir)

        try:
            self.tenants_df.to_csv(self.file_paths["tenants"], index=False)
            self.bills_df.to_csv(self.file_paths["bills"], index=False)
            self.readings_df.to_csv(self.file_paths["readings"], index=False)
            self.settings_df.to_csv(self.file_paths["settings"], index=False)
            self.notifications_df.to_csv(self.file_paths["notifications"], index=False)
            self.advance_payments_df.to_csv(self.file_paths["advance_payments"], index=False)
            self.audit_log_df.to_csv(self.file_paths["audit_log"], index=False)
            print("[نجاح] تمت أرشفة وحفظ حركات التطبيق السبعة بالكامل بنجاح في ملفات CSV.")
            return True
        except Exception as e:
            print(f"[خطأ عاجل] فشلت عملية حفظ البيانات وأرشفتها: {e}")
            return False

    def load_demo_data(self):
        """
        شحن يدوي لبيانات تجريبية نموذجية لتمثيل سيناريوهات واقعية واختبار النظام بشكل كامل مع الميزات الجديدة.
        """
        print("[عملية] جاري شحن البيانات النموذجية والـ 5 ميزات الجديدة في طبقة البيانات...")
        
        # 1. تعبئة المستأجرين مع إضافة رصيد الدفع المقدم والحذف الناعم
        demo_tenants = [
            {
                "tenant_id": "T101", "name": "أحمد العتيبي", "phone": "0501112222", 
                "id_type": "الهوية الوطنية", "id_number": "1098877665", "apartment_number": "A1", 
                "electricity_meter": "E-9901", "water_meter": "W-4401", "security_deposit": 1000.0, 
                "email": "ahmed@example.com", "contract_start": "2026-01-01", "contract_end": "2026-12-31", 
                "status": "نشط", "advance_balance": 500.0, "is_deleted": 0
            },
            {
                "tenant_id": "T102", "name": "سارة الشمري", "phone": "0503334444", 
                "id_type": "الهوية الوطنية", "id_number": "1087766554", "apartment_number": "B3", 
                "electricity_meter": "E-9902", "water_meter": "W-4402", "security_deposit": 1500.0, 
                "email": "sara@example.com", "contract_start": "2026-02-15", "contract_end": "2027-02-14", 
                "status": "نشط", "advance_balance": 0.0, "is_deleted": 0
            },
            {
                "tenant_id": "T103", "name": "خالد الدوسري", "phone": "0555556666", 
                "id_type": "الإقامة", "id_number": "2244556677", "apartment_number": "C5", 
                "electricity_meter": "E-9903", "water_meter": "W-4403", "security_deposit": 800.0, 
                "email": "khaled@example.com", "contract_start": "2026-03-10", "contract_end": "2027-03-09", 
                "status": "نشط", "advance_balance": 0.0, "is_deleted": 0
            },
            {
                "tenant_id": "T104", "name": "فاطمة الغامدي", "phone": "0507778888", 
                "id_type": "الهوية الوطنية", "id_number": "1076655443", "apartment_number": "D2", 
                "electricity_meter": "E-9904", "water_meter": "W-4404", "security_deposit": 1200.0, 
                "email": "fatima@example.com", "contract_start": "2026-05-01", "contract_end": "2027-04-30", 
                "status": "نشط مؤقتاً", "advance_balance": 200.0, "is_deleted": 0
            }
        ]
        self.tenants_df = pd.DataFrame(demo_tenants)
        
        # 2. تعبئة قراءات العدادات النموذجية مع الحذف الناعم
        demo_readings = [
            {"reading_id": "R001", "tenant_id": "T101", "bill_type": "كهرباء", "reading_value": 1200.0, "reading_date": "2026-05-30", "is_deleted": 0},
            {"reading_id": "R002", "tenant_id": "T101", "bill_type": "مياه", "reading_value": 340.0, "reading_date": "2026-05-30", "is_deleted": 0},
            {"reading_id": "R003", "tenant_id": "T102", "bill_type": "كهرباء", "reading_value": 4500.0, "reading_date": "2026-05-30", "is_deleted": 0},
            {"reading_id": "R004", "tenant_id": "T102", "bill_type": "مياه", "reading_value": 980.0, "reading_date": "2026-05-30", "is_deleted": 0},
            
            {"reading_id": "R005", "tenant_id": "T101", "bill_type": "كهرباء", "reading_value": 1550.0, "reading_date": "2026-06-29", "is_deleted": 0},
            {"reading_id": "R006", "tenant_id": "T101", "bill_type": "مياه", "reading_value": 365.0, "reading_date": "2026-06-29", "is_deleted": 0},
            {"reading_id": "R007", "tenant_id": "T102", "bill_type": "كهرباء", "reading_value": 4980.0, "reading_date": "2026-06-29", "is_deleted": 0},
            {"reading_id": "R008", "tenant_id": "T102", "bill_type": "مياه", "reading_value": 1012.0, "reading_date": "2026-06-29", "is_deleted": 0}
        ]
        self.readings_df = pd.DataFrame(demo_readings)

        # 3. تعبئة فواتير سابقة مع حقول المصاريف المشتركة والدفع المقدم والأرشفة
        demo_bills = [
            {
                "bill_id": "B001", "tenant_id": "T101", "bill_type": "إيجار شهري", 
                "amount": 2500.0, "arrears": 0.0, "service_charges": 0.0, "total": 2500.0, "due_date": "2026-07-05", 
                "status": "مدفوع", "paid_amount": 2500.0, "shared_expense_share": 0.0, "applied_advance": 0.0, 
                "is_archived": 1, "is_deleted": 0
            },
            {
                "bill_id": "B002", "tenant_id": "T101", "bill_type": "كهرباء", 
                "amount": 63.0, "arrears": 0.0, "service_charges": 0.0, "total": 63.0, "due_date": "2026-07-05", 
                "status": "مدفوع", "paid_amount": 63.0, "shared_expense_share": 0.0, "applied_advance": 0.0, 
                "is_archived": 1, "is_deleted": 0
            },
            {
                "bill_id": "B003", "tenant_id": "T102", "bill_type": "إيجار شهري", 
                "amount": 3200.0, "arrears": 1500.0, "service_charges": 80.0, "total": 4780.0, "due_date": "2026-07-05", 
                "status": "غير مدفوع", "paid_amount": 0.0, "shared_expense_share": 80.0, "applied_advance": 0.0, 
                "is_archived": 0, "is_deleted": 0
            },
            {
                "bill_id": "B004", "tenant_id": "T103", "bill_type": "إيجار شهري", 
                "amount": 1800.0, "arrears": 0.0, "service_charges": 80.0, "total": 1880.0, "due_date": "2026-07-05", 
                "status": "مدفوع جزئياً", "paid_amount": 1000.0, "shared_expense_share": 80.0, "applied_advance": 0.0, 
                "is_archived": 0, "is_deleted": 0
            }
        ]
        self.bills_df = pd.DataFrame(demo_bills)

        # 4. تعبئة إعدادات الأسعار ومحفظة جيب الافتراضية
        demo_settings = {
            "electricity_rate": [0.18],
            "water_rate": [2.50],
            "monthly_service_fee": [80.0],
            "max_spike_default": [2000.0],
            "total_shared_expenses": [320.0], # إجمالي المصاريف المشتركة للشقة
            "jeeb_phone": ["0501112222"],
            "jeeb_barcode": ["jeeb_merchant_snd_1122"],
            "last_updated": [datetime.now().strftime("%Y-%m-%d %H:%M:%S")]
        }
        self.settings_df = pd.DataFrame(demo_settings)

        # 5. تعبئة إشعارات نموذجية للمركز الإشعارات الداخلي
        demo_notifs = [
            {
                "notification_id": "N001", "tenant_id": "T102", "title": "فاتورة مستحقة", 
                "message": "تنبيه: فاتورتك لشهر يونيو مستحقة بقيمة 4780.0 ر.ي ولديها متأخرات سابقة.", 
                "date": "2026-07-01 08:00:00", "is_read": 0, "is_deleted": 0
            },
            {
                "notification_id": "N002", "tenant_id": "T101", "title": "تأكيد دفعة مقدمة", 
                "message": "تم استلام دفعة مقدمة بقيمة 500.0 ر.ي وقيدها بنجاح في حساب رصيدك المقدم.", 
                "date": "2026-07-10 12:30:00", "is_read": 1, "is_deleted": 0
            }
        ]
        self.notifications_df = pd.DataFrame(demo_notifs)

        # 6. تعبئة دفعات مقدمة نموذجية
        demo_advances = [
            {"payment_id": "P001", "tenant_id": "T101", "amount": 500.0, "payment_date": "2026-07-10", "notes": "دفعة مقدمة لتسوية الإيجارات القادمة", "is_deleted": 0},
            {"payment_id": "P002", "tenant_id": "T104", "amount": 200.0, "payment_date": "2026-07-15", "notes": "دفعة تأمين متبقي قراءة العداد", "is_deleted": 0}
        ]
        self.advance_payments_df = pd.DataFrame(demo_advances)

        # 7. سجل حركات التدقيق والنظام التأسيسي
        demo_logs = [
            {"log_id": "L001", "timestamp": "2026-07-20 10:00:00", "action": "شحن بيانات نموذجية", "table_name": "system", "record_id": "all", "details": "تم تهيئة قاعدة البيانات بالبيانات التجريبية للتطبيق سند بنجاح."},
            {"log_id": "L002", "timestamp": "2026-07-20 10:05:00", "action": "تحديث الإعدادات", "table_name": "settings", "record_id": "1", "details": "إضافة إعدادات محفظة جيب (0501112222) وتفعيل ميزة المصاريف المشتركة."}
        ]
        self.audit_log_df = pd.DataFrame(demo_logs)

        # 8. حفظ وحفظ كل شيء
        self.save_data()
        print("[نجاح] تم شحن وأرشفة البيانات التجريبية الموسعة والـ 5 ميزات الجديدة بنجاح.")
