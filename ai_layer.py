# -*- coding: utf-8 -*-
"""
ملف: ai_layer.py
الوصف: طبقة الذكاء الاصطناعي ومحاكاة قراءة العدادات الذكية (Smart OCR Simulator Layer).
يحتوي هذا الملف على:
1. دالة محاكاة قراءة العداد الرقمي من الصور والملفات المرفوعة لخدمة قراءة العداد الآلية.
2. آلية التحقق من منطقية القراءة المستخرجة ومقارنتها بالقراءات التاريخية لتفادي القفزات الكبيرة أو المدخلات الخاطئة.
"""

import random
from datetime import datetime

class AILayer:
    def __init__(self, data_layer=None):
        """
        تهيئة طبقة الذكاء الاصطناعي مع إمكانية ربطها بطبقة البيانات للتحقق الذكي.
        """
        self.db = data_layer

    def read_meter_from_image(self, image_path):
        """
        محاكاة استخراج قراءة العداد الرقمية من ملف صورة عبر تقنية التعرف الضوئي على الحروف (OCR).
        يمكن ترقية هذه الدالة مستقبلاً لترتبط بنموذج Gemini Vision API أو أي خدمة سحابية حقيقية.
        """
        print(f"[الذكاء الاصطناعي] جاري تحليل الصورة '{image_path}' واستخراج قراءة العداد...")
        
        # محاكاة زمن الاستجابة وقراءة قيمة عشوائية واقعية للعداد
        simulated_reading = random.randint(100, 1000)
        
        print(f"[الذكاء الاصطناعي] تم التعرف بنجاح على القراءة الرقمية من الصورة: {simulated_reading}")
        return float(simulated_reading)

    def validate_reading_logic(self, tenant_id, bill_type, current_reading):
        """
        دالة ذكية ومطورة للتحقق المالي والمنطقي من دقة القراءة المستخرجة.
        تقوم بـ:
        1. مقارنة القراءة الجديدة بآخر قراءة مسجلة لضمان عدم حدوث تراجع في قيمة العداد.
        2. حساب متوسط الاستهلاك الفعلي لآخر 3 فترات تاريخية لهذا المستأجر.
        3. التحقق من طفرة الاستهلاك ديناميكياً: إذا تجاوز الاستهلاك الجديد 200% من المتوسط، يتم رفض القراءة كطفرة استهلاك.
        4. في حال عدم وجود سجل كافٍ (أقل من 3 فترات)، يتم المقارنة بقيمة افتراضية من الإعدادات (max_spike_default = 2000).
        """
        if self.db is None:
            return True, "لم يتم ربط قاعدة البيانات للتحقق"

        # جلب القراءات السابقة لهذا المستأجر ونوع الخدمة
        prev_readings = self.db.readings_df[
            (self.db.readings_df["tenant_id"] == str(tenant_id)) & 
            (self.db.readings_df["bill_type"] == bill_type)
        ]

        if prev_readings.empty:
            return True, "قراءة أولى مقبولة تلقائياً (لا توجد قراءات سابقة للمقارنة)"

        # ترتيب القراءات حسب التاريخ تصاعدياً
        prev_readings_sorted = prev_readings.sort_values(by="reading_date", ascending=True)
        latest_value = float(prev_readings_sorted.iloc[-1]["reading_value"])

        # التحقق الأول: أن لا تكون القراءة الجديدة أقل من القراءة السابقة
        if current_reading < latest_value:
            return False, f"قراءة خاطئة! القراءة الجديدة ({current_reading}) أقل من القراءة المسجلة الأخيرة ({latest_value})."

        # حساب الاستهلاك المقترح الجديد
        consumption_spike = current_reading - latest_value

        # حساب الاستهلاكات التاريخية السابقة بين كل قراءتين متتاليتين
        history_values = prev_readings_sorted["reading_value"].astype(float).tolist()
        historical_consumptions = []
        for i in range(1, len(history_values)):
            historical_consumptions.append(history_values[i] - history_values[i-1])

        # جلب القيمة الافتراضية للحد الأقصى للطفرة من الإعدادات
        if "max_spike_default" in self.db.settings_df.columns:
            max_spike_default = float(self.db.settings_df["max_spike_default"].values[0])
        else:
            max_spike_default = 2000.0

        # التحقق الثاني: طفرة الاستهلاك (ديناميكي)
        if len(historical_consumptions) >= 3:
            # حساب متوسط الاستهلاك لآخر 3 فترات تاريخية
            last_3_consumptions = historical_consumptions[-3:]
            avg_consumption = sum(last_3_consumptions) / len(last_3_consumptions)
            
            # إذا كان متوسط الاستهلاك صفر، نعتمد على الحد الافتراضي لتجنب القسمة على صفر أو التقييد المجحف
            if avg_consumption > 0:
                # الزيادة بنسبة 200% تعني أن الاستهلاك المقترح يتجاوز ضعف المتوسط (أي consumption_spike > 2 * avg_consumption)
                if consumption_spike > 2.0 * avg_consumption:
                    return False, f"تنبيه استهلاك غير طبيعي (ديناميكي)! الاستهلاك الحالي ({consumption_spike}) يتجاوز 200% من متوسط استهلاكك التاريخي البالغ ({avg_consumption:.2f}) وحدة."
            else:
                if consumption_spike > max_spike_default:
                    return False, f"تنبيه استهلاك غير طبيعي! الاستهلاك الحالي ({consumption_spike}) يتجاوز الحد الافتراضي المسموح به ({max_spike_default}) وحدة."
        else:
            # عدم وجود قراءات تاريخية كافية (أقل من 3 فترات) -> استخدام القيمة الافتراضية المقيدة
            if consumption_spike > max_spike_default:
                return False, f"تنبيه استهلاك غير طبيعي (عدم كفاية بيانات تاريخية)! الاستهلاك الحالي ({consumption_spike}) يتجاوز الحد الافتراضي المسموح به ({max_spike_default}) وحدة."

        return True, "القراءة منطقية ومطابقة للضوابط التشغيلية والديناميكية."
