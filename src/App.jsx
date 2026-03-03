import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, doc, onSnapshot, addDoc, updateDoc, query, serverTimestamp, setDoc, getDocs, where, deleteDoc } from 'firebase/firestore';
import { 
  Plus, Trash2, ShoppingCart, Settings, 
  ClipboardList, Calendar, FileSpreadsheet, X, Edit3, Check,
  ChevronUp, ChevronDown, Wifi, WifiOff, Menu, Loader2,
  BarChart3, List, Download, ShoppingBag
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

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'sales-manager-pro-v2'; 

const App = () => {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('sales'); 
  const [activeCategory, setActiveCategory] = useState('全部');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const [view, setView] = useState('sales'); 
  const [activeCategory, setActiveCategory] = useState('全部');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // 數據狀態
  const [dbProducts, setDbProducts] = useState([]);
  const [salesHistory, setSalesHistory] = useState([]);
  const [currentSale, setCurrentSale] = useState([]);
  const [dailyNote, setDailyNote] = useState("");
  const [newItem, setNewItem] = useState({ name: '', price: '', category: '冷飲' });
  
  // 離線同步與手機版狀態
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [syncQueue, setSyncQueue] = useState(() => {
    const saved = localStorage.getItem(`syncQueue_${appId}`);
    return saved ? JSON.parse(saved) : [];
  }); 

  // 編輯與顯示狀態
  const [editingProductId, setEditingProductId] = useState(null);
  const [editBuffer, setEditBuffer] = useState({ name: '', price: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const [localHiddenIds, setLocalHiddenIds] = useState([]); 
  const [productToDelete, setProductToDelete] = useState(null);
  const undoTimerRef = useRef(null);
  const isSyncingRef = useRef(false);

  // --- 核心同步邏輯 ---
  const processSyncQueue = async () => {
    if (!navigator.onLine || isSyncingRef.current || !auth.currentUser) return;
    const currentQueue = JSON.parse(localStorage.getItem(`syncQueue_${appId}`) || "[]");
    if (currentQueue.length === 0) {
      setIsSaving(false);
      return;
    }
    isSyncingRef.current = true;
    setIsSaving(true);
    try {
      while (currentQueue.length > 0) {
        const item = currentQueue[0];
        const docToUpload = { ...item, createdAt: serverTimestamp(), syncedAt: Date.now() };
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'sales'), docToUpload);
        currentQueue.shift();
        localStorage.setItem(`syncQueue_${appId}`, JSON.stringify(currentQueue));
        setSyncQueue([...currentQueue]);
      }
    } catch (err) {
      console.error("同步過程中發生錯誤:", err);
    } finally {
      setIsSaving(false);
      isSyncingRef.current = false;
    }
  };

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); setTimeout(processSyncQueue, 1000); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    if (user && syncQueue.length > 0) processSyncQueue();
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user]);

  // 預設品項
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
    { id: 'def_o1', name: '其他收入 1元', price: 1, category: '其他', isDefault: true, sortOrder: 1000 },
    { id: 'def_o2', name: '其他收入 10元', price: 10, category: '其他', isDefault: true, sortOrder: 1010 },
    { id: 'def_o3', name: '其他收入 100元', price: 100, category: '其他', isDefault: true, sortOrder: 1020 },
    { id: 'def_o4', name: '其他收入 1000元', price: 1000, category: '其他', isDefault: true, sortOrder: 1030 },
    { id: 'def_ex1', name: '臨時支出 -1元', price: -1, category: '其他', isDefault: true, sortOrder: 2000 },
    { id: 'def_ex2', name: '臨時支出 -10元', price: -10, category: '其他', isDefault: true, sortOrder: 2010 },
    { id: 'def_ex3', name: '臨時支出 -100元', price: -100, category: '其他', isDefault: true, sortOrder: 2020 },
    { id: 'def_ex4', name: '臨時支出 -1000元', price: -1000, category: '其他', isDefault: true, sortOrder: 2030 },
  ], []);

  // --- 認證與監聽 ---
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else { await signInAnonymously(auth); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubProducts = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'products'), (s) => 
      setDbProducts(s.docs.map(d => ({ ...d.data(), id: d.id })))
    );
    const unsubSales = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'sales'), (s) => 
      setSalesHistory(s.docs.map(d => ({ ...d.data(), id: d.id })))
    );
    return () => { unsubProducts(); unsubSales(); };
  }, [user]);

  const allProducts = useMemo(() => {
    const hiddenNames = new Set(dbProducts.filter(p => p.isHidden || p.isDeleted).map(p => p.originalName || p.name));
    let result = defaultProducts.filter(p => !hiddenNames.has(p.name));
    const activeDbEntries = dbProducts.filter(p => !p.isHidden && !p.isDeleted);
    activeDbEntries.forEach(dbP => {
      if (dbP.originalName) {
        const idx = result.findIndex(p => p.isDefault && p.name === dbP.originalName);
        if (idx !== -1) result[idx] = { ...result[idx], ...dbP, isDefault: false };
      } else {
        if (!result.some(p => p.name === dbP.name)) result.push({ ...dbP, isDefault: false });
      }
    });
    return result.sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999));
  }, [dbProducts, defaultProducts]);

  const checkout = () => {
    if (currentSale.length === 0) return;
    const now = new Date();
    const orderData = {
      fullDate: now.toLocaleDateString(),
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now(),
      traceId: crypto.randomUUID(),
      items: currentSale.map(i => ({ name: i.name, price: i.price, quantity: i.quantity })),
      total: currentSale.reduce((s, i) => s + (i.price * i.quantity), 0),
      note: dailyNote,
      isHidden: false
    };
    const currentQueue = JSON.parse(localStorage.getItem(`syncQueue_${appId}`) || "[]");
    const newQueue = [...currentQueue, orderData];
    localStorage.setItem(`syncQueue_${appId}`, JSON.stringify(newQueue));
    setSyncQueue(newQueue);
    setCurrentSale([]);
        setDailyNote("");
    setShowMobileCart(false);
    processSyncQueue();
  };

  const requestDeleteRecord = async (id) => {
    if (!id) return;
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sales', id), { isHidden: true });
      setLocalHiddenIds(prev => [...prev, id]);
    } catch (err) { console.error("刪除失敗", err); }
  };

  const handleEditSave = (id) => {
    try {
      const target = allProducts.find(p => p.id === id);
      if (!target) return;
      const updateData = { name: editBuffer.name, price: Number(editBuffer.price), category: target.category, updatedAt: serverTimestamp() };
      setEditingProductId(null);
      if (!target.isDefault && !target.id.startsWith('def_')) {
        updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', id), updateData);
      } else {
        addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'products'), { ...updateData, originalName: target.name, isHidden: false });
      }
    } catch (err) { console.error(err); }
  };

  const confirmDelete = () => {
    if (!productToDelete) return;
    try {
      if (!productToDelete.isDefault && !productToDelete.id.startsWith('def_')) {
        updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', productToDelete.id), { isHidden: true, updatedAt: serverTimestamp() });
      } else {
        addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'products'), { name: productToDelete.name, originalName: productToDelete.name, category: productToDelete.category, price: productToDelete.price, isHidden: true, updatedAt: serverTimestamp() });
      }
    } catch (err) { console.error(err); } finally { setProductToDelete(null); }
  };

  const moveProduct = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= allProducts.length) return;
    const currentItem = allProducts[index];
    const neighborItem = allProducts[targetIndex];
    const currentOrder = currentItem.sortOrder ?? (index * 10);
    const neighborOrder = neighborItem.sortOrder ?? (targetIndex * 10);
    const updateItemOrder = (item, newOrder) => {
      if (!item.isDefault && !item.id.startsWith('def_')) {
        updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', item.id), { sortOrder: newOrder });
      } else {
        addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'products'), { name: item.name, originalName: item.name, category: item.category, price: item.price, sortOrder: newOrder });
      }
    };
    try { updateItemOrder(currentItem, neighborOrder); updateItemOrder(neighborItem, currentOrder === neighborOrder ? currentOrder + 1 : currentOrder); } catch (err) { console.error(err); }
  };

  // --- 報表數據彙整 ---
  const groupedSales = useMemo(() => {
    const groups = {};
    const activeSales = salesHistory.filter(s => !s.isHidden && !localHiddenIds.includes(s.id));
    activeSales.forEach(record => {
      try {
        const date = record.fullDate || "未知日期";
        if (!groups[date]) groups[date] = { date, total: 0, records: [], summary: {} };
        const safeTotal = typeof record.total === 'number' ? record.total : 0;
        groups[date].records.push({ ...record, total: safeTotal, time: record.time || "--:--" });
        groups[date].total += safeTotal;
        record.items.forEach(item => {
          if (!groups[date].summary[item.name]) groups[date].summary[item.name] = { count: 0, subtotal: 0, price: item.price };
          groups[date].summary[item.name].count += item.quantity;
          groups[date].summary[item.name].subtotal += (item.price * item.quantity);
        });
      } catch (e) { console.error(e); }
    });
    return Object.values(groups).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [salesHistory, localHiddenIds]);

  const downloadCSV = (dataList, filename) => {
    let csv = "\uFEFF統計日期,品項名稱,單價,銷售數量,銷售小計\n";
    dataList.forEach(day => {
      Object.entries(day.summary).forEach(([name, data]) => {
        csv += `${day.date},"${name}",${data.price},${data.count},${data.subtotal}\n`;
      });
      csv += `${day.date},當日總計,, ,${day.total}\n\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const cartTotal = currentSale.reduce((s, i) => s + (i.price * i.quantity), 0);
  const cartItemCount = currentSale.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="min-h-screen bg-[#070b1a] text-slate-200 font-sans pb-24 md:pb-0 selection:bg-yellow-500/30">
      <nav className="bg-[#0e1630] border-b border-slate-800 p-3 md:p-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(234,179,8,0.2)]">
            <ShoppingCart size={18} className="text-[#070b1a]" />
          </div>
          <h1 className="text-sm md:text-lg font-bold text-white tracking-tight">若晞茶空間</h1>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold ${isOnline ? 'text-emerald-500 bg-emerald-500/10' : 'text-red-500 bg-red-500/10'}`}>
            {isSaving ? <Loader2 size={12} className="animate-spin" /> : isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
            <span className="hidden xs:inline">{isSaving ? '同步中' : isOnline ? '連線中' : '離線模式'}</span>
            {syncQueue.length > 0 && <span className="ml-1 bg-red-500 text-white px-1.5 rounded-full animate-pulse font-black">{syncQueue.length}</span>}
          </div>
          <div className="flex bg-[#070b1a] rounded-full p-1 border border-slate-800">
            {['sales', 'inventory', 'reports'].map(v => (
              <button key={v} onClick={() => setView(v)} className={`px-3 md:px-5 py-1.5 rounded-full text-[10px] md:text-xs font-bold transition-all ${view === v ? 'bg-yellow-500 text-black shadow-md' : 'text-slate-500 hover:text-white'}`}>
                {v === 'sales' ? '點單' : v === 'inventory' ? '品項' : '報表'}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="p-3 md:p-8 max-w-7xl mx-auto">
        {view === 'sales' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-6">
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar -mx-3 px-3 py-2 sticky top-[62px] z-40 bg-[#070b1a]/95 backdrop-blur-md border-b border-slate-800/50">
                {['全部', '冷飲', '熱飲', '餐點', '其他'].map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-5 py-2 rounded-xl text-[11px] font-black border transition-all whitespace-nowrap ${activeCategory === cat ? 'bg-yellow-500 border-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'bg-[#0e1630] border-slate-800 text-slate-400'}`}>
                    {cat}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {allProducts.filter(p => activeCategory === '全部' || p.category === activeCategory).map(p => (
                  <button key={p.id} onClick={() => {
                    const ex = currentSale.find(i => i.name === p.name);
                    if(ex) setCurrentSale(currentSale.map(i => i.name === p.name ? {...i, quantity: i.quantity+1}:i));
                    else setCurrentSale([...currentSale, {...p, quantity: 1}]);
                  }} className="p-4 bg-[#0e1630] border border-slate-800 rounded-2xl text-left hover:border-yellow-500 active:scale-95 transition-all group shadow-sm">
                    <div className="text-[9px] text-slate-500 uppercase font-black tracking-widest">{p.category}</div>
                    <div className="font-bold text-sm h-10 mt-1 text-white line-clamp-2">{p.name}</div>
                    <div className="mt-3 flex justify-between items-center">
                      <span className="font-black text-yellow-500 text-lg">${p.price}</span>
                      <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-yellow-500 transition-colors">
                        <Plus size={14} className="text-slate-400 group-hover:text-black" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="hidden lg:block lg:col-span-4">
              <div className="bg-[#0e1630] border border-slate-800 rounded-3xl p-6 sticky top-24 shadow-2xl h-[calc(100vh-140px)] flex flex-col">
                <h2 className="text-xs font-bold text-slate-500 mb-6 flex items-center gap-2 uppercase tracking-widest"><ClipboardList size={18} className="text-yellow-500" /> 當前訂單</h2>
                <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                  {currentSale.length === 0 ? <div className="py-10 text-center text-slate-700 text-sm italic">點擊左側品項開始</div> : 
                    currentSale.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-[#070b1a]/40 p-3 rounded-xl border border-slate-800/50">
                        <div>
                          <div className="text-sm font-bold text-white">{item.name}</div>
                          <div className="text-xs text-slate-500">${item.price} × {item.quantity}</div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-sm font-black text-yellow-500">${item.price * item.quantity}</div>
                          <button onClick={() => setCurrentSale(currentSale.filter((_, i) => i !== idx))} className="text-slate-600 hover:text-red-400 p-1"><X size={14} /></button>
                        </div>
                      </div>
                    ))
                  }
                </div>
                <div className="mt-6 pt-6 border-t border-slate-800 space-y-4">
                  <textarea value={dailyNote} onChange={e => setDailyNote(e.target.value)} placeholder="備註資訊..." className="w-full bg-[#070b1a] border border-slate-800 rounded-xl p-3 text-xs text-slate-300 h-20 outline-none focus:border-yellow-500/50 transition-colors" />
                  <div className="flex justify-between items-end">
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-tighter">總額</span>
                    <span className="text-4xl font-black text-white tracking-tighter">${cartTotal}</span>
                  </div>
                  <button onClick={checkout} disabled={currentSale.length===0} className="w-full py-4 rounded-2xl bg-yellow-500 text-black font-black hover:bg-yellow-400 disabled:bg-slate-800 disabled:text-slate-500 transition-all flex justify-center items-center gap-2 shadow-lg shadow-yellow-500/10">確認結帳</button>
                </div>
              </div>
            </div>

            <div className="lg:hidden fixed bottom-8 right-6 z-[60]">
              <button 
                onClick={() => setShowMobileCart(true)}
                className={`w-16 h-16 rounded-full bg-yellow-500 text-black shadow-[0_10px_30px_rgba(234,179,8,0.4)] flex items-center justify-center transition-all active:scale-90 ${currentSale.length > 0 ? 'scale-110 opacity-100' : 'scale-0 opacity-0'}`}
              >
                <div className="relative">
                  <ShoppingBag size={28} />
                  {cartItemCount > 0 && (
                    <span className="absolute -top-3 -right-3 bg-red-500 text-white text-[10px] font-black min-w-[24px] h-6 px-1 rounded-full flex items-center justify-center border-2 border-yellow-500">
                      {cartItemCount}
                    </span>
                  )}
                </div>
              </button>
            </div>

            {showMobileCart && (
              <div className="fixed inset-0 bg-[#070b1a] z-[100] lg:hidden flex flex-col animate-in slide-in-from-bottom duration-300">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-[#0e1630]">
                  <h2 className="font-black text-white flex items-center gap-2 italic"><ClipboardList className="text-yellow-500" size={20} /> 當前訂單</h2>
                  <button onClick={() => setShowMobileCart(false)} className="p-2 text-slate-400 bg-slate-800/50 rounded-full"><X size={20} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {currentSale.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-700 gap-4 italic text-sm">
                      <ShoppingBag size={48} className="opacity-20" />
                      <p>籃子裡空空的</p>
                    </div>
                  ) : (
                    currentSale.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-[#0e1630] p-4 rounded-2xl border border-slate-800">
                        <div>
                          <div className="text-base font-bold text-white">{item.name}</div>
                          <div className="text-xs text-slate-500">${item.price} × {item.quantity}</div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-lg font-black text-yellow-500">${item.price * item.quantity}</div>
                          <button onClick={() => setCurrentSale(currentSale.filter((_, i) => i !== idx))} className="text-red-400 p-2 bg-red-400/10 rounded-xl"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-6 bg-[#0e1630] border-t border-slate-800 space-y-4 shadow-[0_-15px_40px_rgba(0,0,0,0.6)]">
                  <textarea 
                    value={dailyNote} 
                    onChange={e => setDailyNote(e.target.value)} 
                    placeholder="輸入訂單備註..." 
                    className="w-full bg-[#070b1a] border border-slate-800 rounded-2xl p-4 text-sm text-slate-200 h-24 outline-none focus:border-yellow-500/50" 
                  />
                  <div className="flex justify-between items-center px-2">
                    <span className="text-xs text-slate-500 font-black uppercase tracking-widest">總金額</span>
                    <span className="text-4xl font-black text-white tracking-tighter">${cartTotal}</span>
                  </div>
                  <button 
                    onClick={checkout} 
                    disabled={currentSale.length === 0} 
                    className="w-full py-5 rounded-2xl bg-yellow-500 text-black font-black text-lg shadow-xl shadow-yellow-500/10 active:scale-95 transition-transform"
                  >
                    結帳完成
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'inventory' && (
          <div className="bg-[#0e1630] p-6 rounded-3xl border border-slate-800 max-w-2xl mx-auto shadow-2xl">
            <h2 className="text-xl font-black mb-6 flex items-center gap-3 italic text-white"><Settings className="text-yellow-500"/>品項庫管理</h2>
            <div className="grid grid-cols-1 gap-3 mb-8 bg-[#070b1a] p-6 rounded-2xl border border-slate-800">
                <input className="w-full bg-[#0e1630] border border-slate-800 p-4 rounded-xl text-sm" placeholder="新項目名稱" value={newItem.name} onChange={e=>setNewItem({...newItem, name: e.target.value})} />
                <div className="grid grid-cols-2 gap-3">
                  <input className="w-full bg-[#0e1630] border border-slate-800 p-4 rounded-xl text-sm" type="number" placeholder="單價" value={newItem.price} onChange={e=>setNewItem({...newItem, price: e.target.value})} />
                  <select className="w-full bg-[#0e1630] border border-slate-800 p-4 rounded-xl text-sm text-slate-400" value={newItem.category} onChange={e=>setNewItem({...newItem, category: e.target.value})}>
                    {['冷飲', '熱飲', '餐點', '其他'].map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <button onClick={()=>{
                  if(!newItem.name || !newItem.price) return;
                  addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'products'), { ...newItem, price: Number(newItem.price), isHidden: false, sortOrder: allProducts.length * 10, updatedAt: serverTimestamp() });
                  setNewItem({name:'', price:'', category:'冷飲'});
                }} className="bg-yellow-500 text-black py-4 rounded-xl font-black shadow-lg shadow-yellow-500/10">新增品項</button>
            </div>
            <div className="space-y-2">
              {allProducts.map((p, idx)=>(
                <div key={p.id} className="flex justify-between items-center p-4 bg-[#070b1a]/50 rounded-2xl border border-slate-800/50">
                  {editingProductId === p.id ? (
                    <div className="flex-1 flex flex-wrap sm:flex-nowrap items-center gap-3 w-full">
                      <input className="flex-1 bg-[#0e1630] border border-yellow-500/50 p-2 rounded-xl text-sm text-white focus:outline-none focus:border-yellow-500 min-w-[120px]" value={editBuffer.name} onChange={e=>setEditBuffer({...editBuffer, name: e.target.value})} />
                      <input className="w-24 bg-[#0e1630] border border-yellow-500/50 p-2 rounded-xl text-sm text-white" type="number" value={editBuffer.price} onChange={e=>setEditBuffer({...editBuffer, price: e.target.value})} />
                      <div className="flex items-center gap-1 ml-auto shrink-0">
                        <button onClick={() => handleEditSave(p.id)} className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg"><Check size={18}/></button>
                        <button onClick={() => setEditingProductId(null)} className="p-2 bg-slate-800 text-slate-400 rounded-lg"><X size={18}/></button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                          <button disabled={idx===0} onClick={()=>moveProduct(idx, -1)} className="p-1 text-slate-700 hover:text-yellow-500 disabled:opacity-0"><ChevronUp size={16}/></button>
                          <button disabled={idx===allProducts.length-1} onClick={()=>moveProduct(idx, 1)} className="p-1 text-slate-700 hover:text-yellow-500 disabled:opacity-0"><ChevronDown size={16}/></button>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{p.category}</span>
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
        )}

        {view === 'reports' && (
          <div className="space-y-8 pb-20">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2">
              <h2 className="text-2xl font-black text-white italic tracking-tight">銷售大數據中心</h2>
              <button onClick={() => { if (groupedSales.length > 0) downloadCSV(groupedSales, `若晞完整報表.csv`); }} className="w-full sm:w-auto bg-[#0e1630] text-emerald-500 border border-emerald-500/20 px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 text-xs hover:bg-emerald-500 hover:text-white transition-all">
                <FileSpreadsheet size={16} /> 匯出全部資料
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {groupedSales.length > 0 ? (
                groupedSales.map((day) => (
                  <div key={day.date} className="bg-[#0e1630] rounded-[24px] shadow-sm border border-slate-800 p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-800 flex items-center justify-center rounded-2xl">
                        <BarChart3 className="text-slate-400" size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-white">{day.date}</h4>
                        <p className="text-sm text-slate-400">{day.records.length} 筆訂單</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-yellow-500">${day.total.toLocaleString()}</p>
                      <button onClick={() => downloadCSV([day], `${day.date}-日報表.csv`)} className="mt-2 text-sm text-emerald-500 hover:text-emerald-400 flex items-center justify-end gap-1"><Download size={14} /> 匯出</button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-slate-500 mt-20">目前還沒有銷售紀錄。</div>
              )}
            </div>
          </div>
        )}
      </main>

      {productToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <div className="bg-[#0e1630] border border-slate-800 p-6 rounded-3xl shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-white mb-4 italic">確認刪除</h3>
            <p className="text-slate-400 mb-6 text-sm leading-relaxed">確定要將「<span className="text-yellow-500 font-bold">{productToDelete.name}</span>」從系統中移除嗎？此動作不可撤回。</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setProductToDelete(null)} className="px-5 py-2 text-slate-500 font-bold">取消</button>
              <button onClick={confirmDelete} className="px-5 py-2 bg-red-500 text-white rounded-xl font-bold shadow-lg shadow-red-500/10">確認移除</button>
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        body { 
          background-color: #070b1a; 
          margin: 0; 
          padding: 0; 
          overscroll-behavior-y: contain; 
        }
        @media all and (display-mode: standalone) {
          nav { padding-top: env(safe-area-inset-top); }
          .pb-24 { padding-bottom: calc(6rem + env(safe-area-inset-bottom)); }
        }
      `}</style>
    </div>
  );
};

export default App;
