# -*- coding: utf-8 -*-
"""
ملف: business_logic.py
الوصف: طبقة منطق الأعمال (Business Logic Layer) لنظام إدارة العقارات "سند".
يحتوي هذا الملف على القواعد البرمجية، والعمليات الحسابية الأساسية، والـ 5 ميزات الجديدة:
1. احتساب المصاريف المشتركة ديناميكياً وتقسيمها بالتساوي على الشقق المؤجرة (المشغولة) في شهر الفاتورة.
2. تتبع وتطبيق الدفعات المقدمة (Advanced Rent Tracking) وتطبيقها تلقائياً لتسوية أو خفض قيمة الفواتير الجديدة.
3. الجمود المحاسبي (Archiving): منع التعديل أو الحذف للفواتير بعد أرشفتها.
4. الحذف الناعم (Soft Delete) وسجل التدقيق (Audit Log) لكافة العمليات المالية والتشغيلية.
5. الإشعارات الداخلية (In-App Notification Center) عند صدور فواتير، تجاوز مواعيد السداد، أو تسجيل دفعات.
"""

import pandas as pd
from datetime import datetime

class BusinessLogic:
    def __init__(self, data_layer):
        """
        تهيئة منطق الأعمال بربطه بطبقة البيانات الأساسية.
        """
        self.db = data_layer

    def add_tenant(self, tenant_data):
        """
        إضافة مستأجر جديد إلى الـ DataFrame وتسجيل الحركة في سجل التدقيق وحفظ البيانات تلقائياً.
        """
        # توليد رقم معرف تلقائي إذا لم يكن متوفراً
        if "tenant_id" not in tenant_data or not tenant_data["tenant_id"]:
            # تصفية المستأجرين غير المحذوفين أو حتى المحذوفين للحصول على معرف فريد
            if len(self.db.tenants_df) > 0:
                last_id = self.db.tenants_df["tenant_id"].iloc[-1]
                try:
                    num = int(last_id.replace("T", ""))
                    tenant_data["tenant_id"] = f"T{num + 1}"
                except:
                    tenant_data["tenant_id"] = f"T{100 + len(self.db.tenants_df) + 1}"
            else:
                tenant_data["tenant_id"] = "T101"

        # تعيين القيم الافتراضية للميزات الجديدة
        tenant_data["advance_balance"] = float(tenant_data.get("advance_balance", 0.0))
        tenant_data["is_deleted"] = int(tenant_data.get("is_deleted", 0))

        new_row = pd.DataFrame([tenant_data])
        # دمج السجل الجديد
        self.db.tenants_df = pd.concat([self.db.tenants_df, new_row], ignore_index=True)
        
        # تسجيل لوج تدقيق
        self.db.add_audit_log(
            action="إضافة مستأجر",
            table_name="tenants",
            record_id=tenant_data["tenant_id"],
            details=f"تم تسجيل المستأجر الجديد '{tenant_data['name']}' للشقة رقم '{tenant_data.get('apartment_number', '-')}' بقيمة إيجار {tenant_data.get('rent_amount', 0.0)} ر.ي."
        )

        # إرسال تنبيه ترحيبي
        self.db.add_notification(
            tenant_id=tenant_data["tenant_id"],
            title="ترحيب بالمسكن الجديد",
            message=f"أهلاً بك {tenant_data['name']} في عقارك الجديد شقة رقم {tenant_data.get('apartment_number', '-')}. نتمنى لك إقامة سعيدة."
        )

        self.db.save_data()
        print(f"[منطق الأعمال] تم تسجيل المستأجر الجديد '{tenant_data['name']}' بنجاح بالمعرف: {tenant_data['tenant_id']}")
        return tenant_data["tenant_id"]

    def calculate_arrears(self, tenant_id):
        """
        احتساب إجمالي المبالغ المتأخرة والديون غير المدفوعة على مستأجر معين تلقائياً.
        يتم استثناء السجلات المحذوفة ناعماً (is_deleted == 1).
        """
        if len(self.db.bills_df) == 0:
            return 0.0

        tenant_id = str(tenant_id)
        # تصفية الفواتير المعلقة أو المدفوعة جزئياً للمستأجر المحدد، مع استبعاد المحذوفة
        tenant_bills = self.db.bills_df[
            (self.db.bills_df["tenant_id"] == tenant_id) & 
            (self.db.bills_df["status"].isin(["غير مدفوع", "مدفوع جزئياً"])) &
            (self.db.bills_df["is_deleted"] == 0)
        ]

        total_arrears = 0.0
        for _, bill in tenant_bills.iterrows():
            total = float(bill["total"])
            paid = float(bill["paid_amount"]) if "paid_amount" in bill and not pd.isna(bill["paid_amount"]) else 0.0
            total_arrears += max(0.0, total - paid)

        return round(total_arrears, 2)

    def record_payment(self, bill_id, amount):
        """
        تسجيل دفعة مالية معينة لفاتورة محددة.
        تقوم بالتأكد من حماية الفاتورة من التعديل في حال كانت مؤرشفة (الجمود المحاسبي).
        تحديث العمود paid_amount، وإعادة تقييم حالة الفاتورة، وحفظ التغييرات تلقائياً مع تسجيل حركة تدقيق.
        """
        bill_id = str(bill_id)
        amount = float(amount)

        # البحث عن الفاتورة في جدول الفواتير
        bill_index = self.db.bills_df[self.db.bills_df["bill_id"] == bill_id].index
        if bill_index.empty:
            print(f"[خطأ] الفاتورة ذات الرقم {bill_id} غير موجودة.")
            return False

        idx = bill_index[0]
        
        # 1. التحقق من الحذف الناعم
        if int(self.db.bills_df.at[idx, "is_deleted"]) == 1:
            print(f"[خطأ] لا يمكن تسجيل دفع على فاتورة محذوفة ناعماً.")
            return False

        # 2. ميزة الجمود المحاسبي (Archiving Check)
        if "is_archived" in self.db.bills_df.columns and int(self.db.bills_df.at[idx, "is_archived"]) == 1:
            print(f"[خطأ أمني] الفاتورة {bill_id} مؤرشفة ومغلقة محاسبياً. لا يمكن تعديلها أو تسجيل مبالغ دفع عليها.")
            return False

        current_paid = float(self.db.bills_df.at[idx, "paid_amount"]) if "paid_amount" in self.db.bills_df.columns else 0.0
        total_bill = float(self.db.bills_df.at[idx, "total"])
        tenant_id = str(self.db.bills_df.at[idx, "tenant_id"])

        # تحديث قيمة المبلغ المدفوع التراكمي
        new_paid = round(current_paid + amount, 2)
        self.db.bills_df.at[idx, "paid_amount"] = new_paid

        # إعادة احتساب الحالة بناءً على المبالغ المسددة الفعلية
        if new_paid >= total_bill:
            self.db.bills_df.at[idx, "status"] = "مدفوع"
        elif new_paid > 0:
            self.db.bills_df.at[idx, "status"] = "مدفوع جزئياً"
        else:
            self.db.bills_df.at[idx, "status"] = "غير مدفوع"

        # تسجيل حركة تدقيق
        self.db.add_audit_log(
            action="تسجيل سداد دفعة",
            table_name="bills",
            record_id=bill_id,
            details=f"تم تسجيل سداد مبلغ {amount} ر.ي للفاتورة {bill_id}. إجمالي المدفوع: {new_paid}/{total_bill} ر.ي. الحالة الجديدة: {self.db.bills_df.at[idx, 'status']}"
        )

        # إضافة إشعار داخلي
        self.db.add_notification(
            tenant_id=tenant_id,
            title="تأكيد استلام دفعة مالية",
            message=f"نشكرك على السداد، تم استلام مبلغ {amount} ر.ي بنجاح للفاتورة رقم {bill_id}."
        )

        # حفظ التعديلات
        self.db.save_data()
        print(f"[منطق الأعمال] تم تحديث الدفع للفاتورة {bill_id}: تم دفع {amount} ر.ي. الإجمالي المحصل: {new_paid}/{total_bill} ر.ي. الحالة: {self.db.bills_df.at[idx, 'status']}")
        return True

    def add_advance_payment(self, tenant_id, amount, notes=""):
        """
        تسجيل دفعة مقدمة من المستأجر وحفظها آلياً مع تحديث رصيده المسبق وتوثيق لوج تدقيق.
        """
        payment_date = datetime.now().strftime("%Y-%m-%d")
        payment_id = self.db.add_advance_payment(tenant_id, amount, payment_date, notes)
        if payment_id:
            # تنبيه المستأجر
            self.db.add_notification(
                tenant_id=tenant_id,
                title="إيداع رصيد مقدم",
                message=f"تم إيداع مبلغ {amount} ر.ي كدفعة مقدمة في رصيدك الخاص بنجاح."
            )
            return payment_id
        return None

    def archive_bill(self, bill_id):
        """
        تفعيل الجمود المحاسبي لفاتورة معينة (أرشفة الفاتورة).
        يمنع أي تعديل مستقبلي على قيمها أو حالتها أو حذفها.
        """
        bill_id = str(bill_id)
        bill_index = self.db.bills_df[self.db.bills_df["bill_id"] == bill_id].index
        if bill_index.empty:
            print(f"[خطأ] الفاتورة {bill_id} غير موجودة لغرض الأرشفة.")
            return False

        idx = bill_index[0]
        if int(self.db.bills_df.at[idx, "is_deleted"]) == 1:
            print(f"[خطأ] لا يمكن أرشفة فاتورة محذوفة.")
            return False

        self.db.bills_df.at[idx, "is_archived"] = 1
        
        # تسجيل لوج التدقيق
        self.db.add_audit_log(
            action="أرشفة فاتورة (جمود محاسبي)",
            table_name="bills",
            record_id=bill_id,
            details=f"تم إغلاق الفاتورة {bill_id} وأرشفتها بنجاح. يمنع تعديل البيانات أو المبالغ المدفوعة عليها بدءاً من الآن."
        )

        self.db.save_data()
        print(f"[منطق الأعمال] تم تفعيل الجمود المحاسبي وأرشفة الفاتورة {bill_id} بنجاح.")
        return True

    def calculate_shared_expense_share(self):
        """
        حساب حصة الشقة الواحدة من إجمالي المصاريف المشتركة للشهر الحالي.
        المعادلة: إجمالي المصاريف المشتركة من الإعدادات / عدد المستأجرين النشطين (غير محذوفين وغير ملغيين).
        """
        # 1. جلب إجمالي المصاريف من الإعدادات
        if len(self.db.settings_df) == 0:
            return 0.0
            
        total_expenses = float(self.db.settings_df["total_shared_expenses"].values[0]) if "total_shared_expenses" in self.db.settings_df.columns else 0.0
        if total_expenses <= 0:
            return 0.0

        # 2. جلب المستأجرين النشطين (occupied apartments)
        active_tenants_count = len(self.db.tenants_df[
            (self.db.tenants_df["status"] != "ملغى") & 
            (self.db.tenants_df["is_deleted"] == 0)
        ])

        if active_tenants_count == 0:
            return 0.0

        # 3. حساب الحصة بالتساوي
        share = round(total_expenses / active_tenants_count, 2)
        return share

    def apply_advance_balance(self, tenant_id, total_amount):
        """
        معالجة الدفعات المقدمة وتطبيقها تلقائياً لتسوية أو خفض قيمة الفواتير الجديدة.
        تُرجع: (المبلغ المتبقي المفوتر، المبلغ المخصوم من الرصيد المقدم)
        """
        tenant_id = str(tenant_id)
        total_amount = float(total_amount)
        
        idx = self.db.tenants_df[(self.db.tenants_df["tenant_id"] == tenant_id) & (self.db.tenants_df["is_deleted"] == 0)].index
        if idx.empty:
            return total_amount, 0.0

        current_balance = float(self.db.tenants_df.at[idx[0], "advance_balance"])
        if current_balance <= 0:
            return total_amount, 0.0

        applied_advance = 0.0
        if current_balance >= total_amount:
            # الرصيد يغطي كامل الفاتورة
            applied_advance = total_amount
            new_total = 0.0
            new_balance = round(current_balance - total_amount, 2)
        else:
            # الرصيد يغطي جزء من الفاتورة
            applied_advance = current_balance
            new_total = round(total_amount - current_balance, 2)
            new_balance = 0.0

        # تحديث رصيد المستأجر
        self.db.tenants_df.at[idx[0], "advance_balance"] = new_balance
        
        # لوج تدقيق الحركة
        tenant_name = self.db.tenants_df.at[idx[0], "name"]
        self.db.add_audit_log(
            action="تطبيق دفع مسبق",
            table_name="tenants",
            record_id=tenant_id,
            details=f"تم تطبيق مبلغ {applied_advance} ر.ي من رصيد الدفعات المقدمة للمستأجر {tenant_name} لتسوية الفاتورة. الرصيد المتبقي: {new_balance} ر.ي."
        )

        return new_total, applied_advance

    def issue_utility_bill(self, tenant_id, bill_type, current_reading, due_date=None):
        """
        إصدار فاتورة خدمات (كهرباء أو مياه) مع احتساب الاستهلاك الفعلي وتطبيق المصاريف المشتركة والدفع المقدم والمتأخرات آلياً.
        """
        tenant_id = str(tenant_id)
        # 1. التحقق من وجود المستأجر
        tenant = self.db.tenants_df[(self.db.tenants_df["tenant_id"] == tenant_id) & (self.db.tenants_df["is_deleted"] == 0)]
        if tenant.empty:
            print(f"[خطأ] المستأجر بالمعرف {tenant_id} غير موجود في طبقة البيانات أو محذوف.")
            return None

        tenant_name = tenant["name"].values[0]
        
        # 2. جلب القراءة السابقة لتحديد الاستهلاك
        prev_readings = self.db.readings_df[
            (self.db.readings_df["tenant_id"] == tenant_id) & 
            (self.db.readings_df["bill_type"] == bill_type) &
            (self.db.readings_df["is_deleted"] == 0)
        ]
        
        prev_value = 0.0
        if not prev_readings.empty:
            # ترتيب القراءات حسب التاريخ وجلب الأحدث
            prev_readings_sorted = prev_readings.sort_values(by="reading_date", ascending=False)
            prev_value = float(prev_readings_sorted["reading_value"].values[0])

        # 3. احتساب الاستهلاك والتعرفة
        consumption = max(0.0, float(current_reading) - prev_value)
        rate = 0.0
        if bill_type == "كهرباء":
            rate = float(self.db.settings_df["electricity_rate"].values[0])
        elif bill_type == "مياه":
            rate = float(self.db.settings_df["water_rate"].values[0])
        else:
            rate = 1.0

        raw_amount = consumption * rate
        
        # 4. احتساب الديون والمتأخرات السابقة المتراكمة
        arrears = self.calculate_arrears(tenant_id)

        # 5. احتساب رسوم الخدمات المشتركة + المصاريف المشتركة الموزعة
        target_month = datetime.now().strftime("%Y-%m") if not due_date else due_date[:7]
        
        # التحقق مما إذا صدرت له أي فاتورة في هذا الشهر تحتوي على رسوم خدمات مشتركة
        tenant_bills_this_month = self.db.bills_df[
            (self.db.bills_df["tenant_id"] == tenant_id) & 
            (self.db.bills_df["due_date"].astype(str).str.startswith(target_month)) &
            (self.db.bills_df["is_deleted"] == 0)
        ]
        
        already_charged = False
        if not tenant_bills_this_month.empty:
            if "service_charges" in tenant_bills_this_month.columns:
                already_charged = (tenant_bills_this_month["service_charges"] > 0).any()

        service_charges = 0.0
        if not already_charged:
            service_charges = float(self.db.settings_df["monthly_service_fee"].values[0]) if "monthly_service_fee" in self.db.settings_df.columns else 80.0
        
        # إضافة المصاريف المشتركة الموزعة تلقائياً
        shared_expense_share = self.calculate_shared_expense_share()

        # 6. احتساب المجموع الكلي مع الإضافات قبل تطبيق الرصيد المقدم
        initial_total = raw_amount + service_charges + arrears + shared_expense_share

        # 7. تطبيق رصيد الدفع المقدم تلقائياً (Advanced Rent Tracking)
        final_total, applied_advance = self.apply_advance_balance(tenant_id, initial_total)

        # 8. توليد رقم فاتورة تلقائي ورقم قراءة تلقائي
        bill_id = f"B{100 + len(self.db.bills_df) + 1}"
        reading_id = f"R{100 + len(self.db.readings_df) + 1}"

        # 9. تسجيل القراءة الجديدة في جدول القراءات
        new_reading = {
            "reading_id": reading_id,
            "tenant_id": tenant_id,
            "bill_type": bill_type,
            "reading_value": float(current_reading),
            "reading_date": datetime.now().strftime("%Y-%m-%d"),
            "is_deleted": 0
        }
        self.db.readings_df = pd.concat([self.db.readings_df, pd.DataFrame([new_reading])], ignore_index=True)

        # 10. تسجيل الفاتورة الجديدة في جدول الفواتير
        if not due_date:
            due_date = datetime.now().strftime("%Y-%m-05")

        # الفاتورة تعتبر مدفوعة تلقائياً إذا غطاها الرصيد المقدم بالكامل
        status = "غير مدفوع"
        paid_amount = 0.0
        if final_total <= 0:
            status = "مدفوع"
            paid_amount = initial_total

        new_bill = {
            "bill_id": bill_id,
            "tenant_id": tenant_id,
            "bill_type": bill_type,
            "amount": round(raw_amount, 2),
            "arrears": round(arrears, 2),
            "service_charges": round(service_charges, 2),
            "total": round(initial_total, 2), # نحفظ المجموع الكلي الأساسي لشفافية الحسابات
            "due_date": due_date,
            "status": status,
            "paid_amount": round(paid_amount, 2),
            "shared_expense_share": round(shared_expense_share, 2),
            "applied_advance": round(applied_advance, 2),
            "is_archived": 0,
            "is_deleted": 0
        }
        self.db.bills_df = pd.concat([self.db.bills_df, pd.DataFrame([new_bill])], ignore_index=True)

        # 11. تسجيل حركة تدقيق وإشعار
        self.db.add_audit_log(
            action="إصدار فاتورة خدمات",
            table_name="bills",
            record_id=bill_id,
            details=f"تم إصدار فاتورة خدمات {bill_type} للمستأجر {tenant_name} بقيمة {initial_total} ر.ي. تم تطبيق رصيد دفعات مقدمة بقيمة {applied_advance} ر.ي. المبلغ المطلوب سداده: {final_total} ر.ي."
        )

        self.db.add_notification(
            tenant_id=tenant_id,
            title=f"فاتورة خدمات جديدة: {bill_type}",
            message=f"صدرت فاتورة {bill_type} جديدة لك بقيمة {initial_total} ر.ي. المستحق للدفع حالياً: {final_total} ر.ي بعد خصم الدفع المسبق."
        )

        # 12. حفظ وتأمين البيانات
        self.db.save_data()
        
        print(f"[منطق الأعمال] تم إصدار فاتورة '{bill_type}' بنجاح للعميل {tenant_name} بقيمة {new_bill['total']} ر.ي (رصيد مقدم مطبق: {applied_advance} ر.ي).")
        return bill_id

    def find_unissued_bills(self):
        """
        التحقق من الفواتير غير الصادرة للمستأجرين النشطين في الشهر الحالي.
        """
        if len(self.db.tenants_df) == 0:
            return []

        active_tenants = self.db.tenants_df[(self.db.tenants_df["status"] != "ملغى") & (self.db.tenants_df["is_deleted"] == 0)]
        unissued = []
        
        now = datetime.now()
        current_year_month = now.strftime("%Y-%m")

        for _, tenant in active_tenants.iterrows():
            t_id = str(tenant["tenant_id"])
            
            # تصفية فواتير هذا المستأجر في الشهر الحالي وغير محذوفة
            tenant_bills = self.db.bills_df[(self.db.bills_df["tenant_id"] == t_id) & (self.db.bills_df["is_deleted"] == 0)]
            
            has_bill_this_month = False
            if not tenant_bills.empty:
                has_bill_this_month = tenant_bills["due_date"].astype(str).str.startswith(current_year_month).any()
            
            if not has_bill_this_month:
                unissued.append({
                    "tenant_id": t_id,
                    "name": tenant["name"],
                    "apartment_number": tenant["apartment_number"],
                    "status": f"لم تصدر له فاتورة لشهر {current_year_month}"
                })

        return unissued

    def generate_monthly_report(self):
        """
        إنشاء تقرير مالي وإحصائي شهري شامل مع استبعاد السجلات المحذوفة ناعماً.
        """
        active_bills = self.db.bills_df[self.db.bills_df["is_deleted"] == 0]
        
        if len(active_bills) == 0:
            return {
                "total_invoiced": 0.0,
                "collected_amount": 0.0,
                "pending_amount": 0.0,
                "paid_bills_count": 0,
                "unpaid_bills_count": 0,
                "partial_bills_count": 0
            }

        total_invoiced = float(active_bills["total"].sum())
        collected_amount = float(active_bills["paid_amount"].sum())
        pending_amount = max(0.0, total_invoiced - collected_amount)

        paid_bills_count = len(active_bills[active_bills["status"] == "مدفوع"])
        unpaid_bills_count = len(active_bills[active_bills["status"] == "غير مدفوع"])
        partial_bills_count = len(active_bills[active_bills["status"] == "مدفوع جزئياً"])

        report = {
            "total_invoiced": round(total_invoiced, 2),
            "collected_amount": round(collected_amount, 2),
            "pending_amount": round(pending_amount, 2),
            "paid_bills_count": paid_bills_count,
            "unpaid_bills_count": unpaid_bills_count,
            "partial_bills_count": partial_bills_count
        }
        return report

    def issue_monthly_bills(self, year, month, readings_dict):
        """
        آلية الإصدار الشهري الموحد (دورة الفوترة الشهرية) مع احتساب المصاريف المشتركة والدفع المقدم والتأمين تلقائياً.
        """
        if len(self.db.tenants_df) == 0:
            print("[تنبيه] لا يوجد مستأجرين لإصدار فواتير لهم.")
            return []

        active_tenants = self.db.tenants_df[(self.db.tenants_df["status"] != "ملغى") & (self.db.tenants_df["is_deleted"] == 0)]
        issued_bill_ids = []
        due_date = f"{year:04d}-{month:02d}-05"

        # حساب المصاريف المشتركة بالتساوي
        shared_expense_share = self.calculate_shared_expense_share()
        service_fee = float(self.db.settings_df["monthly_service_fee"].values[0]) if "monthly_service_fee" in self.db.settings_df.columns else 80.0

        for _, tenant in active_tenants.iterrows():
            tenant_id = str(tenant["tenant_id"])
            tenant_name = tenant["name"]

            # جلب قراءة هذا المستأجر من القاموس
            tenant_reading_data = readings_dict.get(tenant_id, None)
            if tenant_reading_data is None:
                print(f"[تنبيه دورة الفوترة] لا تتوفر قراءات مسجلة للمستأجر {tenant_name} ({tenant_id})، سيتم تخطيه.")
                continue

            services = {}
            if isinstance(tenant_reading_data, dict):
                services = tenant_reading_data
            else:
                services = {"كهرباء": float(tenant_reading_data)}

            raw_amount = 0.0
            consumption_details = []

            for bill_type, current_reading in services.items():
                current_reading = float(current_reading)
                # جلب القراءة السابقة لتحديد الاستهلاك
                prev_readings = self.db.readings_df[
                    (self.db.readings_df["tenant_id"] == tenant_id) & 
                    (self.db.readings_df["bill_type"] == bill_type) &
                    (self.db.readings_df["is_deleted"] == 0)
                ]
                
                prev_value = 0.0
                if not prev_readings.empty:
                    prev_readings_sorted = prev_readings.sort_values(by="reading_date", ascending=False)
                    prev_value = float(prev_readings_sorted["reading_value"].values[0])

                consumption = max(0.0, current_reading - prev_value)
                
                rate = 0.0
                if bill_type == "كهرباء":
                    rate = float(self.db.settings_df["electricity_rate"].values[0]) if "electricity_rate" in self.db.settings_df.columns else 0.18
                elif bill_type == "مياه":
                    rate = float(self.db.settings_df["water_rate"].values[0]) if "water_rate" in self.db.settings_df.columns else 2.50
                else:
                    rate = 1.0

                service_cost = consumption * rate
                raw_amount += service_cost
                consumption_details.append(f"{bill_type}: {consumption} وحدة بقيمة {service_cost:.2f} ر.ي")

                # تسجيل القراءة
                reading_id = f"R{100 + len(self.db.readings_df) + 1}"
                new_reading = {
                    "reading_id": reading_id,
                    "tenant_id": tenant_id,
                    "bill_type": bill_type,
                    "reading_value": current_reading,
                    "reading_date": f"{year:04d}-{month:02d}-28",
                    "is_deleted": 0
                }
                self.db.readings_df = pd.concat([self.db.readings_df, pd.DataFrame([new_reading])], ignore_index=True)

            # المجموع الأساسي للفاتورة الموحدة
            arrears = self.calculate_arrears(tenant_id)
            total_invoice_cost = raw_amount + arrears + service_fee + shared_expense_share

            # تطبيق رصيد الدفعات المقدمة تلقائياً
            final_invoice_cost, applied_advance = self.apply_advance_balance(tenant_id, total_invoice_cost)

            status = "غير مدفوع"
            paid_amount = 0.0
            if final_invoice_cost <= 0:
                status = "مدفوع"
                paid_amount = total_invoice_cost

            # توليد معرف الفاتورة
            bill_id = f"B{100 + len(self.db.bills_df) + 1}"

            # إنشاء الفاتورة الموحدة
            new_bill = {
                "bill_id": bill_id,
                "tenant_id": tenant_id,
                "bill_type": "فاتورة شهرية شاملة",
                "amount": round(raw_amount, 2),
                "arrears": round(arrears, 2),
                "service_charges": round(service_fee, 2),
                "total": round(total_invoice_cost, 2),
                "due_date": due_date,
                "status": status,
                "paid_amount": round(paid_amount, 2),
                "shared_expense_share": round(shared_expense_share, 2),
                "applied_advance": round(applied_advance, 2),
                "is_archived": 0,
                "is_deleted": 0
            }
            self.db.bills_df = pd.concat([self.db.bills_df, pd.DataFrame([new_bill])], ignore_index=True)
            issued_bill_ids.append(bill_id)
            
            # تسجيل لوج والتدقيق
            self.db.add_audit_log(
                action="دورة الفوترة الشهرية",
                table_name="bills",
                record_id=bill_id,
                details=f"تم إصدار الفاتورة الموحدة {bill_id} للمستأجر {tenant_name} بقيمة {total_invoice_cost} ر.ي تشمل {shared_expense_share} ر.ي مصاريف مشتركة. رصيد مقدم مطبق: {applied_advance} ر.ي."
            )

            self.db.add_notification(
                tenant_id=tenant_id,
                title="صدور الفاتورة الشهرية الموحدة",
                message=f"تم إصدار فاتورتك الموحدة لشهر {month}/{year} بقيمة {total_invoice_cost} ر.ي. المطلوب للدفع: {final_invoice_cost} ر.ي."
            )

            detail_str = " | ".join(consumption_details)
            print(f"[دورة الفوترة] تم إصدار الفاتورة الموحدة {bill_id} بقيمة {total_invoice_cost} ر.ي للمستأجر {tenant_name}.")

        self.db.save_data()
        return issued_bill_ids

    # دوال الحذف الناعم المباشرة لمنطق الأعمال
    def soft_delete_tenant(self, tenant_id):
        """
        حذف مستأجر حذفاً ناعماً.
        """
        return self.db.soft_delete_record("tenants", "tenant_id", tenant_id)

    def soft_delete_bill(self, bill_id):
        """
        حذف فاتورة حذفاً ناعماً (إذا لم تكن مؤرشفة).
        """
        return self.db.soft_delete_record("bills", "bill_id", bill_id)

    def soft_delete_reading(self, reading_id):
        """
        حذف قراءة عداد حذفاً ناعماً.
        """
        return self.db.soft_delete_record("readings", "reading_id", reading_id)
