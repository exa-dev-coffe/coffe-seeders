# ☕ Coffe Shop Seeders & Order Trigger Tooling

Folder ini berisi tool seeder & generator transaksi otomatis modular untuk aplikasi Coffe Shop. Anda dapat meng-generate katalog produk dengan foto real HD, serta memicu simulasi transaksi harian (order normal, order ber-voucher, dan order ber-diskon promo) secara terpisah sesuai kebutuhan testing Anda.

---

## 📁 Struktur Folder

```text
d:\Project\coffe\seeders/
├── index.js          # CLI Runner utama & entrypoint router
├── products.js       # Module seeder Kategori, Produk (HD Images), & Meja Cafe
├── orders.js         # Module simulator Order Normal, Order Voucher, & Order Promo Diskon
└── README.md         # Dokumentasi penggunaan & referensi command
```

---

## 🚀 Panduan Penggunaan (Commands)

Anda dapat menjalankan script dari folder root workspace atau via `npm` dari folder `coffe-fe`:

### 1. Seed Produk & Kategori (Real HD Unsplash Images)
Membuat 5 kategori utama (*Espresso & Coffee, Manual Brew, Non-Coffee & Latte, Artisanal Pastries, Signature Food*), 14+ item menu dengan gambar HD Unsplash, dan meja cafe.
```bash
node seeders/index.js seed-products
# atau via coffe-fe:
cd coffe-fe && npm run seed:products
```

---

### 2. Trigger Order Normal (Tanpa Voucher / Promo)
Mensimulasikan order normal dengan pelanggan acak, catatan barista, variasi kuantitas item, serta distribusi jam ramai.
```bash
node seeders/index.js trigger-normal
# Kustomisasi Jumlah Hari & Order per Hari:
node seeders/index.js trigger-normal --days=14 --ordersPerDay=20
# via coffe-fe:
cd coffe-fe && npm run trigger:normal
```

---

### 3. Trigger Order Voucher
Mendaftarkan voucher belanja aktif (`WELCOME10`, `HEMAT5K`) jika belum ada, lalu mensimulasikan transaksi yang menggunakan kode voucher tersebut.
```bash
node seeders/index.js trigger-vouchers
# Kustomisasi Jumlah Hari:
node seeders/index.js trigger-vouchers --days=7 --ordersPerDay=15
# via coffe-fe:
cd coffe-fe && npm run trigger:vouchers
```

---

### 4. Trigger Order Diskon & Promo Campaign
Mendaftarkan promo campaign di `master-data` (yang otomatis menjadwalkan task Asynq di Redis Queue), lalu mensimulasikan transaksi yang mendapatkan potongan diskon harga promo.
```bash
node seeders/index.js trigger-promos
# Kustomisasi Jumlah Hari:
node seeders/index.js trigger-promos --days=7 --ordersPerDay=15
# via coffe-fe:
cd coffe-fe && npm run trigger:promos
```

---

### 5. Trigger Semua Proses Sekaligus (Seed All)
Menjalankan seluruh tahap (Seed Produk, Order Normal, Order Voucher, Order Promo) secara otomatis berurutan.
```bash
node seeders/index.js trigger-all
# Kustomisasi:
node seeders/index.js trigger-all --days=14 --ordersPerDay=20
# via coffe-fe:
cd coffe-fe && npm run trigger:all
```

---

## ⚙️ CLI Flags Reference

- `--days=<number>`: Jumlah hari historis yang ingin disimulasikan ke belakang (default: `7`).
- `--ordersPerDay=<number>`: Target rata-rata volume transaksi per hari (default: `10`).

---

## 🌐 Mappings Service & Database

Script ini akan otomatis mendeteksi service backend lokal:
- **Master Data Service**: `http://localhost:8081` (atau Kong Gateway `http://localhost:8000`)
- **Transaction Service**: `http://localhost:8084`
- **Wallet Service**: `http://localhost:8082`
- **PostgreSQL Database**: `postgres://root:password@localhost:10000/transaction` & `wallet`
