'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useSearchParams } from 'next/navigation';
import { 
  Search, 
  ShoppingCart, 
  ChevronLeft, 
  Plus, 
  Minus, 
  X, 
  CheckCircle2, 
  Clock,
  ArrowRight,
  Info,
  Coffee,
  CupSoda,
  Croissant,
  Pizza,
  Utensils,
  PartyPopper,
  Banknote,
  QrCode,
  CreditCard,
  Cake
} from 'lucide-react';

// --- Types ---
interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  emoji: string;
  is_active: boolean;
  sales_count: number;
}

interface CartItem extends MenuItem {
  qty: number;
}

// --- Helper Icon ---
const getCategoryIcon = (category: string, size: number = 24, className: string = '') => {
  const cat = (category || '').toLowerCase();
  if (cat.includes('non') || cat.includes('teh') || cat.includes('susu') || cat.includes('juice')) return <CupSoda size={size} className={className} />;
  if (cat.includes('coffe') || cat.includes('specialty') || cat.includes('regular')) return <Coffee size={size} className={className} />;
  if (cat.includes('dessert') || cat.includes('manis') || cat.includes('cake')) return <Cake size={size} className={className} />;
  if (cat.includes('makan') || cat.includes('roti') || cat.includes('pastry')) return <Croissant size={size} className={className} />;
  if (cat.includes('camilan') || cat.includes('snack') || cat.includes('kentang')) return <Pizza size={size} className={className} />;
  return <Utensils size={size} className={className} />;
};

function MenuContent() {
  const searchParams = useSearchParams();
  const tableParam = searchParams.get('table') || '-';
  const tableNumber = `Meja ${tableParam}`;

  const [menuData, setMenuData] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<{ [id: number]: number }>({});
  const [currentCat, setCurrentCat] = useState('semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCartPage, setIsCartPage] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('tunai');
  const [note, setNote] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [loading, setLoading] = useState(true);

  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Load Data & Cek Status Pembayaran Callback dari Xendit
  useEffect(() => {
    fetchMenu();
    
    // Cek URL params, jika ada ?payment=success berarti kembali dari Xendit
    if (searchParams.get('payment') === 'success') {
      setShowSuccess(true);
      // Bersihkan URL tanpa reload
      window.history.replaceState(null, '', window.location.pathname + (tableParam !== '-' ? `?table=${tableParam}` : ''));
    }
  }, [searchParams, tableParam]);

  const fetchMenu = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('menu')
      .select('*')
      .order('id', { ascending: true });
    
    if (!error && data) {
      setMenuData(data);
    }
    setLoading(false);
  };

  // Logic
  const filteredMenu = menuData.filter(m => {
    const matchesCat = currentCat === 'semua' || m.category === currentCat;
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (m.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    return m.is_active && matchesCat && matchesSearch;
  });

  const cartItems: CartItem[] = Object.keys(cart).map(id => {
    const item = menuData.find(m => m.id === parseInt(id));
    return { ...item!, qty: cart[parseInt(id)] };
  });

  const cartTotal = cartItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const cartCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  const tax = Math.round(cartTotal * 0.1);
  const totalFinal = cartTotal + tax;

  const updateQty = (id: number, delta: number) => {
    setCart(prev => {
      const newQty = (prev[id] || 0) + delta;
      if (newQty <= 0) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: newQty };
    });
  };

  const handleOrder = async () => {
    if (cartCount === 0 || isProcessingPayment) return;
    setIsProcessingPayment(true);
    
    const exactCurrentTime = new Date().toISOString();
    const orderItemsFormatted = cartItems.map(i => `${i.qty}x ${i.name}`);
    const orderId = `ORD-${Date.now()}`; // ID sementara untuk invoice

    // JIKA NON-TUNAI (XENDIT)
    if (paymentMethod !== 'tunai') {
      try {
        // 1. Simpan order ke supabase dulu dengan status 'unpaid' atau langsung 'waiting' (tergantung preferensi, kita asumsikan 'waiting' karena ini cafe)
        const { error: dbError } = await supabase.from('orders').insert([{
          id: crypto.randomUUID(), // Supabase auto uuid, but let's let it auto generate if we don't specify, or we just let it insert
          table_number: tableNumber,
          customer_name: customerName || 'Pelanggan',
          payment_method: paymentMethod.toUpperCase(),
          status: 'waiting', // Di sistem nyata yang lebih ketat, status awal harus 'unpaid'
          total_price: totalFinal,
          items: orderItemsFormatted,
          note: note,
          created_at: exactCurrentTime
        }]);

        if (dbError) throw dbError;

        // 2. Minta Link Invoice ke Backend kita (route.ts)
        const res = await fetch('/api/payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: orderId,
            amount: totalFinal,
            customerName: customerName || 'Pelanggan',
            tableNumber: tableNumber,
            items: orderItemsFormatted
          })
        });

        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error);

        // 3. Redirect ke Halaman Xendit
        window.location.href = data.invoiceUrl;
        return; // Jangan jalankan resetApp dulu karena pindah halaman
        
      } catch (err: any) {
        alert('Gagal memproses pembayaran: ' + err.message);
        setIsProcessingPayment(false);
        return;
      }
    } 
    
    // JIKA TUNAI
    else {
      const { error } = await supabase.from('orders').insert([{
        table_number: tableNumber,
        customer_name: customerName || 'Pelanggan',
        payment_method: 'Tunai',
        status: 'waiting',
        total_price: totalFinal,
        items: orderItemsFormatted,
        note: note,
        created_at: exactCurrentTime
      }]);

      if (!error) {
        setShowSuccess(true);
      } else {
        alert('Gagal membuat pesanan');
      }
      setIsProcessingPayment(false);
    }
  };

  const resetApp = () => {
    setCart({});
    setNote('');
    setCustomerName('');
    setShowSuccess(false);
    setIsCartPage(false);
    setCurrentCat('semua');
  };

  const fmt = (n: number) => 'Rp ' + n.toLocaleString('id-ID');

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-parchment">
      <div className="w-16 h-16 bg-espresso rounded-2xl flex items-center justify-center animate-bounce mb-4">
        <Coffee size={32} className="text-caramel" />
      </div>
      <p className="font-serif font-bold text-espresso animate-pulse">Menyiapkan Menu Spesial...</p>
    </div>
  );

  return (
    <div className="max-w-[430px] mx-auto bg-parchment min-h-screen relative font-sans text-espresso overflow-x-hidden selection:bg-caramel/20">
      
      {/* PAGE 1: MENU */}
      {!isCartPage && (
        <div className="animate-fade-in pb-32">
          {/* Header */}
          <header className="sticky top-0 z-40 bg-parchment/80 backdrop-blur-xl px-5 pt-8 pb-4 border-b border-latte/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-espresso flex items-center justify-center shadow-lg shadow-espresso/20 animate-float">
                  <Coffee size={24} className="text-caramel" />
                </div>
                <div>
                  <h1 className="font-serif font-bold leading-none text-2xl tracking-tight">Nine <span className="text-caramel">Coffee</span></h1>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-leaf animate-pulse"></span>
                    <p className="text-[10px] font-bold tracking-widest text-mocha uppercase opacity-60">Open · Specialty Café</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="px-3 py-2 rounded-2xl bg-white border border-latte shadow-sm flex items-center gap-2">
                  <span className="text-xs font-bold text-espresso">{tableNumber}</span>
                </div>
              </div>
            </div>
            
            {/* Search Toggle */}
            <div className="mt-6 relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-mocha/40">
                <Search size={18} />
              </div>
              <input 
                type="text" 
                placeholder="Cari menu favorit..." 
                className="w-full bg-white border border-latte rounded-2xl pl-11 pr-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-caramel/20 transition-all placeholder:text-mocha/40 shadow-sm font-medium text-espresso"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </header>

          {/* Categories */}
          <div className="px-5 mt-6 mb-4">
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 pt-1 px-1">
              {[
                { id: 'semua', label: 'Semua', icon: <Utensils size={16} /> },
                ...Array.from(new Set(menuData.map(m => m.category))).filter(c => c).map(cat => ({
                  id: cat,
                  label: cat.charAt(0).toUpperCase() + cat.slice(1),
                  icon: getCategoryIcon(cat, 16)
                }))
              ].map((cat) => (
                <button 
                  key={cat.id}
                  onClick={() => setCurrentCat(cat.id)}
                  className={`btn-premium whitespace-nowrap rounded-2xl px-6 py-4 font-bold text-xs flex items-center gap-2.5 shadow-sm min-w-fit ${
                    currentCat === cat.id 
                    ? 'bg-espresso text-parchment shadow-espresso/20 scale-105' 
                    : 'bg-white text-mocha border border-latte hover:bg-cream'
                  }`}
                >
                  <span className={`${currentCat === cat.id ? 'text-caramel' : 'text-mocha/50'}`}>{cat.icon}</span>
                  <span className="tracking-wide">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Menu Grid */}
          <div className="px-5 grid grid-cols-2 gap-4 mt-6">
            {filteredMenu.map(m => (
              <div key={m.id} className="group bg-white rounded-[32px] border border-latte p-2 pb-4 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1">
                <div className="relative aspect-square bg-parchment rounded-[24px] flex items-center justify-center mb-3 overflow-hidden group-hover:bg-cream transition-colors">
                  <div className="absolute inset-0 bg-gradient-to-tr from-caramel/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  {getCategoryIcon(m.category, 36, "text-mocha/30 group-hover:text-caramel group-hover:scale-110 transition-all duration-500 relative z-10")}
                </div>
                <div className="px-2">
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-start gap-1">
                      <h3 className="font-bold text-[13px] leading-tight text-espresso min-h-[32px] line-clamp-2">{m.name}</h3>
                      {m.sales_count > 10 && (
                        <span className="text-[7px] font-black bg-caramel/10 text-caramel px-1.5 py-0.5 rounded-full whitespace-nowrap mt-0.5">TOP</span>
                      )}
                    </div>
                  </div>
                  <p className="text-[10px] text-mocha opacity-50 mt-1 line-clamp-2 h-7 leading-relaxed">{m.description}</p>
                  
                  <div className="flex items-center justify-between mt-4">
                    <span className="font-bold text-sm text-leaf">{fmt(m.price)}</span>
                    
                    {cart[m.id] ? (
                      <div className="flex items-center gap-2.5 bg-cream rounded-xl p-1 shadow-inner">
                        <button onClick={() => updateQty(m.id, -1)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white text-mocha shadow-sm active:scale-90 transition-transform">
                          <Minus size={14} />
                        </button>
                        <span className="text-xs font-bold text-espresso min-w-[12px] text-center">{cart[m.id]}</span>
                        <button onClick={() => updateQty(m.id, 1)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white text-mocha shadow-sm active:scale-90 transition-transform">
                          <Plus size={14} />
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => updateQty(m.id, 1)}
                        className="btn-premium w-9 h-9 bg-leaf text-parchment rounded-xl flex items-center justify-center shadow-lg shadow-leaf/20 hover:rotate-90"
                      >
                        <Plus size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {filteredMenu.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 px-10 text-center opacity-40">
              <Search size={48} className="text-mocha/30 mb-4" />
              <p className="font-serif font-bold text-lg text-espresso">Oops! Menu tidak ketemu</p>
              <p className="text-xs mt-1 text-mocha">Coba cari dengan kata kunci lain ya.</p>
            </div>
          )}
        </div>
      )}

      {/* PAGE 2: CART */}
      {isCartPage && (
        <div className="animate-fade-in-right pb-32">
          {/* Cart Header */}
          <header className="sticky top-0 z-40 bg-parchment/80 backdrop-blur-xl px-5 pt-8 pb-4 border-b border-latte/30">
            <div className="flex items-center gap-4">
              <button onClick={() => setIsCartPage(false)} className="w-10 h-10 rounded-2xl flex items-center justify-center bg-white border border-latte shadow-sm active:scale-90 transition-all text-espresso">
                <ChevronLeft size={20} />
              </button>
              <div>
                <h1 className="font-serif font-bold text-xl">Konfirmasi Pesanan</h1>
                <p className="text-[10px] font-bold text-caramel tracking-widest uppercase opacity-70">{cartCount} Item · {tableNumber}</p>
              </div>
            </div>
          </header>

          {/* Cart Items */}
          <div className="px-5 mt-8 flex flex-col gap-4">
            {cartItems.map(item => (
              <div key={item.id} className="flex items-center gap-4 p-3 bg-white rounded-3xl border border-latte shadow-sm animate-fade-in">
                <div className="w-20 h-20 bg-parchment rounded-2xl flex items-center justify-center border border-latte/50 group">
                  {getCategoryIcon(item.category, 28, "text-mocha/40 group-hover:scale-110 group-hover:text-caramel transition-all duration-300")}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-sm text-espresso">{item.name}</h3>
                    <button onClick={() => updateQty(item.id, -item.qty)} className="text-mocha/30 hover:text-red-500 transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                  <p className="text-[10px] text-caramel font-bold mt-0.5">{fmt(item.price)}</p>
                  
                  <div className="flex items-center justify-between mt-3">
                    <p className="font-bold text-sm text-leaf">{fmt(item.price * item.qty)}</p>
                    <div className="flex items-center gap-3 bg-parchment rounded-xl p-1 border border-latte/30">
                      <button onClick={() => updateQty(item.id, -1)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white text-mocha shadow-sm active:scale-90 transition-all">
                        <Minus size={14} />
                      </button>
                      <span className="text-xs font-bold text-espresso min-w-[12px] text-center">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, 1)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white text-mocha shadow-sm active:scale-90 transition-all">
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {cartItems.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 opacity-30">
                <div className="w-20 h-20 bg-latte rounded-full flex items-center justify-center mb-4">
                  <ShoppingCart size={32} className="text-mocha" />
                </div>
                <p className="font-serif font-bold text-espresso">Keranjang masih kosong</p>
                <button onClick={() => setIsCartPage(false)} className="mt-4 text-xs font-bold text-caramel underline">Kembali ke Menu</button>
              </div>
            )}
          </div>

          {/* Form Details */}
          {cartItems.length > 0 && (
            <div className="px-5 mt-10 space-y-6 animate-fade-in">
              {/* Customer Name */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-mocha opacity-40 uppercase tracking-widest ml-1">Nama Pemesan</label>
                <input 
                  type="text" 
                  placeholder="Biar kami bisa panggil namamu..." 
                  className="w-full bg-white border border-latte rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-caramel/20 transition-all shadow-sm font-medium"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>

              {/* Note */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-mocha opacity-40 uppercase tracking-widest ml-1">Catatan Khusus</label>
                <textarea 
                  rows={2}
                  placeholder="Contoh: Gula dikit, es dipisah, atau..."
                  className="w-full bg-white border border-latte rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-caramel/20 transition-all shadow-sm resize-none font-medium"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              {/* Payment Method */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-mocha opacity-40 uppercase tracking-widest ml-1">Metode Pembayaran</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'tunai', label: 'Tunai', icon: <Banknote size={24} /> },
                    { id: 'qris', label: 'QRIS', icon: <QrCode size={24} /> },
                    { id: 'debit', label: 'Debit', icon: <CreditCard size={24} /> }
                  ].map(m => (
                    <button 
                      key={m.id}
                      onClick={() => setPaymentMethod(m.id)}
                      className={`flex flex-col items-center justify-center p-4 rounded-3xl border transition-all duration-300 active:scale-95 ${
                        paymentMethod === m.id 
                        ? 'bg-espresso border-espresso text-parchment shadow-lg shadow-espresso/20' 
                        : 'bg-white border-latte text-mocha hover:bg-cream shadow-sm'
                      }`}
                    >
                      <span className={`mb-2 ${paymentMethod === m.id ? 'text-caramel' : 'text-mocha/40'}`}>{m.icon}</span>
                      <span className="text-[9px] font-black uppercase tracking-widest">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-white rounded-[32px] p-6 border border-latte shadow-sm space-y-3">
                <h3 className="font-serif font-bold text-lg mb-2 flex items-center gap-2">
                  <Info size={18} className="text-caramel" /> Ringkasan
                </h3>
                <div className="flex justify-between text-sm">
                  <span className="text-mocha opacity-60 font-medium">Subtotal</span>
                  <span className="font-bold text-espresso">{fmt(cartTotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-mocha opacity-60 font-medium">Pajak (10%)</span>
                  <span className="font-bold text-espresso">{fmt(tax)}</span>
                </div>
                <div className="h-px bg-latte/30 my-2"></div>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-espresso">Total Akhir</span>
                  <span className="text-2xl font-black text-leaf tracking-tighter">{fmt(totalFinal)}</span>
                </div>
              </div>

              <button 
                disabled={cartCount === 0}
                onClick={handleOrder}
                className="btn-premium w-full py-5 rounded-[24px] bg-leaf text-parchment font-black text-sm shadow-xl shadow-leaf/20 flex items-center justify-center gap-3 hover:bg-leaf/90"
              >
                <CheckCircle2 size={20} /> KONFIRMASI & PESAN
              </button>
            </div>
          )}
        </div>
      )}

      {/* FLOAT BAR (HOME) */}
      {!isCartPage && cartCount > 0 && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] p-5 z-50 animate-slide-up">
          <button 
            onClick={() => setIsCartPage(true)}
            className="w-full bg-espresso text-parchment rounded-[28px] p-4 flex items-center justify-between shadow-2xl shadow-espresso/40 hover:scale-[1.02] transition-transform group overflow-hidden relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-caramel/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 bg-caramel rounded-2xl flex items-center justify-center shadow-lg shadow-caramel/20 group-hover:rotate-12 transition-transform text-white">
                <ShoppingCart size={20} />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black text-caramel uppercase tracking-widest">{cartCount} Item Terpilih</p>
                <p className="font-serif font-bold text-lg">{fmt(cartTotal)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 relative z-10 bg-white/10 px-4 py-2 rounded-2xl font-bold text-xs uppercase tracking-widest backdrop-blur-sm group-hover:bg-caramel transition-colors">
              Check out <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </div>
      )}

      {/* SUCCESS OVERLAY */}
      {showSuccess && (
        <div className="fixed inset-0 z-[100] bg-espresso/90 backdrop-blur-xl flex items-center justify-center p-8 animate-fade-in">
          <div className="bg-parchment rounded-[48px] p-10 text-center max-w-[340px] animate-scale-up border border-white/20 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-caramel to-transparent"></div>
            <div className="flex justify-center mb-6 animate-float">
              <PartyPopper size={64} className="text-caramel drop-shadow-xl" />
            </div>
            <h2 className="font-serif font-bold text-3xl mb-3 text-espresso">Pesanan Masuk!</h2>
            <p className="text-sm text-mocha opacity-70 mb-10 leading-relaxed font-medium">
              Silakan tunggu di <span className="font-black text-caramel">{tableNumber}</span>, barista kami sedang meracik rasa spesial untukmu.
            </p>
            <button 
              onClick={resetApp} 
              className="btn-premium w-full bg-espresso text-parchment py-5 rounded-[24px] font-black text-sm shadow-xl shadow-espresso/20 flex items-center justify-center gap-2"
            >
              <Coffee size={18} className="text-caramel" /> PESAN LAGI
            </button>
            <div className="mt-6 flex items-center justify-center gap-2 text-[10px] font-bold text-mocha opacity-40 uppercase tracking-widest">
              <Clock size={12} /> Estimasi: 5-10 Menit
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeInRight { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slideDown { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slideUp { from { transform: translate(-50%, 100%); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
        @keyframes scaleUp { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
        .animate-fade-in-right { animation: fadeInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-slide-down { animation: slideDown 0.3s ease-out forwards; }
        .animate-slide-up { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-scale-up { animation: scaleUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
      `}</style>
    </div>
  );
}

export default function UserMenu() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen bg-parchment">
        <div className="w-16 h-16 bg-espresso rounded-2xl flex items-center justify-center animate-bounce mb-4">
          <Coffee size={32} className="text-caramel" />
        </div>
      </div>
    }>
      <MenuContent />
    </Suspense>
  );
}
