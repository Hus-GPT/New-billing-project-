import { useState, useEffect, useRef } from 'react';
import { 
  Tenant, Bill, MeterReading, PriceSettings, 
  AssistantMessage, AuditLog, Notification 
} from './types';
import {
  initialTenants,
  initialMeterReadings,
  initialBills,
  initialPriceSettings,
} from './data';

// Import newly implemented modular views
import DashboardView from './components/DashboardView';
import TenantsView from './components/TenantsView';
import BillsView from './components/BillsView';
import SettingsView from './components/SettingsView';
import ArchiveTrashView from './components/ArchiveTrashView';
import AiOcrTab from './components/AiOcrTab';
import PresentationTab from './components/PresentationTab';
import { translations } from './lib/translations';

import { 
  Building2, LayoutDashboard, Users, Receipt, Settings, 
  Archive, Cpu, MessageSquare, Code, Volume2, VolumeX, ShieldCheck,
  Sun, Moon, Sparkles, Plus, UserPlus, X, Clock, RefreshCw, Download
} from 'lucide-react';

export default function App() {
  // Navigation: Primary Horizontal Tabs
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'tenants' | 'bills' | 'archive' | 'ai_ocr' | 'portal_assistant' | 'settings'
  >('dashboard');

  const [isFabOpen, setIsFabOpen] = useState(false);

  // Core system databases (Pandas DataFrames mock state)
  const [tenants, setTenants] = useState<Tenant[]>(() => {
    const saved = localStorage.getItem('sanad_tenants');
    return saved ? JSON.parse(saved) : initialTenants;
  });

  const [readings, setReadings] = useState<MeterReading[]>(() => {
    const saved = localStorage.getItem('sanad_readings');
    return saved ? JSON.parse(saved) : initialMeterReadings;
  });

  const [bills, setBills] = useState<Bill[]>(() => {
    const saved = localStorage.getItem('sanad_bills');
    return saved ? JSON.parse(saved) : initialBills;
  });

  const [prices, setPrices] = useState<PriceSettings>(() => {
    const saved = localStorage.getItem('sanad_prices');
    return saved ? JSON.parse(saved) : {
      ...initialPriceSettings,
      total_shared_expenses: 600, // standard default
      jeeb_phone: '0555556666',
      jeeb_barcode: 'https://images.unsplash.com/photo-1590103514966-5e2a11c13e21?auto=format&fit=crop&q=80&w=200',
    };
  });

  // Auditing Trail and Notification states
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('sanad_audit_logs');
    if (saved) return JSON.parse(saved);
    return [
      {
        log_id: 'L001',
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        action: 'تهيئة النظام',
        table_name: 'system',
        record_id: 'SYS_INIT',
        details: 'تم إقلاع نظام GABER للإدارة العقارية وتهيئة مستودع البيانات بنجاح.'
      }
    ];
  });

  const [notifications, setNotifications] = useState<Notification[]>(() => {
    const saved = localStorage.getItem('sanad_notifications');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const seen = new Set<string>();
          return parsed.filter(n => {
            if (!n || !n.notification_id) return false;
            if (seen.has(n.notification_id)) return false;
            seen.add(n.notification_id);
            return true;
          });
        }
      } catch (e) {
        console.warn("Failed to parse notifications from localStorage", e);
      }
    }
    return [
      {
        notification_id: 'N001',
        tenant_id: 'T101',
        title: 'عقد يوشك على الانتهاء',
        message: 'عقد المستأجر أحمد العتيبي (شقة A1) ينتهي خلال أقل من ٣٠ يوماً.',
        date: new Date().toISOString().split('T')[0],
        is_read: false
      }
    ];
  });

  // Audio & Refresh toggles
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('sanad_dark_mode');
    return saved === 'true';
  });

  const [fontFamily, setFontFamily] = useState<string>(() => {
    return localStorage.getItem('sanad_font_family') || 'Tajawal';
  });

  const [lang, setLang] = useState<'ar' | 'en'>(() => {
    return (localStorage.getItem('sanad_lang') as 'ar' | 'en') || 'ar';
  });

  // Hoisted smart summary states to avoid redundant calls on tab switching
  const [smartSummary, setSmartSummary] = useState<string>('');
  const [isSummaryLoading, setIsSummaryLoading] = useState<boolean>(false);

  // Web Audio API Synthesizer (Happy / Alert / Restore Sound Effects)
  const playSound = (type: 'success' | 'alert' | 'click' | 'restore') => {
    if (!audioEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === 'success') {
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
        
        setTimeout(() => {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
          gain2.gain.setValueAtTime(0.1, ctx.currentTime);
          osc2.start();
          osc2.stop(ctx.currentTime + 0.15);
        }, 120);
      } else if (type === 'alert') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, ctx.currentTime); // A3
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === 'restore') {
        const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
        notes.forEach((freq, i) => {
          setTimeout(() => {
            const oscN = ctx.createOscillator();
            const gainN = ctx.createGain();
            oscN.connect(gainN);
            gainN.connect(ctx.destination);
            oscN.frequency.setValueAtTime(freq, ctx.currentTime);
            gainN.gain.setValueAtTime(0.08, ctx.currentTime);
            oscN.start();
            oscN.stop(ctx.currentTime + 0.12);
          }, i * 80);
        });
      } else {
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(0.03, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.03);
      }
    } catch (e) {
      console.warn("Web Audio Context blocked or not supported in this frame environment.", e);
    }
  };

  // Helper callbacks to manipulate states
  const handleLogAudit = (action: string, table_name: string, record_id: string, details: string) => {
    setAuditLogs((prev) => {
      const maxId = prev.reduce((max, l) => {
        const idNum = parseInt(l.log_id.replace(/\D/g, '')) || 0;
        return idNum > max ? idNum : max;
      }, 0);
      const nextIdNum = maxId + 1;
      const newLog: AuditLog = {
        log_id: `L${String(nextIdNum).padStart(3, '0')}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        action,
        table_name,
        record_id,
        details,
      };
      return [newLog, ...prev];
    });
  };

  const handleAddNotification = (title: string, message: string, tenantId: string = 'T101') => {
    setNotifications((prev) => {
      const seen = new Set<string>();
      const cleanPrev = prev.filter(n => {
        if (!n || !n.notification_id) return false;
        if (seen.has(n.notification_id)) return false;
        seen.add(n.notification_id);
        return true;
      });

      const maxId = cleanPrev.reduce((max, n) => {
        const idNum = parseInt(n.notification_id.replace(/\D/g, '')) || 0;
        return idNum > max ? idNum : max;
      }, 0);
      const nextIdNum = maxId + 1;
      let newId = `N${String(nextIdNum).padStart(3, '0')}`;
      let attempts = 0;
      while (cleanPrev.some((n) => n.notification_id === newId) && attempts < 100) {
        attempts++;
        newId = `N${String(nextIdNum + attempts).padStart(3, '0')}`;
      }
      
      const suffix = Math.random().toString(36).substring(2, 6);
      const finalId = `${newId}_${suffix}`;

      const newNotif: Notification = {
        notification_id: finalId,
        tenant_id: tenantId,
        title,
        message,
        date: new Date().toISOString().split('T')[0],
        is_read: false,
      };
      return [newNotif, ...cleanPrev];
    });
  };

  useEffect(() => {
    const fetchSmartSummary = async () => {
      setIsSummaryLoading(true);
      try {
        const response = await fetch('/api/gemini/stats-summary', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            context: { tenants, bills, readings, prices }
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setSmartSummary(data.summary);
        } else {
          throw new Error('API server error');
        }
      } catch (err) {
        console.warn("Failed to fetch smart summary:", err);
        const unpaidBills = bills.filter(b => b.payment_status === 'غير مدفوع' && !b.is_deleted);
        if (unpaidBills.length > 0) {
          setSmartSummary(`الأمور تحت السيطرة يا عاقل، يوجد حالياً ${unpaidBills.length} مطالبات معلقة تحتاج متابعة سداد خفيفة وتنبيه للمستأجرين.`);
        } else {
          setSmartSummary("تبارك الله يا عاقل! كافة المطالبات الإيجارية والخدمية مدفوعة بالكامل لشهرنا هذا، والأمور طيبة ومستقرة تماماً.");
        }
      } finally {
        setIsSummaryLoading(false);
      }
    };

    fetchSmartSummary();
  }, [tenants.length, bills.length, readings.length]);

  const handleRefreshSmartSummary = async () => {
    setIsSummaryLoading(true);
    try {
      const response = await fetch('/api/gemini/stats-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context: { tenants, bills, readings, prices }
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSmartSummary(data.summary);
        if (audioEnabled) playSound('success');
      } else {
        throw new Error('API server error');
      }
    } catch (err) {
      console.warn("Failed to refresh smart summary:", err);
    } finally {
      setIsSummaryLoading(false);
    }
  };

  // Apply language direction on root element
  useEffect(() => {
    localStorage.setItem('sanad_lang', lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  // Toggle dark mode classes on html/body elements
  useEffect(() => {
    localStorage.setItem('sanad_dark_mode', String(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Apply custom font-family on root element
  useEffect(() => {
    localStorage.setItem('sanad_font_family', fontFamily);
    document.documentElement.style.setProperty('--font-family-custom', `"${fontFamily}", "Cairo", sans-serif`);
  }, [fontFamily]);

  // Musaid AI Chat Assistant state
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: 'm1',
      sender: 'assistant',
      text: 'مرحباً بك في نظام GABER العقاري! أنا مساعدك الذكي لإدارة الوحدات وتدقيق العدادات واستخراج الفواتير. كيف يمكنني مساعدتك اليوم؟',
      timestamp: '14:15',
    },
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Session Timer state and logic (مؤقت الجلسة الذكي)
  const [sessionTimeLeft, setSessionTimeLeft] = useState(900); // 15 minutes
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const [warnedAboutExpiration, setWarnedAboutExpiration] = useState(false);
  const warnedAboutExpirationRef = useRef(false);

  const formatSessionTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (isSessionExpired) return;

    const interval = setInterval(() => {
      setSessionTimeLeft((prev) => {
        if (prev <= 1) {
          setIsSessionExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isSessionExpired]);

  useEffect(() => {
    if (sessionTimeLeft === 60 && !warnedAboutExpirationRef.current) {
      warnedAboutExpirationRef.current = true;
      setWarnedAboutExpiration(true);
      handleAddNotification(
        'تنبيه انتهاء الجلسة',
        'شارفت جلستك الأمنية النشطة على الانتهاء خلال دقيقة واحدة! يرجى الضغط على تمديد الجلسة لتجنب فقدان البيانات.',
        'T101'
      );
      playSound('alert');
    }
  }, [sessionTimeLeft, playSound]);

  const handleExtendSession = () => {
    setSessionTimeLeft(900); // reset to 15 minutes
    setIsSessionExpired(false);
    setWarnedAboutExpiration(false);
    warnedAboutExpirationRef.current = false;
    playSound('success');
    
    handleAddNotification(
      'تمديد الجلسة النشطة',
      'تم تمديد صلاحية الجلسة الأمنية لـ GABER بنجاح لمدة ١٥ دقيقة إضافية.',
      'T101'
    );
  };

  // Synchronize with LocalStorage on state updates
  useEffect(() => {
    localStorage.setItem('sanad_tenants', JSON.stringify(tenants));
  }, [tenants]);

  useEffect(() => {
    localStorage.setItem('sanad_readings', JSON.stringify(readings));
  }, [readings]);

  useEffect(() => {
    localStorage.setItem('sanad_bills', JSON.stringify(bills));
  }, [bills]);

  useEffect(() => {
    localStorage.setItem('sanad_prices', JSON.stringify(prices));
  }, [prices]);

  useEffect(() => {
    localStorage.setItem('sanad_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem('sanad_notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Synchronize with LocalStorage on state updates

  // Keyboard Shortcuts (Ctrl + 1 to 7) to switch tabs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if Ctrl key is pressed (and not Alt/Shift/Meta)
      if (e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey) {
        let targetTab: 'dashboard' | 'tenants' | 'bills' | 'archive' | 'ai_ocr' | 'portal_assistant' | 'settings' | null = null;
        switch (e.key) {
          case '1': targetTab = 'dashboard'; break;
          case '2': targetTab = 'tenants'; break;
          case '3': targetTab = 'bills'; break;
          case '4': targetTab = 'archive'; break;
          case '5': targetTab = 'ai_ocr'; break;
          case '6': targetTab = 'portal_assistant'; break;
          case '7': targetTab = 'settings'; break;
        }

        if (targetTab) {
          e.preventDefault();
          setActiveTab(targetTab);
          playSound('click');
          handleLogAudit(
            'تنقل سريع',
            'keyboard',
            `Ctrl+${e.key}`,
            `تم التنقل السريع إلى تبويب (${
              targetTab === 'dashboard' ? 'الرئيسية' : 
              targetTab === 'tenants' ? 'المستأجرين' : 
              targetTab === 'bills' ? 'الفواتير والمطالبات' : 
              targetTab === 'archive' ? 'الأرشيف والمهملات' : 
              targetTab === 'ai_ocr' ? 'العدادات OCR' : 
              targetTab === 'portal_assistant' ? 'مساعد GABER' : 
              'الإعدادات والرقابة'
            }) عبر اختصار لوحة المفاتيح Ctrl+${e.key}.`
          );
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleLogAudit, playSound]);

  const handleMarkNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.notification_id === id ? { ...n, is_read: true } : n))
    );
  };

  const handleAddTenant = (newTenant: Tenant) => {
    setTenants((prev) => [...prev, newTenant]);
  };

  const handleUpdateTenant = (updatedTenant: Tenant) => {
    setTenants((prev) =>
      prev.map((t) => (t.tenant_id === updatedTenant.tenant_id ? updatedTenant : t))
    );
    handleAddNotification('تحديث بيانات مستأجر', `تم تحديث بيانات المستأجر ${updatedTenant.name} بنجاح.`, updatedTenant.tenant_id);
    playSound('success');
  };

  const handleSoftDeleteTenant = (tenantId: string) => {
    setTenants((prev) =>
      prev.map((t) => (t.tenant_id === tenantId ? { ...t, is_deleted: true } : t))
    );
    handleAddNotification('تعديل حالة مستأجر', `تم إلغاء/حذف المستأجر ذو المعرّف ${tenantId} ونقله لسلة المهملات ناعماً.`, tenantId);
    playSound('alert');
  };

  const handleRestoreTenant = (tenantId: string) => {
    setTenants((prev) =>
      prev.map((t) => (t.tenant_id === tenantId ? { ...t, is_deleted: false } : t))
    );
    handleAddNotification('استعادة مستأجر', `تم استعادة المستأجر ذو المعرّف ${tenantId} من سلة المهملات بنجاح.`, tenantId);
    playSound('restore');
  };

  const handleAddBill = (newBill: Bill) => {
    setBills((prev) => [...prev, newBill]);
    handleAddNotification('إصدار مطالبة جديدة', `تم إصدار الفاتورة ${newBill.bill_id} بقيمة إجمالية قدرها ${newBill.total_amount} ر.ي.`, newBill.tenant_id);
    playSound('success');
  };

  const handleSoftDeleteBill = (billId: string) => {
    setBills((prev) =>
      prev.map((b) => (b.bill_id === billId ? { ...b, is_deleted: true } : b))
    );
    playSound('alert');
  };

  const handleRestoreBill = (billId: string) => {
    setBills((prev) =>
      prev.map((b) => (b.bill_id === billId ? { ...b, is_deleted: false } : b))
    );
    playSound('restore');
  };

  const handleAddReading = (newReading: MeterReading) => {
    setReadings((prev) => [...prev, newReading]);
    playSound('success');
  };

  const handleRestoreReading = (readingId: string) => {
    setReadings((prev) =>
      prev.map((r) => (r.reading_id === readingId ? { ...r, is_deleted: false } : r))
    );
    playSound('restore');
  };

  const handleRecordPayment = (billId: string, amount: number) => {
    setBills((prev) =>
      prev.map((b) => {
        if (b.bill_id === billId) {
          const newPaid = (b.paid_amount || 0) + amount;
          const status = newPaid >= b.total_amount ? 'مدفوع' : 'مدفوع جزئياً';
          return { ...b, paid_amount: newPaid, payment_status: status };
        }
        return b;
      })
    );
    playSound('success');
  };

  const handleArchiveBill = (billId: string) => {
    setBills((prev) =>
      prev.map((b) => (b.bill_id === billId ? { ...b, is_archived: true } : b))
    );
    playSound('success');
  };

  const handleUpdateTenantAdvanceBalance = (tenantId: string, amount: number) => {
    setTenants((prev) =>
      prev.map((t) => {
        if (t.tenant_id === tenantId) {
          return { ...t, advance_balance: (t.advance_balance || 0) + amount };
        }
        return t;
      })
    );
  };

  const handleUpdatePrices = (newPrices: PriceSettings) => {
    setPrices(newPrices);
    playSound('success');
  };

  const handleBulkRestore = (
    restoredTenants: Tenant[],
    restoredBills: Bill[],
    restoredReadings: MeterReading[]
  ) => {
    setTenants(restoredTenants);
    setBills(restoredBills);
    setReadings(restoredReadings);
    setNotifications([
      {
        notification_id: `N_${Date.now()}`,
        tenant_id: 'T101',
        title: 'استعادة ناجحة للنسخ الاحتياطي',
        message: 'تم استعادة واستيراد قاعدة بيانات GABER بالكامل وتغذية سجلات المستأجرين بنجاح.',
        date: new Date().toISOString().split('T')[0],
        is_read: false,
      }
    ]);
  };

  // Reset Application Data
  const handleReset = () => {
    setTenants([]);
    setReadings([]);
    setBills([]);
    setNotifications([]);
    setPrices({
      electricity_rate: 0.18,
      water_rate: 2.5,
      tax_rate: 0.05,
      last_update: new Date().toISOString().replace('T', ' ').substring(0, 19),
    });

    handleLogAudit('تصفير البيانات', 'system', 'RESET_ALL', 'تم مسح كامل ذاكرة GABER وإعادة تعيين النظام لوضع التعافي.');
    playSound('alert');
  };

  // Load Initial Demo Data
  const handleLoadDemo = () => {
    setTenants(initialTenants);
    setReadings(initialMeterReadings);
    setBills(initialBills);
    setPrices({
      ...initialPriceSettings,
      total_shared_expenses: 600,
      jeeb_phone: '0555556666',
      jeeb_barcode: 'https://images.unsplash.com/photo-1590103514966-5e2a11c13e21?auto=format&fit=crop&q=80&w=200',
    });
    setNotifications([
      {
        notification_id: 'N001',
        tenant_id: 'T101',
        title: 'عقد يوشك على الانتهاء',
        message: 'عقد المستأجر أحمد العتيبي (شقة A1) ينتهي خلال أقل من ٣٠ يوماً.',
        date: new Date().toISOString().split('T')[0],
        is_read: false
      }
    ]);

    handleLogAudit('شحن البيانات التجريبية', 'system', 'LOAD_DEMO', 'تم شحن مستودع بيانات GABER بالبيانات المفوترة التأسيسية.');
    playSound('restore');
  };

  const handleNavigateToBilling = (tenantId: string) => {
    setActiveTab('bills');
  };

  // Intelligent Context-Aware Assistant chat (Musaid)
  const handleSendMessage = async (text: string) => {
    const userMsg: AssistantMessage = {
      id: `u_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsChatLoading(true);

    let reply = '';
    try {
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: text,
          context: { tenants, bills, readings, prices }
        }),
      });

      if (response.ok) {
        const data = await response.json();
        reply = data.text;
      } else {
        throw new Error('API server returned error status');
      }
    } catch (e) {
      console.warn("Falling back to client-side rule engine because backend Gemini is offline:", e);
      reply = 'عذراً، لم أفهم استفسارك بدقة. هل يمكنك السؤال عن مستأجر معين، أو عن فواتير شقة ما، أو سؤالي عن أسعار التعرفة؟';
      const query = text.toLowerCase();

      if (query.includes('مرحبا') || query.includes('أهلاً') || query.includes('السلام')) {
        reply = 'أهلاً وسهلاً بك في نظام GABER العقاري! أنا "مساعد" ومستعد لخدمتك في تتبع الشقق وقراءات العدادات وتحصيل الإيجارات يا عاقل.';
      } else if (query.includes('أحمد') || query.includes('العتيبي')) {
        const activeBill = bills.find((b) => b.tenant_id === 'T101' && !b.is_deleted);
        reply = `المستأجر أحمد العتيبي يقطن في الشقة (A1) بإيجار شهري 2500 ر.ي. ${
          activeBill 
            ? `فاتورته الأخيرة لشهر ${activeBill.billing_month} تبلغ ${activeBill.total_amount} ر.ي وحالتها: ${activeBill.payment_status}.`
            : 'لا توجد فواتير معلقة له حالياً.'
        }`;
      } else if (query.includes('سارة') || query.includes('الشمري')) {
        const activeBill = bills.find((b) => b.tenant_id === 'T102' && !b.is_deleted);
        reply = `المستأجر سارة الشمري تقطن في الشقة (B3) بإيجار شهري 3200 ر.ي. ${
          activeBill 
            ? `فاتورتها لشهر ${activeBill.billing_month} تبلغ ${activeBill.total_amount} ر.ي وحالتها: ${activeBill.payment_status} (نظراً لوجود متأخرات سابقة بقيمة ${activeBill.previous_arrears} ر.ي).`
            : 'لا توجد فواتير معلقة لها حالياً.'
        }`;
      } else if (query.includes('كم مستأجر') || query.includes('عدد المستأجرين') || query.includes('المستأجرين')) {
        const activeList = tenants.filter(t => !t.is_deleted);
        if (activeList.length === 0) {
          reply = 'لا يوجد مستأجرين مسجلين حالياً في النظام.';
        } else {
          reply = `يحتوي نظام GABER حالياً على ${activeList.length} مستأجرين نشطين وعقود جارية بانتظام يا عاقل.`;
        }
      } else if (query.includes('فاتورة') || query.includes('الفواتير') || query.includes('غير مدفوع')) {
        const unpaid = bills.filter(b => b.payment_status === 'غير مدفوع' && !b.is_deleted);
        if (unpaid.length === 0) {
          reply = 'جميع الفواتير والمطالبات المالية مسددة بالكامل حالياً، عمل عظيم بارك الله فيك!';
        } else {
          reply = `يوجد حالياً ${unpaid.length} فواتير معلقة بانتظار التحصيل والسداد من المستأجرين يا عاقل.`;
        }
      } else if (query.includes('سعر') || query.includes('التعرفة') || query.includes('الكهرباء')) {
        reply = `تعرفة الأسعار المعتمدة حالياً في GABER: الكهرباء = ${prices.electricity_rate} ر.ي/كيلوواط، المياه = ${prices.water_rate} ر.ي/متر مكعب، والضريبة = ${prices.tax_rate * 100}%.`;
      }
    }

    const assistantMsg: AssistantMessage = {
      id: `a_${Date.now()}`,
      sender: 'assistant',
      text: reply,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, assistantMsg]);
    setIsChatLoading(false);
    return reply;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300" dir={lang === 'ar' ? 'rtl' : 'ltr'} id="app-root">
      {/* 1. شريط العنوان العلوي (The Header Block) */}
      <header className="bg-gradient-to-r from-emerald-800 to-teal-950 dark:from-slate-900 dark:to-teal-950 text-white shadow-md p-4 sm:p-5" id="app-header">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2.5 rounded-xl border border-white/10 shadow-inner">
              <Building2 className="h-6 w-6 text-emerald-300 animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black tracking-tight flex items-center gap-1.5">
                {lang === 'ar' ? 'نظام GABER العقاري الاحترافي' : 'Professional GABER Real Estate System'}
                <span className="text-[10px] bg-emerald-500 text-white font-mono px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">PRO</span>
              </h1>
              <p className="text-[11px] sm:text-xs text-emerald-100/80 mt-0.5 font-semibold">
                {lang === 'ar' 
                  ? 'بوابة متطورة لإدارة العقارات، الفواتير، الاستهلاك بالذكاء الاصطناعي والرقابة المالية' 
                  : 'Advanced portal for property management, billing, AI consumption OCR & financial audit'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Dark Mode Toggle Button */}
            <button
              onClick={() => {
                setIsDarkMode(!isDarkMode);
                playSound('click');
              }}
              className="p-2 bg-white/10 border border-white/10 rounded-xl hover:bg-white/20 text-white transition-all cursor-pointer flex items-center justify-center"
              title={isDarkMode ? 'الوضع المضيء' : 'الوضع الداكن'}
              id="header-darkmode-toggle"
            >
              {isDarkMode ? (
                <Sun className="h-4 w-4 text-amber-300 animate-spin-slow" />
              ) : (
                <Moon className="h-4 w-4 text-emerald-200" />
              )}
            </button>

            {/* Quick Audio Toggle Header Controller */}
            <button
              onClick={() => {
                setAudioEnabled(!audioEnabled);
                playSound('click');
              }}
              className="p-2 bg-white/10 border border-white/10 rounded-xl hover:bg-white/20 text-white transition-all cursor-pointer"
              title={audioEnabled ? 'كتم المؤثرات الصوتية' : 'تفعيل المؤثرات الصوتية'}
              id="header-audio-toggle"
            >
              {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-emerald-300" />}
            </button>

            {/* تنزيل المشروع بالكامل مضغوطاً (Download Source Code) */}
            <a
              href="/project.tar.gz"
              download="gaber_project_source.tar.gz"
              className="p-2 bg-white/10 border border-white/10 rounded-xl hover:bg-white/20 text-white transition-all cursor-pointer flex items-center gap-1.5 text-[11px] font-bold"
              title="تنزيل المشروع كاملاً مضغوطاً (tar.gz)"
              id="header-download-source"
              onClick={() => playSound('click')}
            >
              <Download className="h-4 w-4 text-emerald-300" />
              <span className="hidden md:inline">تحميل كود المشروع</span>
            </a>

            {/* مؤقت الجلسة النشط لـ GABER (Active Session Timer) */}
            <div 
              className={`px-3 py-1 sm:py-1.5 rounded-xl border flex items-center gap-2 transition-all ${
                sessionTimeLeft <= 60 
                  ? 'bg-rose-500/20 border-rose-500 text-rose-200 animate-pulse' 
                  : 'bg-white/5 border-white/10 text-emerald-200 hover:bg-white/10'
              }`} 
              title="مؤقت الجلسة النشطة - اضغط للتمديد الفوري للسرية المحاسبية"
            >
              <Clock className={`h-3.5 w-3.5 ${sessionTimeLeft <= 60 ? 'text-rose-400' : 'text-emerald-300'}`} />
              <div className="flex flex-col text-right">
                <span className="text-[8px] sm:text-[9px] text-white/50 leading-none">مؤقت الجلسة</span>
                <span className="text-[10px] sm:text-xs font-mono font-black mt-0.5">{formatSessionTime(sessionTimeLeft)}</span>
              </div>
              <button
                onClick={handleExtendSession}
                className="mr-1 px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-extrabold rounded-md transition-colors cursor-pointer"
              >
                تمديد
              </button>
            </div>

            <span className="px-3 py-1 bg-white/10 border border-white/10 rounded-full text-[10px] font-mono text-emerald-200 flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
              الجمود المحاسبي مفعل
            </span>
          </div>
        </div>
      </header>

      {/* 2. شريط علامات التبويب الذكي (Smart Tab Navigation) */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shadow-sm sticky top-0 z-30 transition-colors duration-300" id="smart-tab-bar">
        <div className="max-w-7xl mx-auto px-4 overflow-x-auto scrollbar-none flex gap-2">
          
          <button
            onClick={() => { setActiveTab('dashboard'); playSound('click'); }}
            className={`flex items-center gap-2 px-5 py-3.5 border-b-2 font-bold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-emerald-50/10'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            id="tab-dashboard"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>{translations[lang].nav_dashboard}</span>
            <span className="text-[9px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 px-1 py-0.5 rounded-md mr-1.5 border border-slate-200/50 dark:border-slate-700/50">Ctrl+1</span>
          </button>

          <button
            onClick={() => { setActiveTab('tenants'); playSound('click'); }}
            className={`flex items-center gap-2 px-5 py-3.5 border-b-2 font-bold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'tenants'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-emerald-50/10'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            id="tab-tenants"
          >
            <Users className="h-4 w-4" />
            <span>{translations[lang].nav_tenants}</span>
            <span className="text-[9px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 px-1 py-0.5 rounded-md mr-1.5 border border-slate-200/50 dark:border-slate-700/50">Ctrl+2</span>
          </button>

          <button
            onClick={() => { setActiveTab('bills'); playSound('click'); }}
            className={`flex items-center gap-2 px-5 py-3.5 border-b-2 font-bold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'bills'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-emerald-50/10'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            id="tab-bills"
          >
            <Receipt className="h-4 w-4" />
            <span>{translations[lang].nav_bills}</span>
            <span className="text-[9px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 px-1 py-0.5 rounded-md mr-1.5 border border-slate-200/50 dark:border-slate-700/50">Ctrl+3</span>
          </button>

          <button
            onClick={() => { setActiveTab('archive'); playSound('click'); }}
            className={`flex items-center gap-2 px-5 py-3.5 border-b-2 font-bold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'archive'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-emerald-50/10'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            id="tab-archive"
          >
            <Archive className="h-4 w-4" />
            <span>{translations[lang].nav_archive}</span>
            <span className="text-[9px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 px-1 py-0.5 rounded-md mr-1.5 border border-slate-200/50 dark:border-slate-700/50">Ctrl+4</span>
          </button>

          <button
            onClick={() => { setActiveTab('ai_ocr'); playSound('click'); }}
            className={`flex items-center gap-2 px-5 py-3.5 border-b-2 font-bold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'ai_ocr'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-emerald-50/10'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            id="tab-ai-ocr"
          >
            <Cpu className="h-4 w-4" />
            <span>{translations[lang].nav_ocr}</span>
            <span className="text-[9px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 px-1 py-0.5 rounded-md mr-1.5 border border-slate-200/50 dark:border-slate-700/50">Ctrl+5</span>
          </button>

          <button
            onClick={() => { setActiveTab('portal_assistant'); playSound('click'); }}
            className={`flex items-center gap-2 px-5 py-3.5 border-b-2 font-bold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'portal_assistant'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-emerald-50/10'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            id="tab-portal-assistant"
          >
            <MessageSquare className="h-4 w-4" />
            <span>{translations[lang].nav_assistant}</span>
            <span className="text-[9px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 px-1 py-0.5 rounded-md mr-1.5 border border-slate-200/50 dark:border-slate-700/50">Ctrl+6</span>
          </button>

          <button
            onClick={() => { setActiveTab('settings'); playSound('click'); }}
            className={`flex items-center gap-2 px-5 py-3.5 border-b-2 font-bold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-emerald-50/10'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            id="tab-settings"
          >
            <Settings className="h-4 w-4" />
            <span>{translations[lang].nav_settings}</span>
            <span className="text-[9px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 px-1 py-0.5 rounded-md mr-1.5 border border-slate-200/50 dark:border-slate-700/50">Ctrl+7</span>
          </button>

        </div>
      </div>

      {/* 3. منطقة محتوى علامة التبويب النشطة (Main Viewport) */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6" id="app-main-layout">
        
        {activeTab === 'dashboard' && (
          <DashboardView
            tenants={tenants}
            bills={bills}
            readings={readings}
            prices={prices}
            notifications={notifications}
            onMarkAllNotificationsRead={() => {
              setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            }}
            onAddReading={handleAddReading}
            onAddBill={handleAddBill}
            onRecordPayment={handleRecordPayment}
            onAddAdvancePayment={handleUpdateTenantAdvanceBalance}
            onLogAudit={handleLogAudit}
            playSound={playSound}
            audioEnabled={audioEnabled}
            autoRefreshEnabled={autoRefreshEnabled}
            smartSummary={smartSummary}
            isSummaryLoading={isSummaryLoading}
            onRefreshSmartSummary={handleRefreshSmartSummary}
          />
        )}

        {activeTab === 'tenants' && (
          <TenantsView
            tenants={tenants}
            onAddTenant={handleAddTenant}
            onUpdateTenant={handleUpdateTenant}
            onSoftDeleteTenant={handleSoftDeleteTenant}
            onLogAudit={handleLogAudit}
            playSound={playSound}
            audioEnabled={audioEnabled}
          />
        )}

        {activeTab === 'bills' && (
          <BillsView
            tenants={tenants}
            bills={bills}
            readings={readings}
            prices={prices}
            onAddReading={handleAddReading}
            onAddBill={handleAddBill}
            onRecordPayment={handleRecordPayment}
            onArchiveBill={handleArchiveBill}
            onSoftDeleteBill={handleSoftDeleteBill}
            onLogAudit={handleLogAudit}
            playSound={playSound}
            audioEnabled={audioEnabled}
          />
        )}

        {activeTab === 'archive' && (
          <ArchiveTrashView
            tenants={tenants}
            bills={bills}
            readings={readings}
            onRestoreTenant={handleRestoreTenant}
            onRestoreBill={handleRestoreBill}
            onRestoreReading={handleRestoreReading}
            onBulkRestore={handleBulkRestore}
            onLogAudit={handleLogAudit}
            playSound={playSound}
            audioEnabled={audioEnabled}
          />
        )}

        {activeTab === 'ai_ocr' && (
          <AiOcrTab
            tenants={tenants}
            readings={readings}
            onAddReading={handleAddReading}
            onNavigateToBilling={handleNavigateToBilling}
          />
        )}

        {activeTab === 'portal_assistant' && (
          <PresentationTab
            tenants={tenants}
            bills={bills}
            readings={readings}
            onSendMessage={handleSendMessage}
            messages={messages}
            isChatLoading={isChatLoading}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            prices={prices}
            onUpdatePrices={handleUpdatePrices}
            auditLogs={auditLogs}
            tenants={tenants}
            bills={bills}
            fontFamily={fontFamily}
            onUpdateFontFamily={setFontFamily}
            lang={lang}
            onUpdateLang={setLang}
            audioEnabled={audioEnabled}
            setAudioEnabled={setAudioEnabled}
            autoRefreshEnabled={autoRefreshEnabled}
            setAutoRefreshEnabled={setAutoRefreshEnabled}
            onLoadDemo={handleLoadDemo}
            onReset={handleReset}
            onLogAudit={handleLogAudit}
            playSound={playSound}
          />
        )}

      </main>

      {/* 4. تذييل الصفحة البسيط */}
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 dark:border-slate-950 py-4 text-center text-xs" id="app-footer">
        <p>© 2026 نظام GABER لإدارة العقارات والتحقق المالي. جميع الميزات تم دمجها وبنائها حسب رغبتك بالكامل.</p>
      </footer>

      {/* 5. القائمة الإجرائية العائمة الذكية لـ GABER (Smart FAB Action Menu) */}
      <div className="fixed bottom-6 left-6 z-50 flex flex-col-reverse items-start gap-3" dir="rtl">
        {/* الزر الرئيسي */}
        <button
          onClick={() => {
            setIsFabOpen(!isFabOpen);
            playSound('click');
          }}
          className="w-14 h-14 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer relative group border-2 border-white/20"
          title="الإجراءات السريعة"
          id="fab-main-button"
        >
          {isFabOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Plus className="h-7 w-7 transition-transform group-hover:rotate-90 duration-300" />
          )}
          {/* شارة التنبيه الصغيرة المضيئة */}
          {!isFabOpen && (
            <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4.5 w-4.5 bg-amber-500 border-2 border-white dark:border-slate-950"></span>
            </span>
          )}
        </button>

        {/* قائمة الخيارات العائمة */}
        {isFabOpen && (
          <div className="flex flex-col gap-2.5 bg-white dark:bg-slate-900/95 backdrop-blur-md p-3.5 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800/80 w-56 animate-bounce-short text-right">
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800/80 pb-1.5 mb-1 flex items-center justify-between">
              <span>الإجراءات السريعة لـ GABER</span>
              <Sparkles className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
            </div>

            {/* الخيار 1: إضافة مستأجر جديد */}
            <button
              onClick={() => {
                setActiveTab('tenants');
                setIsFabOpen(false);
                playSound('click');
              }}
              className="flex items-center gap-2.5 px-2.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl transition-all cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 text-right w-full"
            >
              <UserPlus className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
              <span>إضافة مستأجر جديد</span>
            </button>

            {/* الخيار 2: إنشاء فاتورة جديدة */}
            <button
              onClick={() => {
                setActiveTab('bills');
                setIsFabOpen(false);
                playSound('click');
              }}
              className="flex items-center gap-2.5 px-2.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl transition-all cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 text-right w-full"
            >
              <Receipt className="h-4.5 w-4.5 text-teal-600 shrink-0" />
              <span>إنشاء فاتورة جديدة</span>
            </button>

            {/* الخيار 3: إدخال قراءة عداد */}
            <button
              onClick={() => {
                setActiveTab('ai_ocr');
                setIsFabOpen(false);
                playSound('click');
              }}
              className="flex items-center gap-2.5 px-2.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl transition-all cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 text-right w-full"
            >
              <Cpu className="h-4.5 w-4.5 text-blue-600 shrink-0" />
              <span>إدخال قراءة عداد (OCR)</span>
            </button>

            {/* الخيار 4: طلب ومساعد Gemini */}
            <button
              onClick={() => {
                setActiveTab('portal_assistant');
                setIsFabOpen(false);
                playSound('click');
              }}
              className="flex items-center gap-2.5 px-2.5 py-2 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/20 dark:to-teal-500/20 hover:from-emerald-500/20 hover:to-teal-500/20 rounded-xl transition-all cursor-pointer text-xs font-extrabold text-emerald-800 dark:text-emerald-300 text-right w-full border border-emerald-500/10 dark:border-emerald-500/20"
            >
              <Sparkles className="h-4.5 w-4.5 text-emerald-500 shrink-0 animate-pulse" />
              <span>طلب مساعد Gemini الذكي</span>
            </button>
          </div>
        )}
      </div>

      {/* 6. شاشة القفل عند انتهاء صلاحية الجلسة (Session Expired Lock Screen Overlay) */}
      {isSessionExpired && (
        <div className="fixed inset-0 bg-slate-950/90 dark:bg-slate-950/95 backdrop-blur-xl z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300" dir="rtl">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 sm:p-10 rounded-3xl shadow-2xl max-w-md w-full text-center space-y-6 animate-in zoom-in-95 duration-200">
            <div className="mx-auto w-16 h-16 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center border border-amber-500/20">
              <Clock className="h-8 w-8 animate-pulse text-amber-600" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">
                انتهت صلاحية الجلسة النشطة
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                لحمايتك ولأسباب تتعلق بالأمان والسرية المحاسبية، انتهت صلاحية الجلسة الحالية لـ GABER تلقائياً بعد مرور ١٥ دقيقة من الخمول والعمل المتواصل.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl text-xs font-mono text-slate-600 dark:text-slate-300 flex items-center justify-center gap-2">
              <ShieldCheck className="h-4.5 w-4.5 text-emerald-500" />
              <span>بياناتك العقارية والمالية محفوظة ومحملة بالكامل</span>
            </div>

            <button
              onClick={handleExtendSession}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-xs sm:text-sm rounded-xl transition-all shadow-lg active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <RefreshCw className="h-4 w-4 text-emerald-200 animate-spin" style={{ animationDuration: '3s' }} />
              تمديد صلاحية الجلسة العقارية الفورية
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
