'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Clock, CheckCircle, PlayCircle, CheckCircle2, ClipboardList } from 'lucide-react';

interface Order {
  id: string;
  table_number: string;
  customer_name: string;
  payment_method: string;
  status: 'waiting' | 'process' | 'ready' | 'completed';
  total_price: number;
  items: string[];
  note: string;
  created_at: string;
}

// Sub-component untuk menghitung durasi waktu secara realtime
function LiveTimer({ startTime, status }: { startTime: string, status: string }) {
  const [duration, setDuration] = useState('');

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const start = new Date(startTime).getTime();
      const diffMs = now - start;
      
      const diffMins = Math.floor(diffMs / 60000);
      const diffSecs = Math.floor((diffMs % 60000) / 1000);
      
      if (diffMins < 1) {
        setDuration(`${diffSecs} detik lalu`);
      } else {
        setDuration(`${diffMins} menit lalu`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000); // Update setiap 1 detik
    
    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <span className={`inline-flex items-center gap-1 ml-2 ${
      status === 'waiting' && duration.includes('menit') && parseInt(duration) > 5 ? 'text-red-500 animate-pulse' : 'text-caramel'
    }`}>
      <Clock size={12} /> {duration}
    </span>
  );
}

export default function OrderManagement() {
  const [orderData, setOrderData] = useState<Order[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [orderToConfirm, setOrderToConfirm] = useState<Order | null>(null);
  const [sqlErrorOpen, setSqlErrorOpen] = useState(false);

  useEffect(() => {
    fetchOrders();
    
    // Realtime subscription
    const ordersSubscription = supabase
      .channel('orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        fetchOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ordersSubscription);
    };
  }, []);

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .neq('status', 'completed')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching orders:', error);
    } else {
      setOrderData(data || []);
    }
  };

  const executeCompletion = async () => {
    if (!orderToConfirm) return;
    setUpdatingId(orderToConfirm.id);
    setIsConfirmModalOpen(false);
    
    try {
      // WAJIB UPDATE KE 'completed' UNTUK LAPORAN (Bukan Delete)
      const { error } = await supabase.from('orders').update({ status: 'completed' }).eq('id', orderToConfirm.id);
      
      if (error) {
        // Jika error constraint terjadi, tampilkan modal instruksi SQL
        setSqlErrorOpen(true);
        setUpdatingId(null);
        return;
      }

      // Update sales_count di tabel menu
      for (const itemStr of orderToConfirm.items) {
        const match = itemStr.match(/^(\d+)x\s+(.+)$/);
        if (match) {
          const qty = parseInt(match[1]);
          const name = match[2].trim();
          const { data: menuItems } = await supabase.from('menu').select('id, sales_count').eq('name', name).limit(1);
          if (menuItems && menuItems.length > 0) {
            await supabase.from('menu').update({ sales_count: (menuItems[0].sales_count || 0) + qty }).eq('id', menuItems[0].id);
          }
        }
      }
    } catch (err) {
      console.error('Gagal saat menyelesaikan pesanan:', err);
    }
    
    setOrderToConfirm(null);
    setUpdatingId(null);
    fetchOrders();
  };

  const updateOrderStatus = async (order: Order) => {
    let nextStatus = '';
    
    if (order.status === 'waiting') nextStatus = 'process';
    else if (order.status === 'process') nextStatus = 'ready';
    else if (order.status === 'ready') {
      setOrderToConfirm(order);
      setIsConfirmModalOpen(true);
      return;
    }

    if (nextStatus) {
      setUpdatingId(order.id);
      const { error } = await supabase.from('orders').update({ status: nextStatus }).eq('id', order.id);
      if (error) {
        setSqlErrorOpen(true);
      }
      setUpdatingId(null);
      fetchOrders();
    }
  };

  const fmt = (n: number) => 'Rp ' + n.toLocaleString('id-ID');

  return (
    <>
      <div className="animate-fade-in relative min-h-screen">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="font-serif font-bold text-3xl text-espresso">Pesanan Masuk</h1>
            <p className="text-mocha opacity-60">Pantau dan kelola pesanan pelanggan secara realtime.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold border border-amber-200 shadow-sm">
              <Clock size={14} /> {orderData.filter(o => o.status === 'waiting').length} Antrean
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 shadow-sm">
              <PlayCircle size={14} /> {orderData.filter(o => o.status === 'process').length} Diproses
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orderData.map(order => (
            <div key={order.id} className="bg-white rounded-[32px] border border-latte shadow-sm p-6 flex flex-col hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="font-bold text-xl text-espresso">{order.table_number}</p>
                  <p className="text-[10px] text-mocha opacity-50 uppercase tracking-wider font-bold mt-1">
                    {order.customer_name} <br/> {order.created_at ? new Date(order.created_at).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }) : '--:--'} WIB
                  </p>
                </div>
                <span className={`text-[10px] font-bold px-3 py-1 rounded-full border shadow-sm ${
                  order.status === 'waiting' ? 'bg-amber-100 text-amber-700 border-amber-200' : 
                  order.status === 'process' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-green-100 text-green-700 border-green-200'
                }`}>
                  {order.status === 'waiting' ? 'MENUNGGU' : order.status === 'process' ? 'DIPROSES' : 'SIAP SAJI'}
                </span>
              </div>

              <div className="bg-parchment rounded-2xl p-4 mb-4 flex-1 border border-latte/50">
                <div className="space-y-1.5">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex gap-2 text-sm font-bold text-espresso">
                      <span className="text-caramel">•</span> <span>{item}</span>
                    </div>
                  ))}
                </div>
                {order.note && (
                  <div className="mt-4 pt-3 border-t border-latte/50">
                    <p className="text-[10px] font-black text-caramel uppercase tracking-widest mb-1 flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-caramel"></span> Catatan
                    </p>
                    <p className="text-xs text-mocha italic">{order.note}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center mb-6 px-1">
                <span className="text-[10px] font-black text-mocha opacity-40 uppercase tracking-widest px-2 py-1 bg-cream rounded-md border border-latte/50">
                  {order.payment_method}
                </span>
                <span className="font-black text-leaf text-xl tracking-tight">{fmt(order.total_price)}</span>
              </div>

              <button 
                disabled={updatingId === order.id}
                onClick={() => updateOrderStatus(order)}
                className={`w-full py-4 rounded-[20px] font-black text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-lg active:scale-95 disabled:opacity-50 ${
                  order.status === 'waiting' ? 'bg-espresso text-parchment hover:bg-mocha shadow-espresso/20' : 
                  order.status === 'process' ? 'bg-leaf text-parchment hover:bg-leaf/90 shadow-leaf/20' : 
                  'bg-caramel text-white hover:bg-caramel/90 shadow-caramel/20'
                }`}
              >
                {updatingId === order.id ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : order.status === 'waiting' ? (
                  <><PlayCircle size={18} /> MULAI SIAPKAN</>
                ) : order.status === 'process' ? (
                  <><CheckCircle size={18} /> TANDAI SIAP SAJI</>
                ) : (
                  <><CheckCircle2 size={18} /> SELESAIKAN PESANAN</>
                )}
              </button>
            </div>
          ))}

          {orderData.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-32 opacity-40 bg-white/40 rounded-[48px] border-2 border-dashed border-latte/60">
              <div className="w-20 h-20 bg-cream rounded-full flex items-center justify-center mb-4">
                <span className="text-4xl block animate-float">✨</span>
              </div>
              <p className="font-serif font-bold text-2xl text-espresso">Belum ada pesanan aktif</p>
              <p className="text-xs text-mocha mt-2 font-bold uppercase tracking-widest">Menunggu pelanggan...</p>
            </div>
          )}
        </div>
      </div>

      {/* CUSTOM CONFIRM MODAL */}
      {isConfirmModalOpen && orderToConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-espresso/60 backdrop-blur-sm" onClick={() => setIsConfirmModalOpen(false)}></div>
          <div className="bg-parchment rounded-[32px] p-8 w-full max-w-sm relative z-10 animate-scale-up shadow-2xl border border-white/20">
            <div className="w-16 h-16 bg-caramel/10 text-caramel rounded-2xl flex items-center justify-center text-3xl mb-6 mx-auto">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="font-serif font-bold text-2xl text-center text-espresso mb-2">Selesaikan Pesanan?</h2>
            <p className="text-sm text-center text-mocha opacity-70 mb-8 leading-relaxed">
              Pesanan untuk <span className="font-bold text-espresso">{orderToConfirm.customer_name}</span> di <span className="font-bold text-espresso">{orderToConfirm.table_number}</span> sudah selesai disajikan dan akan dimasukkan ke laporan penjualan.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setIsConfirmModalOpen(false)}
                className="flex-1 py-3.5 rounded-xl font-bold text-sm text-mocha bg-white border border-latte shadow-sm hover:bg-cream transition-all"
              >
                Batal
              </button>
              <button 
                onClick={executeCompletion}
                className="flex-1 py-3.5 rounded-xl font-bold text-sm text-white bg-leaf shadow-lg shadow-leaf/20 hover:bg-leaf/90 transition-all flex items-center justify-center"
              >
                Selesaikan
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
