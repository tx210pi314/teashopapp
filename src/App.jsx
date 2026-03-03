import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, onSnapshot, addDoc, updateDoc, serverTimestamp, query, where, getDocs, deleteDoc } from 'firebase/firestore';
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
  
  // 數據狀態
  const [dbProducts, setDbProducts] = useState([]);
  const [salesHistory, setSalesHistory] = useState([]);
  const [currentSale, setCurrentSale] = useState([]);
  const [dailyNote, setDailyNote] = useState("");
  const [newItem, setNewItem] = useState({ name: '', price: '', category: '冷飲' });
  
  // 離線同步與狀態
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [syncQueue, setSyncQueue] = useState(() => {
    const saved = localStorage.getItem(`syncQueue_${appId}`);
    return saved ? JSON.parse(saved) : [];
  }); 

  // 編輯與顯示
  const [editingProductId, setEditingProductId] = useState(null);
  const [editBuffer, setEditBuffer] = useState({ name: '', price: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const [localHiddenIds, setLocalHiddenIds] = useState([]); 
  const [productToDelete, setProductToDelete] = useState(null);
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
      console.error("同步錯誤:", err);
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
    { id: 'def_f1', name: '琥珀糖內用(三入)', price: 60, category: '餐點', isDefault: true, sortOrder: 120 },
    { id: 'def_o1', name: '其他收入 1元', price: 1, category: '其他', isDefault: true, sortOrder: 1000 }
  ], []);

  // --- 認證與監聽 ---
  useEffect(() => {
    signInAnonymously(auth).catch(err => console.error("Firebase 登入失敗:", err));
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
    localStorage.setItem(`syncQueue_${appId}`, JSON.stringify([...currentQueue, orderData]));
    setSyncQueue([...currentQueue, orderData]);
    setCurrentSale([]);
    setDailyNote("");
    setShowMobileCart(false);
    processSyncQueue();
  };

  const handleEditSave = (id) => {
    const target = allProducts.find(p => p.id === id);
    if (!target) return;
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
      groups[date].total += (record.total || 0);
      record.items.forEach(item => {
        if (!groups[date].summary[item.name]) groups[date].summary[item.name] = { count: 0, subtotal: 0, price: item.price };
        groups[date].summary[item.name].count += item.quantity;
        groups[date].summary[item.name].subtotal += (item.price * item.quantity);
      });
    });
    return Object.values(groups).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [salesHistory, localHiddenIds]);

  const downloadCSV = (dataList, filename) => {
    let csv = "\uFEFF日期,品項名稱,單價,數量,小計\n";
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
  const cartItemCount = currentSale.reduce((s, i) => s + i.quantity, 0);

  // --- UI 開始 ---
  return (
    <div className="min-h-screen bg-[#070b1a] text-slate-200 font-sans pb-24 md:pb-0">
      <nav className="bg-[#0e1630] border-b border-slate-800 p-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
            <ShoppingCart size={18} className="text-[#070b1a]" />
          </div>
          <h1 className="text-sm md:text-lg font-bold text-white">若晞茶空間</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold ${isOnline ? 'text-emerald-500 bg-emerald-500/10' : 'text-red-500 bg-red-500/10'}`}>
            {isSaving ? <Loader2 size={12} className="animate-spin" /> : isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
            <span className="hidden xs:inline">{isOnline ? '連線中' : '離線模式'}</span>
          </div>
          <div className="flex bg-[#070b1a] rounded-full p-1 border border-slate-800">
            {['sales', 'inventory', 'reports'].map(v => (
              <button key={v} onClick={() => setView(v)} className={`px-4 py-1.5 rounded-full text-[10px] md:text-xs font-bold transition-all ${view === v ? 'bg-yellow-500 text-black' : 'text-slate-500 hover:text-white'}`}>
                {v === 'sales' ? '點單' : v === 'inventory' ? '品項' : '報表'}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="p-3 md:p-8 max-w-7xl mx-auto">
        {/* --- 點單視圖 --- */}
        {view === 'sales' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-6">
              <div className="flex gap-2 overflow-x-auto pb-2 sticky top-[72px] z-40 bg-[#070b1a]">
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
                  }} className="p-4 bg-[#0e1630] border border-slate-800 rounded-2xl text-left hover:border-yellow-500 transition-all">
                    <div className="text-[9px] text-slate-500 uppercase font-black">{p.category}</div>
                    <div className="font-bold text-sm h-10 mt-1 text-white line-clamp-2">{p.name}</div>
                    <div className="mt-3 flex justify-between items-center">
                      <span className="font-black text-yellow-500 text-lg">${p.price}</span>
                      <Plus size={14} className="text-slate-400" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="hidden lg:block lg:col-span-4">
              <div className="bg-[#0e1630] border border-slate-800 rounded-3xl p-6 sticky top-24 shadow-2xl h-[calc(100vh-140px)] flex flex-col">
                <h2 className="text-xs font-bold text-slate-500 mb-6 flex items-center gap-2 uppercase tracking-widest">當前訂單</h2>
                <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                  {currentSale.length === 0 ? <div className="py-10 text-center text-slate-700 text-sm italic">點擊左側品項開始</div> : 
                    currentSale.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-[#070b1a]/40 p-3 rounded-xl border border-slate-800/50">
                        <div>
                          <div className="text-sm font-bold text-white">{item.name}</div>
                          <div className="text-xs text-slate-500">${item.price} × {item.quantity}</div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-sm font-black text-yellow-500">${item.price * item.quantity}</div>
                          <button onClick={() => setCurrentSale(currentSale.filter((_, i) => i !== idx))} className="text-slate-600 hover:text-red-400"><X size={14} /></button>
                        </div>
                      </div>
                    ))
                  }
                </div>
                <div className="mt-6 pt-6 border-t border-slate-800 space-y-4">
                  <textarea value={dailyNote} onChange={e => setDailyNote(e.target.value)} placeholder="備註..." className="w-full bg-[#070b1a] border border-slate-800 rounded-xl p-3 text-xs text-slate-300 h-20 outline-none" />
                  <div className="flex justify-between items-end">
                    <span className="text-xs text-slate-500 font-bold">總額</span>
                    <span className="text-4xl font-black text-white">${cartTotal}</span>
                  </div>
                  <button onClick={checkout} disabled={currentSale.length===0} className="w-full py-4 rounded-2xl bg-yellow-500 text-black font-black hover:bg-yellow-400 disabled:bg-slate-800 transition-all">確認結帳</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- 品項管理視圖 --- */}
        {view === 'inventory' && (
          <div className="bg-[#0e1630] p-6 rounded-3xl border border-slate-800 max-w-2xl mx-auto shadow-2xl">
            <h2 className="text-xl font-black mb-6 flex items-center gap-3 italic text-white"><Settings className="text-yellow-500"/>品項管理</h2>
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
                  addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'products'), { ...newItem, price: Number(newItem.price), isHidden: false, sortOrder: 999 });
                  setNewItem({name:'', price:'', category:'冷飲'});
                }} className="bg-yellow-500 text-black py-4 rounded-xl font-black">新增品項</button>
            </div>
            <div className="space-y-2">
              {allProducts.map((p)=>(
                <div key={p.id} className="flex justify-between items-center p-4 bg-[#070b1a]/50 rounded-2xl border border-slate-800/50">
                  {editingProductId === p.id ? (
                    <div className="flex-1 flex items-center gap-3">
                      <input className="flex-1 bg-[#0e1630] border border-yellow-500 p-2 rounded-xl text-sm" value={editBuffer.name} onChange={e=>setEditBuffer({...editBuffer, name: e.target.value})} />
                      <input className="w-24 bg-[#0e1630] border border-yellow-500 p-2 rounded-xl text-sm" type="number" value={editBuffer.price} onChange={e=>setEditBuffer({...editBuffer, price: e.target.value})} />
                      <button onClick={() => handleEditSave(p.id)} className="p-2 bg-emerald-500 text-white rounded-lg"><Check size={18}/></button>
                      <button onClick={() => setEditingProductId(null)} className="p-2 bg-slate-800 text-slate-400 rounded-lg"><X size={18}/></button>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-600 uppercase">{p.category}</span>
                        <span className="font-bold text-sm text-slate-200">{p.name}</span>
                        <span className="text-yellow-500 font-black text-xs">${p.price}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setEditingProductId(p.id); setEditBuffer({ name: p.name, price: p.price }); }} className="p-2 text-slate-700 hover:text-yellow-500"><Edit3 size={18} /></button>
                        <button onClick={() => {
                            if(p.isDefault) {
                                addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'products'), { name: p.name, originalName: p.name, isHidden: true });
                            } else {
                                updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', p.id), { isHidden: true });
                            }
                        }} className="p-2 text-slate-700 hover:text-red-500"><Trash2 size={18} /></button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- 報表視圖 --- */}
        {view === 'reports' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center px-2">
              <h2 className="text-2xl font-black text-white italic">銷售報表</h2>
              <button onClick={() => downloadCSV(groupedSales, `完整報表.csv`)} className="bg-[#0e1630] text-emerald-500 border border-emerald-500/20 px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 text-xs">
                <FileSpreadsheet size={16} /> 匯出 CSV
              </button>
            </div>
            {groupedSales.map(day => (
              <div key={day.date} className="bg-[#0e1630] rounded-3xl border border-slate-800 overflow-hidden shadow-xl mb-6">
                <div className="bg-[#121c3b] p-6 flex justify-between items-center border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <Calendar className="text-yellow-500" size={24} />
                    <span className="text-xl font-black text-white">{day.date}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-500 uppercase font-black">當日營收</div>
                    <div className="text-2xl font-black text-yellow-500">${day.total}</div>
                  </div>
                </div>
                <div className="p-6 bg-[#070b1a]/30">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(day.summary).map(([name, data]) => (
                      <div key={name} className="bg-[#0e1630] border border-slate-800/50 p-4 rounded-2xl flex justify-between items-center">
                        <div>
                          <div className="text-sm font-bold text-slate-200">{name}</div>
                          <div className="text-[10px] text-slate-500">${data.price} / 單位</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-black text-white">× {data.count}</div>
                          <div className="text-xs font-bold text-emerald-500">${data.subtotal}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 手機版浮動購物籃 (修正顯示邏輯) */}
      <div className="lg:hidden fixed bottom-8 right-6 z-[60]">
        <button 
          onClick={() => setShowMobileCart(true)}
          className={`w-16 h-16 rounded-full bg-yellow-500 text-black shadow-xl flex items-center justify-center transition-all ${currentSale.length > 0 ? 'scale-100' : 'scale-0'}`}
        >
          <div className="relative">
            <ShoppingBag size={28} />
            {cartItemCount > 0 && (
              <span className="absolute -top-3 -right-3 bg-red-500 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-yellow-500">
                {cartItemCount}
              </span>
            )}
          </div>
        </button>
      </div>

      {/* 手機版全螢幕訂單彈窗 */}
      {showMobileCart && (
        <div className="fixed inset-0 bg-[#070b1a] z-[100] lg:hidden flex flex-col">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-[#0e1630]">
            <h2 className="font-black text-white">當前訂單</h2>
            <button onClick={() => setShowMobileCart(false)} className="p-2 text-slate-400"><X size={20} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {currentSale.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center bg-[#0e1630] p-4 rounded-2xl border border-slate-800">
                <div><div className="text-sm font-bold text-white">{item.name}</div><div className="text-xs text-slate-500">${item.price} x {item.quantity}</div></div>
                <div className="flex items-center gap-4">
                    <span className="font-black text-yellow-500">${item.price * item.quantity}</span>
                    <button onClick={() => setCurrentSale(currentSale.filter((_, i) => i !== idx))} className="text-red-400"><Trash2 size={16}/></button>
                </div>
              </div>
            ))}
          </div>
          <div className="p-6 bg-[#0e1630] border-t border-slate-800 space-y-4">
            <div className="flex justify-between items-center"><span className="text-slate-500">總金額</span><span className="text-3xl font-black text-white">${cartTotal}</span></div>
            <button onClick={checkout} className="w-full py-5 rounded-2xl bg-yellow-500 text-black font-black">確認結帳</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
