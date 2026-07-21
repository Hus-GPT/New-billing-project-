import { Tenant, Bill, MeterReading, PriceSettings } from './types';

export const initialTenants: Tenant[] = [
  { tenant_id: 'T101', name: 'أحمد العتيبي', phone: '0501112222', unit_number: 'A1', rent_amount: 2500.0, status: 'نشط', join_date: '2026-01-01' },
  { tenant_id: 'T102', name: 'سارة الشمري', phone: '0503334444', unit_number: 'B3', rent_amount: 3200.0, status: 'نشط', join_date: '2026-02-15' },
  { tenant_id: 'T103', name: 'خالد الدوسري', phone: '0555556666', unit_number: 'C5', rent_amount: 1800.0, status: 'نشط', join_date: '2026-03-10' },
  { tenant_id: 'T104', name: 'فاطمة الغامدي', phone: '0507778888', unit_number: 'D2', rent_amount: 2900.0, status: 'نشط مؤقتاً', join_date: '2026-05-01' }
];

export const initialMeterReadings: MeterReading[] = [
  // قراءات شهر مايو 2026 (تأسيسية كقراءة بداية)
  { reading_id: 'R001', tenant_id: 'T101', reading_month: '2026-05', electricity_reading: 1200.0, water_reading: 340.0, reading_date: '2026-05-30' },
  { reading_id: 'R002', tenant_id: 'T102', reading_month: '2026-05', electricity_reading: 4500.0, water_reading: 980.0, reading_date: '2026-05-30' },
  { reading_id: 'R003', tenant_id: 'T103', reading_month: '2026-05', electricity_reading: 800.0,  water_reading: 150.0, reading_date: '2026-05-30' },
  
  // قراءات شهر يونيو 2026 (الاستهلاك الفعلي)
  { reading_id: 'R004', tenant_id: 'T101', reading_month: '2026-06', electricity_reading: 1550.0, water_reading: 365.0, reading_date: '2026-06-29' },
  { reading_id: 'R005', tenant_id: 'T102', reading_month: '2026-06', electricity_reading: 4980.0, water_reading: 1012.0, reading_date: '2026-06-29' },
  { reading_id: 'R006', tenant_id: 'T103', reading_month: '2026-06', electricity_reading: 1120.0, water_reading: 178.0, reading_date: '2026-06-29' },
  { reading_id: 'R007', tenant_id: 'T104', reading_month: '2026-06', electricity_reading: 100.0,  water_reading: 25.0,  reading_date: '2026-06-29' }
];

export const initialBills: Bill[] = [
  {
    bill_id: 'B001', tenant_id: 'T101', billing_month: '2026-06', rent_bill: 2500.0,
    electricity_bill: 63.0, water_bill: 62.5, previous_arrears: 0.0,
    total_amount: 2625.5, payment_status: 'مدفوع', issue_date: '2026-07-01'
  },
  {
    bill_id: 'B002', tenant_id: 'T102', billing_month: '2026-06', rent_bill: 3200.0,
    electricity_bill: 86.4, water_bill: 80.0, previous_arrears: 1500.0,
    total_amount: 4786.4, payment_status: 'غير مدفوع', issue_date: '2026-07-01'
  },
  {
    bill_id: 'B003', tenant_id: 'T103', billing_month: '2026-06', rent_bill: 1800.0,
    electricity_bill: 57.6, water_bill: 70.0, previous_arrears: 0.0,
    total_amount: 1927.6, payment_status: 'مدفوع جزئياً', issue_date: '2026-07-01'
  }
];

export const initialPriceSettings: PriceSettings = {
  electricity_rate: 0.18,
  water_rate: 2.5,
  tax_rate: 0.05,
  last_update: '2026-07-20 14:15:00'
};

export const dataLayerCode = `# -*- coding: utf-8 -*-
"""
ملف: data_layer.py
الوصف: طبقة البيانات (Data Layer) لنظام إدارة العقارات في Google Colab.
يقوم هذا الملف بإدارة 4 مجموعات بيانات أساسية باستخدام مكتبة Pandas:
1. المستأجرين (Tenants)
2. الفواتير (Bills)
3. قراءات العدادات (Meter Readings)
4. إعدادات الأسعار (Price Settings)

يتضمن كود الأرشفة المباشر (CSV) والتحقق التلقائي والتعافي من الأخطاء في حال فقدان الملفات.
"""

import os
import pandas as pd
from datetime import datetime

class DataLayer:
    def __init__(self, archive_dir="real_estate_archive"):
        """
        تهيئة طبقة البيانات وتحديد مجلد الأرشفة لملفات CSV.
        """
        self.archive_dir = archive_dir
        
        # أسماء ملفات الأرشفة لكل جدول
        self.files = {
            "tenants": os.path.join(archive_dir, "tenants.csv"),
            "bills": os.path.join(archive_dir, "bills.csv"),
            "meter_readings": os.path.join(archive_dir, "meter_readings.csv"),
            "price_settings": os.path.join(archive_dir, "price_settings.csv")
        }
        
        # الحقول والمجموعات الأساسية في الذاكرة (DataFrames)
        self.tenants_df = None
        self.bills_df = None
        self.meter_readings_df = None
        self.price_settings_df = None
        
        # تهيئة البيانات تلقائياً
        self.initialize_data()

    def initialize_data(self, force_fresh=False):
        """
        تهيئة البيانات. إذا كانت ملفات الأرشيف موجودة يتم تحميلها،
        وإلا يتم إنشاء جداول افتراضية فارغة أو إعدادات قياسية تلقائياً للتعافي من الأخطاء.
        """
        if not os.path.exists(self.archive_dir):
            try:
                os.makedirs(self.archive_dir)
                print(f"[معلومات] تم إنشاء مجلد الأرشفة الجديد: '{self.archive_dir}'")
            except Exception as e:
                print(f"[تحذير] تعذر إنشاء المجلد '{self.archive_dir}': {e}. سيتم العمل في الذاكرة فقط.")

        # 1. تهيئة المستأجرين (Tenants)
        if not force_fresh and os.path.exists(self.files["tenants"]):
            try:
                self.tenants_df = pd.read_csv(self.files["tenants"])
                self.tenants_df["tenant_id"] = self.tenants_df["tenant_id"].astype(str)
            except Exception as e:
                print(f"[خطأ] تعذر قراءة أرشيف المستأجرين: {e}. سيتم إنشاء جدول فارغ.")
                self._create_empty_tenants()
        else:
            self._create_empty_tenants()

        # 2. تهيئة الفواتير (Bills)
        if not force_fresh and os.path.exists(self.files["bills"]):
            try:
                self.bills_df = pd.read_csv(self.files["bills"])
                self.bills_df["bill_id"] = self.bills_df["bill_id"].astype(str)
                self.bills_df["tenant_id"] = self.bills_df["tenant_id"].astype(str)
            except Exception as e:
                print(f"[خطأ] تعذر قراءة أرشيف الفواتير: {e}. سيتم إنشاء جدول فارغ.")
                self._create_empty_bills()
        else:
            self._create_empty_bills()

        # 3. تهيئة قراءات العدادات (Meter Readings)
        if not force_fresh and os.path.exists(self.files["meter_readings"]):
            try:
                self.meter_readings_df = pd.read_csv(self.files["meter_readings"])
                self.meter_readings_df["reading_id"] = self.meter_readings_df["reading_id"].astype(str)
                self.meter_readings_df["tenant_id"] = self.meter_readings_df["tenant_id"].astype(str)
            except Exception as e:
                print(f"[خطأ] تعذر قراءة أرشيف العدادات: {e}. سيتم إنشاء جدول فارغ.")
                self._create_empty_meter_readings()
        else:
            self._create_empty_meter_readings()

        # 4. تهيئة إعدادات الأسعار (Price Settings)
        if not force_fresh and os.path.exists(self.files["price_settings"]):
            try:
                self.price_settings_df = pd.read_csv(self.files["price_settings"])
            except Exception as e:
                print(f"[خطأ] تعذر قراءة أرشيف إعدادات الأسعار: {e}. سيتم إنشاء قيم افتراضية.")
                self._create_default_price_settings()
        else:
            self._create_default_price_settings()

    def _create_empty_tenants(self):
        """إنشاء جدول مستأجرين فارغ مع تعريف الأعمدة ونوع البيانات."""
        columns = ["tenant_id", "name", "phone", "unit_number", "rent_amount", "status", "join_date"]
        self.tenants_df = pd.DataFrame(columns=columns)
        self.tenants_df = self.tenants_df.astype({
            "tenant_id": str, "name": str, "phone": str, 
            "unit_number": str, "rent_amount": float, "status": str, "join_date": str
        })

    def _create_empty_bills(self):
        """إنشاء جدول فواتير فارغ مع تعريف الأعمدة ونوع البيانات."""
        columns = [
            "bill_id", "tenant_id", "billing_month", "rent_bill", 
            "electricity_bill", "water_bill", "previous_arrears", 
            "total_amount", "payment_status", "issue_date"
        ]
        self.bills_df = pd.DataFrame(columns=columns)
        self.bills_df = self.bills_df.astype({
            "bill_id": str, "tenant_id": str, "billing_month": str,
            "rent_bill": float, "electricity_bill": float, "water_bill": float,
            "previous_arrears": float, "total_amount": float, "payment_status": str, "issue_date": str
        })

    def _create_empty_meter_readings(self):
        """إنشاء جدول قراءات عدادات فارغ."""
        columns = ["reading_id", "tenant_id", "reading_month", "electricity_reading", "water_reading", "reading_date"]
        self.meter_readings_df = pd.DataFrame(columns=columns)
        self.meter_readings_df = self.meter_readings_df.astype({
            "reading_id": str, "tenant_id": str, "reading_month": str,
            "electricity_reading": float, "water_reading": float, "reading_date": str
        })

    def _create_default_price_settings(self):
        """تهيئة إعدادات أسعار افتراضية للكهرباء والماء والضرائب."""
        data = {
            "setting_id": [1],
            "electricity_rate": [0.18],
            "water_rate": [2.5],
            "tax_rate": [0.05],
            "last_update": [datetime.now().strftime("%Y-%m-%d %H:%M:%S")]
        }
        self.price_settings_df = pd.DataFrame(data)

    def save_all(self):
        """أرشفة وحفظ كافة مجموعات البيانات الحالية إلى ملفات CSV."""
        if not os.path.exists(self.archive_dir):
            os.makedirs(self.archive_dir)
            
        try:
            self.tenants_df.to_csv(self.files["tenants"], index=False)
            self.bills_df.to_csv(self.files["bills"], index=False)
            self.meter_readings_df.to_csv(self.files["meter_readings"], index=False)
            self.price_settings_df.to_csv(self.files["price_settings"], index=False)
            print("[نجاح] تمت أرشفة جميع جداول البيانات وحفظها بنجاح كملفات CSV.")
            return True
        except Exception as e:
            print(f"[خطأ] فشلت عملية الأرشفة وحفظ الملفات: {e}")
            return False

    def load_demo_data(self):
        """
        استدعاء يدوي لشحن بيانات تجريبية (Demo Data) لتسهيل الفحص والتجربة والتحقق من النظام.
        """
        print("[عملية] جاري تحميل البيانات التجريبية اليدوية...")
        
        demo_tenants = [
            {"tenant_id": "T101", "name": "أحمد العتيبي", "phone": "0501112222", "unit_number": "A1", "rent_amount": 2500.0, "status": "نشط", "join_date": "2026-01-01"},
            {"tenant_id": "T102", "name": "سارة الشمري", "phone": "0503334444", "unit_number": "B3", "rent_amount": 3200.0, "status": "نشط", "join_date": "2026-02-15"},
            {"tenant_id": "T103", "name": "خالد الدوسري", "phone": "0555556666", "unit_number": "C5", "rent_amount": 1800.0, "status": "نشط", "join_date": "2026-03-10"},
            {"tenant_id": "T104", "name": "فاطمة الغامدي", "phone": "0507778888", "unit_number": "D2", "rent_amount": 2900.0, "status": "نشط مؤقتاً", "join_date": "2026-05-01"}
        ]
        self.tenants_df = pd.DataFrame(demo_tenants)
        
        demo_readings = [
            {"reading_id": "R001", "tenant_id": "T101", "reading_month": "2026-05", "electricity_reading": 1200.0, "water_reading": 340.0, "reading_date": "2026-05-30"},
            {"reading_id": "R002", "tenant_id": "T102", "reading_month": "2026-05", "electricity_reading": 4500.0, "water_reading": 980.0, "reading_date": "2026-05-30"},
            {"reading_id": "R003", "tenant_id": "T103", "reading_month": "2026-05", "electricity_reading": 800.0,  "water_reading": 150.0, "reading_date": "2026-05-30"},
            
            {"reading_id": "R004", "tenant_id": "T101", "reading_month": "2026-06", "electricity_reading": 1550.0, "water_reading": 365.0, "reading_date": "2026-06-29"},
            {"reading_id": "R005", "tenant_id": "T102", "reading_month": "2026-06", "electricity_reading": 4980.0, "water_reading": 1012.0, "reading_date": "2026-06-29"},
            {"reading_id": "R006", "tenant_id": "T103", "reading_month": "2026-06", "electricity_reading": 1120.0, "water_reading": 178.0, "reading_date": "2026-06-29"},
            {"reading_id": "R007", "tenant_id": "T104", "reading_month": "2026-06", "electricity_reading": 100.0,  "water_reading": 25.0,  "reading_date": "2026-06-29"}
        ]
        self.meter_readings_df = pd.DataFrame(demo_readings)

        demo_bills = [
            {
                "bill_id": "B001", "tenant_id": "T101", "billing_month": "2026-06", "rent_bill": 2500.0,
                "electricity_bill": 63.0, "water_bill": 62.5, "previous_arrears": 0.0,
                "total_amount": 2625.5, "payment_status": "مدفوع", "issue_date": "2026-07-01"
            },
            {
                "bill_id": "B002", "tenant_id": "T102", "billing_month": "2026-06", "rent_bill": 3200.0,
                "electricity_bill": 86.4, "water_bill": 80.0, "previous_arrears": 1500.0,
                "total_amount": 4786.4, "payment_status": "غير مدفوع", "issue_date": "2026-07-01"
            },
            {
                "bill_id": "B003", "tenant_id": "T103", "billing_month": "2026-06", "rent_bill": 1800.0,
                "electricity_bill": 57.6, "water_bill": 70.0, "previous_arrears": 0.0,
                "total_amount": 1927.6, "payment_status": "مدفوع جزئياً", "issue_date": "2026-07-01"
            }
        ]
        self.bills_df = pd.DataFrame(demo_bills)

        self.save_all()
        print("[نجاح] تم شحن البيانات التجريبية بنجاح وأرشفتها في ملفات CSV.")
`;
