'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Edit2, Trash2, Search, Coffee, CupSoda, Croissant, Pizza, Utensils } from 'lucide-react';

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

const getCategoryIcon = (category: string, size: number = 24, className: string = '') => {
  const cat = (category || '').toLowerCase();
  if (cat.includes('coffe') && !cat.includes('non')) return <Coffee size={size} className={className} />;
  if (cat.includes('non') || cat.includes('teh') || cat.includes('susu')) return <CupSoda size={size} className={className} />;
  if (cat.includes('makan') || cat.includes('roti') || cat.includes('pastry')) return <Croissant size={size} className={className} />;
  if (cat.includes('camilan') || cat.includes('snack') || cat.includes('kentang')) return <Pizza size={size} className={className} />;
  return <Utensils size={size} className={className} />;
};

export default function MenuManagement() {
  const [menuData, setMenuData] = useState<MenuItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Partial<MenuItem> | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null);
  
  // Custom dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const categoryOptions = Array.from(new Set([
    'Specialty Coffe', 'Non Coffe', 'Regular Coffe', 'Snack', 'Dessert', 
    ...menuData.map(m => m.category)
  ])).filter(c => c);

  // Toast state
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    const { data } = await supabase.from('menu').select('*').order('id', { ascending: true });
    if (data) setMenuData(data);
  };

  const toggleMenuStatus = async (item: MenuItem) => {
    const { error } = await supabase.from('menu').update({ is_active: !item.is_active }).eq('id', item.id);
    if (!error) {
      showToast(`Status '${item.name}' berhasil diperbarui!`, 'success');
      fetchMenu();
    } else {
      showToast(`Gagal memperbarui status!`, 'error');
    }
  };

  const triggerDelete = (item: MenuItem) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    const { error } = await supabase.from('menu').delete().eq('id', itemToDelete.id);
    if (!error) {
      showToast(`Menu '${itemToDelete.name}' berhasil dihapus!`, 'success');
    } else {
      showToast(`Gagal menghapus menu!`, 'error');
    }
    setIsDeleteModalOpen(false);
    setItemToDelete(null);
    fetchMenu();
  };

  const saveMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validasi Manual
    if (!editingMenu?.name?.trim()) {
      showToast('Nama menu tidak boleh kosong!', 'error');
      return;
    }
    if (!editingMenu?.category?.trim()) {
      showToast('Kategori menu harus diisi!', 'error');
      return;
    }
    if (!editingMenu?.price || editingMenu.price <= 0) {
      showToast('Harga menu tidak valid!', 'error');
      return;
    }

    let error = null;
    if (editingMenu.id) {
      const { error: err } = await supabase.from('menu').update({
        name: editingMenu.name,
        description: editingMenu.description || '',
        price: editingMenu.price,
        category: editingMenu.category,
        emoji: '',
        is_active: editingMenu.is_active
      }).eq('id', editingMenu.id);
      error = err;
    } else {
      const { error: err } = await supabase.from('menu').insert([{
        ...editingMenu,
        description: editingMenu.description || '',
        emoji: '',
        sales_count: 0,
        is_active: true
      }]);
      error = err;
    }

    if (!error) {
      showToast(`Menu berhasil ${editingMenu.id ? 'diperbarui' : 'ditambahkan'}!`, 'success');
      setIsModalOpen(false);
      setEditingMenu(null);
      fetchMenu();
    } else {
      showToast(`Gagal menyimpan menu!`, 'error');
    }
  };

  const fmt = (n: number) => 'Rp ' + n.toLocaleString('id-ID');

  const filteredMenu = menuData.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <div className="animate-fade-in relative">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="font-serif font-bold text-3xl text-espresso">Manajemen Menu</h1>
            <p className="text-mocha opacity-60">Kelola daftar menu, harga, dan ketersediaan.</p>
          </div>
          <button 
            onClick={() => { setEditingMenu({ category: '' }); setIsModalOpen(true); }}
            className="bg-leaf text-parchment px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-leaf/20 hover:bg-leaf/90 transition-all"
          >
            <Plus size={20} /> Tambah Menu
          </button>
        </div>

        <div className="bg-white rounded-3xl border border-latte shadow-sm overflow-hidden">
          <div className="p-6 border-b border-latte bg-cream/30 flex justify-between items-center">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-mocha opacity-40" size={18} />
              <input 
                type="text" 
                placeholder="Cari menu..."
                className="w-full bg-white border border-latte rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-caramel/20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <span className="text-xs font-bold text-mocha opacity-60 uppercase">Total: {filteredMenu.length} Item</span>
            </div>
          </div>
          
          <table className="w-full text-left">
            <thead className="text-xs uppercase text-mocha opacity-60 bg-cream/10">
              <tr>
                <th className="px-6 py-4">Ikon</th>
                <th className="px-6 py-4">Nama & Deskripsi</th>
                <th className="px-6 py-4">Harga</th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-latte/50">
              {filteredMenu.map(m => (
                <tr key={m.id} className="hover:bg-cream/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="w-12 h-12 bg-parchment rounded-xl flex items-center justify-center border border-latte shadow-sm">
                      {getCategoryIcon(m.category, 20, "text-mocha/50")}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-sm text-espresso">{m.name}</p>
                    <p className="text-[10px] text-caramel line-clamp-1">{m.description}</p>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-leaf">{fmt(m.price)}</td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-latte text-mocha uppercase">
                      {m.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => toggleMenuStatus(m)}
                      className={`w-12 h-6 rounded-full relative transition-all ${m.is_active ? 'bg-leaf' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${m.is_active ? 'right-1' : 'left-1'}`} />
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => { setEditingMenu(m); setIsModalOpen(true); }} className="p-2 hover:bg-cream rounded-lg text-mocha transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => triggerDelete(m)} className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL HAPUS MENU */}
      {isDeleteModalOpen && itemToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-espresso/60 backdrop-blur-sm" onClick={() => setIsDeleteModalOpen(false)}></div>
          <div className="bg-parchment rounded-[32px] p-8 w-full max-w-sm relative z-10 animate-scale-up shadow-2xl border border-white/20">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center text-3xl mb-6 mx-auto">
              <Trash2 size={32} />
            </div>
            <h2 className="font-serif font-bold text-2xl text-center text-espresso mb-2">Hapus Menu?</h2>
            <p className="text-sm text-center text-mocha opacity-70 mb-8 leading-relaxed">
              Anda yakin ingin menghapus <span className="font-bold text-espresso">{itemToDelete.name}</span> dari daftar menu? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-3.5 rounded-xl font-bold text-sm text-mocha bg-white border border-latte shadow-sm hover:bg-cream transition-all"
              >
                Batal
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 py-3.5 rounded-xl font-bold text-sm text-white bg-red-600 shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all flex items-center justify-center"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT MENU */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-espresso/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-[32px] p-8 w-full max-w-md animate-scale-up">
            <h2 className="font-serif font-bold text-2xl mb-6 text-espresso">{editingMenu?.id ? 'Edit Menu' : 'Tambah Menu Baru'}</h2>
            <form onSubmit={saveMenu} className="space-y-4">
              
              <div>
                <label className="text-xs font-bold opacity-40 block mb-1 uppercase tracking-wider">Nama Menu</label>
                <input 
                  type="text" 
                  className="w-full bg-cream rounded-xl px-4 py-2 outline-none border border-latte focus:ring-2 focus:ring-caramel/20"
                  value={editingMenu?.name || ''}
                  onChange={e => setEditingMenu({...editingMenu, name: e.target.value})}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label className="text-xs font-bold opacity-40 block mb-1 uppercase tracking-wider">Kategori</label>
                  <div 
                    className="w-full bg-cream rounded-xl px-4 py-2 outline-none border border-latte focus-within:ring-2 focus-within:ring-caramel/20 flex justify-between items-center cursor-pointer"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  >
                    <input 
                      type="text" 
                      placeholder="Pilih atau ketik..."
                      className="bg-transparent outline-none w-full cursor-text"
                      value={editingMenu?.category || ''}
                      onChange={e => setEditingMenu({...editingMenu, category: e.target.value})}
                      required
                    />
                    <div className="text-mocha opacity-50 text-xs">▼</div>
                  </div>
                  
                  {isDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)}></div>
                      <div className="absolute top-full left-0 right-0 mt-2 bg-espresso rounded-xl shadow-xl z-50 overflow-hidden py-1 border border-white/10 animate-scale-up origin-top">
                        {categoryOptions.map(cat => (
                          <div 
                            key={cat} 
                            onClick={() => {
                              setEditingMenu({...editingMenu, category: cat});
                              setIsDropdownOpen(false);
                            }}
                            className="px-4 py-2.5 text-parchment text-sm font-medium hover:bg-white/10 cursor-pointer transition-colors"
                          >
                            {cat}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <div>
                  <label className="text-xs font-bold opacity-40 block mb-1 uppercase tracking-wider">Harga (Rp)</label>
                  <input 
                    type="text" 
                    inputMode="numeric"
                    className="w-full bg-cream rounded-xl px-4 py-2 outline-none border border-latte focus:ring-2 focus:ring-caramel/20"
                    value={editingMenu?.price ? editingMenu.price.toLocaleString('id-ID') : ''}
                    onChange={e => {
                      const rawValue = e.target.value.replace(/\D/g, '');
                      setEditingMenu({...editingMenu, price: rawValue ? parseInt(rawValue, 10) : 0});
                    }}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold opacity-40 block mb-1 uppercase tracking-wider">Deskripsi</label>
                <textarea 
                  className="w-full bg-cream rounded-xl px-4 py-2 outline-none border border-latte focus:ring-2 focus:ring-caramel/20 resize-none"
                  rows={3}
                  value={editingMenu?.description || ''}
                  onChange={e => setEditingMenu({...editingMenu, description: e.target.value})}
                />
              </div>

              <div className="flex gap-3 pt-6">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 rounded-2xl border border-latte font-bold text-mocha hover:bg-cream transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 rounded-2xl bg-leaf text-parchment font-bold shadow-lg shadow-leaf/20 hover:bg-leaf/90 transition-all"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[200] px-6 py-4 rounded-2xl shadow-2xl border animate-slide-up flex items-center gap-3 font-medium text-sm ${
          toast.type === 'success' ? 'bg-leaf text-white border-leaf/50 shadow-leaf/20' : 'bg-red-600 text-white border-red-500/50 shadow-red-600/20'
        }`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${toast.type === 'success' ? 'bg-white/20' : 'bg-white/20'}`}>
            {toast.type === 'success' ? '✓' : '✕'}
          </div>
          {toast.message}
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleUp { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes slideUpToast { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
        .animate-scale-up { animation: scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .animate-slide-up { animation: slideUpToast 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </>
  );
}
