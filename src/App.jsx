import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged, 
  signInWithCustomToken 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  Plus, Trash2, ShoppingCart, Settings, 
  ClipboardList, Calendar, FileSpreadsheet, X, Edit3, Check,
  ChevronUp, ChevronDown, Wifi, WifiOff, Loader2,
  BarChart3, List, Search, ChevronLeft, ChevronRight,
  MoreHorizontal, CreditCard, Banknote, ArrowRightLeft, Clock,
  LayoutGrid, Layers, Palette, Download
} from 'lucide-react';

// --- Firebase 配置 ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'sales-manager-pro-v2';

const ITEMS_PER_PAGE = 5;

// 安全生成 UUID，防止無痕模式下報錯
const generateUUID = () => {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch(e) {}
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2);
};

const App = () => {
  // --- 1. 基礎預設資料宣告 (確保穩定性) ---
  const defaultPaymentMethods = useMemo(() => [
    { name: '現金', color: 'yellow' },
    { name: 'Line Pay', color: 'emerald' },
    { name: '轉帳', color: 'blue' }
  ], []);

  const defaultProducts = useMemo(() => [
    { id: 'def_c1', name: '紫翳光', price: 220, category: '冷飲', isDefault: true, sortOrder: 10 },
    { id: 'def_c2', name: '十方仙境', price: 220, category: '冷飲', isDefault: true, sortOrder: 20 },
    { id: 'def_c3', name: '茶之光 100ml', price: 350, category: '冷飲', isDefault: true, sortOrder: 30 },
    { id: 'def_c4', name: '茶之光 350ml', price: 1200, category: '冷飲', isDefault: true, sortOrder: 40 },
    { id: 'def_h1', name: '紫翳光(內)', price: 220, category: '熱飲', isDefault: true, sortOrder: 50 },
    { id: 'def_h2', name: '紫翳光(外)', price: 250, category: '熱飲', isDefault: true, sortOrder: 60 },
    { id: 'def_h3', name: '白毫雪露(內)', price: 220, category: '熱飲', isDefault: true, sortOrder: 70 },
    { id: 'def_h4', name: '白毫雪露(外)', price: 250, category: '熱飲', isDefault: true, sortOrder: 80 },
    { id: 'def_h5', name: '茶師精選現沖茶(350)', price: 350, category: '熱飲', isDefault: true, sortOrder: 90 },
    { id: 'def_h6', name: '茶師精選現沖茶(500)', price: 500, category: '熱飲', isDefault: true, sortOrder: 100 },
    { id: 'def_h7', name: '茶師精選現沖茶(700)', price: 700, category: '熱飲', isDefault: true, sortOrder: 110 },
    { id: 'def_f1', name: '琥珀糖內用(三入)', price: 60, category: '餐點', isDefault: true, sortOrder: 120 },
    { id: 'def_f2', name: '琥珀糖外帶禮盒(六入)', price: 150, category: '餐點', isDefault: true, sortOrder: 130 },
    { id: 'def_f3', name: '水信玄餅(含冰茶)', price: 160, category: '餐點', isDefault: true, sortOrder: 140 },
    { id: 'def_f4', name: '迎春套組', price: 450, category: '餐點', isDefault: true, sortOrder: 150 },
    
    // 其他類別項目 (收入)
    { id: 'def_o1', name: '其他收入 1元', price: 1, category: '其他', isDefault: true, sortOrder: 1001 },
    { id: 'def_o5', name: '其他收入 5元', price: 5, category: '其他', isDefault: true, sortOrder: 1005 },
    { id: 'def_o2', name: '其他收入 10元', price: 10, category: '其他', isDefault: true, sortOrder: 1010 },
    { id: 'def_o6', name: '其他收入 50元', price: 50, category: '其他', isDefault: true, sortOrder: 1050 },
    { id: 'def_o3', name: '其他收入 100元', price: 100, category: '其他', isDefault: true, sortOrder: 1100 },
    { id: 'def_o7', name: '其他收入 500元', price: 500, category: '其他', isDefault: true, sortOrder: 1500 },
    { id: 'def_o4', name: '其他收入 1000元', price: 1000, category: '其他', isDefault: true, sortOrder: 1900 },
    { id: 'def_o8', name: '其他收入 5000元', price: 5000, category: '其他', isDefault: true, sortOrder: 1999 },
    
    // 其他類別項目 (支出)
    { id: 'def_ex1', name: '臨時支出 -1元', price: -1, category: '其他', isDefault: true, sortOrder: 2001 },
    { id: 'def_ex5', name: '臨時支出 -5元', price: -5, category: '其他', isDefault: true, sortOrder: 2005 },
    { id: 'def_ex2', name: '臨時支出 -10元', price: -10, category: '其他', isDefault: true, sortOrder: 2010 },
    { id: 'def_ex6', name: '臨時支出 -50元', price: -50, category: '其他', isDefault: true, sortOrder: 2050 },
    { id: 'def_ex3', name: '臨時支出 -100元', price: -100, category: '其他', isDefault: true, sortOrder: 2100 },
    { id: 'def_ex7', name: '臨時支出 -500元', price: -500, category: '其他', isDefault: true, sortOrder: 2500 },
    { id: 'def_ex4', name: '臨時支出 -1000元', price: -1000, category: '其他', isDefault: true, sortOrder: 2900 },
    { id: 'def_ex8', name: '臨時支出 -5000元', price: -5000, category: '其他', isDefault: true, sortOrder: 2999 },
  ], []);

  const colorOptions = [
    { name: '黃色', value: 'yellow' },
    { name: '綠色', value: 'emerald' },
    { name: '藍色', value: 'blue' },
    { name: '紫色', value: 'purple' },
    { name: '粉色', value: 'rose' },
    { name: '青色', value: 'cyan' }
  ];

  // --- 2. 狀態定義 ---
  const [user, setUser] = useState(null);
  const [view, setView] = useState('sales'); 
  const [activeCategory, setActiveCategory] = useState('全部');
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  
  const [dbProducts, setDbProducts] = useState([]);
  const [salesHistory, setSalesHistory] = useState([]);
  const [dbPaymentMethods, setDbPaymentMethods] = useState([]); 
  
  const [currentSale, setCurrentSale] = useState([]);
  const [dailyNote, setDailyNote] = useState("");
  const [selectedPayment, setSelectedPayment] = useState("現金"); 
  const [newItem, setNewItem] = useState({ name: '', price: '', category: '冷飲' });
  const [newPaymentName, setNewPaymentName] = useState(""); 
  const [newPaymentColor, setNewPaymentColor] = useState("yellow"); 
  
  // --- 編輯功能相關狀態 ---
  const [editingRecord, setEditingRecord] = useState(null);
  const [editCart, setEditCart] = useState([]);
  const [editNote, setEditNote] = useState("");
  const [editPayment, setEditPayment] = useState("現金");
  const [showEmptyEditPrompt, setShowEmptyEditPrompt] = useState(false);

  const [showMobileCart, setShowMobileCart] = useState(false);
  const [syncQueue, setSyncQueue] = useState(() => {
    try {
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem(`syncQueue_${appId}`) : null;
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  }); 

  const [editingProductId, setEditingProductId] = useState(null);
  const [editBuffer, setEditBuffer] = useState({ name: '', price: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const [localHiddenIds, setLocalHiddenIds] = useState([]); 
  const [undoItem, setUndoItem] = useState(null); 
  const [productToDelete, setProductToDelete] = useState(null);
  
  // 滑動與標記狀態 (分離職責)
  const [newOrderTraceId, setNewOrderTraceId] = useState(null); // 專門給「剛剛加入」黃框用
  const [scrollTargetId, setScrollTargetId] = useState(null); // 通用滑動目標 ID
  
  const [searchQuery, setSearchQuery] = useState("");
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDateJump, setSelectedDateJump] = useState(""); 
  const [isSummarizedView, setIsSummarizedView] = useState(false); 
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [exportMonth, setExportMonth] = useState(() => {
    try { return new Date().toISOString().slice(0, 7); } catch(e) { return "2024-01"; }
  }); 
  
  const undoTimerRef = useRef(null);
  const isSyncingRef = useRef(false);

  // --- 3. 核心邏輯與同步 ---
  useEffect(() => {
    if (typeof document === 'undefined') return;
    let viewportMeta = document.querySelector('meta[name="viewport"]');
    if (!viewportMeta) {
      viewportMeta = document.createElement('meta');
      viewportMeta.name = "viewport";
      document.head.appendChild(viewportMeta);
    }
    viewportMeta.content = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover";
    const preventPinch = (e) => { if (e.touches?.length > 1) e.preventDefault(); };
    document.addEventListener('touchstart', preventPinch, { passive: false });
    return () => document.removeEventListener('touchstart', preventPinch);
  }, []);

  const processSyncQueue = async () => {
    if (!isOnline || isSyncingRef.current || !auth.currentUser) return;
    let currentQueue = [];
    try {
      if (typeof window !== 'undefined') {
        currentQueue = JSON.parse(window.localStorage.getItem(`syncQueue_${appId}`) || "[]");
      }
    } catch(e) { return; }
    
    if (!currentQueue || currentQueue.length === 0) { setIsSaving(false); return; }
    
    isSyncingRef.current = true;
    setIsSaving(true);
    
    try {
      while (currentQueue.length > 0) {
        const item = currentQueue[0];
        const docToUpload = { ...item, createdAt: serverTimestamp(), syncedAt: serverTimestamp() };
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'sales'), docToUpload);
        currentQueue.shift();
        try { 
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(`syncQueue_${appId}`, JSON.stringify(currentQueue)); 
          }
        } catch(e){}
        setSyncQueue([...currentQueue]);
      }
    } catch (err) {
      console.error("同步失敗:", err);
    } finally {
      setIsSaving(false);
      isSyncingRef.current = false;
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => { setIsOnline(true); setTimeout(processSyncQueue, 1000); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { 
      window.removeEventListener('online', handleOnline); 
      window.removeEventListener('offline', handleOffline); 
    };
  }, []);

  useEffect(() => {
        const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch(e) { console.error("Auth error:", e); }
    };

    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (user) => { 
      setUser(user); 
      if (user) processSyncQueue(); 
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubProducts = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'products'), (s) => {
      setDbProducts(s.docs.map(d => ({ ...d.data(), id: d.id })));
    });
    const unsubSales = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'sales'), (s) => {
      setSalesHistory(s.docs.map(d => ({ ...d.data(), id: d.id })));
    });
    const unsubPayments = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'paymentMethods'), (s) => {
      setDbPaymentMethods(s.docs.map(d => ({ ...d.data(), id: d.id })));
    });
    return () => { unsubProducts(); unsubSales(); unsubPayments(); };
  }, [user]);

  // --- 4. 數據衍生整合 (安全防護) ---
  const allPaymentMethods = useMemo(() => {
    const combined = [...(defaultPaymentMethods || [])];
    (dbPaymentMethods || []).forEach(dbM => {
      if (dbM && !combined.some(m => m?.name === dbM.name)) {
        combined.push({ name: dbM.name, color: dbM.color || 'yellow' });
      }
    });
    return combined;
  }, [dbPaymentMethods, defaultPaymentMethods]);

  const allProducts = useMemo(() => {
    const safeDbProducts = dbProducts || [];
    const safeDefaultProducts = defaultProducts || [];
    
    const hiddenNames = new Set(
      safeDbProducts.filter(p => p && (p.isHidden || p.isDeleted)).map(p => p.originalName || p.name)
    );
    
    let result = safeDefaultProducts.filter(p => p && !hiddenNames.has(p.name));
    
    safeDbProducts.filter(p => p && !p.isHidden && !p.isDeleted).forEach(dbP => {
      if (dbP.originalName) {
        const idx = result.findIndex(p => p?.isDefault && p?.name === dbP.originalName);
        if (idx !== -1) {
          result[idx] = { ...result[idx], ...dbP, isDefault: false };
        }
      } else if (!result.some(p => p?.name === dbP.name)) {
        result.push({ ...dbP, isDefault: false });
      }
    });
    return result.sort((a, b) => (a?.sortOrder ?? 9999) - (b?.sortOrder ?? 9999));
  }, [dbProducts, defaultProducts]);

  const groupedSales = useMemo(() => {
    const groups = {};
    const safeSalesHistory = salesHistory || [];
    const safeLocalHiddenIds = localHiddenIds || [];
    
    const activeSales = safeSalesHistory.filter(s => s && !s.isHidden && !safeLocalHiddenIds.includes(s.id));
    
    activeSales.forEach(record => {
      try {
        const date = record.fullDate || "未知日期";
        if (!groups[date]) { 
          groups[date] = { date, total: 0, records: [], paymentGroups: {} }; 
        }
        const safeTotal = typeof record.total === 'number' ? record.total : 0;
        
        groups[date].records.push({ ...record, total: safeTotal, time: record.time || "--:--" });
        groups[date].total += safeTotal;
        
        const payMethod = record.paymentMethod || "現金";
        if (!groups[date].paymentGroups[payMethod]) { 
          groups[date].paymentGroups[payMethod] = { total: 0, items: {}, txns: [] }; 
        }
        
        groups[date].paymentGroups[payMethod].total += safeTotal;
        groups[date].paymentGroups[payMethod].txns.push(record);
        
        (record.items || []).forEach(item => {
          if (!item || !item.name) return;
          const itemKey = item.category ? `[${item.category}] ${item.name}` : item.name;
          if (!groups[date].paymentGroups[payMethod].items[itemKey]) { 
            groups[date].paymentGroups[payMethod].items[itemKey] = { 
              count: 0, 
              subtotal: 0, 
              price: item.price || 0,
              originalName: item.name,
              category: item.category || '其他'
            }; 
          }
          groups[date].paymentGroups[payMethod].items[itemKey].count += (item.quantity || 1);
          groups[date].paymentGroups[payMethod].items[itemKey].subtotal += ((item.price || 0) * (item.quantity || 1));
        });
      } catch (e) { console.error("Error grouping sales", e); }
    });
    
    return Object.values(groups).sort((a, b) => new Date(b.date) - new Date(a.date)).map(day => ({
      ...day,
      records: (day.records || []).sort((a, b) => (a?.timestamp || 0) - (b?.timestamp || 0))
    }));
  }, [salesHistory, localHiddenIds]);

  const totalPages = Math.max(1, Math.ceil((groupedSales || []).length / ITEMS_PER_PAGE));
  
  const paginatedDays = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return (groupedSales || []).slice(start, start + ITEMS_PER_PAGE);
  }, [groupedSales, currentPage]);

  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const matches = [];
    (groupedSales || []).forEach((day, dayIdx) => {
      (day.records || []).forEach(record => { 
        if (record?.note && typeof record.note === 'string' && record.note.includes(searchQuery)) {
          matches.push({ traceId: record.traceId, dayIndex: dayIdx }); 
        }
      });
    });
    return matches;
  }, [groupedSales, searchQuery]);

  // --- 5. 匯出邏輯 ---
  const generateCSVContent = (daysList, reportTitle) => {
    let csv = `\uFEFF若晞茶空間 ${reportTitle}\n\n`;
    const grandTotal = (daysList || []).reduce((s, d) => s + (d?.total || 0), 0);
    csv += `總計營收: ${grandTotal}元\n\n`;

    csv += "【 統計帳務 】\n付款方式,總額,狀態說明\n";
    const paymentSummary = {};
    (allPaymentMethods || []).forEach(m => {
      if (m?.name) paymentSummary[m.name] = 0;
    });
    
    (daysList || []).forEach(day => {
      if(day?.paymentGroups) {
        Object.entries(day.paymentGroups).forEach(([mName, g]) => {
          if (mName && !paymentSummary[mName]) paymentSummary[mName] = 0;
          if (mName) paymentSummary[mName] += (g?.total || 0);
        });
      }
    });
    
    Object.entries(paymentSummary).forEach(([mName, amount]) => {
      if (amount !== 0) csv += `${mName},${amount},${mName === '現金' ? '彙總於本表' : `詳見${mName}附錄`}\n`;
    });
    csv += "\n";

    csv += "【 統計數量 】\n品項名稱,銷售總量,銷售小計\n";
    const itemSummary = {}; 
    let otherSum = 0;
    
    (daysList || []).forEach(day => {
      (day?.records || []).forEach(r => {
        (r?.items || []).forEach(it => {
          if (!it || !it.name) return;
          if (it.category === '其他') {
            otherSum += ((it.price || 0) * (it.quantity || 1));
          } else {
            const displayName = it.category ? `[${it.category}] ${it.name}` : it.name;
            if (!itemSummary[displayName]) itemSummary[displayName] = { count: 0, subtotal: 0, originalName: it.name };
            itemSummary[displayName].count += (it.quantity || 1);
            itemSummary[displayName].subtotal += ((it.price || 0) * (it.quantity || 1));
          }
        });
      });
    });
    
    const sortedItems = Object.entries(itemSummary).sort((a, b) => {
      const itemA = (allProducts || []).find(p => p && p.name === a[1].originalName);
      const itemB = (allProducts || []).find(p => p && p.name === b[1].originalName);
      const orderA = itemA ? (itemA.sortOrder ?? 9999) : 9999;
      const orderB = itemB ? (itemB.sortOrder ?? 9999) : 9999;
      return orderA - orderB;
    });

    sortedItems.forEach(([name, data]) => {
      csv += `${name},${data?.count || 0},${data?.subtotal || 0}\n`;
    });
    if (otherSum !== 0) csv += `其他收入彙總,1,${otherSum}\n`;
    csv += "\n";

    const ascendingDaysList = [...(daysList || [])].sort((a, b) => new Date(a.date) - new Date(b.date));

    csv += "【 完整交易記錄 】\n交易日期,時間,金額,付款方式,內容,註\n";
    ascendingDaysList.forEach(day => {
      (day?.records || []).forEach(record => {
        const itemSummaryStr = (record?.items || []).map(it => `${it?.category ? `[${it.category}] ` : ''}${it?.name || '未知'}x${it?.quantity || 1}`).join('; ');
        csv += `${day?.date || ''},${record?.time || ''},${record?.total || 0},${record?.paymentMethod || '現金'},"${itemSummaryStr}","${record?.note || ''}"\n`;
      });
    });
    csv += "\n";

    const appendAppendix = (methodName) => {
      let appendCsv = `【 附錄：${methodName} 交易細項 】\n日期,時間,金額\n`;
      let hasAny = false;
      ascendingDaysList.forEach(day => {
        (day?.records || []).forEach(record => {
          if (record?.paymentMethod === methodName) {
            appendCsv += `${day?.date || ''},${record?.time || ''},${record?.total || 0}\n`;
            hasAny = true;
          }
        });
      });
      return hasAny ? appendCsv + "\n" : "";
    };

    csv += appendAppendix('Line Pay');
    csv += appendAppendix('轉帳');
    
    (allPaymentMethods || []).forEach(m => {
      if (m?.name && m.name !== '現金' && m.name !== 'Line Pay' && m.name !== '轉帳') {
        csv += appendAppendix(m.name);
      }
    });

    let otherTxnCsv = `【 附錄：其他類別交易明細 】\n交易日期,時間,金額,付款方式,備註\n`;
    let hasOtherTxns = false;
    
    ascendingDaysList.forEach(day => {
      (day?.records || []).forEach(record => {
        const otherItems = (record?.items || []).filter(it => it && it.category === '其他');
        if (otherItems.length > 0) {
          const totalOtherAmount = otherItems.reduce((sum, it) => sum + ((it.price || 0) * (it.quantity || 1)), 0);
          const safeNote = record?.note ? `"${record.note.replace(/"/g, '""')}"` : '""';
          
          otherTxnCsv += `${day?.date || ''},${record?.time || ''},${totalOtherAmount},${record?.paymentMethod || '現金'},${safeNote}\n`;
          hasOtherTxns = true;
        }
      });
    });
    
    if (hasOtherTxns) {
      csv += otherTxnCsv + "\n";
    }

    return csv;
  };

  const exportMonthlyReport = () => {
    const [year, month] = (exportMonth || "").split('-');
    if (!year || !month) return;
    
    const targetMonthSales = (groupedSales || []).filter(day => {
      try {
        if (!day || !day.date) return false;
        const parts = day.date.split('/'); 
        return parts[0] === year && parts[1].padStart(2, '0') === month;
      } catch(e) { return false; }
    });
    
    if (targetMonthSales.length === 0) return;
    
    const csv = generateCSVContent(targetMonthSales, `${year}年${month}月 報表`);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `若晞茶空間_月報表_${year}_${month}.csv`;
    link.click();
  };

  const exportDailyReport = (dayData) => {
    if (!dayData) return;
    const csv = generateCSVContent([dayData], `日報表 (${dayData.date})`);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `若晞茶空間_日報表_${(dayData.date || '').replace(/\//g, '-')}.csv`;
    link.click();
  };

  // --- 6. 互動邏輯 ---
  const requestDeleteRecord = async (id) => {
    if (!id || !user) return;
    try {
      setLocalHiddenIds(prev => [...(prev || []), id]);
      setUndoItem(id); 
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      undoTimerRef.current = setTimeout(() => setUndoItem(null), 4000);
      
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sales', id), { isHidden: true });
    } catch (err) { console.error("刪除失敗", err); }
  };

  const handleUndo = async () => {
    if (!undoItem || !user) return;
    try {
      const targetId = undoItem;
      setLocalHiddenIds(prev => (prev || []).filter(id => id !== targetId)); 
      setUndoItem(null);
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sales', targetId), { isHidden: false });
    } catch (err) { console.error("回復失敗", err); }
  };

  const checkout = () => {
    if (!currentSale || currentSale.length === 0) return;
    const now = new Date(); 
    const traceId = generateUUID(); 
    const orderData = { 
      fullDate: now.toLocaleDateString(), 
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
      timestamp: Date.now(), 
      traceId, 
      paymentMethod: selectedPayment, 
      items: currentSale.map(i => ({ 
        name: i?.name || '未知', 
        price: i?.price || 0, 
        quantity: i?.quantity || 1, 
        category: i?.category || '其他' 
      })), 
      total: currentSale.reduce((s, i) => s + ((i?.price || 0) * (i?.quantity || 1)), 0), 
      note: dailyNote || "", 
      isHidden: false 
    };
    
    try {
      if (typeof window !== 'undefined') {
        const currentQueue = JSON.parse(window.localStorage.getItem(`syncQueue_${appId}`) || "[]");
        window.localStorage.setItem(`syncQueue_${appId}`, JSON.stringify([...currentQueue, orderData])); 
      }
      setSyncQueue(prev => [...(prev || []), orderData]);
    } catch(e) {}
    
    setCurrentSale([]); 
    setDailyNote(""); 
    setSelectedPayment("現金"); 
    setShowMobileCart(false); 
    setView('reports'); 
    
    // 設定這筆記錄為新結帳，並且執行平滑滑動
    setNewOrderTraceId(traceId);
    setScrollTargetId(`record-${traceId}`); 
    setCurrentPage(1); 
    
    setTimeout(() => setNewOrderTraceId(null), 5000); 
    processSyncQueue();
  };

  // --- 編輯專用邏輯 ---
  const startEditingRecord = (record) => {
    setEditingRecord(record);
    setEditCart(JSON.parse(JSON.stringify(record.items || [])));
    setEditNote(record.note || "");
    setEditPayment(record.paymentMethod || "現金");
    setView('edit');
  };

  const cancelEditing = () => {
    setEditingRecord(null);
    setEditCart([]);
    setEditNote("");
    setEditPayment("現金");
    setShowMobileCart(false);
    setView('reports');
  };

  const handleEditComplete = async () => {
    if (!editCart || editCart.length === 0) {
      setShowEmptyEditPrompt(true);
      return;
    }
    if (!user || !editingRecord) return;
    
    try {
      const updatedTotal = editCart.reduce((s, i) => s + ((i?.price || 0) * (i?.quantity || 1)), 0);
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sales', editingRecord.id), {
        items: editCart.map(i => ({
          name: i?.name || '未知',
          price: i?.price || 0,
          quantity: i?.quantity || 1,
          category: i?.category || '其他'
        })),
        total: updatedTotal,
        note: editNote,
        paymentMethod: editPayment,
        updatedAt: serverTimestamp()
      });
      
      // 編輯完成只會滑動到目標，不會觸發「剛剛加入」的黃框
      setScrollTargetId(`record-${editingRecord.traceId}`);
      cancelEditing();
    } catch (err) { console.error("更新失敗", err); }
  };

  // 統一參數化點單與編輯共用的變數
  const isEditMode = view === 'edit';
  const displayCart = isEditMode ? editCart : currentSale;
  const setDisplayCart = isEditMode ? setEditCart : setCurrentSale;
  const displayNote = isEditMode ? editNote : dailyNote;
  const setDisplayNote = isEditMode ? setEditNote : setDailyNote;
  const displayPayment = isEditMode ? editPayment : selectedPayment;
  const setDisplayPayment = isEditMode ? setEditPayment : setSelectedPayment;
  const displayTotal = (displayCart || []).reduce((s, i) => s + ((i?.price || 0) * (i?.quantity || 1)), 0);

  // 通用的平滑滑動處理機制
  useEffect(() => {
    if (view === 'reports' && scrollTargetId) {
      const scrollTimer = setTimeout(() => {
        if (typeof document !== 'undefined') {
          const element = document.getElementById(scrollTargetId);
          if (element) {
            const isDayBlock = scrollTargetId.startsWith('day-block');
            // 如果是滑到日期區塊，考量到頂部導航列的高度來做稍微偏移
            const targetPosition = isDayBlock 
              ? element.getBoundingClientRect().top + window.scrollY - 80 
              : element.getBoundingClientRect().top + window.scrollY - (window.innerHeight / 2) + (element.offsetHeight / 2);
            
            const startPosition = window.scrollY;
            const distance = targetPosition - startPosition;
            let startTime = null;
            const duration = 1200;

            const animation = (currentTime) => {
              if (startTime === null) startTime = currentTime;
              const timeElapsed = currentTime - startTime;
              const progress = Math.min(timeElapsed / duration, 1);
              const ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
              window.scrollTo(0, startPosition + distance * ease);
              if (timeElapsed < duration) {
                requestAnimationFrame(animation);
              }
            };
            requestAnimationFrame(animation);
          }
        }
      }, 300);
      return () => clearTimeout(scrollTimer);
    }
  }, [view, scrollTargetId, currentPage]);

  const navigateSearch = (direction) => {
    if (!searchMatches || searchMatches.length === 0) return;
    let nextIndex = currentSearchIndex + direction;
    if (nextIndex < 0) nextIndex = searchMatches.length - 1;
    if (nextIndex >= searchMatches.length) nextIndex = 0;
    
    setCurrentSearchIndex(nextIndex); 
    const match = searchMatches[nextIndex];
    if (!match) return;
    
    const targetPage = Math.floor(match.dayIndex / ITEMS_PER_PAGE) + 1;
    if (currentPage !== targetPage) setCurrentPage(targetPage);
    
    // 讓搜尋結果也能被平滑滑動鎖定
    setScrollTargetId(`record-${match.traceId}`);
  };

  const jumpToDate = (dateStr) => {
    if (!dateStr) return;
    try {
      const formattedDate = new Date(dateStr).toLocaleDateString();
      const dayIndex = (groupedSales || []).findIndex(d => d && d.date === formattedDate);
      if (dayIndex !== -1) {
        const targetPage = Math.floor(dayIndex / ITEMS_PER_PAGE) + 1; 
        if (currentPage !== targetPage) {
          setCurrentPage(targetPage);
        }
        // 使用替換斜線後的乾淨 ID，避免與 CSS 選擇器衝突，並且保證平滑滑動
        setScrollTargetId(`day-block-${formattedDate.replace(/\//g, '-')}`);
      }
    } catch(e) {}
  };

  const handleEditSave = async (id) => {
    if (!user) return;
    try {
      const target = (allProducts || []).find(p => p?.id === id); 
      if (!target) return;
      const updateData = { 
        name: editBuffer.name, 
        price: Number(editBuffer.price), 
        category: target.category, 
        updatedAt: serverTimestamp() 
      };
      setEditingProductId(null);
      
      if (!target.isDefault && !target.id.startsWith('def_')) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', id), updateData);
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'products'), { ...updateData, originalName: target.name, isHidden: false });
      }
    } catch (err) { console.error(err); }
  };

  const confirmDelete = async () => {
    if (!productToDelete || !user) return;
    try {
      if (!productToDelete.isDefault && !productToDelete.id.startsWith('def_')) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', productToDelete.id), { isHidden: true, updatedAt: serverTimestamp() });
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'products'), {
          name: productToDelete.name, originalName: productToDelete.name, category: productToDelete.category, price: productToDelete.price, isHidden: true, updatedAt: serverTimestamp()
        });
      }
    } catch (err) { console.error(err); }
    finally { setProductToDelete(null); }
  };

  const moveProduct = async (index, direction) => {
    if (!user) return;
    const targetIndex = index + direction; 
    if (targetIndex < 0 || targetIndex >= (allProducts || []).length) return;
    
    const currentItem = allProducts[index]; 
    const neighborItem = allProducts[targetIndex];
    if (!currentItem || !neighborItem) return;
    
    const currentOrder = currentItem.sortOrder ?? (index * 10); 
    const neighborOrder = neighborItem.sortOrder ?? (targetIndex * 10);
    
    const updateItemOrder = async (item, newOrder) => {
      if (!item.isDefault && !item.id.startsWith('def_')) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', item.id), { sortOrder: newOrder });
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'products'), { name: item.name, originalName: item.name, category: item.category, price: item.price, sortOrder: newOrder });
      }
    };
    
    try { 
      await updateItemOrder(currentItem, neighborOrder); 
      await updateItemOrder(neighborItem, currentOrder === neighborOrder ? currentOrder + 1 : currentOrder); 
    } catch (err) { console.error(err); }
  };

  const getPayColorClass = (methodName, isActive = false) => {
    const method = (allPaymentMethods || []).find(m => m?.name === methodName);
    const color = method ? method.color : 'yellow';
    const colorMap = { 
      yellow: isActive ? (isEditMode ? 'bg-blue-500 border-blue-500 text-white' : 'bg-yellow-500 border-yellow-500 text-black') : 'border-slate-800 text-slate-400', 
      emerald: isActive ? (isEditMode ? 'bg-blue-500 border-blue-500 text-white' : 'bg-emerald-500 border-emerald-500 text-black') : 'border-slate-800 text-slate-400', 
      blue: isActive ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-800 text-slate-400', 
      purple: isActive ? (isEditMode ? 'bg-blue-500 border-blue-500 text-white' : 'bg-purple-500 border-purple-500 text-black') : 'border-slate-800 text-slate-400', 
      rose: isActive ? (isEditMode ? 'bg-blue-500 border-blue-500 text-white' : 'bg-rose-500 border-rose-500 text-black') : 'border-slate-800 text-slate-400', 
      cyan: isActive ? (isEditMode ? 'bg-blue-500 border-blue-500 text-white' : 'bg-cyan-500 border-cyan-500 text-black') : 'border-slate-800 text-slate-400' 
    };
    return colorMap[color] || colorMap.yellow;
  };

  const getPayBadge = (mName) => {
    const m = (allPaymentMethods || []).find(x => x?.name === mName) || { name: '現金', color: 'yellow' };
    const styleMap = { 
      yellow: { icon: <Banknote size={10}/>, color: 'text-yellow-500' }, 
      emerald: { icon: <Banknote size={10}/>, color: 'text-emerald-500' }, 
      blue: { icon: <ArrowRightLeft size={10}/>, color: 'text-blue-500' }, 
      purple: { icon: <CreditCard size={10}/>, color: 'text-purple-500' }, 
      rose: { icon: <CreditCard size={10}/>, color: 'text-rose-500' }, 
      cyan: { icon: <CreditCard size={10}/>, color: 'text-cyan-500' } 
    };
    const style = styleMap[m.color] || styleMap.yellow;
    return (
      <span className={`flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded ${style.color} border border-slate-800`}>
        {style.icon} {mName || '現金'}
      </span>
    );
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const pages = []; 
    let startPage = Math.max(1, currentPage - 2); 
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);
    for (let i = startPage; i <= endPage; i++) pages.push(i);
    
    return (
      <div className="flex flex-col items-center gap-4 py-8 border-t border-slate-800 mt-12">
        <div className="flex items-center gap-1 sm:gap-2">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 disabled:opacity-20 transition-all">
            <ChevronLeft size={20} />
          </button>
          
          {startPage > 1 && (
            <>
              <button onClick={() => setCurrentPage(1)} className="w-10 h-10 rounded-lg text-sm font-bold text-slate-400 hover:bg-slate-800 transition-all">1</button>
              {startPage > 2 && <MoreHorizontal size={16} className="text-slate-600 mx-1" />}
            </>
          )}
          
          {pages.map(p => (
            <button key={p} onClick={() => setCurrentPage(p)} className={`w-10 h-10 rounded-lg text-sm font-black transition-all ${currentPage === p ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              {p}
            </button>
          ))}
          
          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && <MoreHorizontal size={16} className="text-slate-600 mx-1" />}
              <button onClick={() => setCurrentPage(totalPages)} className="w-10 h-10 rounded-lg text-sm font-bold text-slate-400 hover:bg-slate-800 transition-all">{totalPages}</button>
            </>
          )}
          
          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 disabled:opacity-20 transition-all">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#070b1a] text-slate-200 font-sans pb-24 md:pb-0">
      <nav className="bg-[#0e1630] border-b border-slate-800 p-3 md:p-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
            <ShoppingCart size={18} className="text-[#070b1a]" />
          </div>
          <h1 className="text-sm md:text-lg font-bold text-white tracking-tight">若晞茶空間銷售管理系統</h1>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold ${isOnline ? 'text-emerald-500 bg-emerald-500/10' : 'text-red-500 bg-red-500/10'}`}>
            {isSaving ? <Loader2 size={12} className="animate-spin" /> : isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
            <span className="hidden sm:inline">{isSaving ? '同步中' : isOnline ? '連線中' : '離線模式'}</span>
            {(syncQueue || []).length > 0 && <span className="ml-1 bg-red-500 text-white px-1.5 rounded-full animate-pulse font-black">{syncQueue.length}</span>}
          </div>
          <div className="flex bg-[#070b1a] rounded-full p-1 border border-slate-800">
            {['sales', 'inventory', 'reports'].map(v => (
              <button 
                key={v} 
                onClick={() => {
                  if (view === 'edit') cancelEditing();
                  setView(v);
                }} 
                className={`px-3 md:px-5 py-1.5 rounded-full text-[10px] md:text-xs font-bold transition-all ${(view === v || (view === 'edit' && v === 'reports')) ? 'bg-yellow-500 text-black shadow-md' : 'text-slate-500 hover:text-white'}`}
              >
                {v === 'sales' ? '點單' : v === 'inventory' ? '品項' : '報表'}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="p-3 md:p-8 max-w-7xl mx-auto">
        {(view === 'sales' || view === 'edit') && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-6">
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar -mx-3 px-3 py-2 sticky top-[62px] z-40 bg-[#070b1a]/95 backdrop-blur-md">
                {['全部', '冷飲', '熱飲', '餐點', '其他'].map(cat => (
                  <button 
                    key={cat} 
                    onClick={() => setActiveCategory(cat)} 
                    className={`px-5 py-2 rounded-xl text-[11px] font-black border transition-all whitespace-nowrap ${activeCategory === cat ? (isEditMode ? 'bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-yellow-500 border-yellow-500 text-black shadow-lg shadow-yellow-500/20') : 'bg-[#0e1630] border-slate-800 text-slate-400'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {(allProducts || []).filter(p => p && (activeCategory === '全部' || p.category === activeCategory)).map(p => (
                  <button 
                    key={p.id} 
                    onClick={() => {
                      const ex = (displayCart || []).find(i => i?.name === p.name);
                      if(ex) setDisplayCart((displayCart || []).map(i => i?.name === p.name ? {...i, quantity: (i.quantity || 1) + 1} : i));
                      else setDisplayCart([...(displayCart || []), {...p, quantity: 1}]);
                    }} 
                    className={`p-4 bg-[#0e1630] border border-slate-800 rounded-2xl text-left active:scale-95 transition-all group ${isEditMode ? 'lg:hover:border-blue-500' : 'lg:hover:border-yellow-500'}`}
                  >
                    <div className="text-[9px] text-slate-500 uppercase font-black">{p.category}</div>
                    <div className="font-bold text-sm h-10 mt-1 text-white line-clamp-2">{p.name}</div>
                    <div className="mt-3 flex justify-between items-center">
                      <span className={`font-black ${isEditMode ? 'text-blue-400' : 'text-yellow-500'}`}>${p.price}</span>
                      <Plus size={14} className={`text-slate-600 ${isEditMode ? 'group-hover:text-blue-400' : 'group-hover:text-yellow-500'}`} />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="hidden lg:block lg:col-span-4">
              <div className="bg-[#0e1630] border border-slate-800 rounded-3xl p-6 sticky top-24 shadow-2xl h-[calc(100vh-140px)] flex flex-col">
                <h2 className={`text-xs font-bold mb-6 flex items-center gap-2 uppercase tracking-widest ${isEditMode ? 'text-blue-400' : 'text-slate-500'}`}>
                  <ClipboardList size={18} className={isEditMode ? 'text-blue-500' : 'text-yellow-500'} /> 
                  {isEditMode ? '編輯訂單內容' : '當前訂單'}
                </h2>
                <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                  {(!displayCart || displayCart.length === 0) ? (
                    <div className="py-10 text-center text-slate-700 text-sm italic">{isEditMode ? '訂單已清空' : '點擊左側品項開始'}</div>
                  ) : (
                    displayCart.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <div>
                          <div className="text-sm font-bold text-white">{item?.name}</div>
                          <div className="text-xs text-slate-500">${item?.price} × {item?.quantity}</div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className={`text-sm font-black ${isEditMode ? 'text-blue-400' : 'text-yellow-500'}`}>${(item?.price || 0) * (item?.quantity || 1)}</div>
                          <button onClick={() => setDisplayCart((displayCart || []).filter((_, i) => i !== idx))} className="text-slate-800 hover:text-red-400 p-1">
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-6 pt-6 border-t border-slate-800 space-y-4">
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest block">付款方式</span>
                    <div className="flex flex-wrap gap-2">
                      {(allPaymentMethods || []).map(m => (
                        <button 
                          key={m.name} 
                          onClick={() => setDisplayPayment(m.name)} 
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${getPayColorClass(m.name, displayPayment === m.name)}`}
                        >
                          {m.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea 
                    value={displayNote} 
                    onChange={e => setDisplayNote(e.target.value)} 
                    placeholder="備註…" 
                    className="w-full bg-[#070b1a] border border-slate-800 rounded-xl p-3 text-xs text-slate-300 h-16 outline-none" 
                  />
                  <div className="flex justify-between items-end">
                    <span className="text-xs text-slate-500 font-bold uppercase">總計</span>
                    <span className="text-4xl font-black text-white tracking-tighter">${displayTotal}</span>
                  </div>
                  {isEditMode ? (
                    <div className="flex gap-2">
                      <button onClick={cancelEditing} className="w-1/3 py-4 rounded-2xl bg-slate-800 text-white font-black hover:bg-slate-700 transition-all">取消</button>
                      <button onClick={handleEditComplete} className="flex-1 py-4 rounded-2xl bg-blue-500 text-white font-black hover:bg-blue-400 transition-all flex justify-center items-center gap-2">
                        修改完成
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={checkout} 
                      disabled={!displayCart || displayCart.length === 0} 
                      className="w-full py-4 rounded-2xl bg-yellow-500 text-black font-black hover:bg-yellow-400 disabled:bg-slate-800 transition-all flex justify-center items-center gap-2"
                    >
                      確認結帳
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {(view === 'sales' || view === 'edit') && displayCart && displayCart.length > 0 && (
          <button 
            onClick={() => setShowMobileCart(true)} 
            className={`lg:hidden fixed bottom-10 right-6 w-16 h-16 ${isEditMode ? 'bg-blue-500' : 'bg-yellow-500'} rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex items-center justify-center text-black z-[99] animate-bounce active:scale-90 transition-transform`}
          >
            <div className="relative">
              <ShoppingCart size={28} className={isEditMode ? 'text-white' : 'text-black'} />
              <span className={`absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full border-2 ${isEditMode ? 'border-blue-500' : 'border-yellow-500'}`}>
                {(displayCart || []).reduce((s, i) => s + (i?.quantity || 1), 0)}
              </span>
            </div>
          </button>
        )}

        {showMobileCart && (
          <div className="fixed inset-0 bg-black/95 z-[100] animate-in fade-in">
            <div className="absolute bottom-0 left-0 right-0 bg-[#0e1630] rounded-t-[40px] p-4 max-h-[98vh] flex flex-col border-t border-slate-800 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-base font-black text-white flex items-center gap-2">
                  <ShoppingCart size={18} className={isEditMode ? 'text-blue-500' : 'text-yellow-500'} /> 
                  {isEditMode ? '編輯確認' : '點單確認'} ({(displayCart || []).length})
                </h2>
                <button onClick={() => setShowMobileCart(false)} className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center text-slate-400">
                  <X size={18} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-1.5 mb-3 pr-1 custom-scrollbar">
                {(displayCart || []).map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-[#070b1a] py-1.5 px-3 rounded-xl border border-slate-800/50">
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="text-base font-bold text-white truncate leading-tight">{item?.name}</div>
                      <div className="text-[10px] text-slate-500 font-bold">${item?.price} × {item?.quantity}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className={`text-lg font-black tracking-tighter ${isEditMode ? 'text-blue-400' : 'text-yellow-500'}`}>${(item?.price || 0) * (item?.quantity || 1)}</div>
                      <button onClick={() => setDisplayCart((displayCart || []).filter((_, i) => i !== idx))} className="text-red-500/40 p-2 active:text-red-500">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3 pt-3 border-t border-slate-800/50">
                <div className="space-y-1.5">
                  <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest pl-1">付款方式</span>
                  <div className="flex flex-wrap gap-1.5 overflow-x-auto no-scrollbar pb-1">
                    {(allPaymentMethods || []).map(m => (
                      <button 
                        key={m.name} 
                        onClick={() => setDisplayPayment(m.name)} 
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap border transition-all ${getPayColorClass(m.name, displayPayment === m.name)}`}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="flex gap-2 items-center">
                  <textarea 
                    value={displayNote} 
                    onChange={e => setDisplayNote(e.target.value)} 
                    placeholder="備註…" 
                    className="flex-1 bg-[#070b1a] border border-slate-800 rounded-xl p-2 text-[10px] text-slate-400 h-10 outline-none resize-none" 
                  />
                  <div className="text-right shrink-0 min-w-[80px]">
                    <span className="text-slate-500 font-bold uppercase text-[9px] block mb-0.5">應收總計</span>
                    <span className="text-xl font-black text-white leading-none">${displayTotal}</span>
                  </div>
                </div>
                
                {isEditMode ? (
                  <div className="flex gap-2">
                    <button onClick={cancelEditing} className="w-1/3 py-3 rounded-xl bg-slate-800 text-white font-black text-sm active:scale-[0.98] transition-all">取消</button>
                    <button onClick={handleEditComplete} className="flex-1 py-3 rounded-xl bg-blue-500 text-white font-black text-sm active:scale-[0.98] transition-all shadow-lg shadow-blue-500/5">修改完成</button>
                  </div>
                ) : (
                  <button 
                    onClick={checkout} 
                    disabled={!displayCart || displayCart.length === 0} 
                    className="w-full py-3 rounded-xl bg-yellow-500 text-black font-black text-sm active:scale-[0.98] transition-all shadow-lg shadow-yellow-500/5"
                  >
                    確認送出訂單
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {view === 'inventory' && (
          <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="bg-[#0e1630] p-6 rounded-3xl border border-slate-800 shadow-2xl">
              <h2 className="text-xl font-black mb-6 flex items-center gap-3 italic text-white">
                <Settings className="text-yellow-500"/>品項管理
              </h2>
              <div className="grid grid-cols-1 gap-3 mb-8 bg-[#070b1a] p-6 rounded-2xl border border-slate-800">
                  <input 
                    className="w-full bg-[#0e1630] border border-slate-800 p-4 rounded-xl text-sm text-white" 
                    placeholder="新項目名稱" 
                    value={newItem.name} 
                    onChange={e=>setNewItem({...newItem, name: e.target.value})} 
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input 
                      className="w-full bg-[#0e1630] border border-slate-800 p-4 rounded-xl text-sm text-white" 
                      type="number" 
                      placeholder="單價" 
                      value={newItem.price} 
                      onChange={e=>setNewItem({...newItem, price: e.target.value})} 
                    />
                    <select 
                      className="w-full bg-[#0e1630] border border-slate-800 p-4 rounded-xl text-sm text-slate-400" 
                      value={newItem.category} 
                      onChange={e=>setNewItem({...newItem, category: e.target.value})}
                    >
                      {['冷飲', '熱飲', '餐點', '其他'].map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <button 
                    onClick={() => { 
                      if(!newItem.name || !newItem.price || !user) return; 
                      addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'products'), { 
                        ...newItem, 
                        price: Number(newItem.price), 
                        isHidden: false, 
                        sortOrder: (allProducts?.length || 0) * 10, 
                        updatedAt: serverTimestamp() 
                      }); 
                      setNewItem({name:'', price:'', category:'冷飲'}); 
                    }} 
                    className="bg-yellow-500 text-black py-4 rounded-xl font-black"
                  >
                    新增品項
                  </button>
              </div>
              
              <div className="space-y-2">
                {(allProducts || []).map((p, idx) => (
                  <div key={p.id} className="flex justify-between items-center p-4 bg-[#070b1a]/50 rounded-2xl border border-slate-800/50 min-h-[72px]">
                    {editingProductId === p.id ? (
                      <div className="flex-1 flex flex-wrap sm:flex-nowrap items-center gap-3 w-full">
                        <input 
                          className="flex-1 bg-[#0e1630] border border-yellow-500/50 p-2 rounded-xl text-sm text-white focus:outline-none focus:border-yellow-500 min-w-[120px]" 
                          value={editBuffer.name} 
                          onChange={e=>setEditBuffer({...editBuffer, name: e.target.value})} 
                          placeholder="品項名稱" autoFocus 
                        />
                        <input 
                          className="w-24 bg-[#0e1630] border border-yellow-500/50 p-2 rounded-xl text-sm text-white focus:outline-none focus:border-yellow-500" 
                          type="number" 
                          value={editBuffer.price} 
                          onChange={e=>setEditBuffer({...editBuffer, price: e.target.value})} 
                          placeholder="單價" 
                        />
                        <div className="flex items-center gap-1 ml-auto shrink-0">
                          <button onClick={() => handleEditSave(p.id)} className="p-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-lg transition-all"><Check size={18}/></button>
                          <button onClick={() => setEditingProductId(null)} className="p-2 bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white rounded-lg transition-all"><X size={18}/></button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col">
                            <button disabled={idx===0} onClick={()=>moveProduct(idx, -1)} className="p-1 text-slate-700 hover:text-yellow-500 disabled:opacity-10"><ChevronUp size={16}/></button>
                            <button disabled={idx===((allProducts || []).length)-1} onClick={()=>moveProduct(idx, 1)} className="p-1 text-slate-700 hover:text-yellow-500 disabled:opacity-10"><ChevronDown size={16}/></button>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black text-slate-600 uppercase">{p.category}</span>
                            <span className="font-bold text-sm text-slate-200">{p.name}</span>
                            <span className="text-yellow-500 font-black text-xs">${p.price}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => { setEditingProductId(p.id); setEditBuffer({ name: p.name, price: p.price }); }} className="p-2 text-slate-700 hover:text-yellow-500"><Edit3 size={18} /></button>
                          <button onClick={() => setProductToDelete(p)} className="p-2 text-slate-700 hover:text-red-500"><Trash2 size={18} /></button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#0e1630] p-6 rounded-3xl border border-slate-800 shadow-2xl">
              <h2 className="text-xl font-black mb-6 flex items-center gap-3 italic text-white"><CreditCard className="text-yellow-500"/>支付方式管理</h2>
              <div className="space-y-4 mb-6">
                <div className="flex gap-2">
                  <input 
                    className="flex-1 bg-[#070b1a] border border-slate-800 p-4 rounded-xl text-sm text-white" 
                    placeholder="新增支付方式" 
                    value={newPaymentName} 
                    onChange={e => setNewPaymentName(e.target.value)} 
                  />
                  <button 
                    onClick={() => { 
                      if(!newPaymentName.trim() || !user) return; 
                      addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'paymentMethods'), { name: newPaymentName.trim(), color: newPaymentColor, createdAt: serverTimestamp() }); 
                      setNewPaymentName(""); 
                    }} 
                    className="bg-yellow-500 text-black px-6 rounded-xl font-black"
                  >
                    新增
                  </button>
                </div>
                
                <div className="flex items-center gap-3 bg-[#070b1a] p-3 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest shrink-0"><Palette size={14}/> 選擇底色:</div>
                  <div className="flex gap-2">
                    {colorOptions.map(c => (
                      <button 
                        key={c.value} 
                        onClick={() => setNewPaymentColor(c.value)} 
                        className={`w-6 h-6 rounded-full border-2 transition-all ${newPaymentColor === c.value ? 'border-white scale-110' : 'border-transparent opacity-50'}`} 
                        style={{ backgroundColor: c.value === 'emerald' ? '#10b981' : c.value === 'rose' ? '#f43f5e' : c.value === 'cyan' ? '#06b6d4' : c.value === 'yellow' ? '#eab308' : c.value === 'blue' ? '#3b82f6' : '#a855f7' }} 
                        title={c.name} 
                      />
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(allPaymentMethods || []).map(m => (
                  <div key={m.name} className="bg-[#070b1a] p-3 rounded-xl border border-slate-800 flex justify-between items-center group">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color === 'emerald' ? '#10b981' : m.color === 'rose' ? '#f43f5e' : m.color === 'cyan' ? '#06b6d4' : m.color === 'yellow' ? '#eab308' : m.color === 'blue' ? '#3b82f6' : '#a855f7' }} />
                      <span className="text-xs font-bold text-slate-300">{m.name}</span>
                    </div>
                    {!(defaultPaymentMethods || []).some(dm => dm?.name === m.name) && (
                      <button 
                        onClick={async () => { 
                          const target = (dbPaymentMethods || []).find(dbM => dbM && dbM.name === m.name); 
                          if(target) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'paymentMethods', target.id)); 
                        }} 
                        className="text-slate-700 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {view === 'reports' && (
          <div className="space-y-6 pb-20 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-black text-white italic">銷售數據中心</h2>
                <button
                  onClick={() => setIsDeleteMode(!isDeleteMode)}
                  className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ${isDeleteMode ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-[#0e1630] border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'}`}
                  title={isDeleteMode ? "關閉刪除模式" : "開啟刪除模式"}
                >
                  <Trash2 size={18} />
                </button>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative">
                  <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 z-10" />
                  <input 
                    type="month" 
                    value={exportMonth} 
                    onChange={(e) => setExportMonth(e.target.value)} 
                    className="h-[42px] bg-[#0e1630] border border-slate-800 text-slate-300 text-xs font-bold rounded-xl pl-9 pr-3 outline-none focus:border-emerald-500 transition-all block box-border" 
                  />
                </div>
                <button 
                  onClick={exportMonthlyReport} 
                  className="flex-1 sm:flex-none h-[42px] bg-emerald-600 text-white px-5 rounded-xl font-bold flex items-center justify-center gap-2 text-xs shadow-lg shadow-emerald-500/10 hover:bg-emerald-500 transition-all box-border"
                >
                  <FileSpreadsheet size={16} /> 匯出月報表
                </button>
              </div>
            </div>

            <div className="bg-[#0e1630] border border-slate-800 p-3 rounded-2xl flex flex-col sm:flex-row items-center gap-3 sticky top-[62px] z-[45] shadow-xl">
              <div className="relative flex-1 w-full">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 z-10" />
                <input 
                  type="text" 
                  placeholder="搜尋關鍵字..." 
                  className="w-full h-[42px] bg-[#070b1a] border border-slate-800 rounded-xl pl-10 pr-10 text-sm text-white focus:border-yellow-500 outline-none transition-all block box-border" 
                  value={searchQuery} 
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentSearchIndex(-1); }} 
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(""); setCurrentSearchIndex(-1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white z-10">
                    <X size={16} />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button 
                  onClick={() => setIsSummarizedView(!isSummarizedView)} 
                  className={`flex items-center justify-center gap-2 px-4 h-[42px] rounded-xl border transition-all text-xs font-black shrink-0 box-border ${isSummarizedView ? 'bg-yellow-500 border-yellow-500 text-black' : 'bg-[#070b1a] border-slate-800 text-slate-400 hover:text-white'}`}
                >
                  {isSummarizedView ? <LayoutGrid size={16}/> : <Layers size={16}/>}
                  {isSummarizedView ? '統計帳務' : '統計數量'}
                </button>
                
                <div className="relative flex-1 sm:w-40">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-500 z-10" />
                  <input 
                    type="date" 
                    className="w-full h-[42px] bg-[#070b1a] border border-slate-800 rounded-xl pl-10 pr-3 text-xs text-white outline-none focus:border-yellow-500 block box-border" 
                    value={selectedDateJump} 
                    onChange={(e) => { setSelectedDateJump(e.target.value); jumpToDate(e.target.value); }} 
                  />
                </div>
                
                {(searchMatches || []).length > 0 && (
                  <div className="flex items-center h-[42px] gap-2 bg-[#070b1a] px-3 rounded-xl border border-slate-800 shrink-0 box-border">
                    <span className="text-[10px] font-black text-yellow-500 uppercase tracking-tighter">{currentSearchIndex + 1} / {searchMatches.length}</span>
                    <div className="flex gap-1 ml-1">
                      <button onClick={() => navigateSearch(-1)} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"><ChevronLeft size={18} /></button>
                      <button onClick={() => navigateSearch(1)} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"><ChevronRight size={18} /></button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {(!paginatedDays || paginatedDays.length === 0) ? (
              <div className="py-20 text-center text-slate-600 italic">尚無相關銷售紀錄</div>
            ) : paginatedDays.map(day => (
              <div key={day.date} id={`day-block-${day.date ? day.date.replace(/\//g, '-') : 'unknown'}`} className="bg-[#0e1630] rounded-3xl border border-slate-800 overflow-hidden shadow-2xl mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500 scroll-mt-24">
                
                <div className="bg-[#121c3b] p-6 flex justify-between items-center border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <Calendar className="text-yellow-500" size={24} />
                    <span className="text-xl font-black text-white">{day?.date || ''}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-[10px] text-slate-500 uppercase font-black">當日營收總計</div>
                      <div className="text-2xl font-black text-yellow-500 tracking-tighter">${day?.total || 0}</div>
                    </div>
                    <button 
                      onClick={() => exportDailyReport(day)} 
                      className="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-500 hover:text-white p-2 rounded-xl border border-emerald-500/30 transition-all flex items-center gap-2 text-[10px] font-black uppercase"
                    >
                      <Download size={14} /> 日報表
                    </button>
                  </div>
                </div>
                
                <div className="p-6 bg-[#070b1a]/30 space-y-10">
                  {isSummarizedView ? (
                    (() => {
                      const standardItems = {};
                      const otherTransactions = (day.records || []).map(r => {
                        const otherItemsInRecord = (r?.items || []).filter(it => it && it.category === '其他');
                        if (!otherItemsInRecord || otherItemsInRecord.length === 0) return null;
                        const totalOtherAmount = otherItemsInRecord.reduce((sum, it) => sum + ((it.price || 0) * (it.quantity || 1)), 0);
                        return { 
                          time: r?.time || '', 
                          total: totalOtherAmount, 
                          note: r?.note || '', 
                          paymentMethod: r?.paymentMethod || '現金', 
                          timestamp: r?.timestamp || 0 
                        };
                      }).filter(Boolean);

                      (day.records || []).forEach(r => {
                        (r?.items || []).forEach(it => {
                          if (it && it.category !== '其他') {
                            const displayName = it.category ? `[${it.category}] ${it.name}` : it.name;
                            if (!standardItems[displayName]) { standardItems[displayName] = { count: 0, subtotal: 0, price: it.price || 0 }; }
                            standardItems[displayName].count += (it.quantity || 1);
                            standardItems[displayName].subtotal += ((it.price || 0) * (it.quantity || 1));
                          }
                        });
                      });

                      return (
                        <div className="space-y-10 animate-in fade-in duration-300">
                          <div className="space-y-4">
                            <h3 className="text-[11px] font-black text-slate-400 flex items-center gap-2 uppercase tracking-[0.2em] border-b border-slate-800 pb-2"><BarChart3 size={16} className="text-emerald-500"/>統計數量 (不含其他)</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {Object.entries(standardItems).map(([name, data]) => (
                                <div key={name} className="bg-[#0e1630]/60 border border-slate-800/50 p-4 rounded-2xl flex justify-between items-center shadow-sm">
                                  <div>
                                    <div className="text-sm font-bold text-slate-200">{name}</div>
                                    <div className="text-[10px] text-slate-500">${data?.price || 0} / 單位</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm font-black text-white">x {data?.count || 0}</div>
                                    <div className="text-xs font-bold text-emerald-500">${data?.subtotal || 0}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          {otherTransactions.length > 0 && (
                            <div className="space-y-4">
                              <h3 className="text-[11px] font-black text-slate-400 flex items-center gap-2 uppercase tracking-[0.2em] border-b border-slate-800 pb-2"><List size={16} className="text-yellow-500"/>其他類別交易明細</h3>
                              <div className="space-y-2">
                                {otherTransactions.map((e, idx) => (
                                  <div key={idx} className="bg-[#0e1630]/60 border border-slate-800/50 p-4 rounded-2xl shadow-sm flex flex-col gap-2">
                                    <div className="flex justify-between items-start">
                                      <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-black text-slate-600">{e?.time || ''}</span>
                                        <span className="text-xs font-bold text-slate-200">其他收入匯總項目</span>
                                        <span className="px-2 py-0.5 rounded text-[8px] bg-slate-900 border border-slate-800 text-slate-500">{e?.paymentMethod || '現金'}</span>
                                      </div>
                                      <div className="flex flex-col items-end gap-1">
                                        <span className="text-sm font-black text-yellow-500">${e?.total || 0}</span>
                                        {e?.note && <div className="text-[11px] text-yellow-400/80 italic text-right max-w-[200px]">註: {e.note}</div>}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()
                  ) : (
                    (allPaymentMethods || []).map(method => {
                      if (!day?.paymentGroups) return null;
                      const group = day.paymentGroups[method.name]; 
                      if (!group) return null;
                      
                      return (
                        <div key={method.name} className="space-y-4 animate-in fade-in duration-300">
                          <h3 className="text-[11px] font-black text-slate-400 flex items-center gap-2 uppercase tracking-[0.2em] border-b border-slate-800 pb-2">
                            {method.name === '現金' ? <Banknote size={16} className="text-emerald-500"/> : method.name === '轉帳' ? <ArrowRightLeft size={16} className="text-blue-500"/> : <CreditCard size={16} className="text-yellow-500"/>}
                            {method.name} 結算 <span className="ml-auto text-white">${group?.total || 0}</span>
                          </h3>
                          
                          {method.name === '現金' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {(() => {
                                const standardEntries = [];
                                let cashOtherSum = 0;
                                Object.entries(group?.items || {}).forEach(([key, data]) => {
                                  const cat = data.category || ((allProducts || []).find(p => p && p.name === data.originalName)?.category);
                                  if (cat === '其他') cashOtherSum += (data?.subtotal || 0);
                                  else standardEntries.push({ name: key, ...data });
                                });
                                return (
                                  <>
                                    {standardEntries.map((data) => (
                                      <div key={data.name} className="bg-[#0e1630]/60 border border-slate-800/50 p-4 rounded-2xl flex justify-between items-center shadow-sm">
                                        <div>
                                          <div className="text-sm font-bold text-slate-200">{data.name}</div>
                                          <div className="text-[10px] text-slate-500">${data?.price || 0} / 單位</div>
                                        </div>
                                        <div className="text-right">
                                          <div className="text-sm font-black text-white">x {data?.count || 0}</div>
                                          <div className="text-xs font-bold text-emerald-500">${data?.subtotal || 0}</div>
                                        </div>
                                      </div>
                                    ))}
                                    {cashOtherSum !== 0 && (
                                      <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-2xl flex justify-between items-center shadow-sm">
                                        <div>
                                          <div className="text-sm font-black text-yellow-500">其他收入彙總</div>
                                          <div className="text-[10px] text-slate-500">混合金額</div>
                                        </div>
                                        <div className="text-right">
                                          <div className="text-sm font-black text-white">1 筆</div>
                                          <div className="text-xs font-black text-yellow-500">${cashOtherSum}</div>
                                        </div>
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          ) : method.name === '轉帳' ? (
                            <div className="bg-[#0e1630]/40 rounded-2xl border border-slate-800/30 overflow-hidden">
                              <div className="divide-y divide-slate-800/30">
                                {(group?.txns || []).map((t, idx) => (
                                  <div key={idx} className="p-3 px-4 hover:bg-white/5 transition-colors">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <Clock size={12} className="text-slate-600"/>
                                        <span className="text-[11px] font-bold text-slate-400">{t?.time || ''}</span>
                                        <span className="text-xs text-slate-300 line-clamp-1 italic">
                                          {(t?.items || []).map(it => `${it?.name || ''}x${it?.quantity || 1}`).join(', ')}
                                        </span>
                                      </div>
                                      <div className="flex flex-col items-end gap-1">
                                        <span className="text-sm font-black text-blue-400">${t?.total || 0}</span>
                                        {t?.note && <div className="text-[10px] text-yellow-500/70 italic text-right max-w-[180px]">註: {t.note}</div>}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                              {(group?.txns || []).map((t, idx) => (
                                <div key={idx} className="bg-[#0e1630]/60 border border-slate-800/50 p-3 rounded-xl flex flex-col items-center justify-center shadow-sm">
                                  <span className="text-[9px] font-bold text-slate-600 uppercase mb-1">{t?.time || ''}</span>
                                  <span className="text-lg font-black text-white">${t?.total || 0}</span>
                                  {t?.note && <span className="text-[9px] text-yellow-500/60 mt-1 truncate w-full text-center">註: {t.note}</span>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="border-t border-slate-800/50">
                  <button className="w-full p-4 flex items-center gap-2 text-[10px] font-black text-slate-600 hover:text-slate-400 transition-colors uppercase tracking-widest"><List size={14} /> 完整交易記錄</button>
                  <div className="divide-y divide-slate-800/30">
                    {(day.records || []).map(record => {
                      if (!record) return null;
                      const isFocusedSearch = currentSearchIndex >= 0 && (searchMatches || [])[currentSearchIndex]?.traceId === record.traceId;
                      // 只有在真的「結帳新增」的瞬間，這個 isNewOrder 才會是 true
                      const isNewOrder = newOrderTraceId && record.traceId === newOrderTraceId;
                      
                      return (
                        <div key={record.id || record.traceId} id={`record-${record.traceId}`} className={`px-6 py-4 flex justify-between items-start transition-all duration-500 ${isFocusedSearch ? 'bg-blue-500/20 ring-2 ring-blue-500 z-10' : isNewOrder ? 'bg-yellow-500/20 ring-2 ring-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.3)]' : 'hover:bg-slate-800/10'}`}>
                          <div className="space-y-1.5 flex-1 pr-4">
                            <div className="text-[10px] font-black text-slate-600 flex items-center gap-3">
                              <span>{record.time || ''}</span>
                              {getPayBadge(record.paymentMethod)}
                              {isNewOrder && <span className="bg-yellow-500 text-black text-[8px] px-1.5 py-0.5 rounded animate-pulse">剛剛加入</span>}
                              {isFocusedSearch && <span className="bg-blue-500 text-white text-[8px] px-1.5 py-0.5 rounded">搜尋結果</span>}
                            </div>
                            <div className="text-xs font-medium text-slate-300 flex flex-wrap gap-1">
                              {(record.items || []).map((it, i) => (
                                <span key={i} className="bg-slate-900 px-2 py-0.5 rounded text-[10px] border border-slate-800 flex items-center gap-1.5">
                                  {it?.category && <span className="text-[8px] text-slate-500 border-r border-slate-700 pr-1.5 leading-none h-3 flex items-center">{it.category}</span>}
                                  <span>{it?.name || ''}</span>
                                  <span className="text-slate-500 mx-0.5 font-bold">x</span>
                                  <span>{it?.quantity || 0}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end gap-1.5 ml-4">
                            <span className="font-black text-slate-200 text-sm">${record.total || 0}</span>
                            {record.note && typeof record.note === 'string' && (
                              <div className="text-xs tracking-wide font-medium text-right max-w-[200px]">
                                {searchQuery && record.note.includes(searchQuery) ? (
                                  <span className="text-slate-400">
                                    {record.note.split(searchQuery).map((part, i, arr) => (
                                      <React.Fragment key={i}>
                                        {part}
                                        {i !== arr.length - 1 && (<mark className="bg-yellow-500 text-black font-black px-0.5 rounded">{searchQuery}</mark>)}
                                      </React.Fragment>
                                    ))}
                                  </span>
                                ) : ( 
                                  <span className="text-yellow-400/70 italic">註: {record.note}</span> 
                                )}
                              </div>
                            )}
                            <div className="flex items-center gap-1 mt-1">
                              <button 
                                onClick={(e) => { e.stopPropagation(); startEditingRecord(record); }} 
                                className="text-slate-800 hover:text-blue-400 p-2 transition-colors active:scale-90 animate-in zoom-in duration-300" 
                                title="編輯記錄"
                              >
                                <Edit3 size={16} />
                              </button>
                              {isDeleteMode && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); requestDeleteRecord(record.id); }} 
                                  className="text-slate-800 hover:text-red-500 p-2 transition-colors active:scale-90 animate-in zoom-in duration-300" 
                                  title="移除記錄"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
            {renderPagination()}
          </div>
        )}
      </main>

      {/* --- 全域彈窗區 --- */}
      <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[110] transition-all duration-500 ${undoItem ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
        <div className="bg-white text-black px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-6 border-2 border-yellow-500 font-bold">
          <span className="flex items-center gap-2"><Check className="text-emerald-600" size={18}/> 記錄已刪除</span>
          <button onClick={handleUndo} className="bg-black text-white px-5 py-1.5 rounded-xl text-xs font-black active:scale-95 transition-transform">回復</button>
        </div>
      </div>

      {productToDelete && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[110] p-4">
          <div className="bg-[#0e1630] border border-slate-800 p-6 rounded-3xl shadow-2xl max-w-sm w-full">
            <h3 className="text-xl font-bold text-white mb-4">確認刪除品項</h3>
            <p className="text-slate-400 mb-6">確定將「<span className="text-yellow-500">{productToDelete.name}</span>」從選單中刪除嗎？</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setProductToDelete(null)} className="px-5 py-2 text-slate-400 font-bold hover:text-white transition-colors">取消</button>
              <button onClick={confirmDelete} className="px-5 py-2 bg-red-500 text-white rounded-xl font-bold hover:bg-red-400 transition-colors">確定刪除</button>
            </div>
          </div>
        </div>
      )}

      {showEmptyEditPrompt && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[120] p-4 animate-in fade-in">
          <div className="bg-[#0e1630] border border-slate-800 p-6 rounded-3xl shadow-2xl max-w-sm w-full">
            <h3 className="text-xl font-bold text-white mb-4">確定刪除此紀錄？</h3>
            <p className="text-slate-400 mb-6">因訂單內容已全部清空，若繼續修改將刪除此筆交易記錄。</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowEmptyEditPrompt(false)} className="px-5 py-2 text-slate-400 font-bold hover:text-white transition-colors">取消</button>
              <button 
                onClick={() => {
                  setShowEmptyEditPrompt(false);
                  requestDeleteRecord(editingRecord.id);
                  cancelEditing();
                }} 
                className="px-5 py-2 bg-red-500 text-white rounded-xl font-bold hover:bg-red-400 transition-colors"
              >
                是
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          html, body { touch-action: pan-y !important; user-scalable: no; overflow-x: hidden; width: 100%; position: relative; }
          input, textarea, select { font-size: 16px !important; }
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        body { background-color: #070b1a; }
        mark { background-color: #eab308; color: black; padding: 0 2px; border-radius: 2px; }
        input[type="date"]::-webkit-calendar-picker-indicator { background: transparent; bottom: 0; color: transparent; cursor: pointer; height: auto; left: 0; position: absolute; right: 0; top: 0; width: auto; }
        input[type="month"]::-webkit-calendar-picker-indicator { background: transparent; bottom: 0; color: transparent; cursor: pointer; height: auto; left: 0; position: absolute; right: 0; top: 0; width: auto; }
      `}</style>
    </div>
  );
};

export default App;
