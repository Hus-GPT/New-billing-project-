# -*- coding: utf-8 -*-
"""
ملف: presentation_layer.py
الوصف: طبقة العرض والواجهات (Presentation Layer) لنظام إدارة العقارات.
يقوم هذا الملف بـ:
1. دمج جدول الفواتير (bills_df) وجدول المستأجرين (tenants_df) للحصول على بيانات متكاملة.
2. تحويل البيانات المدمجة إلى صيغة JSON مع الحفاظ على الأحرف العربية.
3. قراءة قالب HTML العصري (template.html).
4. استبدال علامة المكان بالبيانات الفعلية وعرض الواجهة في بيئة Google Colab باستخدام IPython HTML.
"""

import os
import json
import pandas as pd

class PresentationLayer:
    def __init__(self, data_layer):
        """
        تهيئة طبقة العرض بربطها بطبقة البيانات الأساسية لجلب الجداول وتحديثها.
        """
        self.db = data_layer
        self.template_path = "template.html"

    def render_dashboard(self):
        """
        دمج البيانات، حقنها في قالب HTML، وعرض لوحة التحكم التفاعلية للمستخدم في Google Colab.
        """
        # 1. دمج جداول البيانات
        if len(self.db.bills_df) == 0:
            merged_list = []
        else:
            # التحقق من وجود مستأجرين للدمج معهم
            if len(self.db.tenants_df) > 0:
                # نسخ الجداول لتجنب التعديل المباشر على الأرشيف الأساسي
                bills_cp = self.db.bills_df.copy()
                tenants_cp = self.db.tenants_df.copy()
                
                # دمج الفواتير مع المستأجرين بناءً على معرف المستأجر (tenant_id)
                merged_df = pd.merge(
                    bills_cp, 
                    tenants_cp[["tenant_id", "name", "apartment_number"]], 
                    on="tenant_id", 
                    how="left"
                )
                
                # إعادة تسمية الأعمدة لتناسب الواجهة التفاعلية
                merged_df = merged_df.rename(columns={"name": "tenant_name"})
                
                # تعبئة القيم المفقودة بقيم افتراضية لتفادي أخطاء الجافا سكريبت
                merged_df["tenant_name"] = merged_df["tenant_name"].fillna("مستأجر غير معروف")
                merged_df["apartment_number"] = merged_df["apartment_number"].fillna("-")
                
                # تحويل الجدول المدمج إلى قائمة من القواميس البرمجية (dicts)
                merged_list = merged_df.to_dict(orient="records")
            else:
                # في حال عدم وجود مستأجرين، تحويل الفواتير مباشرة مع حقول فارغة للمستأجر
                bills_cp = self.db.bills_df.copy()
                bills_cp["tenant_name"] = "لا يوجد مستأجر"
                bills_cp["apartment_number"] = "-"
                merged_list = bills_cp.to_dict(orient="records")

        # 2. تحويل البيانات إلى JSON يدعم اللغة العربية تماماً
        bills_json = json.dumps(merged_list, ensure_ascii=False)

        # 3. قراءة قالب HTML التفاعلي المخصص
        if not os.path.exists(self.template_path):
            print(f"[خطأ] تعذر العثور على ملف القالب المرئي: {self.template_path}")
            return None

        with open(self.template_path, "r", encoding="utf-8") as f:
            html_content = f.read()

        # 4. حقن بيانات JSON في قالب الواجهة
        html_content = html_content.replace("{{BILLS_JSON}}", bills_json)

        # 5. عرض لوحة التحكم التفاعلية باستخدام IPython في بيئة Colab / Jupyter
        try:
            from IPython.display import HTML, display
            display(HTML(html_content))
            print("[نجاح] تم عرض لوحة تحكم سند التفاعلية بنجاح داخل الخلية.")
        except ImportError:
            # الدعم البديل في حال التشغيل خارج بيئة Colab/Jupyter (حفظ كملف محلي للمعاينة)
            output_file = "dashboard_preview.html"
            with open(output_file, "w", encoding="utf-8") as out:
                out.write(html_content)
            print(f"[معلومات] تم حفظ لوحة التحكم كملف مستقل للمعاينة في المتصفح: {output_file}")

        return html_content
