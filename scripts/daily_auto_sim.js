/**
 * Daily Order Simulation Runner (CI/CD & Local)
 * Primary mode: Public REST API (https://api-coffe.eka-dev.cloud)
 * Fallback mode: Direct PostgreSQL
 */

try {
  require("dotenv").config();
} catch {
  // dotenv is optional
}
const fs = require("fs");
const crypto = require("crypto");

const API_URL = (process.env.API_URL || "https://api-coffe.eka-dev.cloud").replace(/\/+$/, "");
const JWT_SECRET =
  process.env.SECRET_JWT ||
  "8hZjEKzG36uOXxJjl8bRtB4KmaZuZ1eJ7DmcKQXMU533wub1Kjq9SXEru3cNnU0ATZsm/m2V0Vcw0zC8r2wegA==";

const rawArgs = process.argv.slice(2).reduce((acc, arg) => {
  const [key, val] = arg.replace(/^--/, "").split("=");
  acc[key] = val ? parseInt(val, 10) : true;
  return acc;
}, {});

const DAYS = parseInt(process.env.DAYS || rawArgs.days || 1, 10);
const ORDERS_PER_DAY = parseInt(process.env.ORDERS_PER_DAY || rawArgs.ordersPerDay || 12, 10);

const CUSTOMERS = [
  "Budi Santoso",
  "Siti Rahma",
  "Reza Pratama",
  "Diana Putri",
  "Andi Setiawan",
  "Maya Indah",
  "Fajar Nugraha",
  "Rina Anggraini",
  "Dimas Saputra",
  "Nadia Safitri"
];

const PAYMENT_METHODS = ["CASH", "QRIS", "WALLET", "CASH", "QRIS"];

function generateAdminJwtToken() {
  const header = Buffer.from(JSON.stringify({ alg: "HS512", typ: "JWT" })).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      sub: "admin@gmail.com",
      iat: now,
      exp: now + 3600 * 24,
      FullName: "Master Admin",
      Email: "admin@gmail.com",
      UserId: 1,
      Type: "access",
      Role: "admin",
      RoleId: 1,
      Permissions: {
        catalog: { view: true, create: true, edit: true, delete: true },
        pos: { view: true, create: true, edit: true, delete: true },
        order: { view: true, create: true, edit: true, delete: true },
        table: { view: true, create: true, edit: true, delete: true },
        voucher: { view: true, create: true, edit: true, delete: true }
      }
    })
  ).toString("base64url");

  const signature = crypto.createHmac("sha512", JWT_SECRET).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
}

async function apiRequest(path, options = {}, token) {
  const url = `${API_URL}${path}`;
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { message: text };
  }
  if (!res.ok) {
    throw new Error(`[HTTP ${res.status}] ${path}: ${json.message || text}`);
  }
  return json;
}

async function main() {
  console.log("==================================================================");
  console.log(`☕ DAILY CAFE ORDERS SIMULATION`);
  console.log(`   Target Endpoint: ${API_URL}`);
  console.log(`   Days: ${DAYS} | Target Volume/Day: ${ORDERS_PER_DAY}`);
  console.log("==================================================================");

  const adminToken = generateAdminJwtToken();

  // 1. Fetch available menus
  console.log("🔍 Fetching active menus from API...");
  const menuRes = await apiRequest("/api/1.0/menus?size=50", {}, adminToken);
  const products = (menuRes.data?.data || []).filter(m => m.isAvailable !== false);
  console.log(`   └─ Found ${products.length} active menu items.`);

  if (products.length === 0) {
    throw new Error("No active menu products found on server!");
  }

  // 2. Fetch tables
  let tables = [1, 2, 3, 4, 5];
  try {
    const tableRes = await apiRequest("/api/1.0/tables", {}, adminToken);
    const tblData = tableRes.data || [];
    if (tblData.length > 0) {
      tables = tblData.map(t => t.id);
    }
  } catch {
    // fallback default tables
  }
  console.log(`   └─ Found ${tables.length} cafe tables.`);

  // 3. Fetch vouchers
  let vouchers = [];
  try {
    const vRes = await apiRequest("/api/1.0/vouchers", {}, adminToken);
    vouchers = (vRes.data?.data || []).filter(v => v.isActive);
  } catch {
    // optional
  }
  console.log(`   └─ Found ${vouchers.length} active vouchers.`);

  // 4. Generate Orders
  console.log(`\n🛍️ Placing simulated orders...`);
  let totalOrders = 0;
  let totalRevenue = 0;

  for (let d = 0; d < DAYS; d++) {
    const dailyTarget = Math.max(3, Math.floor(ORDERS_PER_DAY * (0.8 + Math.random() * 0.4)));
    let dailyOrders = 0;
    let dailyRevenue = 0;

    for (let i = 0; i < dailyTarget; i++) {
      const custName = CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)];
      const isTakeaway = Math.random() > 0.6;
      const orderType = isTakeaway ? "TAKEAWAY" : "DINE_IN";
      const tableId = orderType === "DINE_IN" ? (tables[Math.floor(Math.random() * tables.length)] || 1) : null;

      const itemCount = Math.floor(Math.random() * 3) + 1;
      let orderSubtotal = 0;
      const orderDatas = [];

      for (let k = 0; k < itemCount; k++) {
        const prod = products[Math.floor(Math.random() * products.length)];
        const qty = Math.floor(Math.random() * 2) + 1;
        const lineTotal = prod.price * qty;

        orderDatas.push({
          menuId: prod.id,
          qty,
          price: prod.price,
          total: lineTotal,
          notes: Math.random() > 0.6 ? "Less sugar" : ""
        });
        orderSubtotal += lineTotal;
      }

      // Cash payment order without voucher constraint to ensure 100% success rate
      const cashAmount = Math.ceil(orderSubtotal / 50000) * 50000 + (Math.random() > 0.5 ? 50000 : 0);
      const cashChange = Math.max(0, cashAmount - orderSubtotal);

      const payload = {
        orderType,
        orderFor: custName,
        paymentMethod: "CASH",
        cashAmount,
        cashChange,
        datas: orderDatas,
        total: orderSubtotal
      };

      if (tableId) {
        payload.tableId = tableId;
      }

      try {
        const checkoutRes = await apiRequest("/api/1.0/pos/checkout", {
          method: "POST",
          body: JSON.stringify(payload)
        }, adminToken);

        const txId = checkoutRes.data?.id;
        dailyOrders++;
        dailyRevenue += orderSubtotal;
        totalOrders++;
        totalRevenue += orderSubtotal;
        process.stdout.write(`.`);
      } catch (err) {
        console.error(`\n⚠️ Order failed: ${err.message}`);
      }
    }
    console.log(`\n  └─ Generated ${dailyOrders} orders | Revenue: Rp ${dailyRevenue.toLocaleString("id-ID")}`);
  }

  console.log("\n==================================================================");
  console.log(`🎉 Daily simulation completed successfully via REST API!`);
  console.log(`   Total Orders Placed: ${totalOrders}`);
  console.log(`   Total Revenue: Rp ${totalRevenue.toLocaleString("id-ID")}`);
  console.log("==================================================================");

  // Output to GitHub Step Summary
  if (process.env.GITHUB_STEP_SUMMARY) {
    const todayStr = new Date().toISOString().split("T")[0];
    let md = `## ☕ Daily Coffe Orders Simulation Report\n\n`;
    md += `| Attribute | Value |\n`;
    md += `|---|---|\n`;
    md += `| **Date** | ${todayStr} |\n`;
    md += `| **Orders Placed** | ${totalOrders} orders |\n`;
    md += `| **Total Revenue** | Rp ${totalRevenue.toLocaleString("id-ID")} |\n`;
    md += `| **Target Endpoint** | [${API_URL}](${API_URL}) |\n`;
    md += `\n*Automated simulation keeping [coffe.eka-dev.cloud](https://coffe.eka-dev.cloud) live & fresh.* 🚀\n`;
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
  }
}

main().catch(err => {
  console.error("❌ Fatal Error:", err);
  process.exit(1);
});
