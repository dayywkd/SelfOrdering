# Aturan Pengembangan Proyek (Antigravity Global Rules)

Dokumen ini berisi instruksi dan aturan wajib bagi seluruh Agen AI Gemini yang bekerja dalam proyek ini. 

## 1. Identitas & Peran Agen
- **Gaya Komunikasi**: Singkat, teknis, langsung pada solusi, dan menggunakan bahasa Indonesia yang santai tapi profesional.
- **Pendekatan Masalah**: Selalu lakukan analisis dampak (*impact analysis*) sebelum menyarankan atau mengubah kode pada file utama.

## 2. Standar Penulisan Kode (Style Guide)
- **Bahasa Pemrograman Utama**: [Sebutkan bahasa Anda, misal: JavaScript / TypeScript / Python]
- **Framework / Library**: [Sebutkan framework Anda, misal: Next.js / Express / FastAPI]
- **Penamaan (Naming Convention)**: 
  - Gunakan `camelCase` untuk nama variabel dan fungsi.
  - Gunakan `PascalCase` untuk nama komponen atau kelas.
- **Format**: Wajib mematuhi konfigurasi ESLint dan Prettier yang ada di dalam proyek.

## 3. Alur Kerja Agen & Eksekusi Tugas
Sebelum membuat perubahan besar pada kode, Agen AI wajib melakukan langkah-langkah berikut:
1. **Rencana Kerja (Planning)**: Tuliskan rencana perbaikan atau fitur baru secara singkat di chat panel sebelum mengeksekusinya.
2. **Keamanan (Security)**: Jangan pernah menulis kredensial hardcoded (seperti API Key atau Password). Gunakan variabel lingkungan (`.env`).
3. **Validasi (Testing)**: Jika ada tes otomatis (seperti Jest atau PyTest), jalankan tes tersebut terlebih dahulu di terminal setelah mengubah kode untuk memastikan tidak ada fitur lain yang rusak (*breaking changes*).

## 4. Format Output Kode
- Berikan komentar singkat pada blok kode yang kompleks atau memiliki logika bercabang tinggi.
- Jika menulis fungsi baru, sertakan dokumentasi JSDoc atau Docstring dasar yang menjelaskan parameter input dan outputnya.
