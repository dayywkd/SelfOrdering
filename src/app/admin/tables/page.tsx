'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  QrCode, 
  Plus, 
  Trash2, 
  ToggleLeft, 
  ToggleRight, 
  RefreshCcw,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';

interface Table {
  id: number;
  number: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export default function TablesManagement() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tables')
      .select('*')
      .order('number', { ascending: true });
    
    if (!error && data) {
      setTables(data);
    }
    setLoading(false);
  };

  const toggleTableStatus = async (id: number, currentStatus: string) => {
    setActionLoading(id);
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    const { error } = await supabase
      .from('tables')
      .update({ status: newStatus })
      .eq('id', id);

    if (!error) {
      setTables(prev => prev.map(t => t.id === id ? { ...t, status: newStatus as 'active' | 'inactive' } : t));
    } else {
      alert('Gagal mengubah status meja');
    }
    setActionLoading(null);
  };

  const addTable = async () => {
    if (!newTableNumber.trim()) return;
    
    const { data, error } = await supabase
      .from('tables')
      .insert([{ number: newTableNumber, status: 'inactive' }])
      .select();

    if (!error && data) {
      setTables(prev => [...prev, data[0]].sort((a, b) => a.number.localeCompare(b.number)));
      setNewTableNumber('');
      setIsAdding(false);
    } else {
      alert('Gagal menambah meja (mungkin nomor meja sudah ada)');
    }
  };

  const deleteTable = async (id: number) => {
    if (!confirm('Hapus meja ini?')) return;
    
    const { error } = await supabase
      .from('tables')
      .delete()
      .eq('id', id);

    if (!error) {
      setTables(prev => prev.filter(t => t.id !== id));
    } else {
      alert('Gagal menghapus meja');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-8 rounded-[32px] border border-latte/20 shadow-sm">
        <div>
          <h1 className="text-3xl font-serif font-black text-espresso tracking-tight">Manajemen Meja</h1>
          <p className="text-mocha opacity-50 text-sm mt-1">Buka atau tutup akses pemesanan dari meja pelanggan.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center justify-center gap-2 bg-caramel text-white px-6 py-4 rounded-2xl font-bold text-sm shadow-xl shadow-caramel/20 hover:scale-105 transition-all"
        >
          <Plus size={18} /> Tambah Meja Baru
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-8 rounded-[32px] border-2 border-caramel/20 shadow-xl animate-slide-down">
          <h3 className="font-bold text-espresso mb-4">Tambah Meja Baru</h3>
          <div className="flex gap-4">
            <input 
              type="text" 
              placeholder="Contoh: Meja 10" 
              className="flex-1 bg-parchment border-none rounded-2xl px-6 py-4 text-sm outline-none focus:ring-2 focus:ring-caramel/20 transition-all"
              value={newTableNumber}
              onChange={(e) => setNewTableNumber(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTable()}
            />
            <button 
              onClick={addTable}
              className="bg-espresso text-white px-8 py-4 rounded-2xl font-bold text-sm hover:bg-mocha transition-all"
            >
              Simpan
            </button>
            <button 
              onClick={() => setIsAdding(false)}
              className="bg-parchment text-mocha px-6 py-4 rounded-2xl font-bold text-sm hover:bg-latte/20 transition-all"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array(6).fill(0).map((_, i) => (
            <div key={i} className="bg-white h-48 rounded-[32px] animate-pulse border border-latte/10"></div>
          ))
        ) : tables.map((table) => (
          <div key={table.id} className="group bg-white rounded-[32px] border border-latte/20 p-6 shadow-sm hover:shadow-xl transition-all duration-500">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors duration-500 ${table.status === 'active' ? 'bg-leaf/10 text-leaf' : 'bg-mocha/5 text-mocha/30'}`}>
                  <QrCode size={28} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-espresso">{table.number}</h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`w-2 h-2 rounded-full ${table.status === 'active' ? 'bg-leaf animate-pulse' : 'bg-mocha/30'}`}></span>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${table.status === 'active' ? 'text-leaf' : 'text-mocha/40'}`}>
                      {table.status === 'active' ? 'Aktif / Open' : 'Non-Aktif / Closed'}
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => deleteTable(table.id)}
                className="p-2 text-mocha/20 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
              >
                <Trash2 size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <button 
                onClick={() => toggleTableStatus(table.id, table.status)}
                disabled={actionLoading === table.id}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-300 ${
                  table.status === 'active' 
                  ? 'bg-leaf/5 border-leaf/10 text-leaf hover:bg-leaf/10' 
                  : 'bg-red-50/50 border-red-100 text-red-600 hover:bg-red-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {actionLoading === table.id ? (
                    <RefreshCcw size={20} className="animate-spin" />
                  ) : table.status === 'active' ? (
                    <CheckCircle2 size={20} />
                  ) : (
                    <XCircle size={20} />
                  )}
                  <span className="font-bold text-sm">
                    {table.status === 'active' ? 'Meja Buka' : 'Meja Tutup'}
                  </span>
                </div>
                {table.status === 'active' ? <ToggleRight size={28} /> : <ToggleLeft size={28} className="opacity-30" />}
              </button>
              
              <div className="flex items-center gap-2 px-2 text-[10px] text-mocha opacity-40 font-bold uppercase tracking-widest">
                <AlertCircle size={12} />
                <span>Klik untuk {table.status === 'active' ? 'Tutup Akses' : 'Buka Akses'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!loading && tables.length === 0 && (
        <div className="bg-white rounded-[32px] p-20 text-center border border-latte/20 border-dashed">
          <div className="w-20 h-20 bg-parchment rounded-full flex items-center justify-center mx-auto mb-6 text-mocha/20">
            <QrCode size={40} />
          </div>
          <h3 className="font-serif font-bold text-xl text-espresso">Belum ada meja terdaftar</h3>
          <p className="text-mocha opacity-50 mt-2 max-w-xs mx-auto text-sm">Tambahkan meja pertama Anda agar pelanggan bisa mulai memesan.</p>
          <button 
            onClick={() => setIsAdding(true)}
            className="mt-8 bg-espresso text-white px-8 py-4 rounded-2xl font-bold text-sm hover:scale-105 transition-all shadow-xl shadow-espresso/10"
          >
            Tambah Meja Sekarang
          </button>
        </div>
      )}
    </div>
  );
}
