# Catatan Keuangan Pribadi (Google Apps Script + Sheets + Sites)

Aplikasi web sederhana untuk mencatat keuangan pribadi. Berjalan sepenuhnya di akun Google Anda: tanpa server, tanpa biaya, dan data tetap milik Anda di Google Sheets. Tampilan putih sederhana, nyaman dibuka dari HP maupun desktop.

By **@rakitiot**

---

## Daftar isi

1. [Fitur](#fitur)
2. [Cara kerja](#cara-kerja)
3. [Yang dibutuhkan](#yang-dibutuhkan)
4. [Pemasangan](#pemasangan)
5. [Memasang di Google Sites](#memasang-di-google-sites)
6. [Cara memakai](#cara-memakai)
7. [Keamanan](#keamanan)
8. [Memperbarui aplikasi](#memperbarui-aplikasi)
9. [Cadangan data](#cadangan-data)
10. [Mengubah tampilan dan teks](#mengubah-tampilan-dan-teks)
11. [Membagikan ke orang lain](#membagikan-ke-orang-lain)
12. [Masalah umum](#masalah-umum)
13. [Struktur proyek](#struktur-proyek)

---

## Fitur

- Empat saldo: **total, bulanan, investasi, simpanan**. Saldo total adalah jumlah ketiga saldo lainnya.
- **Pengeluaran** diambil dari saldo bulanan, lengkap dengan tanggal, dalam tiga kategori: **harian**, **kebutuhan pokok**, **kebutuhan pasif** (tipe/keterangan dan jumlah).
- **Pemasukan** ke saldo mana pun, dan **transfer** antar saldo.
- **Riwayat** dengan filter bulan, jenis, dan pencarian; transaksi yang salah bisa dihapus.
- **Setting**: tipe pengeluaran, kolom tambahan (teks, angka, tanggal, pilihan), nama tampilan, nama saldo, batas pengeluaran bulanan, dan PIN.
- Nama dan email pengguna tampil di bagian atas; catatan "Catatan Keuangan Pribadi, by @rakitiot" tampil di bagian bawah.
- Akses terkunci ke akun Google Anda, dengan PIN opsional.

## Cara kerja

```
Google Sites (halaman privat)
   └─ sematan ─▶ Apps Script Web App (login Google)
                    └─▶ Google Sheets (database)
                          ├─ Mutasi       semua pergerakan uang
                          ├─ Pengeluaran  detail pengeluaran + kolom tambahan
                          └─ Config       pengaturan
```

Saldo tidak pernah diketik manual. Semuanya dihitung dari sheet `Mutasi` (hanya ditambah atau dihapus), sehingga angka saldo tetap konsisten.

Aturan yang perlu diketahui:
- Pengeluaran ditolak jika saldo bulanan tidak cukup. Tambahkan pemasukan atau transfer dulu.
- Transfer ditolak jika saldo asal tidak cukup.
- Transaksi tidak bisa dihapus jika saldo akan menjadi minus (misalnya pemasukan yang sudah terpakai).

## Yang dibutuhkan

- **Akun Google pribadi (`@gmail.com`)**. Akun kampus atau kantor kadang dibatasi oleh administrator sehingga aplikasi web tidak bisa dibuka.
- Browser di laptop/komputer untuk pemasangan awal (sekitar 20 menit). Chrome disarankan.
- Login hanya dengan **satu akun Google** di browser itu selama pemasangan, supaya tidak tertukar.

## Pemasangan

### Tahap 0: Uji akun (disarankan, 3 menit)

Langkah ini memastikan akun dan browser Anda bisa membuka aplikasi web, sehingga masalah mudah dilacak.

1. Buka [script.google.com](https://script.google.com), klik **Proyek baru**.
2. Ganti isi `Code.gs` dengan:
   ```js
   function doGet() {
     return HtmlService.createHtmlOutput('Halo, web app berjalan.');
   }
   ```
3. Klik **Terapkan → Deployment baru → (ikon roda gigi) Aplikasi web**.
   - Jalankan sebagai: **Saya**
   - Yang memiliki akses: **Siapa saja yang memiliki Akun Google**
4. Klik **Terapkan**, setujui izin, salin **URL aplikasi web**, dan buka di tab baru.
5. Jika tampil "Halo, web app berjalan.", lanjut. Proyek uji ini boleh dibuang.
   Jika gagal, lihat [Masalah umum](#masalah-umum).

### Tahap 1: Buat spreadsheet

1. Buka [sheets.new](https://sheets.new) dan beri nama `Keuangan Pribadi`.
2. **Jangan bagikan** spreadsheet ini ke siapa pun.

### Tahap 2: Tempel skrip

1. Di spreadsheet, buka **Ekstensi → Apps Script**.
2. Ganti isi `Code.gs` dengan isi file **`Code.gs`** dari proyek ini.
3. Klik **+ → HTML**, beri nama `Index` (tanpa `.html`), lalu tempel isi **`Index.html`**.
4. Klik ikon roda gigi (**Setelan proyek**), centang **Tampilkan file manifes "appsscript.json" di editor**.
5. Kembali ke tab **Editor**, buka `appsscript.json`, hapus isinya, lalu tempel isi **`appsscript.json`** dari proyek ini.
   (File ini sudah ada secara bawaan, hanya disembunyikan. Jangan membuat file baru dengan nama itu.)
6. Simpan semuanya dengan **Ctrl+S**.

#### Isi `appsscript.json`

Tempel persis seperti ini:

```json
{
  "timeZone": "Asia/Jakarta",
  "runtimeVersion": "V8",
  "exceptionLogging": "STACKDRIVER",
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/userinfo.email"
  ],
  "webapp": {
    "executeAs": "USER_ACCESSING",
    "access": "ANYONE"
  }
}
```

| Baris | Arti |
|---|---|
| `timeZone` | Zona waktu untuk menentukan "hari ini" dan "bulan ini". Ganti ke `Asia/Makassar` atau `Asia/Jayapura` jika perlu. |
| `runtimeVersion` | Memakai mesin JavaScript modern (V8). |
| `oauthScopes` | Izin yang diminta: membaca/menulis spreadsheet dan membaca email akun yang sedang login. Tidak ada izin lain. |
| `executeAs: USER_ACCESSING` | Skrip berjalan sebagai **pengunjung**, bukan sebagai pemilik. Karena spreadsheet tidak dibagikan, orang lain tidak bisa membaca data. |
| `access: ANYONE` | Yang bisa membuka URL adalah siapa saja yang memiliki akun Google. Orang yang bukan `OWNER_EMAIL` tetap ditolak oleh skrip. |

Jika muncul galat "Invalid manifest", periksa tanda kurung dan koma, lalu tempel ulang dari awal.

### Tahap 3: Siapkan sheet otomatis

1. Di bagian atas editor, pilih fungsi **`setupAwal`**, lalu klik **Jalankan**.
2. Setujui izin. Jika muncul peringatan "Google belum memverifikasi aplikasi ini", klik **Lanjutan → Buka (nama proyek) → Izinkan**. Ini normal untuk skrip pribadi.
3. Buka tab spreadsheet. Sekarang ada sheet **Config**, **Mutasi**, dan **Pengeluaran**.
4. Di **Setelan proyek → Properti skrip**, pastikan ada:
   - `OWNER_EMAIL`: email Google Anda (terisi otomatis oleh `setupAwal`).
   - `SS_ID`: ID spreadsheet (terisi otomatis).

### Tahap 4: Terapkan sebagai aplikasi web

1. Klik **Terapkan → Deployment baru → Aplikasi web**.
2. Pastikan setelannya:
   - Jalankan sebagai: **Pengguna yang mengakses aplikasi web**
   - Yang memiliki akses: **Siapa saja yang memiliki Akun Google**
3. Klik **Terapkan**, lalu klik **Salin** pada **URL aplikasi web** (berakhiran `/exec`). Simpan URL ini.
4. Buka URL itu di tab baru dan uji:
   - **Catat → Pemasukan**: tambah pemasukan, misalnya 3.000.000 ke Bulanan.
   - **Catat → Pengeluaran**: catat satu pengeluaran.
   - **Ringkasan**: saldo bulanan berkurang dan saldo total ikut berubah.
   - **Riwayat**: kedua transaksi muncul.

> Karena aplikasi berjalan sebagai pengunjung dan spreadsheet tidak dibagikan, orang lain yang mendapat URL ini tidak dapat membaca data Anda. Selain itu, email yang bukan `OWNER_EMAIL` ditolak oleh skrip.

## Memasang di Google Sites

Google Sites membuat aplikasi mudah dijangkau lewat satu alamat, dengan pembatasan akses tambahan.

### Membuat situs

1. Buka [sites.google.com](https://sites.google.com) dengan akun yang sama.
2. Klik **Kosong** (tanda **+**) untuk membuat situs baru.
3. Beri nama situs di kiri atas (misalnya `Keuangan`), dan ketik judul halaman jika diminta. Anda boleh mengosongkan judul halaman.

### Menyematkan aplikasi

Ada dua cara. **Cara A** disarankan karena aplikasi memenuhi seluruh halaman, dengan elemen Google Sites yang minimal.

#### Cara A: Embed satu halaman penuh (disarankan)

Fitur ini menampilkan konten sebagai satu halaman penuh, bukan hanya sebagian halaman, dengan elemen navigasi Google Sites yang minimal.

1. Di mode edit, buka tab **Halaman** di panel kanan.
2. Klik tombol **+** (halaman baru), lalu pilih **Embed satu halaman penuh** (*Full page embed*).
3. Beri nama halaman, misalnya `Keuangan`.
4. Klik **Sematkan**, tempel URL aplikasi web (`…/exec`), lalu klik **Sisipkan**.
5. Jadikan halaman ini beranda: di tab **Halaman**, klik menu ⋮ pada halaman `Keuangan`, lalu pilih **Jadikan halaman beranda** (*Make home page*). Alamat situs kemudian langsung membuka aplikasi.
6. Hapus halaman kosong bawaan agar tidak ada menu navigasi yang tersisa.

#### Cara B: Sematan biasa (jika Cara A tidak tersedia)

1. Di panel kanan, buka tab **Sisipkan**, lalu klik **Sematkan**.
2. Pilih **Menurut URL**, tempel URL aplikasi web, klik **Berikutnya**, lalu **Sisipkan**.
3. Tarik sudut kotak sematan sampai memenuhi lebar halaman, dan perbesar tingginya (sekitar 1000 piksel atau lebih) agar tidak terpotong.
4. Alternatif: pilih **Kode sematan** dan tempel
   ```html
   <iframe src="URL_EXEC_ANDA" style="width:100%;height:100%;border:0"></iframe>
   ```
   dengan `URL_EXEC_ANDA` diganti URL aplikasi web.
5. Hapus teks dan kotak bawaan lain di halaman.

### Menghilangkan header dan footer

- **Header:** arahkan kursor ke header di mode edit, lalu cari opsi untuk menghapusnya. Untuk memasangnya lagi, arahkan kursor ke "Enter site name" dan klik **Add header**. Jika tidak ingin menghapus, buka **Jenis header** dan pilih ukuran terkecil (*Title only*).
- **Footer:** arahkan kursor ke footer, lalu klik **Hide** (**Sembunyikan**) di kiri bawah.
- Pada embed satu halaman penuh, navigasi minimal dari Google Sites masih bisa tampil. Untuk tampilan tanpa elemen tambahan sama sekali, buka URL `/exec` langsung dan jadikan pintasan (lihat bagian pintasan di bawah).

### Membatasi akses situs (penting)

1. Klik ikon **Bagikan dengan orang lain** (gambar orang dengan tanda +) di kanan atas.
2. Tambahkan **email Anda sendiri** sebagai editor.
3. Pastikan tidak ada akses publik atau "siapa saja yang memiliki link".

### Menerbitkan

1. Klik **Terbitkan** di kanan atas.
2. Isi **Alamat web**, misalnya `keuangan-saya`. Hasilnya `sites.google.com/view/keuangan-saya`.
3. Pada pengaturan penerbitan, untuk **Siapa yang dapat melihat situs saya**, pilih **Hanya orang tertentu** (jangan **Siapa saja**), lalu pastikan hanya email Anda yang terdaftar.
4. Klik **Terbitkan**, dan buka alamat situs untuk memeriksa.

Catatan: nama menu Google Sites bisa berubah dari waktu ke waktu. Jika letaknya berbeda, cari menu dengan fungsi yang sama.

### Pintasan di layar utama HP

- **Android (Chrome):** buka alamat situs, ketuk menu ⋮, lalu **Tambahkan ke layar utama**.
- **iPhone (Safari):** buka alamat situs, ketuk tombol **Bagikan**, lalu **Tambahkan ke Layar Utama**.

Jika tampilan di Sites terasa sempit atau bergulir ganda, buka URL `/exec` langsung dan jadikan itu pintasan.

## Cara memakai

- **Ringkasan**: empat saldo, pengeluaran bulan ini per kategori, sisa batas bulanan (jika diatur), dan lima transaksi terakhir.
- **Catat**: pilih Pengeluaran, Pemasukan, atau Transfer, isi form, lalu simpan.
- **Riwayat**: saring per bulan, jenis, atau kata kunci. Klik **Hapus** untuk membatalkan transaksi.
- **Setting**:
  - *Tipe pengeluaran*: daftar saran per kategori, satu per baris.
  - *Kolom tambahan*: tambah kolom baru (misalnya Metode bayar). Kolom muncul di form pengeluaran dan di akhir sheet `Pengeluaran`. Menghapus kolom hanya menyembunyikannya; data lama tetap ada di sheet.
  - *Profil, nama saldo, dan batas*: ubah nama tampilan, nama tiga saldo, dan batas pengeluaran bulanan.
  - *Keamanan*: aktifkan, ganti, atau matikan PIN.

## Keamanan

### Lapisan perlindungan

| Lapisan | Fungsi |
|---|---|
| Login Google | Hanya pengguna Google yang dapat membuka aplikasi |
| `OWNER_EMAIL` | Email selain pemilik ditolak oleh skrip |
| Spreadsheet tidak dibagikan | Data tidak terbaca walaupun URL bocor |
| Situs Google Sites privat | Alamat situs hanya terbuka untuk email Anda |
| PIN (opsional) | Lapisan kedua di dalam aplikasi |

### PIN

PIN **tidak aktif secara bawaan**. Cara mengaktifkan:
1. Buka aplikasi, tab **Setting**, gulir ke bagian **Keamanan**.
2. Isi **PIN baru** (4 sampai 8 angka), lalu klik **Aktifkan PIN**.

Cara kerjanya:
- PIN dicek di **server** (Apps Script), bukan hanya di tampilan. Semua fungsi pembaca dan pengubah data menolak permintaan tanpa PIN yang benar.
- PIN disimpan sebagai **hash SHA-256 dengan salt acak** di Properti skrip, bukan sebagai teks biasa dan bukan di spreadsheet.
- Setelah PIN benar, sesi berlaku **30 menit**, lalu PIN diminta lagi.
- Setelah **5 kali salah**, PIN dikunci sementara selama 10 menit.
- Mengganti atau mematikan PIN hanya bisa dilakukan setelah PIN dimasukkan.

Batasan yang perlu diketahui:
- PIN adalah lapisan tambahan, bukan pengunci utama. Pengunci utamanya adalah akun Google Anda.
- PIN **tidak mengenkripsi** spreadsheet. Siapa pun yang masuk ke akun Google Anda bisa membuka spreadsheet langsung tanpa melewati PIN.
- PIN 4 sampai 8 angka tergolong lemah. Pilih yang tidak mudah ditebak (bukan tanggal lahir atau 1234).

Jika lupa PIN: buka **Setelan proyek → Properti skrip** di Apps Script, hapus `PIN_HASH`, lalu muat ulang aplikasi. PIN menjadi nonaktif dan Anda bisa mengatur yang baru.

### Saran tambahan

- Aktifkan **verifikasi 2 langkah** di akun Google Anda. Semua lapisan di atas bergantung pada keamanan akun itu.
- Jangan membagikan salinan spreadsheet yang sudah berisi data pribadi.
- Pastikan pengaturan berbagi Google Sites hanya mencantumkan email Anda.

## Memperbarui aplikasi

Setelah mengubah kode:
1. Klik **Terapkan → Kelola deployment**.
2. Klik ikon pensil pada deployment aktif.
3. Pada **Versi**, pilih **Versi baru**, lalu klik **Terapkan**.

URL tetap sama, sehingga sematan di Google Sites tidak perlu diubah. Memilih **Deployment baru** akan membuat URL baru yang harus disematkan ulang.

## Cadangan data

- Di spreadsheet: **File → Buat salinan**, atau **File → Download → Microsoft Excel (.xlsx)**.
- Simpan cadangan di tempat privat, misalnya sebulan sekali.
- Hindari mengedit sheet `Mutasi` dan `Pengeluaran` secara manual. Jika perlu, ubah lewat aplikasi agar kedua sheet tetap sinkron.

## Mengubah tampilan dan teks

Semua ada di `Index.html`:
- **Teks footer:** cari `<footer>` dan ubah isinya.
- **Warna aksen:** ubah nilai `--accent` di bagian `:root` pada CSS.
- **Nama tampilan:** bisa diubah dari halaman Setting tanpa mengedit kode. Jika kosong, aplikasi memakai bagian depan email Anda.
- **Tipe pengeluaran awal:** ubah daftar di fungsi `setupAwal` pada `Code.gs` sebelum menjalankannya, atau ubah lewat Setting.

Setelah mengubah kode, ikuti langkah [Memperbarui aplikasi](#memperbarui-aplikasi).

## Membagikan ke orang lain

Bagikan **kode**, bukan spreadsheet Anda:
1. Orang lain membuat spreadsheet baru miliknya sendiri.
2. Mereka mengikuti bagian [Pemasangan](#pemasangan) dan [Google Sites](#memasang-di-google-sites) dengan akun mereka.
3. Setiap orang memiliki data, deployment, dan URL yang terpisah.

## Masalah umum

| Gejala | Penyebab dan solusi |
|---|---|
| "Sorry, unable to open the file at this time" atau halaman tidak ditemukan | Lakukan [Tahap 0](#tahap-0-uji-akun-disarankan-3-menit). Jika uji kosong juga gagal, masalahnya ada di akun/browser: login hanya dengan satu akun Gmail pribadi di Chrome (profil baru), dan pastikan URL berbentuk `script.google.com/macros/s/…/exec`. Tidak ada baris baru di **Eksekusi** berarti permintaan diblokir sebelum sampai ke skrip. |
| "Akses ditolak" | `OWNER_EMAIL` belum terisi atau berbeda dari akun yang dipakai. Jalankan ulang `setupAwal` atau isi manual di Properti skrip. |
| Galat soal spreadsheet / `SS_ID` | `setupAwal` belum dijalankan dari spreadsheet yang sama dengan skripnya. |
| Perubahan kode tidak terlihat | Buat **versi baru** pada deployment (lihat [Memperbarui aplikasi](#memperbarui-aplikasi)), lalu muat ulang halaman. |
| Layar putih di Google Sites | Izinkan cookie pihak ketiga untuk `google.com` di browser, atau buka URL `/exec` langsung. Pastikan Anda login dengan akun pemilik. |
| Tampilan terpotong di Sites | Perbesar tinggi kotak sematan. |
| "Saldo bulanan tidak cukup" | Tambahkan pemasukan ke saldo Bulanan, atau pindahkan saldo lewat Transfer. |
| PIN lupa | Di Apps Script buka **Setelan proyek → Properti skrip**, hapus `PIN_HASH`, lalu muat ulang aplikasi. |
| Layar putih tanpa pesan | Buka konsol browser (F12 → Console) dan catat galatnya. |

## Struktur proyek

```
keuangan-appsscript/
  Code.gs          Backend: setup, akses, PIN, saldo, pengeluaran, setting
  Index.html       Antarmuka (HTML, CSS, JS dalam satu file)
  appsscript.json  Manifest (zona waktu, izin, mode web app)
  README.md        Panduan ini
  DESAIN.md        Catatan rancangan sistem
```

## Lisensi

Bebas dipakai dan dimodifikasi untuk keperluan pribadi. Tentukan lisensi sendiri jika dipublikasikan.

---

Catatan Keuangan Pribadi, by @rakitiot
