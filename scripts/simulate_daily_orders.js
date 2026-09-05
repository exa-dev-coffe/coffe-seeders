/**
 * Daily Transaction & Analytics Simulator for Coffe Shop Web App
 * 
 * Usage:
 *   node scripts/simulate_daily_orders.js [--days=7] [--ordersPerDay=15]
 *   npm run simulate:daily
 * 
 * Description:
 *   Simulates multi-day cafe transactions with realistic order times, customer profiles,
 *   menu item selections, table assignments, and peak-hour distribution.
 *   Does NOT recreate products if they already exist in the database!
 */

const crypto = require("crypto");

let Client = null;
try {
  Client = require("pg").Client;
} catch {
  // pg is optional
}

const BASE_URL = process.env.API_URL || "http://localhost:8000";
const JWT_SECRET =
  process.env.SECRET_JWT ||
  process.env.APP_JWT_SECRET ||
  "8hZjEKzG36uOXxJjl8bRtB4KmaZuZ1eJ7DmcKQXMU533wub1Kjq9SXEru3cNnU0ATZsm/m2V0Vcw0zC8r2wegA==";

const PORTS = {
  auth: process.env.AUTH_URL || `${BASE_URL}`,
  masterData: process.env.MASTER_DATA_URL || `${BASE_URL}`,
  transaction: process.env.TRANSACTION_URL || `${BASE_URL}`,
};

// Parse CLI arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, val] = arg.replace(/^--/, "").split("=");
  acc[key] = val ? parseInt(val, 10) : true;
  return acc;
}, {});

const DAYS_TO_SIMULATE = args.days || 7;
const ORDERS_PER_DAY = args.ordersPerDay || 12;

function generateJwtToken(userId, email, fullName, role = "customer") {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS512", typ: "JWT" }),
  ).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      // Standard Claims
      sub: String(email),
      iat: now,
      exp: now + 30 * 24 * 3600,

      // Go Claims
      FullName: fullName,
      Email: email,
      UserId: userId,
      Type: "access",
      Role: role,

      // Java Claims
      fullName: fullName,
      email: email,
      userId: userId,
      type: "ACCESS",
      role: role,
    }),
  ).toString("base64url");

  const signature = crypto
    .createHmac("sha512", JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");

  return `${header}.${payload}.${signature}`;
}

async function request(baseUrl, path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  let targetUrl = `${baseUrl}${path}`;
  let res;

  try {
    res = await fetch(targetUrl, { ...options, headers });
  } catch (err) {
    if (baseUrl === BASE_URL && !process.env.API_URL) {
      let fallbackBase = "http://localhost:8080";
      if (
        path.includes("/categories") ||
        path.includes("/menus") ||
        path.includes("/promotions") ||
        path.includes("/tables")
      ) {
        fallbackBase = "http://localhost:8081";
      } else if (
        path.includes("/vouchers") ||
        path.includes("/checkout") ||
        path.includes("/transactions")
      ) {
        fallbackBase = "http://localhost:8084";
      } else if (path.includes("/balance")) {
        fallbackBase = "http://localhost:8082";
      }
      targetUrl = `${fallbackBase}${path}`;
      res = await fetch(targetUrl, { ...options, headers });
    } else {
      throw err;
    }
  }

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { message: text };
  }
  if (!res.ok) {
    throw new Error(`[${res.status}] ${path}: ${json.message || text}`);
  }
  return json;
}

// Pool of realistic customer profiles
const CUSTOMER_POOL = [
  { id: 101, name: "Budi Santoso", email: "budi@coffe.com" },
  { id: 102, name: "Siti Rahma", email: "siti@coffe.com" },
  { id: 103, name: "Reza Pratama", email: "reza@coffe.com" },
  { id: 104, name: "Diana Putri", email: "diana@coffe.com" },
  { id: 105, name: "Andi Setiawan", email: "andi@coffe.com" },
  { id: 106, name: "Maya Indah", email: "maya@coffe.com" },
  { id: 107, name: "Rizky Febrian", email: "rizky@coffe.com" },
  { id: 108, name: "Nadia Amalia", email: "nadia@coffe.com" },
];

const NOTES_POOL = [
  "Less ice, extra oat milk please",
  "Hot with double shot ristretto",
  "Takeaway box for pastries",
  "No sugar added",
  "Dine in, warm up the croissant",
  "Extra caramel drizzle please",
  ""
];

function getRandomCafeHour() {
  const hours = [8, 9, 10, 11, 12, 12, 13, 13, 14, 15, 16, 17, 17, 18, 18, 19, 19, 20, 21];
  return hours[Math.floor(Math.random() * hours.length)];
}

async function main() {
  console.log("====================================================");
  console.log(`📊 DAILY TRANSACTION SIMULATOR (${DAYS_TO_SIMULATE} DAYS HISTORY)`);
  console.log("====================================================");

  const adminToken = generateJwtToken(1, "admin@gmail.com", "Master Admin", "admin");
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  // 1. Fetch Existing Products & Tables
  console.log("🔍 Checking existing menu products & cafe tables...");
  let menuItems = [];
  let tableIds = [];

  try {
    const menuRes = await request(PORTS.masterData, "/api/1.0/menus?page=1&size=100", { headers: adminHeaders });
    const items = menuRes.data?.data || menuRes.data || [];
    menuItems = items.map(m => ({ id: m.id, name: m.name, price: m.price }));
    console.log(`  └─ Found ${menuItems.length} active menu products in database.`);
  } catch (err) {
    console.log(`  └─ Could not fetch menus: ${err.message}`);
  }

  try {
    const tableRes = await request(PORTS.masterData, "/api/1.0/tables", { headers: adminHeaders });
    const tables = tableRes.data || [];
    tableIds = tables.map(t => t.id);
    console.log(`  └─ Found ${tableIds.length} cafe seating tables in database.`);
  } catch {
    tableIds = [];
  }

  if (menuItems.length === 0) {
    console.log("⚠️ No menu products found in database. Running product seeder first...");
    require("./seed_live_data.js");
    return;
  }

  // Optional PostgreSQL Direct Connection for exact historical seeding
  let pgClientTx = null;
  let pgClientWallet = null;

  if (Client) {
    const txDbUrl = process.env.DB_TRANSACTION_URL || "postgres://root:password@localhost:10000/transaction?sslmode=disable";
    const walletDbUrl = process.env.DB_WALLET_URL || "postgres://root:password@localhost:10000/wallet?sslmode=disable";

    try {
      pgClientTx = new Client({ connectionString: txDbUrl });
      await pgClientTx.connect();
    } catch {
      pgClientTx = null;
    }

    try {
      pgClientWallet = new Client({ connectionString: walletDbUrl });
      await pgClientWallet.connect();
    } catch {
      pgClientWallet = null;
    }
  }

  // Ensure Customer Users Have Wallet Balance in DB if PostgreSQL client is available
  if (pgClientWallet) {
    console.log("  └─ [PostgreSQL] Initializing customer wallet balances...");
    for (const cust of CUSTOMER_POOL) {
      try {
        // BCrypt hash for "123456"
        const hashedPin = "$2a$10$E2b70f.qO1wGgRk.m.H2v.B5YxT6Wv8D1M9P.bL8P3kL3N1.oQ5S";
        await pgClientWallet.query(
          `INSERT INTO tm_balances (user_id, balance, is_active, pin, created_at, updated_at) 
           VALUES ($1, 10000000, true, $2, NOW(), NOW())
           ON CONFLICT (user_id) DO UPDATE SET balance = tm_balances.balance + 5000000`,
          [cust.id, hashedPin]
        );
      } catch {
        // ignore
      }
    }
  }

  // 2. Simulate Orders Across Past N Days
  console.log(`\n🛍️ Simulating ~${ORDERS_PER_DAY} transactions per day across ${DAYS_TO_SIMULATE} days...`);

  let totalSimulatedOrders = 0;
  let totalSimulatedRevenue = 0;
  const now = new Date();

  for (let dayOffset = DAYS_TO_SIMULATE - 1; dayOffset >= 0; dayOffset--) {
    const targetDate = new Date(now.getTime() - dayOffset * 24 * 3600 * 1000);
    const dateStr = targetDate.toISOString().split("T")[0];
    
    const dailyVolume = Math.max(5, Math.floor(ORDERS_PER_DAY * (0.8 + Math.random() * 0.5)));
    let dailyRevenue = 0;
    let dailySuccessCount = 0;

    for (let i = 0; i < dailyVolume; i++) {
      const cust = CUSTOMER_POOL[Math.floor(Math.random() * CUSTOMER_POOL.length)];
      const custToken = generateJwtToken(cust.id, cust.email, cust.name, "customer");
      const custHeaders = { Authorization: `Bearer ${custToken}` };

      const itemCount = Math.floor(Math.random() * 3) + 1;
      const orderDatas = [];
      let checkoutTotal = 0;

      for (let k = 0; k < itemCount; k++) {
        const prod = menuItems[Math.floor(Math.random() * menuItems.length)];
        const qty = Math.floor(Math.random() * 2) + 1;
        const notes = Math.random() > 0.6 ? NOTES_POOL[Math.floor(Math.random() * NOTES_POOL.length)] : "";
        const itemTotal = prod.price * qty;

        orderDatas.push({
          menuId: prod.id,
          qty: qty,
          notes: notes,
          price: prod.price,
          total: itemTotal
        });
        checkoutTotal += itemTotal;
      }

      const tableId = tableIds.length > 0 ? tableIds[Math.floor(Math.random() * tableIds.length)] : 1;

      // First attempt API checkout
      let txId = null;
      try {
        const checkoutRes = await request(PORTS.transaction, "/api/1.0/checkout", {
          method: "POST",
          headers: custHeaders,
          body: JSON.stringify({
            tableId: tableId,
            orderFor: "DINE_IN",
            pin: "123456",
            datas: orderDatas,
            total: checkoutTotal
          })
        });
        txId = checkoutRes.data?.id || checkoutRes.data;
      } catch {
        // If API checkout fails (e.g. wallet service not connected), insert directly into Postgres DB!
        if (pgClientTx) {
          try {
            const hour = getRandomCafeHour();
            const minute = Math.floor(Math.random() * 60);
            const second = Math.floor(Math.random() * 60);
            const txTimestamp = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), hour, minute, second).toISOString();

            const dbRes = await pgClientTx.query(
              `INSERT INTO th_user_checkouts (user_id, table_id, order_for, total_price, order_status, created_by, created_at, updated_at) 
               VALUES ($1, $2, $3, $4, 2, $5, $6, $6) RETURNING id`,
              [cust.id, tableId, "DINE_IN", checkoutTotal, cust.id, txTimestamp]
            );

            txId = dbRes.rows[0]?.id;
            if (txId) {
              for (const d of orderDatas) {
                await pgClientTx.query(
                  `INSERT INTO td_user_checkouts (ref_id, menu_id, qty, price, total_price, notes, created_by, created_at, updated_at) 
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)`,
                  [txId, d.menuId, d.qty, d.price, d.total, d.notes, cust.id, txTimestamp]
                );
              }
            }
          } catch {
            // ignore
          }
        }
      }

      if (txId) {
        // If PostgreSQL direct client is available, backdate transaction timestamp to target historical date!
        if (pgClientTx) {
          const hour = getRandomCafeHour();
          const minute = Math.floor(Math.random() * 60);
          const second = Math.floor(Math.random() * 60);
          const txTimestamp = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), hour, minute, second).toISOString();

          await pgClientTx.query(
            "UPDATE th_user_checkouts SET created_at = $1, order_status = 2 WHERE id = $2",
            [txTimestamp, txId]
          );
        }

        dailyRevenue += checkoutTotal;
        dailySuccessCount++;
        totalSimulatedOrders++;
        totalSimulatedRevenue += checkoutTotal;
      }
    }

    console.log(`📅 Date: ${dateStr} | Orders: ${dailySuccessCount}/${dailyVolume} | Daily Revenue: Rp ${dailyRevenue.toLocaleString("id-ID")}`);
  }

  if (pgClientTx) await pgClientTx.end();
  if (pgClientWallet) await pgClientWallet.end();

  console.log("\n====================================================");
  console.log(`🎉 DAILY SIMULATION COMPLETED!`);
  console.log(`   Total Orders Generated: ${totalSimulatedOrders}`);
  console.log(`   Total Simulated Revenue: Rp ${totalSimulatedRevenue.toLocaleString("id-ID")}`);
  console.log("   Summary Report & Dashboard Analytics updated!");
  console.log("====================================================");
}

main().catch(err => {
  console.error("❌ Simulation error:", err.message);
});
