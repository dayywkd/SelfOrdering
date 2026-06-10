'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Toaster, toast } from 'sonner';
import { 
  LayoutDashboard, 
  Coffee, 
  ShoppingBag, 
  FileBarChart, 
  LogOut,
  ChevronRight,
  Bell,
  Search,
  User,
  QrCode
} from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [pendingOrders, setPendingOrders] = useState(0);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        setUser(session.user);
        setLoading(false);
      }
    };
    checkUser();

    // Fetch initial pending orders
    const fetchPending = async () => {
      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'waiting');
      if (count !== null) setPendingOrders(count);
    };
    fetchPending();

    const playNotificationSound = () => {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play().catch(e => console.log('Audio play blocked by browser policy'));
    };

    // Subscribe to new orders for notifications
    const subscription = supabase
      .channel('public:orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        fetchPending();
        playNotificationSound();
        toast.success(`Pesanan Baru!`, {
          description: `${payload.new.customer_name} di ${payload.new.table_number}`,
          action: {
            label: 'Lihat',
            onClick: () => router.push('/admin/orders')
          },
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, fetchPending)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'orders' }, fetchPending)
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-parchment">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 bg-espresso rounded-[24px] flex items-center justify-center animate-bounce shadow-xl shadow-espresso/20">
            <Coffee size={32} className="text-caramel" />
          </div>
          <div className="space-y-2 text-center">
            <p className="text-espresso font-serif font-bold text-xl tracking-tight">Nine Coffee</p>
            <p className="text-mocha opacity-40 text-[10px] font-black uppercase tracking-[0.2em]">Authenticating...</p>
          </div>
        </div>
      </div>
    );
  }

  const navItems = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Manajemen Menu', href: '/admin/menu', icon: Coffee },
    { name: 'Manajemen Meja', href: '/admin/tables', icon: QrCode },
    { name: 'Pesanan Masuk', href: '/admin/orders', icon: ShoppingBag },
    { name: 'Laporan', href: '/admin/reports', icon: FileBarChart },
  ];

  return (
    <div className="min-h-screen bg-[#F8F5F2] flex font-sans selection:bg-caramel/20">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 bg-[#1C1008] text-[#A89480] transition-all duration-500 ease-in-out flex flex-col shadow-[10px_0_40px_rgba(0,0,0,0.1)] ${isSidebarOpen ? 'w-72' : 'w-24'}`}>
        {/* Sidebar Header */}
        <div className="p-8 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-caramel rounded-2xl flex items-center justify-center text-white shadow-lg shadow-caramel/20 shrink-0">
              <Coffee size={24} />
            </div>
            <div className={`transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
              <p className="font-serif font-black text-white text-xl leading-none tracking-tight">Nine Coffee</p>
              <p className="text-[9px] font-black text-caramel tracking-[0.2em] uppercase mt-1.5 opacity-60">Admin </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-5 space-y-2 admin-scrollbar overflow-y-auto">
          {isSidebarOpen && (
            <p className="text-[10px] font-black uppercase tracking-[0.2em] px-4 mb-4 opacity-30">Management Console</p>
          )}
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link 
                key={item.name} 
                href={item.href}
                title={item.name}
                className={`flex items-center justify-between px-4 py-4 rounded-2xl transition-all duration-300 group ${
                  isActive 
                  ? 'bg-caramel text-white shadow-xl shadow-caramel/20' 
                  : 'hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Icon size={22} className={`${isActive ? 'scale-110' : 'group-hover:scale-110'} transition-transform duration-300`} />
                    {item.name === 'Pesanan Masuk' && pendingOrders > 0 && !isSidebarOpen && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#1C1008]"></span>
                    )}
                  </div>
                  <span className={`text-sm font-bold tracking-tight transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
                    {item.name}
                  </span>
                </div>
                {item.name === 'Pesanan Masuk' && pendingOrders > 0 && isSidebarOpen && (
                  <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{pendingOrders}</span>
                )}
                {isActive && isSidebarOpen && item.name !== 'Pesanan Masuk' && <ChevronRight size={14} className="opacity-50" />}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-6 mt-auto">
          <div className={`bg-white/5 rounded-3xl p-5 border border-white/10 transition-all duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 scale-90 hidden'}`}>
            <div className="flex items-center gap-4 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-caramel to-mocha flex items-center justify-center text-white font-black text-sm shadow-lg">
                {user?.email?.[0].toUpperCase() || 'A'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-white truncate">Admin Nine Coffe</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all duration-300 text-[10px] font-black uppercase tracking-widest border border-red-500/20"
            >
              <LogOut size={14} /> Keluar
            </button>
          </div>
          {!isSidebarOpen && (
             <button 
                onClick={handleLogout}
                className="w-12 h-12 mx-auto flex items-center justify-center rounded-2xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all duration-300 border border-red-500/20"
              >
                <LogOut size={20} />
              </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={`flex-1 transition-all duration-500 ease-in-out min-h-screen ${isSidebarOpen ? 'ml-72' : 'ml-24'}`}>
        {/* Top Header */}
        <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-latte/20 px-10 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="w-10 h-10 rounded-xl bg-parchment flex items-center justify-center text-mocha hover:bg-cream transition-colors shadow-sm"
            >
              <div className="space-y-1">
                <div className={`h-0.5 bg-mocha transition-all ${isSidebarOpen ? 'w-5' : 'w-3'}`}></div>
                <div className="h-0.5 w-5 bg-mocha"></div>
                <div className={`h-0.5 bg-mocha transition-all ml-auto ${isSidebarOpen ? 'w-5' : 'w-3'}`}></div>
              </div>
            </button>
            <div className="h-6 w-px bg-latte/30 mx-2"></div>
            <div className="hidden md:flex items-center gap-2 text-xs font-bold text-mocha opacity-40 uppercase tracking-[0.2em]">
              <Link href="/admin" className="hover:text-caramel transition-colors">Nine Coffee</Link>
              <ChevronRight size={12} />
              <span className="text-espresso opacity-100">{pathname.split('/').pop() || 'Dashboard'}</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative hidden lg:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-mocha opacity-30" size={16} />
              <input 
                type="text" 
                placeholder="Cari data..." 
                className="bg-parchment border-none rounded-xl pl-10 pr-4 py-2.5 text-xs w-64 focus:ring-2 focus:ring-caramel/20 transition-all outline-none"
              />
            </div>
            <div className="flex items-center gap-3">
              <Link href="/admin/orders" className="w-10 h-10 rounded-xl bg-parchment flex items-center justify-center text-mocha relative hover:bg-cream transition-colors">
                <Bell size={20} />
                {pendingOrders > 0 && (
                  <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                )}
              </Link>
              <button className="w-10 h-10 rounded-xl bg-espresso flex items-center justify-center text-parchment shadow-lg shadow-espresso/10 hover:scale-105 transition-transform">
                <User size={20} />
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-10 max-w-7xl mx-auto admin-scrollbar overflow-y-auto">
          {children}
        </div>
      </main>
      <Toaster position="top-right" richColors />
    </div>
  );
}
