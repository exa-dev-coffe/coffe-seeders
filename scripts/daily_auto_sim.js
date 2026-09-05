/**
 * Daily Order Simulation Runner (CI/CD & Local)
 * Simulates dynamic, realistic cafe traffic:
 * - Slow / Rainy Days (4 - 8 orders)
 * - Normal Days (10 - 17 orders)
 * - Weekend Rush & Payday Surges (20 - 35+ orders)
 * - Realistic group sizes & order notes
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
const FORCED_ORDERS = rawArgs.ordersPerDay ? parseInt(rawArgs.ordersPerDay, 10) : null;

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
  "Nadia Safitri",
  "Bayu Wicaksono",
  "Citra Lestari",
  "Hendra Gunawan",
  "Dewi Kartika",
  "Yoga Pratama"
];

const NOTES = [
  "Less ice, extra oat milk please",
  "Hot with double shot ristretto",
  "Takeaway box for pastries",
  "No sugar added",
  "Dine in, warm up the croissant",
  "Extra caramel drizzle please",
  "Split bags please",
  "Hot, extra creamy foam",
  ""
];

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

/**
 * Calculates realistic fluctuating order volume per day:
 * Sometimes quiet (4-8 orders), sometimes normal (10-17), sometimes surge/weekend rush (20-35).
 */
function getDailyTraffic(targetDate) {
  if (FORCED_ORDERS) {
    return { dayType: "Custom Volume", target: FORCED_ORDERS };
  }

  const dayOfWeek = targetDate.getDay(); // 0 = Sun, 5 = Fri, 6 = Sat
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;
  const roll = Math.random();

  let dayType = "Normal Day";
  let target = 12;

  if (isWeekend) {
    if (roll < 0.25) {
      dayType = "Weekend Standard ☕";
      target = Math.floor(Math.random() * 6) + 14; // 14 - 19
    } else if (roll < 0.80) {
      dayType = "Weekend Busy Surge 🔥";
      target = Math.floor(Math.random() * 8) + 20; // 20 - 27
    } else {
      dayType = "Weekend Full House 🚀";
      target = Math.floor(Math.random() * 8) + 28; // 28 - 35 (Banyak!)
    }
  } else {
    // Weekdays
    if (roll < 0.35) {
      dayType = "Slow / Rainy Day 🌧️";
      target = Math.floor(Math.random() * 5) + 4; // 4 - 8 (Dikit!)
    } else if (roll < 0.85) {
      dayType = "Weekday Normal 🏢";
      target = Math.floor(Math.random() * 8) + 10; // 10 - 17
    } else {
      dayType = "Payday Rush / Promo Day 🎉";
      target = Math.floor(Math.random() * 8) + 18; // 18 - 25 (Banyak!)
    }
  }

  return { dayType, target };
}

async function main() {
  console.log("==================================================================");
  console.log(`☕ DYNAMIC DAILY CAFE ORDERS SIMULATION`);
  console.log(`   Target Endpoint: ${API_URL}`);
  console.log(`   Days to Simulate: ${DAYS}`);
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

  // 3. Generate Orders
  console.log(`\n🛍️ Placing simulated orders...`);
  let totalOrders = 0;
  let totalRevenue = 0;
  const daySummaries = [];
  const now = new Date();

  for (let d = DAYS - 1; d >= 0; d--) {
    const targetDate = new Date(now.getTime() - d * 24 * 3600 * 1000);
    const dateStr = targetDate.toISOString().split("T")[0];
    const { dayType, target } = getDailyTraffic(targetDate);

    console.log(`\n📅 Date: ${dateStr} | Pattern: [${dayType}] -> Generating ~${target} orders:`);

    let dailyOrders = 0;
    let dailyRevenue = 0;

    for (let i = 0; i < target; i++) {
      const custName = CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)];
      const isTakeaway = Math.random() > 0.55;
      const orderType = isTakeaway ? "TAKEAWAY" : "DINE_IN";
      const tableId = orderType === "DINE_IN" ? (tables[Math.floor(Math.random() * tables.length)] || 1) : null;

      // Realistic group order distribution:
      // 70% solo / pairs (1-2 items), 20% small group (3-4 items), 10% big office gathering (5-6 items)
      const groupRoll = Math.random();
      const itemCount = groupRoll < 0.70
        ? Math.floor(Math.random() * 2) + 1
        : groupRoll < 0.90
        ? Math.floor(Math.random() * 2) + 3
        : Math.floor(Math.random() * 2) + 5;

      let orderSubtotal = 0;
      const orderDatas = [];

      for (let k = 0; k < itemCount; k++) {
        const prod = products[Math.floor(Math.random() * products.length)];
        const qty = Math.floor(Math.random() * 2) + 1;
        const lineTotal = prod.price * qty;
        const note = Math.random() > 0.65 ? NOTES[Math.floor(Math.random() * NOTES.length)] : "";

        orderDatas.push({
          menuId: prod.id,
          qty,
          price: prod.price,
          total: lineTotal,
          notes: note
        });
        orderSubtotal += lineTotal;
      }

      const cashAmount = Math.ceil(orderSubtotal / 50000) * 50000 + (Math.random() > 0.4 ? 50000 : 0);
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
        await apiRequest("/api/1.0/pos/checkout", {
          method: "POST",
          body: JSON.stringify(payload)
        }, adminToken);

        dailyOrders++;
        dailyRevenue += orderSubtotal;
        totalOrders++;
        totalRevenue += orderSubtotal;
        process.stdout.write(`.`);
      } catch (err) {
        console.error(`\n⚠️ Order failed: ${err.message}`);
      }
    }

    daySummaries.push({ date: dateStr, dayType, orders: dailyOrders, revenue: dailyRevenue });
    console.log(`\n  └─ Summary: ${dailyOrders} orders placed | Revenue: Rp ${dailyRevenue.toLocaleString("id-ID")}`);
  }

  console.log("\n==================================================================");
  console.log(`🎉 Dynamic simulation finished successfully!`);
  console.log(`   Total Orders Placed: ${totalOrders}`);
  console.log(`   Total Revenue Generated: Rp ${totalRevenue.toLocaleString("id-ID")}`);
  console.log("==================================================================");

  // Output to GitHub Step Summary
  if (process.env.GITHUB_STEP_SUMMARY) {
    let md = `## ☕ Daily Coffe Orders Simulation Report\n\n`;
    md += `| Date | Traffic Condition | Orders Generated | Daily Revenue |\n`;
    md += `|---|---|---|---|\n`;
    for (const s of daySummaries) {
      md += `| **${s.date}** | ${s.dayType} | **${s.orders}** orders | Rp ${s.revenue.toLocaleString("id-ID")} |\n`;
    }
    md += `\n**Grand Total:** ${totalOrders} orders | **Rp ${totalRevenue.toLocaleString("id-ID")}**\n`;
    md += `\n*Automated dynamic simulation keeping [coffe.eka-dev.cloud](https://coffe.eka-dev.cloud) realistic & lively.* 🚀\n`;
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
  }
}

main().catch(err => {
  console.error("❌ Fatal Error:", err);
  process.exit(1);
});
