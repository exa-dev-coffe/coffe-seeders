/**
 * Modular Seeder & Order Trigger Runner for Coffe Shop Web App
 * 
 * Usage:
 *   node scripts/seed_runner.js seed-products
 *   node scripts/seed_runner.js trigger-normal [--days=7] [--ordersPerDay=10]
 *   node scripts/seed_runner.js trigger-vouchers [--days=7] [--ordersPerDay=10]
 *   node scripts/seed_runner.js trigger-promos [--days=7] [--ordersPerDay=10]
 *   node scripts/seed_runner.js trigger-all [--days=7] [--ordersPerDay=10]
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

const rawArgs = process.argv.slice(2);
const command = rawArgs[0] || "help";
const flags = rawArgs.slice(1).reduce((acc, arg) => {
  const [key, val] = arg.replace(/^--/, "").split("=");
  acc[key] = val ? parseInt(val, 10) : true;
  return acc;
}, {});

const DAYS = flags.days || 7;
const ORDERS_PER_DAY = flags.ordersPerDay || 10;

function generateJwtToken(userId, email, fullName, role = "admin") {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS512", typ: "JWT" }),
  ).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
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

const PRODUCTS_SEED_DATA = [
  { name: "Iced Spanish Latte", desc: "Espresso with rich condensed milk, fresh steamed milk, and cinnamon.", price: 28000, cat: "Espresso & Coffee", img: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=800&auto=format&fit=crop&q=80" },
  { name: "Caramel Macchiato", desc: "Freshly steamed milk with vanilla syrup, marked with espresso and caramel drizzle.", price: 32000, cat: "Espresso & Coffee", img: "https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=800&auto=format&fit=crop&q=80" },
  { name: "Artisan Flat White", desc: "Micro-foamed milk poured over a double shot of ristretto espresso.", price: 26000, cat: "Espresso & Coffee", img: "https://images.unsplash.com/photo-1577968897966-3d4325b36b61?w=800&auto=format&fit=crop&q=80" },
  { name: "Vanilla Bean Cold Brew", desc: "Slow-steeped cold brew infused with house-made Madagascar vanilla bean syrup.", price: 30000, cat: "Espresso & Coffee", img: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=800&auto=format&fit=crop&q=80" },
  { name: "Hazelnut Oat Cappuccino", desc: "Double shot espresso with creamy oat milk and roasted hazelnut essence.", price: 34000, cat: "Espresso & Coffee", img: "https://images.unsplash.com/photo-1534778101976-62847782c213?w=800&auto=format&fit=crop&q=80" },
  { name: "Japanese Drip Geisha", desc: "Single-origin Panama Geisha roasted lightly, brewed over ice with floral aroma.", price: 45000, cat: "Manual Brew", img: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80" },
  { name: "V60 Ethiopia Yirgacheffe", desc: "Citric acidity notes of lemon, bergamot, and sweet blueberry finish.", price: 35000, cat: "Manual Brew", img: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&auto=format&fit=crop&q=80" },
  { name: "Kyoto Uji Matcha Latte", desc: "Authentic ceremonial grade Uji matcha whisked fresh with oat milk.", price: 32000, cat: "Non-Coffee & Latte", img: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=800&auto=format&fit=crop&q=80" },
  { name: "Belgian Dark Chocolate", desc: "70% dark Belgian cocoa melted with silky micro-foamed dairy milk.", price: 30000, cat: "Non-Coffee & Latte", img: "https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=800&auto=format&fit=crop&q=80" },
  { name: "French Butter Croissant", desc: "Golden, flaky, multi-layered butter croissant baked fresh daily.", price: 22000, cat: "Artisanal Pastries", img: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&auto=format&fit=crop&q=80" },
  { name: "Pain au Chocolat", desc: "Flaky Viennoiserie pastry stuffed with two sticks of premium dark chocolate.", price: 25000, cat: "Artisanal Pastries", img: "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=800&auto=format&fit=crop&q=80" },
  { name: "Almond Danish Cream Pastry", desc: "Custard filled Danish topped with toasted sliced almonds and powdered sugar.", price: 27000, cat: "Artisanal Pastries", img: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80" },
  { name: "Avocado Toast & Poached Egg", desc: "Smashed Hass avocado on toasted sourdough with poached egg and chilli flakes.", price: 42000, cat: "Signature Food", img: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&auto=format&fit=crop&q=80" },
  { name: "Truffle Cream Spaghetti", desc: "Al dente pasta tossed in creamy garlic parmesan truffle mushroom sauce.", price: 55000, cat: "Signature Food", img: "https://images.unsplash.com/photo-1621996346565-e3def6164286?w=800&auto=format&fit=crop&q=80" }
];

const CUSTOMER_POOL = [
  { id: 101, name: "Budi Santoso", email: "budi@coffe.com" },
  { id: 102, name: "Siti Rahma", email: "siti@coffe.com" },
  { id: 103, name: "Reza Pratama", email: "reza@coffe.com" },
  { id: 104, name: "Diana Putri", email: "diana@coffe.com" },
  { id: 105, name: "Andi Setiawan", email: "andi@coffe.com" },
  { id: 106, name: "Maya Indah", email: "maya@coffe.com" }
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

async function getPgClients() {
  if (!Client) return { pgClientTx: null, pgClientWallet: null };
  const txDbUrl = process.env.DB_TRANSACTION_URL || "postgres://root:password@localhost:10000/transaction?sslmode=disable";
  const walletDbUrl = process.env.DB_WALLET_URL || "postgres://root:password@localhost:10000/wallet?sslmode=disable";
  let pgClientTx = null;
  let pgClientWallet = null;

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

  return { pgClientTx, pgClientWallet };
}

async function initCustomerWallets(pgClientWallet) {
  if (!pgClientWallet) return;
  const hashedPin = "$2a$10$E2b70f.qO1wGgRk.m.H2v.B5YxT6Wv8D1M9P.bL8P3kL3N1.oQ5S";
  for (const cust of CUSTOMER_POOL) {
    try {
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

// ----------------------------------------------------
// PROCESS 1: SEED PRODUCTS & CATEGORIES
// ----------------------------------------------------
async function seedProducts() {
  console.log("\n====================================================");
  console.log("☕ PROCESS 1: SEEDING PRODUCTS & CATEGORIES WITH REAL HD IMAGES");
  console.log("====================================================");

  const adminToken = generateJwtToken(1, "admin@gmail.com", "Master Admin", "admin");
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  const categoryNames = [
    { name: "Espresso & Coffee", icon: "HiOutlineSparkles" },
    { name: "Manual Brew", icon: "HiOutlineBeaker" },
    { name: "Non-Coffee & Latte", icon: "HiOutlineHeart" },
    { name: "Artisanal Pastries", icon: "HiOutlineCake" },
    { name: "Signature Food", icon: "HiOutlineSun" }
  ];

  const categoryMap = {};
  for (const cat of categoryNames) {
    try {
      const res = await request(PORTS.masterData, "/api/1.0/categories", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify(cat)
      });
      const catId = res.data?.id || res.data;
      categoryMap[cat.name] = catId;
      console.log(`  └─ [Created Category] "${cat.name}" (ID: ${catId})`);
    } catch (err) {
      console.log(`  └─ [Category Exist/Skip] "${cat.name}"`);
    }
  }

  try {
    const catListRes = await request(PORTS.masterData, "/api/1.0/categories", { headers: adminHeaders });
    const list = catListRes.data || [];
    for (const c of list) {
      categoryMap[c.name] = c.id;
    }
  } catch {
    // ignore
  }

  let count = 0;
  for (const prod of PRODUCTS_SEED_DATA) {
    const catId = categoryMap[prod.cat] || 0;
    try {
      await request(PORTS.masterData, "/api/1.0/menus", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          name: prod.name,
          description: prod.desc,
          price: prod.price,
          photo: prod.img,
          categoryId: catId,
          isAvailable: true
        })
      });
      count++;
      console.log(`  └─ [Created Menu] "${prod.name}" (Rp ${prod.price.toLocaleString("id-ID")})`);
    } catch (err) {
      console.log(`  └─ [Menu Exist/Skip] "${prod.name}"`);
    }
  }

  const tables = ["Table 1", "Table 2", "Table 3", "Table 4", "Table 5", "VIP Lounge 1", "Outdoor Terrace 1"];
  for (const name of tables) {
    try {
      await request(PORTS.masterData, "/api/1.0/tables", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({ name })
      });
      console.log(`  └─ [Created Table] "${name}"`);
    } catch {
      // ignore
    }
  }

  console.log(`✅ Process 1 Completed! ${count} products & categories ready.`);
}

async function getActiveContext() {
  const adminToken = generateJwtToken(1, "admin@gmail.com", "Master Admin", "admin");
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  let menuItems = [];
  let tableIds = [];

  try {
    const menuRes = await request(PORTS.masterData, "/api/1.0/menus?page=1&size=100", { headers: adminHeaders });
    const items = menuRes.data?.data || menuRes.data || [];
    menuItems = items.map(m => ({ id: m.id, name: m.name, price: m.price }));
  } catch {
    // ignore
  }

  try {
    const tableRes = await request(PORTS.masterData, "/api/1.0/tables", { headers: adminHeaders });
    const tables = tableRes.data || [];
    tableIds = tables.map(t => t.id);
  } catch {
    tableIds = [1, 2, 3, 4, 5];
  }

  return { menuItems, tableIds, adminHeaders };
}

// ----------------------------------------------------
// PROCESS 2: TRIGGER NORMAL ORDERS (NO PROMO/VOUCHER)
// ----------------------------------------------------
async function triggerNormalOrders(days = DAYS, ordersPerDay = ORDERS_PER_DAY) {
  console.log("\n====================================================");
  console.log(`🛒 PROCESS 2: TRIGGER NORMAL ORDERS (${days} DAYS HISTORY)`);
  console.log("====================================================");

  const { menuItems, tableIds } = await getActiveContext();
  if (menuItems.length === 0) {
    console.log("⚠️ No products found. Run seed-products first!");
    return;
  }

  const { pgClientTx, pgClientWallet } = await getPgClients();
  await initCustomerWallets(pgClientWallet);

  let totalOrders = 0;
  let totalRevenue = 0;
  const now = new Date();

  for (let dayOffset = days - 1; dayOffset >= 0; dayOffset--) {
    const targetDate = new Date(now.getTime() - dayOffset * 24 * 3600 * 1000);
    const dateStr = targetDate.toISOString().split("T")[0];
    const dailyVolume = Math.max(3, Math.floor(ordersPerDay * (0.8 + Math.random() * 0.4)));
    let dailyRev = 0;
    let successCount = 0;

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
        const notes = Math.random() > 0.5 ? NOTES_POOL[Math.floor(Math.random() * NOTES_POOL.length)] : "";
        const itemTotal = prod.price * qty;

        orderDatas.push({ menuId: prod.id, qty, notes, price: prod.price, total: itemTotal });
        checkoutTotal += itemTotal;
      }

      const tableId = tableIds.length > 0 ? tableIds[Math.floor(Math.random() * tableIds.length)] : 1;
      let txId = null;

      try {
        const res = await request(PORTS.transaction, "/api/1.0/checkout", {
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
        txId = res.data?.id || res.data;
      } catch {
        if (pgClientTx) {
          try {
            const hour = getRandomCafeHour();
            const txTimestamp = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), hour, Math.floor(Math.random() * 60)).toISOString();
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
        if (pgClientTx) {
          const hour = getRandomCafeHour();
          const txTimestamp = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), hour, Math.floor(Math.random() * 60)).toISOString();
          await pgClientTx.query("UPDATE th_user_checkouts SET created_at = $1, order_status = 2 WHERE id = $2", [txTimestamp, txId]);
        }
        dailyRev += checkoutTotal;
        successCount++;
        totalOrders++;
        totalRevenue += checkoutTotal;
      }
    }
    console.log(`📅 Date: ${dateStr} | Normal Orders: ${successCount}/${dailyVolume} | Revenue: Rp ${dailyRev.toLocaleString("id-ID")}`);
  }

  if (pgClientTx) await pgClientTx.end();
  if (pgClientWallet) await pgClientWallet.end();

  console.log(`✅ Process 2 Completed! ${totalOrders} normal orders placed (Rp ${totalRevenue.toLocaleString("id-ID")}).`);
}

// ----------------------------------------------------
// PROCESS 3: TRIGGER VOUCHER ORDERS
// ----------------------------------------------------
async function triggerVoucherOrders(days = DAYS, ordersPerDay = ORDERS_PER_DAY) {
  console.log("\n====================================================");
  console.log(`🎟️ PROCESS 3: TRIGGER VOUCHER ORDERS (${days} DAYS HISTORY)`);
  console.log("====================================================");

  const { menuItems, tableIds, adminHeaders } = await getActiveContext();
  if (menuItems.length === 0) {
    console.log("⚠️ No products found. Run seed-products first!");
    return;
  }

  const { pgClientTx, pgClientWallet } = await getPgClients();
  await initCustomerWallets(pgClientWallet);

  const now = new Date();
  const endAtFuture = new Date(now.getTime() + 30 * 24 * 3600 * 1000).toISOString();
  const vouchers = [
    { code: "WELCOME10", discountType: "PERCENTAGE", discountValue: 10, maxDiscount: 15000, minPurchase: 20000, quota: 200, expiredAt: endAtFuture },
    { code: "HEMAT5K", discountType: "FIXED", discountValue: 5000, maxDiscount: 5000, minPurchase: 15000, quota: 200, expiredAt: endAtFuture }
  ];

  for (const v of vouchers) {
    try {
      await request(PORTS.transaction, "/api/1.0/vouchers", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify(v)
      });
      console.log(`  └─ [Voucher Ready] "${v.code}"`);
    } catch {
      // ignore if exists
    }
  }

  let totalOrders = 0;
  let totalRevenue = 0;

  for (let dayOffset = days - 1; dayOffset >= 0; dayOffset--) {
    const targetDate = new Date(now.getTime() - dayOffset * 24 * 3600 * 1000);
    const dateStr = targetDate.toISOString().split("T")[0];
    const dailyVolume = Math.max(2, Math.floor((ordersPerDay / 2) * (0.8 + Math.random() * 0.4)));
    let dailyRev = 0;
    let successCount = 0;

    for (let i = 0; i < dailyVolume; i++) {
      const cust = CUSTOMER_POOL[Math.floor(Math.random() * CUSTOMER_POOL.length)];
      const custToken = generateJwtToken(cust.id, cust.email, cust.name, "customer");
      const custHeaders = { Authorization: `Bearer ${custToken}` };

      const itemCount = Math.floor(Math.random() * 2) + 1;
      const orderDatas = [];
      let checkoutTotal = 0;

      for (let k = 0; k < itemCount; k++) {
        const prod = menuItems[Math.floor(Math.random() * menuItems.length)];
        const qty = Math.floor(Math.random() * 2) + 1;
        const notes = NOTES_POOL[Math.floor(Math.random() * NOTES_POOL.length)];
        const itemTotal = prod.price * qty;

        orderDatas.push({ menuId: prod.id, qty, notes, price: prod.price, total: itemTotal });
        checkoutTotal += itemTotal;
      }

      const tableId = tableIds.length > 0 ? tableIds[Math.floor(Math.random() * tableIds.length)] : 1;
      const code = i % 2 === 0 ? "WELCOME10" : "HEMAT5K";
      let txId = null;

      try {
        const res = await request(PORTS.transaction, "/api/1.0/checkout", {
          method: "POST",
          headers: custHeaders,
          body: JSON.stringify({
            tableId: tableId,
            orderFor: "DINE_IN",
            pin: "123456",
            voucherCode: code,
            datas: orderDatas,
            total: checkoutTotal
          })
        });
        txId = res.data?.id || res.data;
      } catch {
        if (pgClientTx) {
          try {
            const hour = getRandomCafeHour();
            const txTimestamp = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), hour, Math.floor(Math.random() * 60)).toISOString();
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
        if (pgClientTx) {
          const hour = getRandomCafeHour();
          const txTimestamp = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), hour, Math.floor(Math.random() * 60)).toISOString();
          await pgClientTx.query("UPDATE th_user_checkouts SET created_at = $1, order_status = 2 WHERE id = $2", [txTimestamp, txId]);
        }
        dailyRev += checkoutTotal;
        successCount++;
        totalOrders++;
        totalRevenue += checkoutTotal;
      }
    }
    console.log(`📅 Date: ${dateStr} | Voucher Orders: ${successCount}/${dailyVolume} | Revenue: Rp ${dailyRev.toLocaleString("id-ID")}`);
  }

  if (pgClientTx) await pgClientTx.end();
  if (pgClientWallet) await pgClientWallet.end();

  console.log(`✅ Process 3 Completed! ${totalOrders} voucher orders placed (Rp ${totalRevenue.toLocaleString("id-ID")}).`);
}

// ----------------------------------------------------
// PROCESS 4: TRIGGER PROMOTION & DISCOUNT ORDERS
// ----------------------------------------------------
async function triggerDiscountOrders(days = DAYS, ordersPerDay = ORDERS_PER_DAY) {
  console.log("\n====================================================");
  console.log(`🎯 PROCESS 4: TRIGGER PROMOTION & DISCOUNT ORDERS (${days} DAYS HISTORY)`);
  console.log("====================================================");

  const { menuItems, tableIds, adminHeaders } = await getActiveContext();
  if (menuItems.length === 0) {
    console.log("⚠️ No products found. Run seed-products first!");
    return;
  }

  const { pgClientTx, pgClientWallet } = await getPgClients();
  await initCustomerWallets(pgClientWallet);

  const now = new Date();
  const startAtActive = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
  const startAtFuture = new Date(now.getTime() + 2 * 3600 * 1000).toISOString();
  const endAtFuture = new Date(now.getTime() + 30 * 24 * 3600 * 1000).toISOString();

  const promos = [
    {
      name: "Morning Coffee Boost (20% OFF)",
      targetType: "ALL",
      discountType: "PERCENTAGE",
      discountValue: 20,
      maxDiscount: 10000,
      minPurchase: 10000,
      startAt: startAtActive,
      endAt: endAtFuture
    },
    {
      name: "Special Pastry Combo (-Rp 3.000)",
      targetType: "ALL",
      discountType: "FIXED",
      discountValue: 3000,
      maxDiscount: 3000,
      minPurchase: 15000,
      startAt: startAtFuture,
      endAt: endAtFuture
    }
  ];

  for (const p of promos) {
    try {
      await request(PORTS.masterData, "/api/1.0/promotions", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify(p)
      });
      console.log(`  └─ [Promo Campaign Ready] "${p.name}" (Asynq Scheduled)`);
    } catch {
      // ignore if exists
    }
  }

  let totalOrders = 0;
  let totalRevenue = 0;

  for (let dayOffset = days - 1; dayOffset >= 0; dayOffset--) {
    const targetDate = new Date(now.getTime() - dayOffset * 24 * 3600 * 1000);
    const dateStr = targetDate.toISOString().split("T")[0];
    const dailyVolume = Math.max(2, Math.floor((ordersPerDay / 2) * (0.8 + Math.random() * 0.4)));
    let dailyRev = 0;
    let successCount = 0;

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
        const notes = NOTES_POOL[Math.floor(Math.random() * NOTES_POOL.length)];
        const itemTotal = prod.price * qty;

        orderDatas.push({ menuId: prod.id, qty, notes, price: prod.price, total: itemTotal });
        checkoutTotal += itemTotal;
      }

      const tableId = tableIds.length > 0 ? tableIds[Math.floor(Math.random() * tableIds.length)] : 1;
      let txId = null;

      try {
        const res = await request(PORTS.transaction, "/api/1.0/checkout", {
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
        txId = res.data?.id || res.data;
      } catch {
        if (pgClientTx) {
          try {
            const hour = getRandomCafeHour();
            const txTimestamp = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), hour, Math.floor(Math.random() * 60)).toISOString();
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
        if (pgClientTx) {
          const hour = getRandomCafeHour();
          const txTimestamp = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), hour, Math.floor(Math.random() * 60)).toISOString();
          await pgClientTx.query("UPDATE th_user_checkouts SET created_at = $1, order_status = 2 WHERE id = $2", [txTimestamp, txId]);
        }
        dailyRev += checkoutTotal;
        successCount++;
        totalOrders++;
        totalRevenue += checkoutTotal;
      }
    }
    console.log(`📅 Date: ${dateStr} | Promo Discount Orders: ${successCount}/${dailyVolume} | Revenue: Rp ${dailyRev.toLocaleString("id-ID")}`);
  }

  if (pgClientTx) await pgClientTx.end();
  if (pgClientWallet) await pgClientWallet.end();

  console.log(`✅ Process 4 Completed! ${totalOrders} promo discount orders placed (Rp ${totalRevenue.toLocaleString("id-ID")}).`);
}

// ----------------------------------------------------
// MAIN CLI SUBCOMMAND ROUTER
// ----------------------------------------------------
async function main() {
  console.log("====================================================");
  console.log(`🚀 COFFE SHOP MODULAR SEEDER & TRIGGER RUNNER`);
  console.log(`   Command: node scripts/seed_runner.js ${command}`);
  console.log("====================================================");

  switch (command) {
    case "seed-products":
      await seedProducts();
      break;

    case "trigger-normal":
      await triggerNormalOrders(DAYS, ORDERS_PER_DAY);
      break;

    case "trigger-vouchers":
      await triggerVoucherOrders(DAYS, ORDERS_PER_DAY);
      break;

    case "trigger-promos":
      await triggerDiscountOrders(DAYS, ORDERS_PER_DAY);
      break;

    case "trigger-all":
    case "all":
      await seedProducts();
      await triggerNormalOrders(DAYS, ORDERS_PER_DAY);
      await triggerVoucherOrders(DAYS, ORDERS_PER_DAY);
      await triggerDiscountOrders(DAYS, ORDERS_PER_DAY);
      break;

    default:
      console.log(`
Available Commands:
  node scripts/seed_runner.js seed-products       -> Seed Categories & Products with HD Unsplash Images
  node scripts/seed_runner.js trigger-normal     -> Trigger Normal Orders (No Promo/Voucher)
  node scripts/seed_runner.js trigger-vouchers   -> Trigger Orders with Vouchers
  node scripts/seed_runner.js trigger-promos     -> Trigger Orders with Marketing Promotions & Discounts
  node scripts/seed_runner.js trigger-all        -> Execute All Steps In Sequence

CLI Flags:
  --days=7           Number of historical days to simulate (default: 7)
  --ordersPerDay=10  Target order volume per day (default: 10)
      `);
      break;
  }
}

main().catch(err => {
  console.error("❌ Runner error:", err.message);
});
