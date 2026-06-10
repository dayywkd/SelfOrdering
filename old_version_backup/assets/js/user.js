/* user.js */

let menuData = [];
let cart = {}; // {id: qty}
let currentCat = 'semua';
let selectedPaymentMethod = 'tunai';
let searchQuery = '';

async function init() {
    await loadData();
    renderMenu('semua');
    updateFloatBar();
}

async function loadData() {
    menuData = await DataStore.getMenu();
}

/* ── RENDER MENU GRID ── */
window.renderMenu = function(cat) {
    const grid = document.getElementById('menuGrid');
    if (!grid) return;
    const label = document.getElementById('sectionLabel');
    const countEl = document.getElementById('sectionCount');
    const labels = { semua: 'Semua Menu', kopi: 'Kopi', nonkopi: 'Non-Kopi', makanan: 'Makanan', camilan: 'Camilan' };
    const query = searchQuery.toLowerCase().trim();
    if (label) label.textContent = query ? 'Hasil Pencarian' : labels[cat];

    const categoryItems = query || cat === 'semua' ? menuData : menuData.filter(m => m.cat === cat);
    // Only show active items for users
    const activeItems = categoryItems.filter(m => m.active);
    const items = activeItems.filter(m => !query || (m.name + ' ' + m.desc + ' ' + m.cat).toLowerCase().includes(query));
    if (countEl) countEl.textContent = items.length + ' item';

    grid.innerHTML = items.length ? items.map(m => {
        const inCart = cart[m.id] || 0;
        return `
    <div class="menu-card rounded-2xl overflow-hidden" style="background:#fff; border:1px solid #E8D5B7; box-shadow:0 2px 12px rgba(59,31,14,.07);">
      <div class="img-ph" style="height:130px;">${m.emoji}</div>
      <div class="p-3">
        <p class="font-semibold font-body leading-tight" style="color:#3B1F0E; font-size:.88rem;">${m.name}</p>
        <p class="font-body mt-1 leading-snug" style="color:#C07D4A; font-size:.72rem;">${m.desc}</p>
        <div class="flex items-center justify-between mt-3">
          <span class="font-display font-bold" style="color:#2D6A4F; font-size:.92rem;">${fmt(m.price)}</span>
          ${inCart === 0
                ? `<button class="add-btn flex items-center gap-1 px-3 py-1.5 rounded-xl font-body font-semibold text-xs"
                        style="background:#2D6A4F; color:#FBF8F4;"
                        onclick="addItem(${m.id})">
                 <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="6" y1="1" x2="6" y2="11"/><line x1="1" y1="6" x2="11" y2="6"/></svg>
                 Tambah
               </button>`
                : `<div class="flex items-center gap-1.5 rounded-xl overflow-hidden" style="background:#F5EFE6;">
                 <button class="qty-btn px-2 py-1 font-bold text-base font-body" style="color:#3B1F0E;" onclick="changeQty(${m.id},-1)">−</button>
                 <span class="font-semibold text-sm font-body" style="color:#2D6A4F; min-width:14px;text-align:center;">${inCart}</span>
                 <button class="qty-btn px-2 py-1 font-bold text-base font-body" style="color:#3B1F0E;" onclick="changeQty(${m.id},1)">+</button>
               </div>`
            }
        </div>
      </div>
    </div>`;
    }).join('') : `
    <div class="col-span-2 rounded-2xl px-5 py-9 text-center" style="background:#fff;border:1px solid #E8D5B7;">
      <div style="font-size:2rem;margin-bottom:8px;">🔎</div>
      <p class="font-semibold font-body text-sm" style="color:#3B1F0E;">Menu tidak ditemukan</p>
      <p class="font-body text-xs mt-1" style="color:#C07D4A;">Coba kata kunci lain.</p>
    </div>`;
}

window.setCategory = function(btn, cat) {
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentCat = cat;
    renderMenu(cat);
}

window.toggleSearch = function() {
    const panel = document.getElementById('searchPanel');
    const isOpening = !panel.classList.contains('open');
    panel.classList.toggle('open', isOpening);
    document.getElementById('searchToggle').setAttribute('aria-expanded', String(isOpening));
    if (isOpening) document.getElementById('searchInput').focus();
    if (!isOpening) clearSearch();
}

window.searchMenu = function(value) {
    searchQuery = value.trim();
    document.getElementById('searchClear').classList.toggle('visible', searchQuery.length > 0);
    renderMenu(currentCat);
}

window.clearSearch = function() {
    document.getElementById('searchInput').value = '';
    searchQuery = '';
    document.getElementById('searchClear').classList.remove('visible');
    renderMenu(currentCat);
}

window.addItem = function(id) {
    cart[id] = (cart[id] || 0) + 1;
    updateFloatBar();
    renderMenu(currentCat);
}

window.changeQty = function(id, delta) {
    cart[id] = (cart[id] || 0) + delta;
    if (cart[id] <= 0) delete cart[id];
    updateFloatBar();
    renderMenu(currentCat);
}

/* ── FLOAT BAR ── */
function updateFloatBar() {
    const bar = document.getElementById('floatBar');
    if (!bar) return;
    const total = cartTotal();
    const count = cartCount();
    const isMenuVisible = document.getElementById('page-menu').classList.contains('on-screen');
    document.getElementById('floatCount').textContent = count + ' Item';
    document.getElementById('floatTotal').textContent = fmt(total);
    if (count > 0 && isMenuVisible) {
        bar.style.transform = 'translateX(-50%) translateY(0)';
        bar.style.opacity = '1';
        bar.style.pointerEvents = 'all';
    } else {
        bar.style.transform = 'translateX(-50%) translateY(100px)';
        bar.style.opacity = '0';
        bar.style.pointerEvents = 'none';
    }
}

/* ── CART RENDER ── */
function renderCart() {
    const list = document.getElementById('cartList');
    if (!list) return;
    const ids = Object.keys(cart).map(Number);
    if (ids.length === 0) { list.innerHTML = `<p class="text-center text-sm font-body py-8" style="color:#C07D4A;">Keranjang masih kosong 🛒</p>`; return; }
    list.innerHTML = ids.map(id => {
        const m = menuData.find(x => x.id === id);
        const qty = cart[id];
        return `
    <div class="flex items-center gap-3 p-3.5 rounded-2xl" style="background:#fff; border:1px solid #E8D5B7;">
      <div class="img-ph-sm w-16 h-16">${m.emoji}</div>
      <div class="flex-1 min-w-0">
        <p class="font-semibold font-body text-sm leading-tight" style="color:#3B1F0E;">${m.name}</p>
        <p class="font-body text-xs mt-0.5" style="color:#C07D4A;">${fmt(m.price)} / pcs</p>
        <p class="font-display font-bold text-sm mt-1" style="color:#2D6A4F;">${fmt(m.price * qty)}</p>
      </div>
      <div class="flex flex-col items-end gap-2">
        <button onclick="removeItem(${id})" aria-label="Hapus item"
                class="w-7 h-7 rounded-full flex items-center justify-center"
                style="background:#FAECE7; border:1px solid #F0997B;">
          <svg width="12" height="12" fill="none" stroke="#D85A30" stroke-width="2" stroke-linecap="round">
            <line x1="1" y1="1" x2="11" y2="11"/><line x1="11" y1="1" x2="1" y2="11"/>
          </svg>
        </button>
        <div class="flex items-center gap-1.5 rounded-xl px-1 py-1" style="background:#F5EFE6;">
          <button class="qty-btn w-6 h-6 flex items-center justify-center rounded-lg font-bold text-base font-body"
                  style="color:#3B1F0E;" onclick="cartChangeQty(${id},-1)">−</button>
          <span class="font-semibold text-sm font-body" style="color:#2D6A4F; min-width:16px;text-align:center;">${qty}</span>
          <button class="qty-btn w-6 h-6 flex items-center justify-center rounded-lg font-bold text-base font-body"
                  style="color:#3B1F0E;" onclick="cartChangeQty(${id},1)">+</button>
        </div>
      </div>
    </div>`;
    }).join('');
    updateSummary();
    const sub = document.getElementById('cartSubtitle');
    if (sub) sub.textContent = cartCount() + ' item dipilih · Meja 12';
}

window.removeItem = function(id) { delete cart[id]; renderCart(); updateFloatBar(); renderMenu(currentCat); }
window.cartChangeQty = function(id, delta) {
    cart[id] = (cart[id] || 0) + delta;
    if (cart[id] <= 0) { delete cart[id]; }
    renderCart(); updateFloatBar(); renderMenu(currentCat);
}

function updateSummary() {
    const sub = cartTotal();
    const tax = Math.round(sub * 0.1);
    const tot = sub + tax;
    const subEl = document.getElementById('summarySubtotal');
    const taxEl = document.getElementById('summaryTax');
    const totEl = document.getElementById('summaryTotal');
    if (subEl) subEl.textContent = fmt(sub);
    if (taxEl) taxEl.textContent = fmt(tax);
    if (totEl) totEl.textContent = fmt(tot);
}

/* ── NAVIGATION ── */
window.goToCart = function() {
    renderCart();
    document.getElementById('page-menu').classList.replace('on-screen', 'off-left');
    document.getElementById('page-cart').classList.replace('off-right', 'on-screen');
    updateFloatBar();
}

window.goToMenu = function() {
    document.getElementById('page-cart').classList.replace('on-screen', 'off-right');
    document.getElementById('page-menu').classList.replace('off-left', 'on-screen');
    updateFloatBar();
}

/* ── PAYMENT METHOD ── */
window.selectPayment = function(method) {
    const descriptions = {
        tunai: '<span class="font-bold">Info:</span> Bayar langsung di kasir saat pesanan sudah siap. Bisa menggunakan uang tunai (pas lebih baik).',
        qris: '<span class="font-bold">Info:</span> Scan QRIS di kasir setelah pesanan siap. Pembayaran dapat dilakukan melalui aplikasi e-wallet atau mobile banking.',
        debit: '<span class="font-bold">Info:</span> Bayar menggunakan kartu debit di kasir saat pesanan siap. Pastikan kartu dan PIN tersedia.'
    };

    selectedPaymentMethod = method;
    document.querySelectorAll('.pay-method-btn').forEach(button => {
        const isSelected = button.id === 'pay-' + method;
        button.classList.toggle('active', isSelected);
        button.setAttribute('aria-pressed', String(isSelected));
    });
    const descEl = document.querySelector('#payment-desc p');
    if (descEl) descEl.innerHTML = descriptions[method];
}

/* ── PESAN SEKARANG ── */
window.pesanSekarang = async function() {
    if (cartCount() === 0) { alert('Keranjang masih kosong!'); return; }
    
    const newOrder = {
        table: 'Meja 12',
        customer: 'Pelanggan Baru', 
        method: selectedPaymentMethod.charAt(0).toUpperCase() + selectedPaymentMethod.slice(1),
        status: 'waiting',
        total: cartTotal() + Math.round(cartTotal() * 0.1),
        items: Object.entries(cart).map(([id, qty]) => {
            const m = menuData.find(x => x.id === +id);
            return `${qty}x ${m.name}`;
        }),
        note: document.getElementById('noteInput').value
    };
    
    await DataStore.addOrder(newOrder);

    const overlay = document.getElementById('successOverlay');
    if (overlay) overlay.style.display = 'flex';
}

window.resetApp = function() {
    cart = {};
    const overlay = document.getElementById('successOverlay');
    if (overlay) overlay.style.display = 'none';
    const note = document.getElementById('noteInput');
    if (note) note.value = '';
    updateFloatBar();
    const searchPanel = document.getElementById('searchPanel');
    if (searchPanel) searchPanel.classList.remove('open');
    const searchToggle = document.getElementById('searchToggle');
    if (searchToggle) searchToggle.setAttribute('aria-expanded', 'false');
    document.querySelectorAll('.cat-btn').forEach((b, i) => { b.classList.toggle('active', i === 0); });
    currentCat = 'semua';
    clearSearch();
    selectPayment('tunai');
    goToMenu();
}

/* ── HELPERS ── */
function fmt(n) { return 'Rp ' + n.toLocaleString('id-ID'); }
function cartTotal() { return Object.entries(cart).reduce((s, [id, q]) => s + menuData.find(m => m.id === +id).price * q, 0); }
function cartCount() { return Object.values(cart).reduce((s, q) => s + q, 0); }

// Listen for updates
window.addEventListener('menuUpdated', async () => {
    await loadData();
    renderMenu(currentCat);
});

// Initial Load
document.addEventListener('DOMContentLoaded', init);
