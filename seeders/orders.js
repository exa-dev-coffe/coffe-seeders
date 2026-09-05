/**
 * Order Trigger Module (Normal Orders, Voucher Orders, Promo Discount Orders)
 * File: seeders/orders.js
 */

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

async function getActiveContext({ request, PORTS, adminHeaders }) {
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

  return { menuItems, tableIds };
}

// ----------------------------------------------------
// 1. TRIGGER NORMAL ORDERS
// ----------------------------------------------------
async function triggerNormalOrders({ days, ordersPerDay, request, PORTS, generateJwtToken, adminHeaders, getPgClients }) {
  console.log("\n====================================================");
  console.log(`🛒 PROCESS 2: TRIGGER NORMAL ORDERS (${days} DAYS HISTORY)`);
  console.log("====================================================");

  const { menuItems, tableIds } = await getActiveContext({ request, PORTS, adminHeaders });
  if (menuItems.length === 0) {
    console.log("⚠️ No products found in database. Please run seed-products first!");
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

  console.log(`✅ Completed! ${totalOrders} normal orders placed (Rp ${totalRevenue.toLocaleString("id-ID")}).`);
}

// ----------------------------------------------------
// 2. TRIGGER VOUCHER ORDERS
// ----------------------------------------------------
async function triggerVoucherOrders({ days, ordersPerDay, request, PORTS, generateJwtToken, adminHeaders, getPgClients }) {
  console.log("\n====================================================");
  console.log(`🎟️ PROCESS 3: TRIGGER VOUCHER ORDERS (${days} DAYS HISTORY)`);
  console.log("====================================================");

  const { menuItems, tableIds } = await getActiveContext({ request, PORTS, adminHeaders });
  if (menuItems.length === 0) {
    console.log("⚠️ No products found in database. Please run seed-products first!");
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

  console.log(`✅ Completed! ${totalOrders} voucher orders placed (Rp ${totalRevenue.toLocaleString("id-ID")}).`);
}

// ----------------------------------------------------
// 3. TRIGGER PROMOTION & DISCOUNT ORDERS
// ----------------------------------------------------
async function triggerDiscountOrders({ days, ordersPerDay, request, PORTS, generateJwtToken, adminHeaders, getPgClients }) {
  console.log("\n====================================================");
  console.log(`🎯 PROCESS 4: TRIGGER PROMOTION & DISCOUNT ORDERS (${days} DAYS HISTORY)`);
  console.log("====================================================");

  const { menuItems, tableIds } = await getActiveContext({ request, PORTS, adminHeaders });
  if (menuItems.length === 0) {
    console.log("⚠️ No products found in database. Please run seed-products first!");
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

  console.log(`✅ Completed! ${totalOrders} promo discount orders placed (Rp ${totalRevenue.toLocaleString("id-ID")}).`);
}

module.exports = { triggerNormalOrders, triggerVoucherOrders, triggerDiscountOrders };
