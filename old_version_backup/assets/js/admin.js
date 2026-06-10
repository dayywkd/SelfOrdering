/* admin.js */

// Global Variables
let menuData = [];
let orderData = [];
let reportHistory = [];
let editingId = null;
let selectedEmoji = '☕';
let filterSearch = '', filterCatVal = '', filterStatusVal = '';
let selectedReportFormat = 'xlsx';

const reportMetrics = {
    'Mei 2026': { revenue: 'Rp 8.420.000', orders: '243 Order', bestSeller: 'Brown Sugar Latte', tax: 'Rp 765.455' },
    'April 2026': { revenue: 'Rp 7.140.000', orders: '218 Order', bestSeller: 'Creamy Latte', tax: 'Rp 649.091' },
    'Kuartal 1 2026': { revenue: 'Rp 19.580.000', orders: '612 Order', bestSeller: 'Signature Espresso', tax: 'Rp 1.780.000' },
    'Tahun 2025': { revenue: 'Rp 89.600.000', orders: '2.761 Order', bestSeller: 'Brown Sugar Latte', tax: 'Rp 8.145.455' }
};

// Initialize
async function init() {
    await loadData();
    buildBarChart('month');
    buildPieChart();
    renderAll();
    setupDate();
}

async function loadData() {
    menuData = await DataStore.getMenu();
    orderData = await DataStore.getOrders();
    reportHistory = DataStore.getReports();
}

function renderAll() {
    calculateStats();
    renderTopMenu();
    renderMenuTable();
    renderOrders();
    renderReportHistory();
    updateReportPreview();
}

function calculateStats() {
    // Total Revenue from all time (qty * price)
    const totalRevenue = menuData.reduce((acc, m) => acc + (m.price * (m.qty || 0)), 0);
    const revEl = document.getElementById('statRevenue');
    if (revEl) revEl.textContent = fmt(totalRevenue);

    // Best Seller
    const bestSeller = [...menuData].sort((a, b) => b.qty - a.qty)[0];
    const bestSellerEl = document.querySelector('.stat-card.blue p[style*="Playfair Display"]');
    const bestSellerSub = document.querySelector('.stat-card.blue p[style*="A89480"]');
    if (bestSeller && bestSellerEl && bestSellerSub) {
        bestSellerEl.textContent = bestSeller.name;
        bestSellerSub.textContent = (bestSeller.qty || 0) + ' porsi terjual';
    }

    // Order counts
    const activeOrderCount = orderData.length;
    const activeOrderEl = document.querySelector('.stat-card.amber p[style*="Playfair Display"]');
    if (activeOrderEl) activeOrderEl.textContent = activeOrderCount + ' Order';
}

/* ══ PAGE NAVIGATION ══ */
window.showPage = function(key, el) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('page-' + key).classList.add('active');
    if (el) el.classList.add('active');
    else {
        const map = { dashboard: 'a[onclick*="dashboard"]', 'menu-mgmt': 'a[onclick*="menu-mgmt"]', orders: 'a[onclick*="orders"]', export: 'a[onclick*="export"]' };
        document.querySelector(map[key])?.classList.add('active');
    }
}

/* ══ DATE ══ */
function setupDate() {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const now = new Date();
    const dateStr = days[now.getDay()] + ', ' + now.getDate() + ' ' + months[now.getMonth()] + ' ' + now.getFullYear();
    const el = document.getElementById('todayDate');
    if (el) el.textContent = dateStr;
}

/* ══ TOP MENU TABLE (DASHBOARD) ══ */
function renderTopMenu() {
    const body = document.getElementById('topMenuBody');
    if (!body) return;
    const sorted = [...menuData].sort((a, b) => b.qty - a.qty).slice(0, 5);
    const medals = ['🥇', '🥈', '🥉', '4', '5'];
    const catLabel = { kopi: '☕ Kopi', nonkopi: '🍵 Non-Kopi', makanan: '🥐 Makanan', camilan: '🍟 Camilan' };
    body.innerHTML = sorted.map((m, i) => `
    <tr>
      <td style="font-size:1.1rem;text-align:center;">${medals[i]}</td>
      <td>
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:36px;height:36px;background:#F5E6D8;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0;">${m.emoji}</div>
          <span style="font-weight:600;color:#2C1810;">${m.name}</span>
        </div>
      </td>
      <td><span class="badge badge-${m.cat}">${catLabel[m.cat]}</span></td>
      <td style="font-weight:500;color:#2C1810;">${fmt(m.price)}</td>
      <td><span style="font-weight:700;color:#1E5E40;">${m.qty}</span> <span style="color:#A89480;font-size:.8rem;">porsi</span></td>
      <td style="font-weight:600;color:#2C1810;">${fmt(m.price * m.qty)}</td>
      <td>
        <span style="display:inline-flex;align-items:center;gap:5px;font-size:.78rem;font-weight:600;padding:3px 10px;border-radius:20px;${m.active ? 'background:#D1EDD8;color:#1E5E40;' : 'background:#FDEAEA;color:#B83232;'}">
          <span style="width:6px;height:6px;border-radius:50%;background:${m.active ? '#1E5E40' : '#B83232'};display:inline-block;"></span>
          ${m.active ? 'Tersedia' : 'Habis'}
        </span>
      </td>
    </tr>
  `).join('');
}

/* ══ MENU TABLE (MGMT PAGE) ══ */
function getFiltered() {
    return menuData.filter(m => {
        const s = filterSearch.toLowerCase();
        if (s && !m.name.toLowerCase().includes(s)) return false;
        if (filterCatVal && m.cat !== filterCatVal) return false;
        if (filterStatusVal === 'aktif' && !m.active) return false;
        if (filterStatusVal === 'habis' && m.active) return false;
        return true;
    });
}

function renderMenuTable() {
    const body = document.getElementById('menuTableBody');
    if (!body) return;
    const items = getFiltered();
    const catLabel = { kopi: '☕ Kopi', nonkopi: '🍵 Non-Kopi', makanan: '🥐 Makanan', camilan: '🍟 Camilan' };
    body.innerHTML = items.map((m, i) => `
    <tr>
      <td style="color:#A89480;font-weight:500;">${String(i + 1).padStart(2, '0')}</td>
      <td>
        <div style="width:44px;height:44px;background:#F5E6D8;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;">${m.emoji}</div>
      </td>
      <td>
        <p style="font-weight:600;color:#2C1810;margin:0;">${m.name}</p>
        <p style="font-size:.75rem;color:#A89480;margin:2px 0 0;">${m.desc}</p>
      </td>
      <td><span class="badge badge-${m.cat}">${catLabel[m.cat]}</span></td>
      <td style="font-weight:600;color:#2C1810;">${fmt(m.price)}</td>
      <td>
        <label class="toggle-wrap" onclick="toggleStatus(${m.id})">
          <div class="toggle-track ${m.active ? 'on' : 'off'}" id="toggle-${m.id}">
            <div class="toggle-thumb"></div>
          </div>
          <span style="font-size:.8rem;color:${m.active ? '#1E5E40' : '#B83232'};font-weight:600;" id="toggleLabel-${m.id}">${m.active ? 'Aktif' : 'Habis'}</span>
        </label>
      </td>
      <td>
        <div style="display:flex;gap:6px;justify-content:center;">
          <button class="btn-icon btn-edit" onclick="openEditModal(${m.id})" title="Edit menu">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon btn-delete" onclick="deleteMenu(${m.id})" title="Hapus menu">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
    const total = menuData.length;
    document.getElementById('showingCount').textContent = items.length;
    document.getElementById('totalCount').textContent = total;
    const countLabel = document.getElementById('menuCountLabel');
    if (countLabel) countLabel.textContent = items.length + ' menu ditampilkan';
}

window.toggleStatus = async function(id) {
    const m = menuData.find(x => x.id === id);
    m.active = !m.active;
    await DataStore.saveMenu(m);
    renderMenuTable();
    showToast(m.active ? '✅' : '⚠️', m.name + ' ' + (m.active ? 'diaktifkan' : 'dinonaktifkan'));
}

window.filterMenu = function(v) { filterSearch = v; renderMenuTable(); }
window.filterCat = function(v) { filterCatVal = v; renderMenuTable(); }
window.filterStatus = function(v) { filterStatusVal = v; renderMenuTable(); }

window.deleteMenu = async function(id) {
    if (!confirm('Hapus menu ini?')) return;
    await DataStore.deleteMenu(id);
    await loadData();
    renderMenuTable(); renderTopMenu();
    showToast('🗑️', 'Menu berhasil dihapus');
}

/* ══ INCOMING ORDERS ══ */
function renderOrders() {
    const statusInfo = {
        waiting: { label: 'Menunggu', className: 'status-waiting', action: 'Mulai Siapkan' },
        process: { label: 'Diproses', className: 'status-process', action: 'Tandai Siap' },
        ready: { label: 'Siap Diantar', className: 'status-ready', action: 'Selesaikan Pesanan' }
    };
    const grid = document.getElementById('ordersGrid');
    if (!grid) return;

    grid.innerHTML = orderData.length ? orderData.map(order => {
        const status = statusInfo[order.status];
        return `
      <div class="order-card">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:14px;">
          <div>
            <p style="font-weight:700;color:#2C1810;font-size:.92rem;margin:0 0 3px;">${order.id.substring(0,8)} · ${order.table}</p>
            <p style="font-size:.74rem;color:#A89480;margin:0;">${order.customer} · ${order.time}</p>
          </div>
          <span class="order-status ${status.className}">${status.label}</span>
        </div>
        <div style="background:#F7F2EC;border-radius:10px;padding:11px 12px;margin-bottom:12px;">
          ${order.items.map(item => `<div class="order-item"><span>${item}</span></div>`).join('')}
          ${order.note ? `<p style="font-size:.73rem;color:#B8733D;margin:9px 0 0;">Catatan: ${order.note}</p>` : ''}
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:.78rem;color:#8C7260;">
          <span>${order.method}</span>
          <span style="font-weight:700;color:#1E5E40;font-size:.9rem;">${fmt(order.total)}</span>
        </div>
        <button class="order-action" onclick="advanceOrder('${order.id}')">${status.action}</button>
      </div>
    `;
    }).join('') : `
    <div style="grid-column:1/-1;background:#fff;border:1px solid #EDE8E0;border-radius:16px;padding:48px;text-align:center;color:#8C7260;">
      Semua pesanan sudah selesai diproses.
    </div>
  `;

    const waiting = orderData.filter(order => order.status === 'waiting').length;
    const ready = orderData.filter(order => order.status === 'ready').length;
    document.getElementById('activeOrderCount').textContent = orderData.length;
    document.getElementById('waitingOrderCount').textContent = waiting;
    document.getElementById('readyOrderCount').textContent = ready;
    document.getElementById('orderNavCount').textContent = orderData.length;
    document.getElementById('orderNavCount').style.display = orderData.length ? 'inline-block' : 'none';
    document.getElementById('orderNotifDot').style.display = orderData.length ? 'block' : 'none';
}

window.advanceOrder = async function(id) {
    const order = orderData.find(item => item.id === id);
    if (!order) return;
    if (order.status === 'waiting') {
        await DataStore.updateOrderStatus(id, 'process');
        showToast('☕', 'Pesanan mulai disiapkan');
    } else if (order.status === 'process') {
        await DataStore.updateOrderStatus(id, 'ready');
        showToast('✅', 'Pesanan siap diantar');
    } else {
        await DataStore.deleteOrder(id);
        showToast('✅', 'Pesanan selesai dibayar');
    }
    await loadData();
    renderOrders();
}

/* ══ MODAL ══ */
window.openAddModal = function() {
    editingId = null;
    document.getElementById('modalTitle').textContent = 'Tambah Menu Baru';
    document.getElementById('inputName').value = '';
    document.getElementById('inputPrice').value = '';
    document.getElementById('inputDesc').value = '';
    document.getElementById('inputCat').value = 'kopi';
    selectedEmoji = '☕';
    document.getElementById('emojiPreview').textContent = '☕';
    document.getElementById('menuModal').classList.add('show');
}

window.openEditModal = function(id) {
    editingId = id;
    const m = menuData.find(x => x.id === id);
    document.getElementById('modalTitle').textContent = 'Edit Menu';
    document.getElementById('inputName').value = m.name;
    document.getElementById('inputPrice').value = m.price;
    document.getElementById('inputDesc').value = m.desc;
    document.getElementById('inputCat').value = m.cat;
    selectedEmoji = m.emoji;
    document.getElementById('emojiPreview').textContent = m.emoji;
    document.getElementById('menuModal').classList.add('show');
}

window.closeModal = function() { document.getElementById('menuModal').classList.remove('show'); }
window.closeModalOutside = function(e) { if (e.target === document.getElementById('menuModal')) closeModal(); }

window.saveMenu = async function() {
    const name = document.getElementById('inputName').value.trim();
    const price = parseInt(document.getElementById('inputPrice').value) || 0;
    const desc = document.getElementById('inputDesc').value.trim();
    const cat = document.getElementById('inputCat').value;
    if (!name || !price) { showToast('❌', 'Nama dan harga wajib diisi!'); return; }
    
    const menuItem = {
        id: editingId || Date.now(),
        emoji: selectedEmoji,
        name, price, desc, cat,
        active: true,
        qty: editingId ? menuData.find(x => x.id === editingId).qty : 0
    };
    
    await DataStore.saveMenu(menuItem);
    closeModal();
    await loadData();
    renderMenuTable(); renderTopMenu();
    showToast('✅', editingId ? 'Menu berhasil diperbarui' : 'Menu baru berhasil ditambahkan');
}

window.selectEmoji = function(e) { selectedEmoji = e; document.getElementById('emojiPreview').textContent = e; }
const emojiList = ['☕', '🥛', '🧋', '❄️', '🍵', '🍫', '🍋', '🥐', '🍳', '🍟'];
let emojiIdx = 0;
window.cycleEmoji = function() { emojiIdx = (emojiIdx + 1) % emojiList.length; selectEmoji(emojiList[emojiIdx]); }

/* ══ CHARTS ══ */
let salesChart = null;
function buildBarChart(mode) {
    const ctxEl = document.getElementById('salesChart');
    if (!ctxEl) return;
    const ctx = ctxEl.getContext('2d');
    const monthlyData = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
        revenue: [4.2, 5.1, 4.8, 6.3, 5.9, 7.2, 6.8, 7.5, 8.1, 7.9, 8.4, 8.42],
    };
    const weeklyData = {
        labels: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'],
        revenue: [1.1, 1.4, 1.2, 1.6, 1.9, 2.3, 1.8],
    };
    const d = mode === 'week' ? weeklyData : monthlyData;
    if (salesChart) salesChart.destroy();
    salesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: d.labels,
            datasets: [{
                label: 'Pendapatan (Jt Rp)',
                data: d.revenue,
                backgroundColor: d.revenue.map((v, i, arr) => v === Math.max(...arr) ? '#1E5E40' : '#DEC5A0'),
                borderRadius: 6,
                borderSkipped: false,
                borderWidth: 0,
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => 'Rp ' + (c.raw * 1000000).toLocaleString('id-ID') } } },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#A89480', font: { family: 'DM Sans', size: 11 } } },
                y: { grid: { color: '#F4F0EC' }, ticks: { color: '#A89480', font: { family: 'DM Sans', size: 11 }, callback: v => v + ' Jt' }, border: { display: false } }
            }
        }
    });
}

function buildPieChart() {
    const ctxEl = document.getElementById('catChart');
    if (!ctxEl) return;
    const ctx = ctxEl.getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Kopi', 'Non-Kopi', 'Makanan', 'Camilan'],
            datasets: [{
                data: [48, 22, 18, 12],
                backgroundColor: ['#2C1810', '#B8733D', '#1E5E40', '#DEC5A0'],
                borderWidth: 3,
                borderColor: '#fff',
                hoverOffset: 6,
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '62%',
            plugins: {
                legend: { position: 'bottom', labels: { color: '#5C3317', font: { family: 'DM Sans', size: 11 }, padding: 14, usePointStyle: true, pointStyle: 'circle' } },
                tooltip: { callbacks: { label: c => c.label + ': ' + c.raw + '%' } }
            }
        }
    });
}

window.switchChart = function(type, mode) {
    document.querySelectorAll('.chart-tab').forEach(b => {
        b.style.background = '#F7F2EC'; b.style.color = '#8C7260'; b.style.borderColor = '#EDE8E0';
    });
    const activeBtn = document.getElementById('tab-' + mode);
    if (activeBtn) {
        activeBtn.style.background = '#B8733D'; activeBtn.style.color = '#fff'; activeBtn.style.borderColor = '#B8733D';
    }
    const label = document.getElementById('chartLabel');
    if (label) label.textContent = mode === 'week' ? 'Per Hari — Minggu Ini' : 'Per Bulan — Tahun 2025';
    buildBarChart(mode);
}

window.updatePeriod = function(v) { /* ... */ }

/* ══ EXPORT ══ */
window.toggleExport = function() { document.getElementById('exportDrop').classList.toggle('show'); }
document.addEventListener('click', e => {
    if (!e.target.closest('.export-dropdown') && !e.target.closest('button[onclick="toggleExport()"]')) {
        const drop = document.getElementById('exportDrop');
        if (drop) drop.classList.remove('show');
    }
});

window.selectReportFormat = function(format) {
    selectedReportFormat = format;
    document.getElementById('format-xlsx').classList.toggle('active', format === 'xlsx');
    document.getElementById('format-pdf').classList.toggle('active', format === 'pdf');
}

window.updateReportPreview = function() {
    const periodEl = document.getElementById('reportPeriod');
    if (!periodEl) return;
    const period = periodEl.value;
    const values = reportMetrics[period];
    if (values) {
        document.getElementById('reportRevenue').textContent = values.revenue;
        document.getElementById('reportOrders').textContent = values.orders;
        document.getElementById('reportBestSeller').textContent = values.bestSeller;
        document.getElementById('reportTax').textContent = values.tax;
    }
}

function renderReportHistory() {
    const body = document.getElementById('reportHistoryBody');
    if (!body) return;
    body.innerHTML = reportHistory.map(report => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;background:${report.format === 'xlsx' ? '#D1EDD8' : '#FDEAEA'};">${report.format === 'xlsx' ? '📊' : '📄'}</span>
          <span style="font-weight:600;color:#2C1810;">${report.name}</span>
        </div>
      </td>
      <td>${report.type}</td>
      <td style="color:#8C7260;">${report.period}</td>
      <td><span class="file-type type-${report.format}">${report.format.toUpperCase()}</span></td>
      <td style="color:#8C7260;">${report.created}</td>
      <td style="text-align:center;">
        <button class="report-button report-preview" style="padding:7px 12px;" onclick="downloadExistingReport('${report.name}')">↓ Unduh</button>
      </td>
    </tr>
  `).join('');
    const label = document.getElementById('exportCountLabel');
    if (label) label.textContent = reportHistory.length + ' file tersedia';
}

window.generateReport = function() {
    const type = document.getElementById('reportType').value;
    const period = document.getElementById('reportPeriod').value;
    const slug = type.toLowerCase().replace(/ & /g, '_').replace(/\s+/g, '_');
    const periodSlug = period.toLowerCase().replace(/\s+/g, '_');
    const fileName = slug + '_' + periodSlug + '.' + selectedReportFormat;
    reportHistory.unshift({ name: fileName, type, period, format: selectedReportFormat, created: 'Baru saja' });
    DataStore.saveReports(reportHistory);
    renderReportHistory();
    showToast('📥', fileName + ' berhasil dibuat');
}

window.downloadExistingReport = function(name) {
    showToast('📥', 'Mengunduh ' + name);
}

window.exportAction = function(fmt_) {
    const drop = document.getElementById('exportDrop');
    if (drop) drop.classList.remove('show');
    showToast('📥', 'Mengunduh laporan .' + fmt_ + '…');
}

/* ══ TOAST ══ */
let toastTimeout;
window.showToast = function(icon, msg) {
    clearTimeout(toastTimeout);
    const iconEl = document.getElementById('toastIcon');
    const msgEl = document.getElementById('toastMsg');
    const t = document.getElementById('toast');
    if (!iconEl || !msgEl || !t) return;

    iconEl.textContent = icon;
    msgEl.textContent = msg;
    t.style.transform = 'translateY(0)'; t.style.opacity = '1';
    toastTimeout = setTimeout(() => { t.style.transform = 'translateY(80px)'; t.style.opacity = '0'; }, 2800);
}

/* ══ HELPERS ══ */
function fmt(n) { return 'Rp ' + n.toLocaleString('id-ID'); }

// Listen for updates
window.addEventListener('ordersUpdated', async () => {
    await loadData();
    renderOrders();
});

// Initial Load
document.addEventListener('DOMContentLoaded', init);
