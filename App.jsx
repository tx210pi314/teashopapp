import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, onSnapshot, addDoc, updateDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { 
  Plus, Trash2, ShoppingCart, Settings, 
  ClipboardList, Calendar, FileSpreadsheet, X, Edit3, Check,
  ChevronUp, ChevronDown, Wifi, WifiOff, Loader2,
  BarChart3, List, Download, ShoppingBag
} from 'lucide-react';

// ==========================================
// 1. 這裡填入你從 Firebase 複製的門牌資訊
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyCc7aKnXJ6IzDhoDr4sP2A6Xfe-MdQ8Bas",
  authDomain: "testteahouse.firebaseapp.com",
  projectId: "testteahouse",
  storageBucket: "testteahouse.firebasestorage.app",
  messagingSenderId: "849994588808",
  appId: "1:849994588808:web:4cc97da5637e557b6db53d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'sales-manager-pro-v2'; 

const App = () => {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('sales'); 
  const [activeCategory, setActiveCategory] = useState('全部');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [dbProducts, setDbProducts] = useState([]);
  const [salesHistory, setSalesHistory] = useState([]);
  const [currentSale, setCurrentSale] = useState([]);
  const [dailyNote, setDailyNote] = useState("");
  const [newItem, setNewItem] = useState({ name: '', price: '', category: '冷飲' });
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [syncQueue, setSyncQueue] = useState(() => {
    const saved = localStorage.getItem(`syncQueue_${appId}`);
    return saved ? JSON.parse(saved) : [];
  }); 
  const [editingProductId, setEditingProductId] = useState(null);
  const [editBuffer, setEditBuffer] = useState({ name: '', price: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const [localHiddenIds, setLocalHiddenIds] = useState([]); 
  const [productToDelete, setProductToDelete] = useState(null);
  const isSyncingRef = useRef(false);

  // --- 核心同步與資料讀取邏輯 ---
  const processSyncQueue = async () => {
    if (!navigator.onLine || isSyncingRef.current || !auth.currentUser) return;
    const currentQueue = JSON.parse(localStorage.getItem(`syncQueue_${appId}`) || "[]");
    if (currentQueue.length === 0) { setIsSaving(false); return; }
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
    } catch (err) { console.error("同步錯誤:", err); } 
    finally { setIsSaving(false); isSyncingRef.current = false; }
  };

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); setTimeout(processSyncQueue, 1000); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    if (user && syncQueue.length > 0) processSyncQueue();
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, [user]);

  const defaultProducts = useMemo(() => [
    { id: 'def_c1', name: '紫翳光', price: 220, category: '冷飲', isDefault: true, sortOrder: 10 },
    { id: 'def_c2', name: '十方仙境', price: 220, category: '冷飲', isDefault: true, sortOrder: 20 },
    { id: 'def_c3', name: '茶之光 100ml', price: 350, category: '冷飲', isDefault: true, sortOrder: 30 },
    { id: 'def_c4', name: '茶之光 350ml', price: 1200, category: '冷飲', isDefault: true, sortOrder: 40 },
    { id: 'def_h1', name: '紫翳光(內)', price: 220, category: '熱飲', isDefault: true, sortOrder: 50 },
    { id: 'def_h2', name: '紫翳光(外)', price: 250, category: '熱飲', isDefault: true, sortOrder: 60 },
    { id: 'def_h3', name: '白毫雪露(內)', price: 220, category: '熱飲', isDefault: true, sortOrder: 70 },
    { id: 'def_h4', name: '白毫雪露(外)', price: 250, category: '熱飲', isDefault: true, sortOrder: 80 },
    { id: 'def_f1', name: '琥珀糖內用(三入)', price: 60, category: '餐點', isDefault: true, sortOrder: 120 },
    { id: 'def_o1', name: '其他收入 1元', price: 1, category: '其他', isDefault: true, sortOrder: 1000 }
  ], []);

  useEffect(() => {
    signInAnonymously(auth).catch(err => console.error("登入失敗", err));
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
      } else if (!result.some(p => p.name === dbP.name)) {
        result.push({ ...dbP, isDefault: false });
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
    localStorage.setItem(`syncQueue_${appId}`, JSON.stringify([...currentQueue, orderData]));
    setSyncQueue([...currentQueue, orderData]);
    setCurrentSale([]);
    setDailyNote("");
    setShowMobileCart(false);
    processSyncQueue();
  };

  const handleEditSave = (id) => {
    const target = allProducts.find(p => p.id === id);
    const updateData = { name: editBuffer.name, price: Number(editBuffer.price), category: target.category, updatedAt: serverTimestamp() };
    if (!target.isDefault && !target.id.startsWith('def_')) {
      updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', id), updateData);
    } else {
      addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'products'), { ...updateData, originalName: target.name, isHidden: false });
    }
    setEditingProductId(null);
  };

  const groupedSales = useMemo(() => {
    const groups = {};
    const activeSales = salesHistory.filter(s => !s.isHidden && !localHiddenIds.includes(s.id));
    activeSales.forEach(record => {
      const date = record.fullDate || "未知日期";
      if (!groups[date]) groups[date] = { date, total: 0, records: [], summary: {} };
      groups[date].records.push(record);
      groups[date].total += record.total;
      record.items.forEach(item => {
        if (!groups[date].summary[item.name]) groups[date].summary[item.name] = { count: 0, subtotal: 0, price: item.price };
        groups[date].summary[item.name].count += item.quantity;
        groups[date].summary[item.name].subtotal += (item.price * item.quantity);
      });
    });
    return Object.values(groups).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [salesHistory, localHiddenIds]);

  const downloadCSV = (dataList, filename) => {
    let csv = "\uFEFF日期,品項,單價,數量,小計\n";
    dataList.forEach(day => {
      Object.entries(day.summary).forEach(([name, data]) => {
        csv += `${day.date},${name},${data.price},${data.count},${data.subtotal}\n`;
      });
      csv += `${day.date},總計,,,${day.total}\n\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const cartTotal = currentSale.reduce((s, i) => s + (i.price * i.quantity), 0);

  // --- UI 渲染部分 (修正：包含所有頁面) ---
  return (
    <div className="min-h-screen bg-[#070b1a] text-slate-200">
      <nav className="bg-[#0e1630] border-b border-slate-800 p-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
            <ShoppingCart size={18} className="text-[#070b1a]" />
          </div>
          <h1 className="font-bold text-white">若晞茶空間</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-[#070b1a] rounded-full p-1 border border-slate-800">
            {['sales', 'inventory', 'reports'].map(v => (
              <button key={v} onClick={() => setView(v)} className={`px-4 py-1.5 rounded-full text-xs font-bold ${view === v ? 'bg-yellow-500 text-black' : 'text-slate-500'}`}>
                {v === 'sales' ? '點單' : v === 'inventory' ? '品項' : '報表'}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="p-4 max-w-7xl mx-auto">
        {/* 1. 點單頁面 */}
        {view === 'sales' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-4">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {['全部', '冷飲', '熱飲', '餐點', '其他'].map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-2 rounded-xl text-xs border ${activeCategory === cat ? 'bg-yellow-500 text-black' : 'bg-[#0e1630] border-slate-800'}`}>{cat}</button>
                ))}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {allProducts.filter(p => activeCategory === '全部' || p.category === activeCategory).map(p => (
                  <button key={p.id} onClick={() => {
                    const ex = currentSale.find(i => i.name === p.name);
                    if(ex) setCurrentSale(currentSale.map(i => i.name === p.name ? {...i, quantity: i.quantity+1}:i));
                    else setCurrentSale([...currentSale, {...p, quantity: 1}]);
                  }} className="p-4 bg-[#0e1630] border border-slate-800 rounded-2xl text-left hover:border-yellow-500">
                    <div className="text-[10px] text-slate-500">{p.category}</div>
                    <div className="font-bold text-sm h-10 mt-1">{p.name}</div>
                    <div className="mt-2 text-yellow-500 font-bold">${p.price}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="lg:col-span-4 bg-[#0e1630] p-6 rounded-3xl border border-slate-800 h-fit">
              <h2 className="text-sm font-bold text-slate-500 mb-4">當前訂單</h2>
              <div className="space-y-3 min-h-[200px]">
                {currentSale.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-[#070b1a] p-3 rounded-xl">
                    <div className="text-sm font-bold">{item.name} <span className="text-slate-500">x{item.quantity}</span></div>
                    <button onClick={() => setCurrentSale(currentSale.filter((_, i) => i !== idx))}><X size={14} /></button>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-800">
                <div className="flex justify-between text-xl font-bold mb-4"><span>總額</span><span>${cartTotal}</span></div>
                <button onClick={checkout} className="w-full py-4 bg-yellow-500 text-black font-bold rounded-2xl">確認結帳</button>
              </div>
            </div>
          </div>
        )}

        {/* 2. 品項管理頁面 (之前漏掉的) */}
        {view === 'inventory' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-[#0e1630] p-6 rounded-3xl border border-slate-800">
              <h2 className="font-bold mb-4">新增自定義品項</h2>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <input className="bg-[#070b1a] border border-slate-800 p-3 rounded-xl text-sm" placeholder="名稱" value={newItem.name} onChange={e=>setNewItem({...newItem, name: e.target.value})} />
                <input className="bg-[#070b1a] border border-slate-800 p-3 rounded-xl text-sm" type="number" placeholder="單價" value={newItem.price} onChange={e=>setNewItem({...newItem, price: e.target.value})} />
              </div>
              <button onClick={()=>{
                if(!newItem.name) return;
                addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'products'), { ...newItem, price: Number(newItem.price), isHidden: false, sortOrder: 999 });
                setNewItem({name:'', price:'', category:'冷飲'});
              }} className="w-full bg-yellow-500 text-black py-3 rounded-xl font-bold">新增到庫存</button>
            </div>
            <div className="space-y-2">
              {allProducts.map(p => (
                <div key={p.id} className="flex justify-between items-center p-4 bg-[#0e1630] rounded-2xl border border-slate-800">
                  <div>
                    <div className="text-xs text-slate-500">{p.category}</div>
                    <div className="font-bold">{p.name}</div>
                    <div className="text-yellow-500">$ {p.price}</div>
                  </div>
                  <button onClick={() => {
                    if(p.isDefault) {
                      addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'products'), { name: p.name, originalName: p.name, isHidden: true });
                    } else {
                      updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', p.id), { isHidden: true });
                    }
                  }} className="text-red-500"><Trash2 size={18} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. 報表頁面 (之前漏掉的) */}
        {view === 'reports' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">銷售報表</h2>
              <button onClick={()=>downloadCSV(groupedSales, '全報表.csv')} className="flex items-center gap-2 bg-emerald-600 px-4 py-2 rounded-xl text-sm"><FileSpreadsheet size={16}/> 匯出 CSV</button>
            </div>
            {groupedSales.map(day => (
              <div key={day.date} className="bg-[#0e1630] rounded-3xl border border-slate-800 overflow-hidden">
                <div className="p-4 bg-[#121c3b] flex justify-between items-center">
                  <span className="font-bold">{day.date}</span>
                  <span className="text-yellow-500 font-bold">日總計: ${day.total}</span>
                </div>
                <div className="p-4 space-y-2">
                  {Object.entries(day.summary).map(([name, data]) => (
                    <div key={name} className="flex justify-between text-sm border-b border-slate-800 pb-2">
                      <span>{name} x {data.count}</span>
                      <span>${data.subtotal}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
