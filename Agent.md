SELF ORDERING COFFEE SHOP - IMPROVEMENT LIST

[WAJIB]

1. Perbaiki redirect pembayaran
   - Ganti semua redirect localhost ke domain production.
   - File: src/app/api/payment/route.ts

2. Proteksi halaman admin
   - Tambah middleware untuk mengecek login/session.
   - File baru: src/middleware.ts

3. Sistem status meja (QR lebih aman)
   - Tambah tabel tables.
   - Status: active / inactive.
   - QR tetap statis, tidak perlu cetak ulang.
   - Order hanya bisa dilakukan jika meja active.

4. Validasi meja sebelum checkout
   - Cek status meja sebelum membuat order dan invoice.
   - File: src/app/page.tsx
   - File: src/app/api/payment/route.ts


[SANGAT DISARANKAN]

5. Halaman manajemen meja
   - Admin bisa buka/tutup meja.
   - Folder baru: src/app/admin/tables

6. Tracking pesanan customer
   - Setelah bayar redirect ke halaman status pesanan.
   - Contoh: /order/[id]

7. Auto close meja
   - Saat order selesai (completed), meja otomatis inactive.

8. Notifikasi realtime order baru
   - Toast + suara notifikasi untuk admin/barista.


[PENINGKATAN FITUR PELANGGAN]

9. Detail menu (Modal/Halaman Detail)
   - Saat pelanggan klik menu:
     • Foto produk ukuran besar
     • Deskripsi produk
     • Bahan/isi produk
     • Cara penyajian/pembuatan singkat
     • Tingkat manis (jika ada)
     • Ukuran gelas (jika ada)
     • Harga
   - Tombol langsung "Tambah ke Keranjang".
   - Mirip tampilan GoFood, GrabFood, Starbucks, dll.

10. Upload gambar menu
    - Gunakan Supabase Storage.
    - Setiap menu memiliki foto produk.


11. Pencarian & filter menu
    - Search menu
    - Filter kategori
    - Filter harga


[PENINGKATAN OPERASIONAL]

12. Nomor pesanan yang mudah dibaca
    - Contoh: ORD-20260610-001
    - Jangan hanya UUID.

13. Dashboard analytics
    - Produk terlaris.
    - Pendapatan harian/bulanan.
    - Jam tersibuk.
    - Total transaksi.

14. Status pesanan lebih detail
    - Pending Payment
    - Paid
    - Processing
    - Ready
    - Completed
    - Cancelled


[KEAMANAN & STRUKTUR]

15. Pisahkan Supabase Client dan Server
    - lib/supabase-client.ts
    - lib/supabase-server.ts



16. Activity log
    - Catat perubahan menu, harga, status order, dll.


[PRIORITAS IMPLEMENTASI]

1. Redirect pembayaran
2. Middleware admin
3. Sistem meja active/inactive
4. Halaman admin meja
5. Validasi meja saat checkout
6. Tracking pesanan customer
7. Detail menu + foto produk
8. Upload gambar menu
9. Notifikasi realtime order baru

Setelah 9 poin di atas selesai, aplikasi sudah terlihat jauh lebih profesional dan siap digunakan untuk operasional coffee shop sungguhan.