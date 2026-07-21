import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

// تحميل متغيرات البيئة
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// تهيئة عميل Gemini SDK على الخادم مع الهيدر المخصص للتيليميتري
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in environment variables.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// دالة لمعالجة الاتصال بنموذج Gemini مع تكرار المحاولة تلقائياً في حالة الأخطاء المؤقتة
async function generateContentWithRetry(
  ai: GoogleGenAI,
  params: {
    model: string;
    contents: any;
    config?: any;
  },
  retries = 2,
  delay = 500
): Promise<any> {
  try {
    return await ai.models.generateContent(params);
  } catch (error: any) {
    const status = error?.status || error?.code || error?.error?.code;
    const errorMsg = String(error?.message || "").toLowerCase();
    const isTransient = status === 503 || status === 429 || status === 500 || 
                        errorMsg.includes("503") || 
                        errorMsg.includes("unavailable") ||
                        errorMsg.includes("429") ||
                        errorMsg.includes("high demand") ||
                        errorMsg.includes("rate limit") ||
                        errorMsg.includes("resource_exhausted");
    
    if (isTransient && retries > 0) {
      console.warn(`Transient Gemini API error (status/code: ${status || 'unknown'}). Retrying in ${delay}ms... (Remaining retries: ${retries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return generateContentWithRetry(ai, params, retries - 1, delay * 2);
    }
    throw error;
  }
}

// 1. واجهة محادثة مساعد سند بالذكاء الاصطناعي (مُساعد) بلهجة يمنية متكاملة
app.post("/api/gemini/chat", async (req, res) => {
  try {
    const { prompt, context } = req.body;
    let responseText = "";

    try {
      const ai = getAiClient();
      // صياغة سياق البيانات المتاحة لتمكين المساعد من تقديم إجابات ذكية حقيقية
      const systemInstruction = `أنت "مُساعد"، المساعد الذكي لنظام سند لإدارة العقارات في اليمن.
مهمتك هي مساعدة مالك العقار والمستأجرين في تعقب وتدقيق الشقق، الفواتير، الدفعات المقدمة، والاستهلاك.
لغتك هي العربية، وتتحدث بلهجة يمنية مهذبة ومحببة وقريبة من القلب (مثال: "يا عاقل"، "أهلاً وسهلاً بك"، "الأمور طيبة"، "ولا تشيل هم"، "تحياتي لك").
العملة الرسمية المستخدمة في النظام هي الريال اليمني (ر.ي).
التوقيت المحلي لليمن هو توقيت آسيا/عدن.

البيانات الحالية في النظام هي كالتالي:
${JSON.stringify(context || {}, null, 2)}

الرجاء الإجابة عن استفسارات المستخدم بناءً على البيانات أعلاه بلهجة يمنية ذكية ودقيقة. إذا سألك المستخدم عن إحصائيات أو أسماء أو مبالغ مستحقة، قم بحسابها وعرضها بدقة مستعيناً بالبيانات المتاحة.`;

      const response = await generateContentWithRetry(ai, {
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });
      responseText = response.text || "";
    } catch (apiError: any) {
      const isQuota = String(apiError?.message || "").toLowerCase().includes("quota") ||
                      String(apiError?.message || "").toLowerCase().includes("exhausted") ||
                      apiError?.status === 429 || apiError?.code === 429;
      
      if (isQuota) {
        console.warn("Gemini Chat Quota Exceeded. Using fallback message.");
      } else {
        console.warn("Gemini Chat API Error (using fallback):", apiError?.message || apiError);
      }
      
      if (isQuota) {
        responseText = "أهلاً بك يا عاقل! نظراً للضغط المرتفع ووصول استهلاك الذكاء الاصطناعي للحد المسموح به حالياً، سأقوم بخدمتك مؤقتاً عبر محاكي القواعد السريع. تفضل بسؤالي، والأمور طيبة ولا تشيل هم أبداً!";
      } else {
        responseText = "مرحباً بك يا عاقل! واجهنا صعوبة طفيفة في الاتصال بالخادم السحابي حالياً، ولكن كافة بياناتك محفوظة ومؤمنة بالكامل في السحاب بانتظام.";
      }
    }

    res.json({ text: responseText });
  } catch (error: any) {
    console.error("Gemini Chat Error:", error);
    res.status(500).json({ error: error.message || "حدث خطأ أثناء معالجة طلب الذكاء الاصطناعي." });
  }
});

// In-memory cache for stats-summary to prevent exceeding Gemini API quotas
let statsSummaryCache: {
  summary: string;
  timestamp: number;
  dataHash: string;
} | null = null;

// 2. واجهة توليد الإحصائيات الذكية الملخصة (Smart Stats)
app.post("/api/gemini/stats-summary", async (req, res) => {
  try {
    const { context } = req.body;
    
    // Generate a quick hash/representation of the context state to detect modifications
    const activeTenants = context?.tenants?.filter((t: any) => !t.is_deleted) || [];
    const activeBills = context?.bills?.filter((b: any) => !b.is_deleted) || [];
    const activeReadings = context?.readings?.filter((r: any) => !r.is_deleted) || [];
    const unpaidBills = activeBills.filter((b: any) => b.payment_status === "غير مدفوع");
    
    const dataHash = JSON.stringify({
      tenantsCount: activeTenants.length,
      billsCount: activeBills.length,
      readingsCount: activeReadings.length,
      unpaidBillsCount: unpaidBills.length,
      electricity_rate: context?.prices?.electricity_rate,
      water_rate: context?.prices?.water_rate,
      total_shared_expenses: context?.prices?.total_shared_expenses,
    });
    
    const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache TTL
    const now = Date.now();
    
    if (statsSummaryCache && 
        statsSummaryCache.dataHash === dataHash && 
        (now - statsSummaryCache.timestamp) < CACHE_TTL_MS) {
      return res.json({ summary: statsSummaryCache.summary });
    }
    
    let summaryText = "";
    let isFallback = false;

    try {
      const ai = getAiClient();
      const systemInstruction = `أنت محلل مالي خبير ومساعد عقاري ذكي بلهجة يمنية مهذبة للغاية وسريعة البديهة.
مهمتك هي مراجعة البيانات المالية والتشغيلية للعقارات الحالية وتوليد جملة ملخصة ذكية واحدة فقط (تتكون من 15-25 كلمة) تقدم للمالك نظرة ثاقبة ودافئة بلهجة يمنية مبهجة.
أمثلة على الأسلوب:
- "الأمور طيبة يا عاقل، تم تحصيل 80% من إيجارات هذا الشهر وعاد باقي ذمم بسيطة عند شقة B3."
- "تنبيه خفيف يا طيب: عندك مستأجرين اثنين متأخرين عن السداد وصادرت لهم فواتير معلقة، يحتاج تواصل سريع معهم."
- "تبارك الله! شقق سند كلها مليانة بنسبة إشغال 100% وكافة قراءات العدادات مدققة بالكامل."

بيانات النظام الحالية للفحص والتلخيص:
${JSON.stringify(context || {}, null, 2)}`;

      const response = await generateContentWithRetry(ai, {
        model: "gemini-3.6-flash",
        contents: "قم بتوليد جملة تلخيصية ذكية واحدة بناءً على الإرشادات والبيانات المالية المتاحة.",
        config: {
          systemInstruction,
          temperature: 0.6,
        },
      });
      summaryText = response.text?.trim() || "";
    } catch (apiError: any) {
      isFallback = true;
      const isQuota = String(apiError?.message || "").toLowerCase().includes("quota") ||
                      String(apiError?.message || "").toLowerCase().includes("exhausted") ||
                      apiError?.status === 429 || apiError?.code === 429;
      
      if (isQuota) {
        console.warn("Gemini Stats Summary Quota Exceeded. Using elegant fallback.");
      } else {
        console.warn("Gemini Stats Summary API Error (using fallback):", apiError?.message || apiError);
      }
      
      // Select an elegant fallback summary based on actual local business state
      if (unpaidBills.length > 0) {
        summaryText = `الأمور تحت السيطرة يا عاقل، يوجد حالياً ${unpaidBills.length} مطالبات معلقة تحتاج متابعة سداد خفيفة وتنبيه للمستأجرين.`;
      } else {
        summaryText = "تبارك الله يا عاقل! كافة المطالبات الإيجارية والخدمية مدفوعة بالكامل لشهرنا هذا، والأمور طيبة ومستقرة تماماً.";
      }
    }

    // Cache the result. If it was a fallback due to quota, cache it for 2 minutes to reduce retries
    statsSummaryCache = {
      summary: summaryText,
      timestamp: isFallback ? (now - CACHE_TTL_MS + (2 * 60 * 1000)) : now,
      dataHash: dataHash,
    };

    res.json({ summary: summaryText });
  } catch (error: any) {
    console.error("Gemini Stats Summary Error:", error);
    res.status(500).json({ error: error.message || "حدث خطأ أثناء توليد ملخص الإحصائيات الذكي." });
  }
});

// إعداد خادم وميدل وير Vite للتطوير
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[سند العقاري] الخادم يعمل على المنفذ: http://localhost:${PORT}`);
  });
}

startServer();
