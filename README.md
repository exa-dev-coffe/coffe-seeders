# ☕ Coffe Seeders & Multi-Year Order Simulators

Kumpulan script dan tool seeder modular untuk inisialisasi katalog menu kopi HD, meja kafe, voucher diskon, dan simulator transaksi multi-tahun (2025 - 2026) untuk ekosistem **Coffe Shop Web App** ([coffe.eka-dev.cloud](https://coffe.eka-dev.cloud)).

---

## 📁 Struktur Repository

```text
├── seeders/
│   ├── index.js                     # CLI Router & entrypoint seeder modular
│   ├── products.js                  # Inisialisasi 14 menu HD Unsplash & 5 kategori
│   ├── orders.js                    # Simulator order normal, voucher, dan promo diskon
│   └── README.md                    # Panduan teknis penggunaan modul seeders
├── scripts/
│   ├── reset_and_seed_portfolio.js  # Script all-in-one reset & 2-year order history (2025 - 2026)
│   ├── simulate_daily_orders.js     # Simulator order harian dengan jam ramai realistis
│   ├── seed_live_data.js            # Seeder produk live dengan foto HD
│   └── seed_runner.js               # CLI runner mandiri
├── .env.example                     # Contoh konfigurasi environment variable
├── package.json                     # Definisi dependensi & NPM scripts
└── README.md                        # Dokumentasi utama
```

---

## 🚀 Panduan Penggunaan (Quick Start)

### 1. Install Dependencies
```bash
npm install
```

### 2. Konfigurasi Environment Variable
Salin `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Sesuaikan konfigurasi database dan API URL target Anda.

### 3. Daftar Perintah (NPM Scripts)

| Perintah | Deskripsi |
|---|---|
| `npm run seed:portfolio` | **All-in-One**: Reset database bersih, seed 14 menu HD & 5 kategori, serta generate riwayat transaksi 2 tahun penuh (2025 - 2026). |
| `npm run seed:products` | Mengisi 5 kategori resmi dan 14 menu kopi & makanan HD Unsplash. |
| `npm run trigger:normal` | Mensimulasikan order normal harian tanpa voucher/promo. |
| `npm run trigger:vouchers` | Mendaftarkan voucher aktif dan membuat pesanan dengan voucher. |
| `npm run trigger:promos` | Mendaftarkan promo marketing dan membuat transaksi diskon promo. |
| `npm run trigger:all` | Menjalankan seluruh proses modul `seeders/` secara berurutan. |
| `npm run simulate:daily` | Mensimulasikan order harian dengan kurva jam sibuk realistis. |

---

## ☕ Detail Menu HD yang Disediakan
1. **Espresso & Coffee**: *Iced Spanish Latte, Caramel Macchiato, Artisan Flat White, Vanilla Bean Cold Brew, Hazelnut Oat Cappuccino*
2. **Manual Brew**: *Japanese Drip Geisha, V60 Ethiopia Yirgacheffe*
3. **Non-Coffee & Latte**: *Kyoto Uji Matcha Latte, Belgian Dark Chocolate*
4. **Artisanal Pastries**: *French Butter Croissant, Pain au Chocolat, Almond Danish Cream Pastry*
5. **Signature Food**: *Avocado Toast & Poached Egg, Truffle Cream Spaghetti*

---

## ⚙️ Lisensi
MIT - [exa-dev-coffe](https://github.com/exa-dev-coffe)
