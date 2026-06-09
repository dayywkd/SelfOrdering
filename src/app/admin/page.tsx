'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  TrendingUp, 
  ShoppingBag, 
  Award, 
  ArrowUpRight,
  Calendar,
  Filter,
  Coffee,
  CupSoda,
  Croissant,
  Pizza,
  Utensils,
  Cake
} from 'lucide-react';

interface MenuItem {
  id: number;
  name: string;
  price: number;
  category: string;
  emoji: string;
  sales_count: number;
  is_active: boolean;
}

interface Order {
  id: string;
  total_price: number;
  created_at: string;
  status: string;
}

type DateFilter = 'today' | 'week' | 'month' | 'year' | 'all';

const getCategoryIcon = (category: string, size: number = 24, className: string = '') => {
  const cat = (category || '').toLowerCase();
  if (cat.includes('non') || cat.includes('teh') || cat.includes('susu') || cat.includes('juice')) return <CupSoda size={size} className={className} />;
  if (cat.includes('kopi') || cat.includes('coffe') || cat.includes('specialty') || cat.includes('regular')) return <Coffee size={size} className={className} />;
  if (cat.includes('dessert') || cat.includes('manis') || cat.includes('cake')) return <Cake size={size} className={className} />;
  if (cat.includes('makan') || cat.includes('roti') || cat.includes('pastry')) return <Croissant size={size} className={className} />;
  if (cat.includes('camilan') || cat.includes('snack') || cat.includes('kentang')) return <Pizza size={size} className={className} />;
  return <Utensils size={size} className={className} />;
};

export default function AdminDashboard() {
  const [menuData, setMenuData] = useState<MenuItem[]>([]);
  const [orderData, setOrderData] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<DateFilter>('month');

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    setLoading(true);
    
    // Calculate start date based on filter
    let startDate = new Date();
    if (filter === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (filter === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (filter === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
    } else if (filter === 'year') {
      startDate.setFullYear(startDate.getFullYear() - 1);
    } else {
      startDate = new Date(0); // All time
    }

    const isoStartDate = startDate.toISOString();

    const [menuRes, orderRes] = await Promise.all([
      supabase.from('menu').select('*').order('sales_count', { ascending: false }),
      supabase.from('orders').select('*').gte('created_at', isoStartDate).eq('status', 'completed')
    ]);
    
    if (menuRes.data) setMenuData(menuRes.data);
    if (orderRes.data) setOrderData(orderRes.data);
    setLoading(false);
  };

  const fmt = (n: number) => 'Rp ' + n.toLocaleString('id-ID');

  const stats = {
    revenue: orderData.reduce((sum, o) => sum + o.total_price, 0),
    totalOrders: orderData.length,
    bestSeller: menuData[0]?.name || '-',
    bestSellerCategory: menuData[0]?.category || '',
  };

  const filterLabels = {
    today: 'Hari Ini',
    week: '7 Hari Terakhir',
    month: 'Bulan Ini',
    year: 'Tahun Ini',
    all: 'Semua Waktu'
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="font-serif font-bold text-4xl text-espresso">Ringkasan Performa</h1>
          <p className="text-mocha opacity-60 flex items-center gap-2 mt-1">
            <Calendar size={14} /> Data diperbarui realtime (WIB)
          </p>
        </div>
        
        {/* Dynamic Filter */}
        <div className="relative group">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-latte rounded-xl text-sm font-bold text-mocha shadow-sm hover:bg-cream transition-colors">
            <Filter size={16} /> {filterLabels[filter]}
          </button>
          <div className="absolute right-0 top-full pt-2 w-48 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-300 z-50">
            <div className="bg-white border border-latte rounded-xl shadow-xl p-2 flex flex-col gap-1">
              {Object.entries(filterLabels).map(([key, label]) => (
                <button 
                  key={key}
                  onClick={() => setFilter(key as DateFilter)}
                  className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
                    filter === key ? 'bg-caramel/10 text-caramel' : 'text-mocha hover:bg-cream hover:pl-5'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-espresso"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white p-8 rounded-[32px] border border-latte shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <TrendingUp size={80} className="text-leaf" />
              </div>
              <p className="text-xs font-bold text-mocha opacity-50 uppercase tracking-widest mb-2">Total Pendapatan</p>
              <p className="font-serif font-bold text-3xl text-leaf">{fmt(stats.revenue)}</p>
              <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-leaf bg-leaf/10 w-fit px-2 py-1 rounded-full">
                <ArrowUpRight size={10} /> Berdasarkan filter
              </div>
            </div>

            <div className="bg-white p-8 rounded-[32px] border border-latte shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <ShoppingBag size={80} className="text-caramel" />
              </div>
              <p className="text-xs font-bold text-mocha opacity-50 uppercase tracking-widest mb-2">Total Pesanan Selesai</p>
              <p className="font-serif font-bold text-3xl text-espresso">{stats.totalOrders} Order</p>
              <p className="mt-4 text-[10px] font-bold text-mocha opacity-40">Dari pesanan yang sukses</p>
            </div>

            <div className="bg-white p-8 rounded-[32px] border border-latte shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Award size={80} className="text-caramel" />
              </div>
              <p className="text-xs font-bold text-mocha opacity-50 uppercase tracking-widest mb-2">Produk Terlaris</p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-caramel/10 rounded-2xl flex items-center justify-center text-caramel">
                  {getCategoryIcon(stats.bestSellerCategory, 24)}
                </div>
                <p className="font-serif font-bold text-3xl text-espresso truncate">{stats.bestSeller}</p>
              </div>
              <p className="mt-4 text-[10px] font-bold text-caramel bg-caramel/10 w-fit px-2 py-1 rounded-full uppercase">Sepanjang masa</p>
            </div>
          </div>

          <div className="bg-white rounded-[40px] border border-latte shadow-sm overflow-hidden mb-10">
            <div className="p-8 border-b border-latte bg-cream/30 flex justify-between items-center">
              <div>
                <h2 className="font-serif font-bold text-2xl text-espresso flex items-center gap-2">
                  <Award className="text-caramel" /> Top 5 Menu Terlaris (All Time)
                </h2>
                <p className="text-xs text-mocha opacity-60 mt-1">Berdasarkan total porsi yang berhasil disajikan.</p>
              </div>
              <a href="/admin/reports" className="text-xs font-bold text-caramel hover:underline uppercase tracking-widest flex items-center gap-1">
                Lihat Semua Laporan <ArrowUpRight size={14} />
              </a>
            </div>
            <table className="w-full text-left">
              <thead className="text-[10px] uppercase text-mocha opacity-40 bg-cream/10 tracking-widest">
                <tr>
                  <th className="px-8 py-5">Menu</th>
                  <th className="px-8 py-5">Kategori</th>
                  <th className="px-8 py-5">Harga</th>
                  <th className="px-8 py-5">Total Terjual</th>
                  <th className="px-8 py-5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-latte/50">
                {menuData.slice(0, 5).map(m => (
                  <tr key={m.id} className="hover:bg-cream/5 transition-colors">
                    <td className="px-8 py-5 flex items-center gap-4">
                      <div className="w-12 h-12 bg-parchment rounded-2xl flex items-center justify-center border border-latte shadow-sm">
                        {getCategoryIcon(m.category, 24, "text-mocha/50")}
                      </div>
                      <span className="font-bold text-espresso">{m.name}</span>
                    </td>
                    <td className="px-8 py-5 text-sm">
                      <span className="bg-latte text-mocha px-3 py-1 rounded-full text-[10px] font-bold uppercase">{m.category}</span>
                    </td>
                    <td className="px-8 py-5 text-sm font-bold text-leaf">{fmt(m.price)}</td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-espresso">{m.sales_count}</span>
                        <span className="text-[10px] text-mocha opacity-50 uppercase">porsi</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`text-[9px] font-bold px-3 py-1.5 rounded-full border ${
                        m.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {m.is_active ? 'READY' : 'OUT OF STOCK'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
}
