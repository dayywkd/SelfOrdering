'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import { 
  Coffee, 
  Clock, 
  CheckCircle2, 
  ChevronLeft, 
  ShoppingBag, 
  MapPin, 
  Receipt,
  AlertCircle,
  Timer,
  Loader2
} from 'lucide-react';

interface Order {
  id: string;
  table_number: string;
  customer_name: string;
  status: 'waiting' | 'paid' | 'processing' | 'ready' | 'completed' | 'cancelled';
  total_price: number;
  items: string[];
  created_at: string;
  payment_method: string;
}

export default function OrderTracking() {
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetchOrder();

    // Realtime subscription untuk update status
    const channel = supabase
      .channel(`order-${id}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'orders',
        filter: `id=eq.${id}`
      }, (payload) => {
        setOrder(payload.new as Order);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const fetchOrder = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (!error && data) {
      setOrder(data);
    }
    setLoading(false);
  };

  const fmt = (n: number) => 'Rp ' + n.toLocaleString('id-ID');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'text-amber-500 bg-amber-50';
      case 'paid': return 'text-blue-500 bg-blue-50';
      case 'processing': return 'text-caramel bg-caramel/10';
      case 'ready': return 'text-leaf bg-leaf/10';
      case 'completed': return 'text-espresso bg-latte/20';
      case 'cancelled': return 'text-red-500 bg-red-50';
      default: return 'text-mocha bg-latte/10';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'waiting': return 'Menunggu Antrean';
      case 'paid': return 'Sudah Dibayar';
      case 'processing': return 'Sedang Diracik';
      case 'ready': return 'Siap Diambil / Diantar';
      case 'completed': return 'Selesai';
      case 'cancelled': return 'Dibatalkan';
      default: return status;
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-parchment">
      <Loader2 className="w-10 h-10 text-caramel animate-spin mb-4" />
      <p className="font-serif font-bold text-espresso">Memuat Detail Pesanan...</p>
    </div>
  );

  if (!order) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-parchment p-10 text-center">
      <AlertCircle size={48} className="text-red-500 mb-4" />
      <h1 className="font-serif font-bold text-2xl text-espresso">Pesanan Tidak Ditemukan</h1>
      <p className="text-mocha opacity-60 mt-2 text-sm">Pastikan ID pesanan benar atau hubungi barista.</p>
      <button onClick={() => router.push('/')} className="mt-8 bg-espresso text-white px-8 py-4 rounded-2xl font-bold text-sm">
        Kembali ke Menu
      </button>
    </div>
  );

  return (
    <div className="max-w-[430px] mx-auto bg-parchment min-h-screen font-sans text-espresso pb-20">
      <header className="sticky top-0 z-40 bg-parchment/80 backdrop-blur-xl px-5 pt-8 pb-4 flex items-center gap-4 border-b border-latte/30">
        <button onClick={() => router.push('/')} className="w-10 h-10 rounded-2xl flex items-center justify-center bg-white border border-latte shadow-sm active:scale-90 transition-all">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="font-serif font-bold text-xl">Status Pesanan</h1>
          <p className="text-[10px] font-black text-caramel tracking-widest uppercase opacity-60">ID: {order.id.slice(0, 8)}...</p>
        </div>
      </header>

      <div className="p-5 space-y-6">
        {/* Status Card */}
        <div className="bg-white rounded-[40px] p-8 shadow-sm border border-latte/20 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-caramel via-leaf to-espresso"></div>
          
          <div className={`mx-auto w-20 h-20 rounded-3xl flex items-center justify-center mb-6 animate-float ${getStatusColor(order.status)}`}>
            {order.status === 'waiting' || order.status === 'paid' ? <Clock size={32} /> : 
             order.status === 'processing' ? <Coffee size={32} /> :
             order.status === 'ready' ? <ShoppingBag size={32} /> :
             <CheckCircle2 size={32} />}
          </div>

          <h2 className="text-2xl font-serif font-black text-espresso mb-2">{getStatusLabel(order.status)}</h2>
          <p className="text-xs text-mocha opacity-50 font-medium">
            {order.status === 'waiting' ? 'Pesananmu sudah masuk antrean barista.' :
             order.status === 'paid' ? 'Pembayaran berhasil, segera kami proses.' :
             order.status === 'processing' ? 'Barista kami sedang meracik pesananmu.' :
             order.status === 'ready' ? 'Pesananmu sudah siap! Segera meluncur.' :
             order.status === 'completed' ? 'Terima kasih telah berkunjung ke Nine Coffee!' :
             'Pesanan ini telah dibatalkan.'}
          </p>

          <div className="mt-8 pt-8 border-t border-latte/30 grid grid-cols-2 gap-4">
            <div className="text-left">
              <div className="flex items-center gap-1.5 text-mocha opacity-40 mb-1">
                <MapPin size={12} />
                <span className="text-[9px] font-black uppercase tracking-widest">Lokasi</span>
              </div>
              <p className="font-bold text-sm">{order.table_number}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1.5 text-mocha opacity-40 mb-1 justify-end">
                <Timer size={12} />
                <span className="text-[9px] font-black uppercase tracking-widest">Waktu</span>
              </div>
              <p className="font-bold text-sm">{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
        </div>

        {/* Items Summary */}
        <div className="bg-white rounded-[40px] p-8 shadow-sm border border-latte/20">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-parchment rounded-xl flex items-center justify-center text-caramel">
              <Receipt size={20} />
            </div>
            <h3 className="font-serif font-bold text-lg">Rincian Pesanan</h3>
          </div>
          
          <div className="space-y-4">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm">
                <span className="font-medium text-mocha">{item}</span>
                <span className="w-2 h-2 rounded-full bg-latte/30"></span>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-latte/30 flex justify-between items-center">
            <div>
              <p className="text-[9px] font-black text-mocha opacity-40 uppercase tracking-widest">Total Pembayaran</p>
              <p className="text-[10px] font-bold text-caramel mt-0.5">{order.payment_method}</p>
            </div>
            <p className="text-xl font-black text-leaf">{fmt(order.total_price)}</p>
          </div>
        </div>

        <button 
          onClick={() => router.push('/')}
          className="w-full bg-parchment border-2 border-latte text-mocha py-5 rounded-[28px] font-black text-sm tracking-widest uppercase hover:bg-white transition-all shadow-sm"
        >
          Pesan Menu Lainnya
        </button>
      </div>

      <style jsx global>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
        .animate-float { animation: float 3s ease-in-out infinite; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
}
