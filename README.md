# MorfoCitra – Morphological Filtering pada Citra Tulisan

Website mini proyek mata kuliah **Pengolahan Citra Digital**:

> **Implementasi Morphological Filtering untuk Mengurangi Noise pada Citra Tulisan Menggunakan Operasi Morfologi Matematis**

Website ini adalah versi web dari notebook Google Colab (`notebook/Morphological_Filtering_Citra_Tulisan.ipynb`). Semua proses berjalan **langsung di browser** dengan JavaScript murni, jadi:

- tidak perlu server, Python, atau instalasi library;
- gambar yang diunggah **tidak dikirim ke mana pun**;
- bisa di-hosting **gratis** di GitHub Pages.

---

## Daftar Isi

1. [Fitur](#1-fitur)
2. [Struktur folder](#2-struktur-folder)
3. [Persiapan alat](#3-persiapan-alat)
4. [Menjalankan di VS Code](#4-menjalankan-di-vs-code)
5. [Mengunggah ke GitHub](#5-mengunggah-ke-github)
6. [Menayangkan website dengan GitHub Pages](#6-menayangkan-website-dengan-github-pages)
7. [Memperbarui website setelah ada perubahan](#7-memperbarui-website-setelah-ada-perubahan)
8. [Kerja kelompok di GitHub (opsional)](#8-kerja-kelompok-di-github-opsional)
9. [Cara memakai website](#9-cara-memakai-website)
10. [Mengubah tampilan](#10-mengubah-tampilan)
11. [Hubungan dengan notebook Colab](#11-hubungan-dengan-notebook-colab)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Fitur

| Tahap | Isi | Setara di Colab |
|---|---|---|
| 1. Upload & preprocessing | Upload/drag gambar, grayscale, Gaussian blur 3×3, Otsu, inversi otomatis/manual | Cell 2–3 |
| 2. Noise sintetis | Salt-and-pepper, bintik putih di latar, lubang hitam di goresan, goresan terputus; parameter dan seed bisa diatur | Cell 4 |
| 3. Morphological filtering | Erosion, dilation, opening, closing × kernel 3×3/5×5 × persegi/elips = 64 citra | Cell 5–6 |
| 4. Evaluasi | Piksel foreground, connected components, IoU, F1-score; tabel bisa diurutkan dan difilter | Cell 7 |
| 5. Analisis otomatis | Konfigurasi terbaik, 3×3 vs 5×5, kasus "lebih bersih tapi IoU turun", keterbatasan, draft kesimpulan | Cell 9 |
| Unduhan | Klik gambar untuk unduh PNG; CSV; TXT; ZIP `hasil_morfologi.zip` (87 file) | Cell 8 |

Algoritma morfologi (erosion, dilation, opening, closing, bentuk kernel elips) sudah diuji dan **hasilnya sama persis piksel demi piksel dengan OpenCV**, begitu juga ambang Otsu dan jumlah connected components.

---

## 2. Struktur folder

```
morfologi-citra-tulisan/
├── index.html                 ← halaman utama (struktur website)
├── css/
│   └── style.css              ← tampilan: warna hijau, font Montserrat, layout responsif
├── js/
│   ├── morfologi.js           ← INTI: Otsu, noise, erosion/dilation/opening/closing, IoU, F1
│   ├── app.js                 ← penghubung tombol/form dengan fungsi di morfologi.js
│   └── zip.js                 ← pembuat file ZIP untuk tombol "Unduh Semua"
├── notebook/
│   └── Morphological_Filtering_Citra_Tulisan.ipynb   ← notebook Colab asli
└── README.md                  ← file ini
```

Jangan mengubah nama folder `css`, `js`, dan `notebook` karena `index.html` memanggil file di dalamnya dengan alamat tersebut.

---

## 3. Persiapan alat

Kamu cukup melakukan langkah ini **sekali** di laptop.

### 3.1 Install Visual Studio Code

1. Buka <https://code.visualstudio.com/> lalu klik **Download** sesuai sistem operasi (Windows/macOS/Linux).
2. Jalankan installer. Di Windows, centang opsi:
   - **Add "Open with Code" action to Windows Explorer file context menu**
   - **Add "Open with Code" action to Windows Explorer directory context menu**
   - **Add to PATH**
3. Selesai, buka VS Code.

### 3.2 Install Git

1. Buka <https://git-scm.com/downloads> lalu unduh sesuai sistem operasi.
2. Windows: jalankan installer dan klik **Next** terus (pengaturan bawaan sudah cukup). Saat ada pilihan *default editor*, kamu boleh memilih **Use Visual Studio Code as Git's default editor**.
3. macOS: buka Terminal lalu ketik `git --version`; jika belum ada, macOS akan menawarkan instalasi.
4. Cek instalasi. Buka terminal (di VS Code: menu **Terminal → New Terminal**) lalu ketik:
   ```bash
   git --version
   ```
   Jika muncul misalnya `git version 2.4x.x`, Git sudah siap.

### 3.3 Atur identitas Git (sekali saja)

Di terminal, ketik (ganti dengan nama dan email akun GitHub kamu):

```bash
git config --global user.name "Nama Kamu"
git config --global user.email "emailkamu@example.com"
```

### 3.4 Buat akun GitHub

Daftar di <https://github.com/signup> jika belum punya. Gunakan email yang sama dengan langkah 3.3.

### 3.5 Install ekstensi VS Code

Di VS Code, klik ikon **Extensions** (kotak empat di sidebar kiri, atau `Ctrl+Shift+X`), lalu cari dan install:

| Ekstensi | Kegunaan |
|---|---|
| **Live Server** (Ritwick Dey) | Menjalankan website di browser dan otomatis refresh setiap kali file disimpan |
| **GitHub Pull Requests** (opsional) | Login GitHub dari VS Code |
| **Jupyter** (opsional) | Membuka file `.ipynb` di VS Code |

---

## 4. Menjalankan di VS Code

1. **Ekstrak** file ZIP proyek ini ke folder yang mudah ditemukan, misalnya `Documents/morfologi-citra-tulisan`.
   > Pastikan saat folder dibuka, isinya langsung `index.html`, `css`, `js`, dan seterusnya, **bukan** folder di dalam folder.
2. Buka VS Code → **File → Open Folder…** → pilih folder `morfologi-citra-tulisan` → **Select Folder**.
   Jika muncul pertanyaan *"Do you trust the authors of the files in this folder?"*, klik **Yes, I trust the authors**.
3. Di panel **Explorer** (kiri), klik kanan `index.html` → **Open with Live Server**.
   Atau klik tombol **Go Live** di pojok kanan bawah VS Code.
4. Browser terbuka di alamat seperti `http://127.0.0.1:5500/index.html`. Website sudah berjalan.
5. Coba ubah sesuatu, misalnya judul di `index.html`, lalu simpan (`Ctrl+S`). Browser akan refresh otomatis.
6. Untuk menghentikan server, klik **Port: 5500** di pojok kanan bawah.

> **Tanpa Live Server:** kamu juga bisa klik dua kali `index.html` agar terbuka di browser. Website tetap berfungsi, tetapi tidak refresh otomatis.

> **Font Montserrat** dimuat dari Google Fonts, jadi butuh koneksi internet. Tanpa internet, website tetap jalan dengan font cadangan.

---

## 5. Mengunggah ke GitHub

Pilih **salah satu** cara: **A (lewat tombol VS Code)** paling mudah untuk pemula, **B (lewat terminal)** lebih umum dipakai.

### Cara A – Lewat tombol di VS Code

1. Klik ikon **Source Control** di sidebar kiri (ikon cabang, atau `Ctrl+Shift+G`).
2. Klik tombol **Publish to GitHub**.
   (Jika yang muncul **Initialize Repository**, klik itu dulu, lalu lanjut ke langkah 4 dan kembali ke sini setelah commit.)
3. VS Code akan meminta login GitHub: klik **Allow**, login di browser, lalu kembali ke VS Code.
4. Pilih **Publish to GitHub public repository** dan beri nama, misalnya `morfologi-citra-tulisan`.
   > Pilih **public** agar bisa memakai GitHub Pages gratis.
5. Saat ditanya file mana yang ikut, centang semua lalu klik **OK**.
6. Setelah selesai, muncul notifikasi **Open on GitHub**. Klik untuk melihat repository kamu.

### Cara B – Lewat terminal

**Langkah 1: buat repository kosong di GitHub**

1. Login ke <https://github.com>, klik tombol **+** di pojok kanan atas → **New repository**.
2. **Repository name:** `morfologi-citra-tulisan`
3. **Description (opsional):** `Morphological filtering untuk mengurangi noise pada citra tulisan`
4. Pilih **Public**.
5. **Jangan** centang *Add a README file*, *.gitignore*, atau *license* (karena README sudah ada di proyek ini).
6. Klik **Create repository**. Biarkan halaman yang muncul tetap terbuka.

**Langkah 2: kirim file dari VS Code**

Buka terminal di VS Code (**Terminal → New Terminal**). Pastikan terminal berada di folder proyek (namanya terlihat di prompt). Lalu jalankan satu per satu:

```bash
# 1. Jadikan folder ini repository Git
git init

# 2. Tandai semua file untuk disimpan
git add .

# 3. Simpan versi pertama (commit)
git commit -m "Versi pertama website morphological filtering"

# 4. Beri nama cabang utama "main"
git branch -M main

# 5. Hubungkan ke repository GitHub (GANTI username-kamu)
git remote add origin https://github.com/username-kamu/morfologi-citra-tulisan.git

# 6. Kirim ke GitHub
git push -u origin main
```

Saat `git push` pertama kali, akan muncul jendela login GitHub. Pilih **Sign in with your browser** lalu izinkan.

> **Jika diminta password di terminal:** GitHub tidak menerima password akun biasa. Buat token di **GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token**, centang `repo`, lalu tempel token itu sebagai password.

Refresh halaman repository di GitHub. Semua file seharusnya sudah muncul, dan README ini tampil di bawahnya.

---

## 6. Menayangkan website dengan GitHub Pages

1. Buka repository kamu di GitHub.
2. Klik tab **Settings** (ikon gerigi di menu atas repository).
3. Di sidebar kiri, klik **Pages**.
4. Di bagian **Build and deployment**:
   - **Source:** `Deploy from a branch`
   - **Branch:** `main` dan folder `/ (root)`
   - Klik **Save**.
5. Tunggu 1–3 menit, lalu refresh halaman **Pages**. Akan muncul tulisan:
   **"Your site is live at `https://username-kamu.github.io/morfologi-citra-tulisan/`"**
6. Klik **Visit site**. Link inilah yang bisa kamu bagikan ke dosen atau teman kelompok.

Tips: tambahkan link ini ke kolom **About** repository (klik ikon gerigi di samping "About" di halaman utama repository → centang *Use your GitHub Pages website*).

Status proses deploy bisa dilihat di tab **Actions** (tanda centang hijau = berhasil).

---

## 7. Memperbarui website setelah ada perubahan

Setiap kali kamu mengubah file:

**Lewat VS Code (Source Control):**
1. Simpan file (`Ctrl+S`).
2. Buka **Source Control** (`Ctrl+Shift+G`). File yang berubah ditandai **M** (modified) atau **U** (baru).
3. Tulis pesan singkat di kotak *Message*, misalnya `Ubah warna tombol`.
4. Klik **Commit** (jika ditanya *stage all changes*, pilih **Yes/Always**).
5. Klik **Sync Changes** / **Push**.

**Lewat terminal:**
```bash
git add .
git commit -m "Jelaskan perubahan yang kamu buat"
git push
```

GitHub Pages akan memperbarui website otomatis dalam 1–3 menit. Jika tampilan belum berubah, tekan `Ctrl+F5` (hard refresh) di browser.

---

## 8. Kerja kelompok di GitHub (opsional)

1. Pemilik repository: **Settings → Collaborators → Add people**, masukkan username GitHub anggota lain.
2. Anggota menerima undangan lewat email, lalu menyalin repository ke laptopnya:
   ```bash
   git clone https://github.com/username-kamu/morfologi-citra-tulisan.git
   ```
   Lalu buka foldernya di VS Code.
3. **Sebelum mulai bekerja**, selalu ambil perubahan terbaru:
   ```bash
   git pull
   ```
4. Setelah selesai: `git add .` → `git commit -m "..."` → `git push`.
5. Agar tidak bentrok, bagi file yang dikerjakan, misalnya:
   - Anggota A: `index.html` (konten dan teks)
   - Anggota B: `css/style.css` (tampilan)
   - Anggota C: `js/app.js` dan `js/morfologi.js` (logika dan analisis)

Jika muncul *merge conflict*, VS Code akan menandai bagian yang bentrok dengan pilihan **Accept Current / Accept Incoming / Accept Both**. Pilih yang benar, simpan, lalu commit lagi.

---

## 9. Cara memakai website

1. **Upload gambar** di bagian *Laboratorium Eksperimen* (klik kotak upload, seret gambar, atau pakai kolom di bawah hero). Belum punya gambar? Klik **Pakai gambar contoh**.
   - Gunakan gambar tulisan gelap di kertas terang, kontras jelas, lurus, lebar sekitar 600–1000 px (misalnya cover TWK yang sudah di-crop).
   - Periksa **Citra biner**: huruf harus **putih di latar hitam**. Jika terbalik, ubah pilihan **Inversi**.
   - Unggah gambar **bersih**. Website menganggap gambar yang diunggah sebagai *ground truth*; jika gambarnya sudah bernoise, IoU dan F1 tidak bermakna.
2. **Atur parameter noise** (opsional), lalu klik **Buat Noise**.
3. Klik **Jalankan 64 Konfigurasi**. Pilih tab jenis noise, ukuran kernel, dan bentuk kernel untuk melihat perbandingan.
4. Lihat **Evaluasi**: kartu konfigurasi terbaik, tabel lengkap (klik judul kolom untuk mengurutkan).
5. Baca **Analisis Otomatis & Draft Kesimpulan** sebagai bahan laporan.
6. Unduh: klik gambar mana pun (PNG), **Unduh CSV**, **Unduh analisis (.txt)**, atau **Unduh Semua (ZIP)**.

---

## 10. Mengubah tampilan

| Ingin mengubah | Lokasi |
|---|---|
| Warna | `css/style.css`, bagian `:root` paling atas (`--hijau`, `--sage`, `--krem`, dan lainnya) |
| Font | `index.html` (tautan Google Fonts di `<head>`) dan `font-family` di `body` pada `style.css` |
| Teks judul, deskripsi, footer | `index.html` |
| Nama logo "MorfoCitra" | `index.html`, cari `class="logo"` (ada di navbar dan footer) |
| Nilai bawaan parameter noise | `index.html`, atribut `value` pada input `paramP`, `paramBintik`, dan seterusnya |
| Teks gambar contoh "HALO ABC" | `js/app.js`, fungsi `pakaiContoh()` |
| Menambah nama anggota kelompok | `index.html`, bagian `<footer>` |

---

## 11. Hubungan dengan notebook Colab

- Logika website diterjemahkan dari notebook Colab. Fungsi di `js/morfologi.js` diberi nama yang mirip, misalnya `noiseSaltPepper`, `terapkanMorfologi`, `hitungMetrik`, dan `hitungKomponen`.
- **Angka di website bisa sedikit berbeda dari Colab** walaupun gambar dan seed sama. Penyebabnya: pembangkit angka acak JavaScript berbeda dengan NumPy (jadi posisi noise berbeda), dan cara browser memperkecil gambar sedikit berbeda dengan OpenCV. Operasi morfologinya sendiri identik dengan OpenCV.
- Untuk **angka di laporan**, pilih satu sumber (Colab **atau** website) dan konsisten memakainya. Sebutkan sumbernya di bagian metodologi.
- Untuk membuka notebook: upload `notebook/Morphological_Filtering_Citra_Tulisan.ipynb` ke Google Colab (**File → Upload notebook**). Jika repository public, kamu juga bisa membukanya lewat
  `https://colab.research.google.com/github/username-kamu/morfologi-citra-tulisan/blob/main/notebook/Morphological_Filtering_Citra_Tulisan.ipynb`

---

## 12. Troubleshooting

| Masalah | Solusi |
|---|---|
| `git` tidak dikenali di terminal | Git belum terinstall atau VS Code belum di-restart setelah instalasi. Tutup lalu buka lagi VS Code. |
| `fatal: not a git repository` | Terminal tidak berada di folder proyek. Buka folder lewat **File → Open Folder**, lalu buka terminal baru. |
| `remote origin already exists` | Jalankan `git remote set-url origin https://github.com/username-kamu/morfologi-citra-tulisan.git` |
| `failed to push some refs` / `rejected` | Repository GitHub sudah berisi file (misalnya README dibuat dari web). Jalankan `git pull origin main --allow-unrelated-histories`, lalu `git push`. |
| `Authentication failed` | Gunakan login lewat browser atau Personal Access Token (lihat bagian 5). |
| GitHub Pages 404 | Tunggu 1–3 menit; pastikan `index.html` berada di **root** repository (bukan di dalam subfolder) dan branch yang dipilih `main` / `/(root)`. |
| Website tampil tanpa warna/gaya | Folder `css`/`js` tidak ikut ter-upload atau namanya berubah. Periksa daftar file di GitHub. Nama file **peka huruf besar-kecil** di GitHub Pages. |
| Font bukan Montserrat | Tidak ada koneksi internet atau Google Fonts diblokir jaringan. |
| Tombol **Go Live** tidak muncul | Ekstensi Live Server belum terinstall, atau folder dibuka sebagai file tunggal. Buka lewat **Open Folder**. |
| Citra biner terbalik (latar putih) | Ubah **Inversi** menjadi *Paksa inversi* atau *Tanpa inversi*. |
| Huruf bolong / hilang setelah Otsu | Foto terlalu gelap/berbayang. Pakai foto dengan pencahayaan merata atau crop area tulisan saja. |
| Proses 64 konfigurasi lambat | Kecilkan **Lebar maks** (misalnya 600). |
| ZIP tidak terunduh | Browser memblokir unduhan. Izinkan unduhan untuk situs ini, lalu klik lagi. |

---

**Teknologi:** HTML, CSS, JavaScript murni (tanpa framework, tanpa library eksternal) · Font Montserrat (Google Fonts)
