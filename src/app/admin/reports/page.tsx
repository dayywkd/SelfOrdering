'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  FileText, 
  Download, 
  Calendar as CalendarIcon,
  Filter,
  Printer,
  X
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  Filler
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Filler,
  Title,
  Tooltip,
  Legend
);

type DateFilter = 'today' | 'week' | 'month' | 'year' | 'all';

interface Order {
  id: string;
  table_number: string;
  customer_name: string;
  payment_method: string;
  status: string;
  total_price: number;
  items: string[];
  note: string;
  created_at: string;
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<DateFilter>('today');
  const [chartData, setChartData] = useState<any>(null);
  const [summaryData, setSummaryData] = useState({ revenue: 0, orders: 0 });
  const [categoryData, setCategoryData] = useState<{name: string, perc: string, val: number}[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);

  useEffect(() => {
    fetchReportData();
  }, [filter]);

  const fetchReportData = async () => {
    setLoading(true);
    
    // Hitung tanggal mulai
    let startDate = new Date();
    if (filter === 'today') startDate.setHours(0, 0, 0, 0);
    else if (filter === 'week') startDate.setDate(startDate.getDate() - 7);
    else if (filter === 'month') startDate.setMonth(startDate.getMonth() - 1);
    else if (filter === 'year') startDate.setFullYear(startDate.getFullYear() - 1);
    else startDate = new Date(0); // All time

    const isoStartDate = startDate.toISOString();

    const [ordersRes, menuRes] = await Promise.all([
      supabase.from('orders').select('*').gte('created_at', isoStartDate).eq('status', 'completed').order('created_at', { ascending: false }),
      supabase.from('menu').select('name, category')
    ]);

    if (ordersRes.data) {
      const orders = ordersRes.data as Order[];
      setAllOrders(orders);
      
      setSummaryData({
        revenue: orders.reduce((sum, o) => sum + o.total_price, 0),
        orders: orders.length
      });

      // Olah data untuk grafik Bar (Pendapatan per hari/bulan)
      const groupedData: Record<string, number> = {};
      orders.forEach(o => {
        const date = new Date(o.created_at);
        // Format label tergantung filter
        const label = filter === 'today' ? date.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit' }) + ':00' 
                    : filter === 'year' ? date.toLocaleString('id-ID', { month: 'short' })
                    : date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        
        groupedData[label] = (groupedData[label] || 0) + o.total_price;
      });

      // Sort labels (especially needed for 'today' or 'week' since we iterate in descending order)
      const sortedLabels = Object.keys(groupedData).sort();
      const sortedValues = sortedLabels.map(l => groupedData[l]);

      setChartData({
        labels: sortedLabels,
        datasets: [
          {
            label: 'Pendapatan (Rp)',
            data: sortedValues,
            borderColor: '#C07D4A', // Caramel
            backgroundColor: 'rgba(192, 125, 74, 0.2)', // Light Caramel fill
            borderWidth: 3,
            pointBackgroundColor: '#C07D4A',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 4,
            fill: true,
            tension: 0.4 // Melengkung mulus
          }
        ]
      });

      // Olah data kategori jika data menu tersedia
      if (menuRes.data) {
        const catCount: Record<string, number> = {};
        let totalItems = 0;

        orders.forEach(o => {
          o.items.forEach((itemStr: string) => {
            const match = itemStr.match(/^(\d+)x\s+(.+)$/);
            if (match) {
              const qty = parseInt(match[1]);
              const name = match[2];
              const menuInfo = menuRes.data.find(m => m.name === name);
              if (menuInfo) {
                const cat = menuInfo.category;
                const catName = cat.charAt(0).toUpperCase() + cat.slice(1);
                catCount[catName] = (catCount[catName] || 0) + qty;
                totalItems += qty;
              }
            }
          });
        });

        const catArray = Object.entries(catCount)
          .map(([name, val]) => ({
            name,
            val,
            perc: totalItems > 0 ? Math.round((val / totalItems) * 100) + '%' : '0%'
          }))
          .filter(c => c.val > 0)
          .sort((a, b) => b.val - a.val);

        setCategoryData(catArray);
      }
    }
    setLoading(false);
  };

  const handleExportPDF = () => {
    window.print();
  };

  const fmt = (n: number) => 'Rp ' + n.toLocaleString('id-ID');
  
  const generateTransactionId = (id: string, dateStr: string) => {
    const d = new Date(dateStr);
    const datePart = `${d.getFullYear().toString().slice(2)}${(d.getMonth()+1).toString().padStart(2, '0')}${d.getDate().toString().padStart(2, '0')}`;
    const idPart = id.split('-')[0].substring(0, 4).toUpperCase();
    return `INV-${datePart}-${idPart}`;
  };

  const filterLabels = {
    today: 'Hari Ini',
    week: '7 Hari Terakhir',
    month: 'Bulan Ini',
    year: 'Tahun Ini',
    all: 'Semua Waktu'
  };

  return (
    <>
      <div className="animate-fade-in print:bg-white print:p-0 relative min-h-screen">
        <div className="flex justify-between items-center mb-8 print:mb-4">
          <div>
            <h1 className="font-serif font-bold text-3xl text-espresso print:text-black">Laporan Penjualan</h1>
            <p className="text-mocha opacity-60 print:opacity-100 print:text-black">Analisis performa bisnis berdasarkan pesanan selesai.</p>
          </div>
          <div className="flex gap-3 print:hidden">
            <div className="relative group z-40">
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-latte rounded-xl text-sm font-bold text-mocha hover:bg-cream transition-all shadow-sm">
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
            <button 
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2 bg-espresso text-parchment rounded-xl text-sm font-bold hover:bg-mocha transition-all shadow-lg shadow-espresso/20 active:scale-95"
            >
              <Download size={16} /> Ekspor PDF
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-espresso"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 print:block print:w-full print:m-0">
            
            <div className="grid grid-cols-2 gap-8 print:grid-cols-2 print:gap-4 print:mb-6">
              <div className="bg-white rounded-[32px] border border-latte shadow-sm p-8 print:border-black/20 print:shadow-none print:p-4 print:rounded-none">
                <h3 className="text-xs font-bold text-mocha opacity-50 uppercase tracking-widest mb-1 print:text-black print:opacity-100">Total Pendapatan</h3>
                <p className="font-serif font-bold text-4xl text-leaf print:text-black print:text-2xl">{fmt(summaryData.revenue)}</p>
                <p className="text-sm font-bold text-mocha opacity-60 mt-2 print:text-black print:text-xs">{filterLabels[filter]}</p>
              </div>
              <div className="bg-white rounded-[32px] border border-latte shadow-sm p-8 print:border-black/20 print:shadow-none print:p-4 print:rounded-none">
                <h3 className="text-xs font-bold text-mocha opacity-50 uppercase tracking-widest mb-1 print:text-black print:opacity-100">Total Pesanan Sukses</h3>
                <p className="font-serif font-bold text-4xl text-espresso print:text-black print:text-2xl">{summaryData.orders} <span className="text-xl print:text-sm">Transaksi</span></p>
                <p className="text-sm font-bold text-mocha opacity-60 mt-2 print:text-black print:text-xs">{filterLabels[filter]}</p>
              </div>
            </div>

            <div className="bg-white rounded-[40px] border border-latte shadow-sm p-8 print:border-black/20 print:shadow-none print:p-4 print:rounded-none print:mb-6">
              <h3 className="font-serif font-bold text-2xl text-espresso mb-6 flex items-center gap-2 print:text-black print:text-lg">
                <CalendarIcon className="text-caramel print:text-black" /> Tren Pendapatan
              </h3>
              {chartData && chartData.labels.length > 0 ? (
                <div className="h-[300px] w-full print:h-[200px]">
                  <Line 
                    data={chartData} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: {
                        y: { beginAtZero: true, border: { display: false }, grid: { color: '#E8D5B7' } },
                        x: { grid: { display: false } }
                      }
                    }} 
                  />
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-mocha opacity-40 font-bold uppercase tracking-widest">
                  Tidak ada data transaksi di periode ini
                </div>
              )}
            </div>

            <div className="bg-white rounded-[40px] border border-latte shadow-sm overflow-hidden print:border-black/20 print:shadow-none print:rounded-none">
              <div className="p-8 border-b border-latte bg-cream/30 print:bg-transparent print:p-4">
                <h3 className="font-serif font-bold text-2xl text-espresso flex items-center gap-2 print:text-black print:text-lg">
                  <FileText className="text-caramel print:text-black" /> Riwayat Transaksi
                </h3>
                <p className="text-xs text-mocha opacity-60 mt-1 print:text-black print:opacity-100">Menampilkan {allOrders.length} transaksi terakhir berdasarkan filter.</p>
              </div>
              {allOrders.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left print:text-xs">
                    <thead className="text-[10px] uppercase text-mocha opacity-40 bg-cream/10 tracking-widest print:text-black print:opacity-100">
                      <tr>
                        <th className="px-8 py-5 print:px-2 print:py-2">No. Transaksi</th>
                        <th className="px-8 py-5 print:px-2 print:py-2">Waktu</th>
                        <th className="px-8 py-5 print:px-2 print:py-2">Pelanggan</th>
                        <th className="px-8 py-5 print:px-2 print:py-2">Metode</th>
                        <th className="px-8 py-5 print:px-2 print:py-2 text-right">Total</th>
                        <th className="px-8 py-5 text-center print:hidden">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-latte/50 print:divide-black/20">
                      {allOrders.map(order => (
                        <tr key={order.id} className="hover:bg-cream/5 transition-colors">
                          <td className="px-8 py-5 print:px-2 print:py-2 font-bold text-espresso print:text-black">{generateTransactionId(order.id, order.created_at)}</td>
                          <td className="px-8 py-5 print:px-2 print:py-2 text-mocha opacity-80 print:text-black print:opacity-100">
                            {new Date(order.created_at).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short' })},{' '}
                            {new Date(order.created_at).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' })} WIB
                          </td>
                          <td className="px-8 py-5 print:px-2 print:py-2">
                            <span className="font-bold text-espresso block print:text-black">{order.customer_name}</span>
                            <span className="text-[10px] text-mocha uppercase opacity-50 print:text-black">{order.table_number}</span>
                          </td>
                          <td className="px-8 py-5 print:px-2 print:py-2">
                            <span className="bg-latte text-mocha px-3 py-1 rounded-full text-[10px] font-bold uppercase print:bg-transparent print:p-0 print:text-black">
                              {order.payment_method}
                            </span>
                          </td>
                          <td className="px-8 py-5 print:px-2 print:py-2 text-right font-black text-leaf print:text-black">{fmt(order.total_price)}</td>
                          <td className="px-8 py-5 text-center print:hidden">
                            <button 
                              onClick={() => setReceiptOrder(order)}
                              className="p-2 bg-cream text-mocha hover:bg-caramel hover:text-white rounded-lg transition-all"
                              title="Cetak Struk"
                            >
                              <Printer size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-16 flex flex-col items-center justify-center text-center opacity-40">
                  <FileText size={48} className="text-mocha mb-4" />
                  <p className="font-serif font-bold text-xl text-espresso">Belum ada transaksi</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* STRUK MODAL (Thermal Receipt) */}
      {receiptOrder && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 print:absolute print:inset-0 print:z-auto print:bg-white print:p-0">
          <div className="absolute inset-0 bg-espresso/80 backdrop-blur-sm print:hidden" onClick={() => setReceiptOrder(null)}></div>
          
          <div className="bg-white p-8 w-full max-w-[320px] relative z-10 animate-scale-up shadow-2xl print:shadow-none print:w-full print:max-w-none print:p-0 print:animate-none">
            {/* Action buttons (hidden in print) */}
            <div className="absolute -top-12 right-0 flex gap-2 print:hidden">
              <button onClick={() => window.print()} className="bg-leaf text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-leaf/90 transition-all shadow-lg">
                <Printer size={16} /> Cetak
              </button>
              <button onClick={() => setReceiptOrder(null)} className="w-9 h-9 bg-white/20 text-white rounded-xl flex items-center justify-center hover:bg-red-500 transition-all">
                <X size={20} />
              </button>
            </div>

            {/* Receipt Content (This will be printed) */}
            <div className="print-receipt font-mono text-black">
              <div className="text-center mb-6">
                <h1 className="font-bold text-2xl tracking-tighter uppercase mb-1">NINE COFFEE</h1>
                <p className="text-[10px] uppercase">Specialty Coffee & Eatery</p>
                <p className="text-[10px] mt-1 border-b-2 border-black border-dashed pb-4">
                  Jl. Coffee Avenue No. 9<br/>
                  DKI Jakarta, Indonesia
                </p>
              </div>

              <div className="text-xs mb-4 grid grid-cols-2 gap-1 border-b-2 border-black border-dashed pb-4">
                <span className="font-bold">ID Transaksi:</span>
                <span className="text-right">{generateTransactionId(receiptOrder.id, receiptOrder.created_at)}</span>
                <span className="font-bold">Tanggal:</span>
                <span className="text-right">{new Date(receiptOrder.created_at).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                <span className="font-bold">Waktu:</span>
                <span className="text-right">{new Date(receiptOrder.created_at).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' })} WIB</span>
                <span className="font-bold mt-2">Pelanggan:</span>
                <span className="text-right mt-2">{receiptOrder.customer_name}</span>
                <span className="font-bold">Layanan:</span>
                <span className="text-right uppercase">{receiptOrder.table_number}</span>
              </div>

              <div className="text-xs mb-4 border-b-2 border-black border-dashed pb-4">
                <div className="font-bold mb-2">Item Pesanan:</div>
                {receiptOrder.items.map((item, idx) => {
                  const match = item.match(/^(\d+)x\s+(.+)$/);
                  return (
                    <div key={idx} className="flex justify-between mb-1">
                      <span className="w-8">{match ? match[1] + 'x' : '1x'}</span>
                      <span className="flex-1 truncate pr-2">{match ? match[2] : item}</span>
                    </div>
                  );
                })}
              </div>

              <div className="text-xs grid grid-cols-2 gap-1 mb-6">
                <span className="font-bold">Subtotal:</span>
                <span className="text-right">{fmt(Math.round(receiptOrder.total_price / 1.1))}</span>
                <span className="font-bold">Pajak (10%):</span>
                <span className="text-right">{fmt(receiptOrder.total_price - Math.round(receiptOrder.total_price / 1.1))}</span>
                <span className="font-bold text-sm mt-2 pt-2 border-t border-black">TOTAL:</span>
                <span className="text-right font-black text-sm mt-2 pt-2 border-t border-black">{fmt(receiptOrder.total_price)}</span>
                <span className="font-bold mt-2">Pembayaran:</span>
                <span className="text-right uppercase mt-2">{receiptOrder.payment_method}</span>
              </div>

              <div className="text-center text-[10px] mt-8 pt-4 border-t-2 border-black border-dashed">
                <p className="font-bold mb-1">TERIMA KASIH</p>
                <p>Silakan berkunjung kembali!</p>
                <p className="mt-2 text-[8px] opacity-50">Powered by Nine Coffee System</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleUp { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
        .animate-scale-up { animation: scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
        
        @media print {
          body * { visibility: hidden; }
          .print\\:hidden { display: none !important; }
          
          /* Show receipt modal content in print mode if open */
          .fixed .print-receipt, .fixed .print-receipt * {
            visibility: visible;
          }
          
          /* If modal is open, only print modal. Else print main report */
          body:has(.print-receipt) main { display: none !important; }
          body:has(.print-receipt) .fixed {
            position: absolute;
            left: 0;
            top: 0;
            margin: 0;
            padding: 0;
            width: 100%;
          }
          
          /* If no modal, print main report */
          main, main * { visibility: visible; }
          main { position: absolute; left: 0; top: 0; width: 100%; padding: 20px !important; }
        }
      `}</style>
    </>
  );
}