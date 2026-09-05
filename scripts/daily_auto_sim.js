/**
 * Daily Order Simulation Runner (CI/CD & Local)
 * Simulates realistic daily cafe orders for today (or past N days).
 * Outputs summary to console & GITHUB_STEP_SUMMARY (for GitHub Actions).
 */

try {
  require("dotenv").config();
} catch {
  // dotenv is optional when env vars are set directly
}
const fs = require("fs");
const { Client } = require("pg");

const DB_MASTER_URL = process.env.DB_MASTER_URL || "postgres://postgres:password@localhost:54321/master_data?sslmode=disable";
const DB_TX_URL = process.env.DB_TX_URL || "postgres://postgres:password@localhost:54321/transaction?sslmode=disable";

const rawArgs = process.argv.slice(2).reduce((acc, arg) => {
  const [key, val] = arg.replace(/^--/, "").split("=");
  acc[key] = val ? parseInt(val, 10) : true;
  return acc;
}, {});

const DAYS = parseInt(process.env.DAYS || rawArgs.days || 1, 10);
const ORDERS_PER_DAY = parseInt(process.env.ORDERS_PER_DAY || rawArgs.ordersPerDay || 12, 10);

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
  console.log(`☕ DAILY CAFE ORDERS SIMULATION`);
  console.log(`   Days: ${DAYS} | Target Volume/Day: ${ORDERS_PER_DAY}`);
  console.log("==================================================================");

  const clientMaster = new Client({ connectionString: DB_MASTER_URL });
  const clientTx = new Client({ connectionString: DB_TX_URL });

  await Promise.all([clientMaster.connect(), clientTx.connect()]);
  console.log("✅ Connected to PostgreSQL databases.");

  // Fetch active products
  const productsRes = await clientMaster.query(
    "SELECT id, name, price FROM tm_menus WHERE is_deleted = false AND is_available = true"
  );
  const products = productsRes.rows;
  console.log(`   └─ Found ${products.length} active products.`);

  // Fetch tables
  const tablesRes = await clientMaster.query(
    "SELECT id FROM tm_tables WHERE is_deleted = false"
  );
  const tables = tablesRes.rows.map(r => r.id);
  console.log(`   └─ Found ${tables.length} cafe tables.`);

  // Fetch active vouchers
  const vouchersRes = await clientTx.query(
    "SELECT id, code, discount_type, discount_value FROM tm_vouchers WHERE is_active = true AND (expired_at IS NULL OR expired_at > NOW())"
  );
  const vouchers = vouchersRes.rows;
  console.log(`   └─ Found ${vouchers.length} active promotional vouchers.`);

  if (products.length === 0) {
    throw new Error("No active products available. Run seed-products first!");
  }

  const today = new Date();
  let totalOrders = 0;
  let totalRevenue = 0;
  const daySummaries = [];

  for (let offset = DAYS - 1; offset >= 0; offset--) {
    const targetDate = new Date(today.getTime() - offset * 24 * 3600 * 1000);
    const dateStr = targetDate.toISOString().split("T")[0];
    const dayOfWeek = targetDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;

    const count = isWeekend
      ? Math.floor(ORDERS_PER_DAY * (1.1 + Math.random() * 0.4))
      : Math.floor(ORDERS_PER_DAY * (0.8 + Math.random() * 0.4));

    let dailyRevenue = 0;
    let dailyOrders = 0;

    for (let i = 0; i < count; i++) {
      const cust = CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)];
      const hour = PEAK_HOURS[Math.floor(Math.random() * PEAK_HOURS.length)];
      const minute = Math.floor(Math.random() * 60);
      const second = Math.floor(Math.random() * 60);

      const orderTimestamp = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth(),
        targetDate.getDate(),
        hour,
        minute,
        second
      );

      const isTakeaway = Math.random() > 0.65;
      const orderType = isTakeaway ? "TAKEAWAY" : "DINE_IN";
      const tableId = isTakeaway || tables.length === 0 ? null : tables[Math.floor(Math.random() * tables.length)];
      const paymentMethod = PAYMENT_METHODS[Math.floor(Math.random() * PAYMENT_METHODS.length)];

      const itemCount = Math.floor(Math.random() * 3) + 1;
      let orderSubtotal = 0;
      const orderItems = [];

      for (let k = 0; k < itemCount; k++) {
        const prod = products[Math.floor(Math.random() * products.length)];
        const qty = Math.floor(Math.random() * 2) + 1;
        const lineTotal = Number(prod.price) * qty;
        const notes = Math.random() > 0.7 ? NOTES[Math.floor(Math.random() * NOTES.length)] : "";
        const rating = Math.random() > 0.2 ? (Math.random() > 0.4 ? 5 : 4) : 3;

        orderItems.push({
          menuId: prod.id,
          qty,
          price: Number(prod.price),
          totalPrice: lineTotal,
          rating,
          notes
        });
        orderSubtotal += lineTotal;
      }

      // Optional voucher discount
      let voucherId = null;
      let discountAmount = 0;
      if (Math.random() < 0.25 && vouchers.length > 0 && orderSubtotal >= 30000) {
        const v = vouchers[Math.floor(Math.random() * vouchers.length)];
        voucherId = v.id;
        if (v.discount_type === "PERCENTAGE") {
          discountAmount = Math.min(Math.round(orderSubtotal * (Number(v.discount_value) / 100)), 20000);
        } else {
          discountAmount = Number(v.discount_value);
        }
      }

      const finalTotal = Math.max(0, orderSubtotal - discountAmount);
      const cashAmount = paymentMethod === "CASH" ? Math.ceil(finalTotal / 50000) * 50000 : finalTotal;
      const cashChange = paymentMethod === "CASH" ? cashAmount - finalTotal : 0;

      const res = await clientTx.query(
        `INSERT INTO th_user_checkouts (
          user_id, order_status, total_price, table_id, order_for,
          created_at, created_by, updated_at, updated_by,
          voucher_id, discount_amount, order_type, payment_method,
          payment_status, cash_amount, cash_change, is_cashier
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
         RETURNING id`,
        [
          cust.id, 2, finalTotal, tableId, cust.name,
          orderTimestamp, cust.id, orderTimestamp, cust.id,
          voucherId, discountAmount, orderType, paymentMethod,
          "PAID", cashAmount, cashChange, true
        ]
      );
      const orderId = res.rows[0].id;

      for (const item of orderItems) {
        await clientTx.query(
          `INSERT INTO td_user_checkouts (
            ref_id, menu_id, qty, price, total_price, rating, notes,
            created_at, created_by, updated_at, updated_by
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            orderId, item.menuId, item.qty, item.price, item.totalPrice, item.rating, item.notes,
            orderTimestamp, cust.id, orderTimestamp, cust.id
          ]
        );
      }

      dailyOrders++;
      dailyRevenue += finalTotal;
      totalOrders++;
      totalRevenue += finalTotal;
    }

    daySummaries.push({ date: dateStr, orders: dailyOrders, revenue: dailyRevenue });
    console.log(`📅 ${dateStr} | Orders: ${dailyOrders} | Revenue: Rp ${dailyRevenue.toLocaleString("id-ID")}`);
  }

  await Promise.all([clientMaster.end(), clientTx.end()]);

  console.log("\n==================================================================");
  console.log(`🎉 Daily simulation completed!`);
  console.log(`   Total Orders: ${totalOrders}`);
  console.log(`   Total Revenue: Rp ${totalRevenue.toLocaleString("id-ID")}`);
  console.log("==================================================================");

  // Write GitHub Actions Step Summary if available
  if (process.env.GITHUB_STEP_SUMMARY) {
    let md = `## ☕ Daily Coffe Orders Simulation Report\n\n`;
    md += `| Date | Orders Generated | Revenue |\n`;
    md += `|---|---|---|\n`;
    for (const s of daySummaries) {
      md += `| **${s.date}** | ${s.orders} orders | Rp ${s.revenue.toLocaleString("id-ID")} |\n`;
    }
    md += `\n**Total:** ${totalOrders} orders | **Rp ${totalRevenue.toLocaleString("id-ID")}**\n`;
    md += `\n*Automated simulation keeping [coffe.eka-dev.cloud](https://coffe.eka-dev.cloud) live & fresh.* 🚀\n`;
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
  }
}

main().catch(err => {
  console.error("❌ Fatal Error:", err);
  process.exit(1);
});
