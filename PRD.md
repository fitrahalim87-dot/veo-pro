# Product Requirements Document (PRD): AniKi TTS (Yapping pakai text)

## 1. Ringkasan Produk (Product Overview)
**AniKi TTS** adalah aplikasi *Text-to-Speech* (TTS) berbasis web yang memanfaatkan teknologi **Gemini AI** untuk mengubah teks menjadi suara manusia yang natural dan ekspresif. Dengan estetika *Cyberpunk* yang modern, aplikasi ini dirancang untuk memudahkan kreator konten, narator, atau pengguna umum dalam menghasilkan audio berkualitas tinggi secara instan.

*   **Nama Produk:** AniKi TTS
*   **Tagline:** Yapping pakai text
*   **Visi:** Menjadi alat produksi suara paling praktis dan ekspresif bagi komunitas kreator Indonesia.

---

## 2. Target Audiens (Target Audience)
1.  **Kreator Konten (TikTok/Reels/Shorts):** Membutuhkan narasi suara untuk video tanpa harus merekam suara sendiri.
2.  **Narator Buku Audio/Podcast:** Mencari alternatif suara yang natural untuk naskah panjang.
3.  **Pengembang Media Pembelajaran:** Membuat materi audio untuk edukasi.
4.  **Pengguna Umum:** Orang yang ingin bereksperimen dengan berbagai karakter suara AI.

---

## 3. Fitur Utama (Core Features)

### 3.1. Text-to-Speech (TTS) Engine
*   Menggunakan model `gemini-2.5-flash-preview-tts` untuk menghasilkan audio berkualitas tinggi.
*   Mendukung input teks hingga **25.000 karakter**.
*   Proses *rendering* audio yang cepat dan stabil.

### 3.2. AI Script Writer (Auto-write)
*   Fitur "Tulis Pake AI" yang membantu pengguna membuat naskah secara otomatis berdasarkan topik singkat atau ide awal.
*   Membantu mengatasi *writer's block*.

### 3.3. Katalog Suara (Voice Catalog)
*   Menyediakan **30+ pilihan suara** unik.
*   Kategorisasi yang jelas antara suara **Laki-laki** dan **Perempuan**.
*   Setiap suara memiliki karakteristik unik (misal: tenang, dalam, ceria, tegas).

### 3.4. Preview Suara (Test Suara)
*   Pengguna dapat mendengarkan sampel suara (preview) sebelum melakukan *generate* naskah penuh.
*   Tombol preview terintegrasi langsung di setiap kartu pilihan suara untuk kemudahan akses.

### 3.5. Preset Gaya Bicara (Style Presets)
*   Instruksi gaya bicara yang bisa dipilih: Ceria, Serius, Marah, Berbisik, dan Semangat.
*   Memungkinkan kontrol emosi pada output suara.

### 3.6. Manajemen Audio
*   Audio player terintegrasi untuk mendengarkan hasil *generate*.
*   Fitur **Download** file audio dalam format `.wav` untuk penggunaan eksternal.

---

## 4. Spesifikasi Teknis (Technical Stack)
*   **Frontend:** React 18+, TypeScript, Vite.
*   **Styling:** Tailwind CSS (Utility-first framework).
*   **Animasi:** Framer Motion (untuk transisi halus dan efek *Cyberpunk*).
*   **Ikon:** Lucide React.
*   **AI Engine:** Google Gemini API (Generative AI SDK).
*   **Deployment:** Web-based (Responsive untuk Desktop & Mobile).

---

## 5. Desain & Antarmuka (UI/UX)
*   **Tema Visual:** *Dark Mode* dengan aksen *Lime Green* (Cyberpunk/Tech vibe).
*   **Layout:**
    *   *Compact Voice Selection:* Grid 2-kolom yang efisien untuk memilih suara.
    *   *Responsive Design:* Tampilan yang menyesuaikan dari layar HP hingga Desktop.
    *   *Interactive Feedback:* Animasi loading, pesan sukses, dan error yang jelas.

---

## 6. Batasan & Aturan (Functional Requirements)
1.  **Limit Karakter:** Maksimal 25.000 karakter per sesi generate.
2.  **Validasi Input:** Script tidak boleh kosong.
3.  **Keamanan:** API Key dikelola secara aman di sisi server/environment.
4.  **Audio Cleanup:** URL audio lama akan dihapus secara otomatis saat generate baru untuk menghemat memori browser.

---

## 7. Roadmap Pengembangan (Future Roadmap)
*   **Multi-Speaker:** Fitur percakapan antara dua karakter suara atau lebih dalam satu naskah.
*   **Background Music:** Opsi untuk menambahkan musik latar secara otomatis.
*   **Voice Cloning:** Eksperimen dengan kloning suara berbasis sampel pendek.
*   **History:** Riwayat naskah dan audio yang pernah dibuat (Local Storage).

---
*Dokumen ini diperbarui pada: 5 Maret 2026*
