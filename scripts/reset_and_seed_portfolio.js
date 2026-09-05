/**
 * Reset & Seed Portfolio Data (Master Data + 2 Years of Historical Orders: 2025 - 2026)
 * Configurable via environment variables (see .env.example)
 */

require("dotenv").config();
const { Client } = require("pg");

const DB_CONFIG = {
  masterData: process.env.DB_MASTER_URL || "postgres://postgres:password@localhost:5432/master_data?sslmode=disable",
  transaction: process.env.DB_TX_URL || "postgres://postgres:password@localhost:5432/transaction?sslmode=disable",
  wallet: process.env.DB_WALLET_URL || "postgres://postgres:password@localhost:5432/wallet?sslmode=disable",
};

const CATEGORIES = [
  { name: "Espresso & Coffee", icon: "HiOutlineSparkles" },
  { name: "Manual Brew", icon: "HiOutlineBeaker" },
  { name: "Non-Coffee & Latte", icon: "HiOutlineHeart" },
  { name: "Artisanal Pastries", icon: "HiOutlineCake" },
  { name: "Signature Food", icon: "HiOutlineSun" }
];

const PRODUCTS = [
  { name: "Iced Spanish Latte", desc: "Rich espresso combined with sweet condensed milk, fresh steamed milk, and a dusting of cinnamon.", price: 28000, cat: "Espresso & Coffee", img: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=800&auto=format&fit=crop&q=80" },
  { name: "Caramel Macchiato", desc: "Silky steamed milk with vanilla syrup, layered with bold espresso and warm artisan caramel drizzle.", price: 32000, cat: "Espresso & Coffee", img: "https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=800&auto=format&fit=crop&q=80" },
  { name: "Artisan Flat White", desc: "Expertly micro-foamed whole milk poured over a double shot of sweet ristretto espresso.", price: 26000, cat: "Espresso & Coffee", img: "https://images.unsplash.com/photo-1577968897966-3d4325b36b61?w=800&auto=format&fit=crop&q=80" },
  { name: "Vanilla Bean Cold Brew", desc: "Cold brewed for 18 hours, infused with Madagascar vanilla bean syrup and a touch of light cream.", price: 30000, cat: "Espresso & Coffee", img: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=800&auto=format&fit=crop&q=80" },
  { name: "Hazelnut Oat Cappuccino", desc: "Double shot espresso paired with creamy Barista-edition oat milk and roasted hazelnut essence.", price: 34000, cat: "Espresso & Coffee", img: "https://images.unsplash.com/photo-1534778101976-62847782c213?w=800&auto=format&fit=crop&q=80" },
  { name: "Japanese Drip Geisha", desc: "Single-origin Panama Geisha roasted lightly, brewed meticulously with floral, jasmine, and peach notes.", price: 45000, cat: "Manual Brew", img: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80" },
  { name: "V60 Ethiopia Yirgacheffe", desc: "Vibrant and clean pour-over with notes of bergamot, lemon zest, and sweet wild blueberry finish.", price: 35000, cat: "Manual Brew", img: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&auto=format&fit=crop&q=80" },
  { name: "Kyoto Uji Matcha Latte", desc: "Authentic ceremonial grade Uji matcha whisked with oat milk and lightly sweetened with cane syrup.", price: 32000, cat: "Non-Coffee & Latte", img: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=800&auto=format&fit=crop&q=80" },
  { name: "Belgian Dark Chocolate", desc: "70% Belgian dark chocolate callets melted into velvety micro-foamed milk with cacao nibs.", price: 30000, cat: "Non-Coffee & Latte", img: "https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=800&auto=format&fit=crop&q=80" },
  { name: "French Butter Croissant", desc: "Multi-layered flaky French butter croissant baked fresh each morning to golden perfection.", price: 22000, cat: "Artisanal Pastries", img: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&auto=format&fit=crop&q=80" },
  { name: "Pain au Chocolat", desc: "Classic Viennoiserie pastry folded with two bars of bittersweet dark chocolate.", price: 25000, cat: "Artisanal Pastries", img: "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=800&auto=format&fit=crop&q=80" },
  { name: "Almond Danish Cream Pastry", desc: "Flaky puff pastry filled with vanilla custard, topped with toasted sliced almonds and icing sugar.", price: 27000, cat: "Artisanal Pastries", img: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80" },
  { name: "Avocado Toast & Poached Egg", desc: "Creamy smashed Hass avocado on artisan sourdough toast, topped with runny poached egg and chili flakes.", price: 42000, cat: "Signature Food", img: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&auto=format&fit=crop&q=80" },
  { name: "Truffle Cream Spaghetti", desc: "Al dente artisanal spaghetti tossed in garlic parmesan cream sauce infused with Italian black truffle.", price: 55000, cat: "Signature Food", img: "https://images.unsplash.com/photo-1621996346565-e3def6164286?w=800&auto=format&fit=crop&q=80" }
];

const TABLES = ["Table 1", "Table 2", "Table 3", "Table 4", "Table 5", "VIP Lounge 1", "Outdoor Terrace 1"];

const VOUCHERS = [
  { code: "WELCOME10", discountType: "PERCENTAGE", discountValue: 10, maxDiscount: 15000, minPurchase: 25000, quota: 500, isActive: true, isPublic: true },
  { code: "HEMAT5K", discountType: "FIXED", discountValue: 5000, maxDiscount: 5000, minPurchase: 30000, quota: 500, isActive: true, isPublic: true },
  { code: "KOPIASIK", discountType: "PERCENTAGE", discountValue: 15, maxDiscount: 20000, minPurchase: 35000, quota: 500, isActive: true, isPublic: true }
];

const CUSTOMERS = [
  { id: 101, name: "Budi Santoso", email: "budi@coffe.com" },
  { id: 102, name: "Siti Rahma", email: "siti@coffe.com" },
  { id: 103, name: "Reza Pratama", email: "reza@coffe.com" },
  { id: 104, name: "Diana Putri", email: "diana@coffe.com" },
  { id: 105, name: "Andi Setiawan", email: "andi@coffe.com" },
  { id: 106, name: "Maya Indah", email: "maya@coffe.com" },
  { id: 107, name: "Fajar Nugraha", email: "fajar@coffe.com" },
  { id: 108, name: "Rina Anggraini", email: "rina@coffe.com" },
  { id: 109, name: "Dimas Saputra", email: "dimas@coffe.com" },
  { id: 110, name: "Nadia Safitri", email: "nadia@coffe.com" }
];

const NOTES = [
  "Less ice, extra oat milk please",
  "Hot with double shot ristretto",
  "Takeaway box for pastries",
  "No sugar added",
  "Dine in, warm up the croissant",
  "Extra caramel drizzle please",
  ""
];

const PAYMENT_METHODS = ["CASH", "QRIS", "WALLET", "CASH", "QRIS"];
const PEAK_HOURS = [8, 8, 9, 9, 10, 11, 12, 12, 13, 13, 14, 15, 16, 17, 17, 18, 18, 19, 19, 20, 21];

async function main() {
  console.log("==================================================================");
  console.log("☕ RESET & SEEDING PORTFOLIO DATABASE (2025 - 2026)");
  console.log("==================================================================");

  const clientMaster = new Client({ connectionString: DB_CONFIG.masterData });
  const clientTx = new Client({ connectionString: DB_CONFIG.transaction });
  const clientWallet = new Client({ connectionString: DB_CONFIG.wallet });

  await Promise.all([
    clientMaster.connect(),
    clientTx.connect(),
    clientWallet.connect()
  ]);
  console.log("✅ Connected to all 3 PostgreSQL databases on remote server!");

  // -------------------------------------------------------------
  // STEP 1: CLEANUP / TRUNCATE OLD DUMMY DATA
  // -------------------------------------------------------------
  console.log("\n🧹 1. Cleaning up old dummy menus, categories & orders...");
  await clientMaster.query("TRUNCATE tm_menus, tm_categories, tm_tables, tm_promotions RESTART IDENTITY CASCADE;");
  await clientTx.query("TRUNCATE th_user_checkouts, td_user_checkouts, tr_voucher_usages, tr_promotion_usages, tm_vouchers RESTART IDENTITY CASCADE;");
  await clientWallet.query("TRUNCATE td_balance_histories RESTART IDENTITY CASCADE;");
  console.log("   └─ Wiped old dummy records cleanly. Sequences reset to 1.");

  // -------------------------------------------------------------
  // STEP 2: SEED CLEAN CATEGORIES & PRODUCTS
  // -------------------------------------------------------------
  console.log("\n📁 2. Seeding 5 official categories...");
  const categoryMap = {};
  for (const cat of CATEGORIES) {
    const res = await clientMaster.query(
      `INSERT INTO tm_categories (name, icon, created_at, created_by, updated_at, updated_by)
       VALUES ($1, $2, NOW(), 1, NOW(), 1) RETURNING id`,
      [cat.name, cat.icon]
    );
    const id = res.rows[0].id;
    categoryMap[cat.name] = id;
    console.log(`   └─ Category [ID: ${id}] ${cat.name}`);
  }

  console.log("\n☕ 3. Seeding 14 premium artisanal coffee & food menus (HD Unsplash)...");
  const seededProducts = [];
  for (const p of PRODUCTS) {
    const catId = categoryMap[p.cat] || null;
    const rating = (4.5 + Math.random() * 0.5).toFixed(1);
    const reviewCount = Math.floor(Math.random() * 50) + 15;
    const res = await clientMaster.query(
      `INSERT INTO tm_menus (name, description, price, photo, category_id, is_available, is_deleted, rating, review_count, created_at, created_by, updated_at, updated_by)
       VALUES ($1, $2, $3, $4, $5, TRUE, FALSE, $6, $7, NOW(), 1, NOW(), 1) RETURNING id`,
      [p.name, p.desc, p.price, p.img, catId, rating, reviewCount]
    );
    const id = res.rows[0].id;
    seededProducts.push({ id, name: p.name, price: p.price, catId });
    console.log(`   └─ Menu [ID: ${id}] ${p.name} - Rp ${p.price.toLocaleString("id-ID")}`);
  }

  console.log("\n🪑 4. Seeding cafe tables...");
  const tableIds = [];
  for (const name of TABLES) {
    const res = await clientMaster.query(
      `INSERT INTO tm_tables (name, is_deleted, created_at, created_by, updated_at, updated_by)
       VALUES ($1, FALSE, NOW(), 1, NOW(), 1) RETURNING id`,
      [name]
    );
    const id = res.rows[0].id;
    tableIds.push(id);
  }
  console.log(`   └─ Seeded ${tableIds.length} tables.`);

  console.log("\n🎟️ 5. Seeding active promotional vouchers...");
  const voucherIds = [];
  for (const v of VOUCHERS) {
    const res = await clientTx.query(
      `INSERT INTO tm_vouchers (code, discount_type, discount_value, max_discount, min_purchase, quota, is_active, is_public, expired_at, created_at, created_by, updated_at, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW() + INTERVAL '1 year', NOW(), 1, NOW(), 1) RETURNING id`,
      [v.code, v.discountType, v.discountValue, v.maxDiscount, v.minPurchase, v.quota, v.isActive, v.isPublic]
    );
    voucherIds.push({ id: res.rows[0].id, code: v.code, discountType: v.discountType, discountValue: v.discountValue });
    console.log(`   └─ Voucher: ${v.code} (${v.discountType === "PERCENTAGE" ? v.discountValue + "%" : "Rp " + v.discountValue.toLocaleString("id-ID")})`);
  }

  console.log("\n💳 6. Ensuring test customer wallets have balance...");
  const hashedPin = "$2a$10$E2b70f.qO1wGgRk.m.H2v.B5YxT6Wv8D1M9P.bL8P3kL3N1.oQ5S";
  for (const c of CUSTOMERS) {
    const existing = await clientWallet.query("SELECT id FROM tm_balances WHERE user_id = $1", [c.id]);
    if (existing.rows.length > 0) {
      await clientWallet.query("UPDATE tm_balances SET balance = 25000000, is_active = TRUE WHERE user_id = $1", [c.id]);
    } else {
      const walletNum = `883900000${String(c.id).padStart(3, "0")}`;
      await clientWallet.query(
        `INSERT INTO tm_balances (user_id, balance, is_active, pin, wallet_number, created_at, updated_at)
         VALUES ($1, 25000000, TRUE, $2, $3, NOW(), NOW())`,
        [c.id, hashedPin, walletNum]
      );
    }
  }
  console.log(`   └─ Wallet balances initialized for ${CUSTOMERS.length} demo customers.`);

  // -------------------------------------------------------------
  // STEP 3: SEED 2 YEARS OF ORDERS (2025 - 2026)
  // -------------------------------------------------------------
  console.log("\n📊 7. Generating 2 full years of realistic order history (Jan 2025 - Sep 2026)...");

  const startDate = new Date(2025, 0, 1, 8, 0, 0); // 2025-01-01
  const endDate = new Date(2026, 8, 5, 20, 0, 0);  // 2026-09-05 (Today)
  const totalDays = Math.round((endDate.getTime() - startDate.getTime()) / (24 * 3600 * 1000));

  console.log(`   └─ Spanning ${totalDays} days across 2025 & 2026...`);

  let totalOrdersGenerated = 0;
  let totalRevenueGenerated = 0;

  let currentDay = new Date(startDate);
  const BATCH_SIZE = 100;
  let thBatch = [];

  while (currentDay <= endDate) {
    const dayOfWeek = currentDay.getDay(); // 0 = Sun, 5 = Fri, 6 = Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;

    // More orders on weekends (5 - 8 orders) vs weekdays (3 - 5 orders)
    const dailyOrderCount = isWeekend
      ? Math.floor(Math.random() * 4) + 5
      : Math.floor(Math.random() * 3) + 3;

    for (let o = 0; o < dailyOrderCount; o++) {
      const cust = CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)];
      const hour = PEAK_HOURS[Math.floor(Math.random() * PEAK_HOURS.length)];
      const minute = Math.floor(Math.random() * 60);
      const second = Math.floor(Math.random() * 60);

      const orderTimestamp = new Date(
        currentDay.getFullYear(),
        currentDay.getMonth(),
        currentDay.getDate(),
        hour,
        minute,
        second
      );

      const isTakeaway = Math.random() > 0.65;
      const orderType = isTakeaway ? "TAKEAWAY" : "DINE_IN";
      const tableId = isTakeaway ? null : tableIds[Math.floor(Math.random() * tableIds.length)];
      const paymentMethod = PAYMENT_METHODS[Math.floor(Math.random() * PAYMENT_METHODS.length)];

      // Pick 1 - 3 menu items per order
      const itemCount = Math.floor(Math.random() * 3) + 1;
      const selectedItems = [];
      let orderSubtotal = 0;

      for (let k = 0; k < itemCount; k++) {
        const prod = seededProducts[Math.floor(Math.random() * seededProducts.length)];
        const qty = Math.floor(Math.random() * 2) + 1;
        const lineTotal = prod.price * qty;
        const notes = Math.random() > 0.7 ? NOTES[Math.floor(Math.random() * NOTES.length)] : "";
        const rating = Math.random() > 0.25 ? (Math.random() > 0.4 ? 5 : 4) : 3;

        selectedItems.push({
          menuId: prod.id,
          qty,
          price: prod.price,
          totalPrice: lineTotal,
          rating,
          notes
        });
        orderSubtotal += lineTotal;
      }

      // Optional voucher application (~20% chance)
      let voucherId = null;
      let discountAmount = 0;
      if (Math.random() < 0.2 && voucherIds.length > 0 && orderSubtotal >= 30000) {
        const v = voucherIds[Math.floor(Math.random() * voucherIds.length)];
        voucherId = v.id;
        if (v.discountType === "PERCENTAGE") {
          discountAmount = Math.min(Math.round(orderSubtotal * (v.discountValue / 100)), 20000);
        } else {
          discountAmount = v.discountValue;
        }
      }

      const finalTotal = Math.max(0, orderSubtotal - discountAmount);
      const cashAmount = paymentMethod === "CASH" ? Math.ceil(finalTotal / 50000) * 50000 : finalTotal;
      const cashChange = paymentMethod === "CASH" ? cashAmount - finalTotal : 0;

      thBatch.push({
        userId: cust.id,
        orderStatus: 2, // Completed
        totalPrice: finalTotal,
        tableId,
        orderFor: cust.name,
        createdAt: orderTimestamp,
        createdBy: cust.id,
        updatedAt: orderTimestamp,
        updatedBy: cust.id,
        voucherId,
        discountAmount,
        orderType,
        paymentMethod,
        paymentStatus: "PAID",
        cashAmount,
        cashChange,
        isCashier: true,
        items: selectedItems
      });

      totalOrdersGenerated++;
      totalRevenueGenerated += finalTotal;

      // Flush batch when it hits limit
      if (thBatch.length >= BATCH_SIZE) {
        await flushBatch(clientTx, thBatch);
        thBatch = [];
      }
    }

    currentDay.setDate(currentDay.getDate() + 1);
  }

  // Flush any remaining
  if (thBatch.length > 0) {
    await flushBatch(clientTx, thBatch);
  }

  console.log("\n==================================================================");
  console.log(`🎉 SUCCESS! DATA RESET & 2-YEAR SEEDING COMPLETED!`);
  console.log(`   Total Orders Generated: ${totalOrdersGenerated.toLocaleString("id-ID")}`);
  console.log(`   Total Revenue Generated: Rp ${totalRevenueGenerated.toLocaleString("id-ID")}`);
  console.log(`   Time Range: January 1, 2025 to September 5, 2026`);
  console.log(`   Products: 14 HD Artisan Menus & 5 Categories Ready`);
  console.log("==================================================================");

  await Promise.all([
    clientMaster.end(),
    clientTx.end(),
    clientWallet.end()
  ]);
}

async function flushBatch(clientTx, thBatch) {
  for (const o of thBatch) {
    const res = await clientTx.query(
      `INSERT INTO th_user_checkouts (
        user_id, order_status, total_price, table_id, order_for,
        created_at, created_by, updated_at, updated_by,
        voucher_id, discount_amount, order_type, payment_method,
        payment_status, cash_amount, cash_change, is_cashier
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       RETURNING id`,
      [
        o.userId, o.orderStatus, o.totalPrice, o.tableId, o.orderFor,
        o.createdAt, o.createdBy, o.updatedAt, o.updatedBy,
        o.voucherId, o.discountAmount, o.orderType, o.paymentMethod,
        o.paymentStatus, o.cashAmount, o.cashChange, o.isCashier
      ]
    );
    const orderId = res.rows[0].id;

    for (const it of o.items) {
      await clientTx.query(
        `INSERT INTO td_user_checkouts (
          ref_id, menu_id, qty, price, total_price, rating, notes,
          created_at, created_by, updated_at, updated_by
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          orderId, it.menuId, it.qty, it.price, it.totalPrice, it.rating, it.notes,
          o.createdAt, o.createdBy, o.updatedAt, o.updatedBy
        ]
      );
    }
  }
}

main().catch(err => {
  console.error("❌ Fatal Error:", err);
  process.exit(1);
});
