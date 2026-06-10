/**
 * data-store.js
 * Menangani sinkronisasi data menggunakan Supabase
 */

const SUPABASE_URL = 'https://wafubfwkesdmxoszggtb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_gYD2DLfi8HNT4DV-plONkw_w02WEjTN'; // Gunakan Anon Key Anda

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const DataStore = {
    // Menu
    async getMenu() {
        const { data, error } = await supabase
            .from('menu')
            .select('*')
            .order('id', { ascending: true });
        
        if (error) {
            console.error('Error fetching menu:', error);
            return [];
        }
        
        // Map back to the structure expected by the app if needed
        return data.map(item => ({
            id: item.id,
            emoji: item.emoji,
            name: item.name,
            cat: item.category,
            desc: item.description,
            price: item.price,
            active: item.is_active,
            qty: item.sales_count
        }));
    },

    async saveMenu(menuItem) {
        // Jika menuItem adalah array (batch update), atau single object
        if (Array.isArray(menuItem)) {
            // Logic untuk batch update jika diperlukan
            // Namun aplikasi saat ini sering mengirim seluruh array menu
            // Untuk Supabase, kita sebaiknya update per item atau upsert
            const upsertData = menuItem.map(m => ({
                id: m.id.toString().length > 10 ? undefined : m.id, // Handle temporary IDs
                name: m.name,
                description: m.desc,
                price: m.price,
                category: m.cat,
                emoji: m.emoji,
                is_active: m.active,
                sales_count: m.qty
            }));
            
            const { error } = await supabase
                .from('menu')
                .upsert(upsertData);
            
            if (error) console.error('Error saving menu:', error);
        } else {
            const { error } = await supabase
                .from('menu')
                .upsert({
                    id: menuItem.id,
                    name: menuItem.name,
                    description: menuItem.desc,
                    price: menuItem.price,
                    category: menuItem.cat,
                    emoji: menuItem.emoji,
                    is_active: menuItem.active,
                    sales_count: menuItem.qty
                });
            if (error) console.error('Error saving menu item:', error);
        }
        window.dispatchEvent(new Event('menuUpdated'));
    },

    async deleteMenu(id) {
        const { error } = await supabase
            .from('menu')
            .delete()
            .eq('id', id);
        if (error) console.error('Error deleting menu:', error);
        window.dispatchEvent(new Event('menuUpdated'));
    },

    // Orders
    async getOrders() {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Error fetching orders:', error);
            return [];
        }
        
        return data.map(o => ({
            id: o.id,
            table: o.table_number,
            time: this.formatTime(o.created_at),
            customer: o.customer_name,
            method: o.payment_method,
            status: o.status,
            total: o.total_price,
            items: o.items, // Array of strings
            note: o.note
        }));
    },

    async addOrder(order) {
        const { error } = await supabase
            .from('orders')
            .insert([{
                table_number: order.table,
                customer_name: order.customer,
                payment_method: order.method,
                status: order.status,
                total_price: order.total,
                items: order.items,
                note: order.note
            }]);
        
        if (error) console.error('Error adding order:', error);
        window.dispatchEvent(new Event('ordersUpdated'));
    },

    async updateOrderStatus(id, status) {
        const { error } = await supabase
            .from('orders')
            .update({ status: status })
            .eq('id', id);
        
        if (error) console.error('Error updating order status:', error);
        window.dispatchEvent(new Event('ordersUpdated'));
    },

    async deleteOrder(id) {
        const { error } = await supabase
            .from('orders')
            .delete()
            .eq('id', id);
        if (error) console.error('Error deleting order:', error);
        window.dispatchEvent(new Event('ordersUpdated'));
    },

    // Reports (Bisa tetap di localStorage atau buat tabel khusus)
    getReports() {
        return JSON.parse(localStorage.getItem('nine_coffee_reports')) || [];
    },

    saveReports(reports) {
        localStorage.setItem('nine_coffee_reports', JSON.stringify(reports));
        window.dispatchEvent(new Event('reportsUpdated'));
    },

    // Helper
    formatTime(dateStr) {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return 'Baru saja';
        if (diffMins < 60) return `${diffMins} menit lalu`;
        return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    }
};

window.DataStore = DataStore;
window.supabaseClient = supabase;
