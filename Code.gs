/**
 * Pencatat Keuangan Pribadi - backend
 * Data: Google Sheets (Mutasi, Pengeluaran, Config). Saldo selalu dihitung dari Mutasi.
 * Fungsi berakhiran "_" bersifat privat (tidak bisa dipanggil dari browser).
 */
const TZ = 'Asia/Jakarta';
const SH = { CFG: 'Config', LED: 'Mutasi', EXP: 'Pengeluaran' };
const KANTONG = ['BULANAN', 'INVESTASI', 'SIMPANAN'];
const KATEGORI = ['HARIAN', 'POKOK', 'PASIF'];
const KOLOM_TETAP = ['ID', 'Tanggal', 'Kategori', 'Keterangan', 'Jumlah'];
const props_ = () => PropertiesService.getScriptProperties();

/* ---------- Setup (jalankan sekali dari editor) ---------- */
function setupAwal() {
  const ss = SpreadsheetApp.getActive();
  props_().setProperty('SS_ID', ss.getId());
  if (!props_().getProperty('OWNER_EMAIL')) {
    props_().setProperty('OWNER_EMAIL', Session.getActiveUser().getEmail());
  }
  const buat = (nama, header) => {
    const s = ss.getSheetByName(nama) || ss.insertSheet(nama);
    if (s.getLastRow() === 0) {
      s.appendRow(header);
      s.setFrozenRows(1);
      s.getRange(1, 1, 1, header.length).setFontWeight('bold');
    }
    return s;
  };
  buat(SH.CFG, ['Kunci', 'Nilai']);
  const led = buat(SH.LED, ['ID', 'Tanggal', 'Jenis', 'Dari', 'Ke', 'Jumlah', 'Keterangan']);
  const exp = buat(SH.EXP, KOLOM_TETAP);
  led.getRange('B:B').setNumberFormat('@'); // tanggal disimpan sebagai teks yyyy-MM-dd
  exp.getRange('B:B').setNumberFormat('@');
  if (cfg_('tipe') === null) {
    setCfg_('tipe', {
      HARIAN: ['Makan', 'Transportasi', 'Jajan'],
      POKOK: ['Belanja bulanan', 'Listrik', 'Air'],
      PASIF: ['Langganan', 'Cicilan', 'Asuransi']
    });
  }
  if (cfg_('kolom') === null) setCfg_('kolom', []);
  if (cfg_('nama') === null) setCfg_('nama', { BULANAN: 'Bulanan', INVESTASI: 'Investasi', SIMPANAN: 'Simpanan' });
  if (cfg_('batas') === null) setCfg_('batas', 0);
  Logger.log('Setup selesai. OWNER_EMAIL = ' + props_().getProperty('OWNER_EMAIL'));
}

/* ---------- Akses & PIN ---------- */
function email_() { return (Session.getActiveUser().getEmail() || '').toLowerCase(); }
function pemilik_() {
  const o = (props_().getProperty('OWNER_EMAIL') || '').toLowerCase();
  return !!o && o === email_();
}
function pinAktif_() { return !!props_().getProperty('PIN_HASH'); }
function cek_() {
  if (!pemilik_()) throw new Error('Akses ditolak. Akun ini bukan pemilik aplikasi.');
  if (pinAktif_() && !CacheService.getUserCache().get('pin_ok')) throw new Error('PIN_DIPERLUKAN');
}
function hash_(pin) {
  const salt = props_().getProperty('PIN_SALT') || '';
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + pin)
    .map(b => ('0' + (b & 255).toString(16)).slice(-2)).join('');
}

function doGet() {
  if (!pemilik_()) {
    return HtmlService.createHtmlOutput(
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<body style="font-family:sans-serif;padding:24px;max-width:480px">' +
      '<h2>Akses ditolak</h2><p>Akun Google ini bukan pemilik aplikasi. ' +
      'Masuk dengan akun yang benar, atau periksa properti OWNER_EMAIL di pengaturan skrip.</p></body>');
  }
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Keuangan')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function statusAkses() {
  if (!pemilik_()) throw new Error('Akses ditolak. Akun ini bukan pemilik aplikasi.');
  return { pin: pinAktif_(), ok: !pinAktif_() || !!CacheService.getUserCache().get('pin_ok') };
}

function cekPin(pin) {
  if (!pemilik_()) throw new Error('Akses ditolak. Akun ini bukan pemilik aplikasi.');
  const c = CacheService.getUserCache();
  const gagal = Number(c.get('pin_gagal') || 0);
  if (gagal >= 5) throw new Error('Terlalu banyak percobaan. Coba lagi dalam 10 menit.');
  if (hash_(String(pin)) !== props_().getProperty('PIN_HASH')) {
    c.put('pin_gagal', String(gagal + 1), 600);
    throw new Error('PIN tidak cocok. Periksa lalu coba lagi.');
  }
  c.put('pin_ok', '1', 1800); // sesi 30 menit
  c.remove('pin_gagal');
  return true;
}

function aturPin(pin) {
  cek_();
  if (!pin) { props_().deleteProperty('PIN_HASH'); return { pin: false }; }
  if (!/^\d{4,8}$/.test(String(pin))) throw new Error('PIN harus 4 sampai 8 angka.');
  props_().setProperty('PIN_SALT', Utilities.getUuid());
  props_().setProperty('PIN_HASH', hash_(String(pin)));
  CacheService.getUserCache().put('pin_ok', '1', 1800);
  return { pin: true };
}

/* ---------- Helper data ---------- */
function sh_(nama) { return SpreadsheetApp.openById(props_().getProperty('SS_ID')).getSheetByName(nama); }
function cfg_(kunci) {
  const v = sh_(SH.CFG).getDataRange().getValues();
  for (let i = 1; i < v.length; i++) if (v[i][0] === kunci) return JSON.parse(v[i][1]);
  return null;
}
function setCfg_(kunci, nilai) {
  const s = sh_(SH.CFG), v = s.getDataRange().getValues(), j = JSON.stringify(nilai);
  for (let i = 1; i < v.length; i++) if (v[i][0] === kunci) { s.getRange(i + 1, 2).setValue(j); return; }
  s.appendRow([kunci, j]);
}
function cfgAll_() {
  return {
    tipe: cfg_('tipe'), kolom: cfg_('kolom') || [], nama: cfg_('nama'), batas: cfg_('batas') || 0,
    pengguna: cfg_('pengguna') || email_().split('@')[0] // nama tampilan; bawaan: bagian depan email
  };
}
function rows_(nama) { return sh_(nama).getDataRange().getValues().slice(1).filter(r => r[0] !== ''); }
function tgl_(v) { return v instanceof Date ? Utilities.formatDate(v, TZ, 'yyyy-MM-dd') : String(v); }
function saldo_(led) {
  const s = { BULANAN: 0, INVESTASI: 0, SIMPANAN: 0 };
  led.forEach(r => {
    const j = Number(r[5]);
    if (r[3] in s) s[r[3]] -= j;
    if (r[4] in s) s[r[4]] += j;
  });
  return s;
}
function jumlah_(v) {
  const n = Math.round(Number(v));
  if (!(n > 0)) throw new Error('Jumlah harus angka lebih dari 0. Contoh: 25000');
  return n;
}
function tanggal_(v) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(v))) throw new Error('Pilih tanggal yang valid.');
  return String(v);
}
function dengankunci_(fn) {
  const lock = LockService.getUserLock();
  lock.waitLock(10000);
  try { return fn(); } finally { lock.releaseLock(); }
}
const id_ = () => Utilities.getUuid().slice(0, 8);

/* ---------- Baca data ---------- */
function ambilData() {
  cek_();
  const cfg = cfgAll_();
  const led = rows_(SH.LED);
  const ev = sh_(SH.EXP).getDataRange().getValues();
  const head = ev[0], exp = ev.slice(1).filter(r => r[0] !== '');
  const aktif = cfg.kolom.map(k => k.nama);
  const em = {};
  exp.forEach(r => {
    const x = {};
    head.forEach((hd, i) => {
      if (i >= KOLOM_TETAP.length && aktif.indexOf(hd) >= 0) x[hd] = r[i] instanceof Date ? tgl_(r[i]) : r[i];
    });
    em[r[0]] = { kat: r[2], x: x };
  });
  const bulan = Utilities.formatDate(new Date(), TZ, 'yyyy-MM');
  const bi = { HARIAN: 0, POKOK: 0, PASIF: 0, total: 0 };
  exp.forEach(r => {
    if (tgl_(r[1]).slice(0, 7) === bulan && r[2] in bi) { bi[r[2]] += Number(r[4]); bi.total += Number(r[4]); }
  });
  const saldo = saldo_(led);
  const riwayat = led.slice().reverse().map(r => ({
    id: r[0], tgl: tgl_(r[1]), jenis: r[2], dari: r[3], ke: r[4], jumlah: Number(r[5]), ket: r[6],
    kategori: em[r[0]] ? em[r[0]].kat : '', extra: em[r[0]] ? em[r[0]].x : {}
  })).sort((a, b) => b.tgl.localeCompare(a.tgl)).slice(0, 500);
  return {
    saldo: saldo, total: saldo.BULANAN + saldo.INVESTASI + saldo.SIMPANAN,
    bulan: bulan, bulanIni: bi, riwayat: riwayat, cfg: cfg, pin: pinAktif_(), email: email_()
  };
}

/* ---------- Tulis data ---------- */
function tambahPengeluaran(p) {
  cek_();
  return dengankunci_(() => {
    const j = jumlah_(p.jumlah), t = tanggal_(p.tanggal);
    if (KATEGORI.indexOf(p.kategori) < 0) throw new Error('Pilih kategori pengeluaran.');
    const ket = String(p.keterangan || '').trim();
    if (!ket) throw new Error('Isi tipe atau keterangan pengeluaran.');
    if (saldo_(rows_(SH.LED)).BULANAN < j) {
      throw new Error('Saldo bulanan tidak cukup. Tambahkan pemasukan atau pindahkan saldo ke Bulanan dulu.');
    }
    const id = id_(), es = sh_(SH.EXP);
    const head = es.getRange(1, 1, 1, es.getLastColumn()).getValues()[0];
    const baku = { ID: id, Tanggal: t, Kategori: p.kategori, Keterangan: ket, Jumlah: j };
    const extra = p.extra || {};
    es.appendRow(head.map(h => (h in baku ? baku[h] : (extra[h] !== undefined ? extra[h] : ''))));
    sh_(SH.LED).appendRow([id, t, 'PENGELUARAN', 'BULANAN', '', j, ket]);
    return true;
  });
}

function tambahMutasi(p) {
  cek_();
  return dengankunci_(() => {
    const j = jumlah_(p.jumlah), t = tanggal_(p.tanggal);
    const jenis = p.jenis, dari = p.dari || '', ke = p.ke || '';
    if (jenis === 'PEMASUKAN') {
      if (KANTONG.indexOf(ke) < 0) throw new Error('Pilih saldo tujuan pemasukan.');
    } else if (jenis === 'TRANSFER') {
      if (KANTONG.indexOf(dari) < 0 || KANTONG.indexOf(ke) < 0) throw new Error('Pilih saldo asal dan tujuan.');
      if (dari === ke) throw new Error('Saldo asal dan tujuan harus berbeda.');
      if (saldo_(rows_(SH.LED))[dari] < j) throw new Error('Saldo asal tidak cukup untuk dipindahkan.');
    } else {
      throw new Error('Jenis mutasi tidak dikenal.');
    }
    const ket = String(p.keterangan || '').trim() || (jenis === 'PEMASUKAN' ? 'Pemasukan' : 'Transfer');
    sh_(SH.LED).appendRow([id_(), t, jenis, jenis === 'PEMASUKAN' ? '' : dari, ke, j, ket]);
    return true;
  });
}

function hapus(id) {
  cek_();
  return dengankunci_(() => {
    const sisa = rows_(SH.LED).filter(r => r[0] !== id);
    const s = saldo_(sisa);
    if (KANTONG.some(k => s[k] < 0)) {
      throw new Error('Tidak bisa dihapus: saldo akan menjadi minus. Hapus transaksi yang bergantung padanya dulu.');
    }
    [SH.LED, SH.EXP].forEach(nama => {
      const sheet = sh_(nama), n = sheet.getLastRow();
      if (n < 2) return;
      const v = sheet.getRange(1, 1, n, 1).getValues();
      for (let i = v.length - 1; i > 0; i--) if (v[i][0] === id) sheet.deleteRow(i + 1);
    });
    return true;
  });
}

/* ---------- Setting ---------- */
function simpanTipe(tipe) {
  cek_();
  const t = {};
  KATEGORI.forEach(k => { t[k] = (tipe[k] || []).map(x => String(x).trim()).filter(Boolean); });
  setCfg_('tipe', t);
  return cfgAll_();
}

function tambahKolom(k) {
  cek_();
  const nama = String(k.nama || '').trim();
  if (!nama) throw new Error('Isi nama kolom.');
  const jenis = ['teks', 'angka', 'tanggal', 'pilihan'].indexOf(k.jenis) >= 0 ? k.jenis : 'teks';
  const kolom = cfg_('kolom') || [];
  const dipakai = KOLOM_TETAP.concat(kolom.map(x => x.nama)).some(x => x.toLowerCase() === nama.toLowerCase());
  if (dipakai) throw new Error('Nama kolom sudah dipakai. Gunakan nama lain.');
  const opsi = jenis === 'pilihan' ? String(k.opsi || '').split(',').map(x => x.trim()).filter(Boolean) : [];
  if (jenis === 'pilihan' && !opsi.length) throw new Error('Isi pilihan, dipisah koma. Contoh: Tunai, Transfer');
  const es = sh_(SH.EXP);
  const head = es.getRange(1, 1, 1, es.getLastColumn()).getValues()[0];
  if (head.indexOf(nama) < 0) { // kolom lama yang pernah dihapus dipakai ulang
    const c = es.getLastColumn() + 1;
    es.getRange(1, c).setValue(nama).setFontWeight('bold');
  }
  kolom.push({ nama: nama, jenis: jenis, opsi: opsi });
  setCfg_('kolom', kolom);
  return cfgAll_();
}

function hapusKolom(nama) { // hanya menyembunyikan dari form; data lama tetap di sheet
  cek_();
  setCfg_('kolom', (cfg_('kolom') || []).filter(k => k.nama !== nama));
  return cfgAll_();
}

function simpanPengaturan(p) {
  cek_();
  const nama = {};
  KANTONG.forEach(k => { nama[k] = String((p.nama || {})[k] || '').trim() || k.charAt(0) + k.slice(1).toLowerCase(); });
  const batas = Math.max(0, Math.round(Number(p.batas) || 0));
  setCfg_('nama', nama);
  setCfg_('batas', batas);
  setCfg_('pengguna', String(p.pengguna || '').trim().slice(0, 40));
  return cfgAll_();
}
