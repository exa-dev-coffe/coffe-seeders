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
  const hashedPin = process.env.CUSTOMER_DEFAULT_PIN_HASH || "$2a$10$E2b70f.qO1wGgRk.m.H2v.B5YxT6Wv8D1M9P.bL8P3kL3N1.oQ5S";
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

async function getActiveContext({ request, PORTS, adminHeaders, pgClientMaster }) {
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
    tableIds = [];
  }

  // Database direct fallback if masterData HTTP service is offline
  if (menuItems.length === 0 && pgClientMaster) {
    try {
      const res = await pgClientMaster.query("SELECT id, name, price FROM tm_menus WHERE is_available = true");
      menuItems = res.rows.map(m => ({ id: m.id, name: m.name, price: parseFloat(m.price) }));
    } catch {
      // ignore
    }
  }

  if (tableIds.length === 0 && pgClientMaster) {
    try {
      const res = await pgClientMaster.query("SELECT id FROM tm_tables");
      tableIds = res.rows.map(t => t.id);
    } catch {
      // ignore
    }
  }

  if (tableIds.length === 0) {
    tableIds = [1, 2, 3, 4, 5];
  }

  return { menuItems, tableIds };
}

/**
 * Universal helper to create & immediately complete seeded orders (both DINE_IN and TAKEAWAY)
 */
async function placeSeededOrder({
  cust,
  targetDate,
  orderDatas,
  subtotal,
  tableIds,
  voucherCode = null,
  voucherId = null,
  discountAmount = 0,
  request,
  PORTS,
  adminHeaders,
  pgClientTx
}) {
  // ~45% Takeaway, ~55% Dine-In
  const isTakeaway = Math.random() > 0.55;
  const orderType = isTakeaway ? "TAKEAWAY" : "DINE_IN";
  const tableId = isTakeaway ? null : (tableIds.length > 0 ? tableIds[Math.floor(Math.random() * tableIds.length)] : 1);
  const orderFor = cust.name;

  const hour = getRandomCafeHour();
  const minute = Math.floor(Math.random() * 60);
  const second = Math.floor(Math.random() * 60);
  const txTimestamp = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate(),
    hour,
    minute,
    second
  ).toISOString();

  let finalTotal = Math.max(0, subtotal - discountAmount);
  let txId = null;

  // 1. Attempt checkout via POS API endpoint
  try {
    const posPayload = {
      tableId: tableId,
      orderType: orderType,
      paymentMethod: "CASH",
      orderFor: orderFor,
      cashAmount: subtotal,
      cashChange: 0,
      datas: orderDatas,
      total: subtotal,
      ...(voucherCode ? { voucherCode } : {})
    };

    const res = await request(PORTS.transaction, "/api/1.0/pos/checkout", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify(posPayload)
    });
    txId = res.data?.id || res.data?.data?.id;
    if (res.data?.totalPrice) {
      finalTotal = parseFloat(res.data.totalPrice);
    }
  } catch {
    // 2. Direct PostgreSQL fallback if API offline or error
    if (pgClientTx) {
      try {
        const dbRes = await pgClientTx.query(
          `INSERT INTO th_user_checkouts (
            user_id, table_id, order_for, total_price, order_status, 
            created_by, created_at, updated_at, updated_by, 
            order_type, payment_method, payment_status, cash_amount, cash_change, is_cashier,
            voucher_id, discount_amount
          ) VALUES (
            $1, $2, $3, $4, 2, 
            $5, $6, $6, $5, 
            $7, 'CASH', 'PAID', $8, 0, true,
            $9, $10
          ) RETURNING id`,
          [
            cust.id,
            tableId,
            orderFor,
            finalTotal,
            cust.id,
            txTimestamp,
            orderType,
            finalTotal,
            voucherId,
            discountAmount
          ]
        );
        txId = dbRes.rows[0]?.id;
        if (txId) {
          for (const d of orderDatas) {
            const rating = Math.random() > 0.25 ? (Math.random() > 0.4 ? 5 : 4) : 3;
            await pgClientTx.query(
              `INSERT INTO td_user_checkouts (
                ref_id, menu_id, qty, price, total_price, rating, notes, 
                created_by, created_at, updated_at, updated_by
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9, $8)`,
              [txId, d.menuId, d.qty, d.price, d.total, rating, d.notes, cust.id, txTimestamp]
            );
          }
        }
      } catch {
        // ignore
      }
    }
  }

  // 3. Immediately mark COMPLETED (order_status = 2) and backdate timestamp
  if (txId) {
    if (pgClientTx) {
      try {
        await pgClientTx.query(
          "UPDATE th_user_checkouts SET created_at = $1, updated_at = $1, order_status = 2 WHERE id = $2",
          [txTimestamp, txId]
        );
        await pgClientTx.query(
          "UPDATE td_user_checkouts SET created_at = $1, updated_at = $1, rating = $2 WHERE ref_id = $3",
          [txTimestamp, Math.random() > 0.25 ? (Math.random() > 0.4 ? 5 : 4) : 3, txId]
        );
      } catch {
        // ignore
      }
    } else {
      // Fallback via API: advance order status twice (0 -> 1 -> 2)
      try {
        await request(PORTS.transaction, "/api/1.0/transactions/update-order-status", {
          method: "PATCH",
          headers: adminHeaders,
          body: JSON.stringify({ id: txId })
        });
        await request(PORTS.transaction, "/api/1.0/transactions/update-order-status", {
          method: "PATCH",
          headers: adminHeaders,
          body: JSON.stringify({ id: txId })
        });
      } catch {
        // ignore
      }
    }
  }

  return { txId, finalTotal, orderType, isTakeaway };
}

// ----------------------------------------------------
// 1. TRIGGER NORMAL ORDERS
// ----------------------------------------------------
async function triggerNormalOrders({ days, ordersPerDay, request, PORTS, generateJwtToken, adminHeaders, getPgClients }) {
  console.log("\n====================================================");
  console.log(`🛒 PROCESS 2: TRIGGER NORMAL ORDERS (${days} DAYS HISTORY)`);
  console.log("====================================================");

  const { pgClientTx, pgClientWallet, pgClientMaster } = await getPgClients();
  const { menuItems, tableIds } = await getActiveContext({ request, PORTS, adminHeaders, pgClientMaster });
  if (menuItems.length === 0) {
    console.log("⚠️ No products found in database. Please run seed-products first!");
    if (pgClientTx) await pgClientTx.end();
    if (pgClientWallet) await pgClientWallet.end();
    if (pgClientMaster) await pgClientMaster.end();
    return;
  }

  await initCustomerWallets(pgClientWallet);

  let totalOrders = 0;
  let totalRevenue = 0;
  let totalDineIn = 0;
  let totalTakeaway = 0;
  const now = new Date();

  for (let dayOffset = days - 1; dayOffset >= 0; dayOffset--) {
    const targetDate = new Date(now.getTime() - dayOffset * 24 * 3600 * 1000);
    const dateStr = targetDate.toISOString().split("T")[0];
    const dailyVolume = Math.max(3, Math.floor(ordersPerDay * (0.8 + Math.random() * 0.4)));
    let dailyRev = 0;
    let successCount = 0;
    let dailyDineIn = 0;
    let dailyTakeaway = 0;

    for (let i = 0; i < dailyVolume; i++) {
      const cust = CUSTOMER_POOL[Math.floor(Math.random() * CUSTOMER_POOL.length)];
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

      const res = await placeSeededOrder({
        cust,
        targetDate,
        orderDatas,
        subtotal: checkoutTotal,
        tableIds,
        request,
        PORTS,
        adminHeaders,
        pgClientTx
      });

      if (res.txId) {
        dailyRev += res.finalTotal;
        successCount++;
        totalOrders++;
        totalRevenue += res.finalTotal;
        if (res.isTakeaway) {
          dailyTakeaway++;
          totalTakeaway++;
        } else {
          dailyDineIn++;
          totalDineIn++;
        }
      }
    }
    console.log(`📅 Date: ${dateStr} | Normal Orders: ${successCount}/${dailyVolume} (Dine-In: ${dailyDineIn}, Takeaway: ${dailyTakeaway}) | Revenue: Rp ${dailyRev.toLocaleString("id-ID")}`);
  }

  if (pgClientTx) await pgClientTx.end();
  if (pgClientWallet) await pgClientWallet.end();
  if (pgClientMaster) await pgClientMaster.end();

  console.log(`✅ Completed! ${totalOrders} normal orders placed (Dine-In: ${totalDineIn}, Takeaway: ${totalTakeaway}, Revenue: Rp ${totalRevenue.toLocaleString("id-ID")}).`);
}

// ----------------------------------------------------
// 2. TRIGGER VOUCHER ORDERS
// ----------------------------------------------------
async function triggerVoucherOrders({ days, ordersPerDay, request, PORTS, generateJwtToken, adminHeaders, getPgClients }) {
  console.log("\n====================================================");
  console.log(`🎟️ PROCESS 3: TRIGGER VOUCHER ORDERS (${days} DAYS HISTORY)`);
  console.log("====================================================");

  const { pgClientTx, pgClientWallet, pgClientMaster } = await getPgClients();
  const { menuItems, tableIds } = await getActiveContext({ request, PORTS, adminHeaders, pgClientMaster });
  if (menuItems.length === 0) {
    console.log("⚠️ No products found in database. Please run seed-products first!");
    if (pgClientTx) await pgClientTx.end();
    if (pgClientWallet) await pgClientWallet.end();
    if (pgClientMaster) await pgClientMaster.end();
    return;
  }

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
      // fallback direct DB if needed
      if (pgClientTx) {
        try {
          await pgClientTx.query(
            `INSERT INTO tm_vouchers (code, discount_type, discount_value, max_discount, min_purchase, quota, expired_at, is_active, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW(), NOW())
             ON CONFLICT (code) DO NOTHING`,
            [v.code, v.discountType, v.discountValue, v.maxDiscount, v.minPurchase, v.quota, v.expiredAt]
          );
        } catch {
          // ignore
        }
      }
    }
  }

  // Fetch voucher DB IDs for direct fallback
  const voucherMap = {};
  if (pgClientTx) {
    try {
      const vRes = await pgClientTx.query("SELECT id, code, discount_type, discount_value, max_discount, min_purchase FROM tm_vouchers");
      for (const row of vRes.rows) {
        voucherMap[row.code] = {
          id: row.id,
          discountType: row.discount_type,
          discountValue: parseFloat(row.discount_value),
          maxDiscount: parseFloat(row.max_discount || 0),
          minPurchase: parseFloat(row.min_purchase || 0)
        };
      }
    } catch {
      // ignore
    }
  }

  let totalOrders = 0;
  let totalRevenue = 0;
  let totalDineIn = 0;
  let totalTakeaway = 0;

  for (let dayOffset = days - 1; dayOffset >= 0; dayOffset--) {
    const targetDate = new Date(now.getTime() - dayOffset * 24 * 3600 * 1000);
    const dateStr = targetDate.toISOString().split("T")[0];
    const dailyVolume = Math.max(2, Math.floor((ordersPerDay / 2) * (0.8 + Math.random() * 0.4)));
    let dailyRev = 0;
    let successCount = 0;
    let dailyDineIn = 0;
    let dailyTakeaway = 0;

    for (let i = 0; i < dailyVolume; i++) {
      const cust = CUSTOMER_POOL[Math.floor(Math.random() * CUSTOMER_POOL.length)];
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

      const code = i % 2 === 0 ? "WELCOME10" : "HEMAT5K";
      const vMeta = voucherMap[code];
      let discountAmount = 0;
      let voucherId = null;

      if (vMeta && checkoutTotal >= vMeta.minPurchase) {
        voucherId = vMeta.id;
        if (vMeta.discountType === "PERCENTAGE") {
          discountAmount = Math.min(checkoutTotal * (vMeta.discountValue / 100), vMeta.maxDiscount);
        } else {
          discountAmount = vMeta.discountValue;
        }
      }

      const res = await placeSeededOrder({
        cust,
        targetDate,
        orderDatas,
        subtotal: checkoutTotal,
        tableIds,
        voucherCode: code,
        voucherId,
        discountAmount,
        request,
        PORTS,
        adminHeaders,
        pgClientTx
      });

      if (res.txId) {
        dailyRev += res.finalTotal;
        successCount++;
        totalOrders++;
        totalRevenue += res.finalTotal;
        if (res.isTakeaway) {
          dailyTakeaway++;
          totalTakeaway++;
        } else {
          dailyDineIn++;
          totalDineIn++;
        }
      }
    }
    console.log(`📅 Date: ${dateStr} | Voucher Orders: ${successCount}/${dailyVolume} (Dine-In: ${dailyDineIn}, Takeaway: ${dailyTakeaway}) | Revenue: Rp ${dailyRev.toLocaleString("id-ID")}`);
  }

  if (pgClientTx) await pgClientTx.end();
  if (pgClientWallet) await pgClientWallet.end();
  if (pgClientMaster) await pgClientMaster.end();

  console.log(`✅ Completed! ${totalOrders} voucher orders placed (Dine-In: ${totalDineIn}, Takeaway: ${totalTakeaway}, Revenue: Rp ${totalRevenue.toLocaleString("id-ID")}).`);
}

// ----------------------------------------------------
// 3. TRIGGER PROMOTION & DISCOUNT ORDERS
// ----------------------------------------------------
async function triggerDiscountOrders({ days, ordersPerDay, request, PORTS, generateJwtToken, adminHeaders, getPgClients }) {
  console.log("\n====================================================");
  console.log(`🎯 PROCESS 4: TRIGGER PROMOTION & DISCOUNT ORDERS (${days} DAYS HISTORY)`);
  console.log("====================================================");

  const { pgClientTx, pgClientWallet, pgClientMaster } = await getPgClients();
  const { menuItems, tableIds } = await getActiveContext({ request, PORTS, adminHeaders, pgClientMaster });
  if (menuItems.length === 0) {
    console.log("⚠️ No products found in database. Please run seed-products first!");
    if (pgClientTx) await pgClientTx.end();
    if (pgClientWallet) await pgClientWallet.end();
    if (pgClientMaster) await pgClientMaster.end();
    return;
  }

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
  let totalDineIn = 0;
  let totalTakeaway = 0;

  for (let dayOffset = days - 1; dayOffset >= 0; dayOffset--) {
    const targetDate = new Date(now.getTime() - dayOffset * 24 * 3600 * 1000);
    const dateStr = targetDate.toISOString().split("T")[0];
    const dailyVolume = Math.max(2, Math.floor((ordersPerDay / 2) * (0.8 + Math.random() * 0.4)));
    let dailyRev = 0;
    let successCount = 0;
    let dailyDineIn = 0;
    let dailyTakeaway = 0;

    for (let i = 0; i < dailyVolume; i++) {
      const cust = CUSTOMER_POOL[Math.floor(Math.random() * CUSTOMER_POOL.length)];
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

      // Promo calculation: 20% discount up to Rp 10.000
      const discountAmount = Math.min(checkoutTotal * 0.20, 10000);

      const res = await placeSeededOrder({
        cust,
        targetDate,
        orderDatas,
        subtotal: checkoutTotal,
        tableIds,
        discountAmount,
        request,
        PORTS,
        adminHeaders,
        pgClientTx
      });

      if (res.txId) {
        dailyRev += res.finalTotal;
        successCount++;
        totalOrders++;
        totalRevenue += res.finalTotal;
        if (res.isTakeaway) {
          dailyTakeaway++;
          totalTakeaway++;
        } else {
          dailyDineIn++;
          totalDineIn++;
        }
      }
    }
    console.log(`📅 Date: ${dateStr} | Promo Discount Orders: ${successCount}/${dailyVolume} (Dine-In: ${dailyDineIn}, Takeaway: ${dailyTakeaway}) | Revenue: Rp ${dailyRev.toLocaleString("id-ID")}`);
  }

  if (pgClientTx) await pgClientTx.end();
  if (pgClientWallet) await pgClientWallet.end();
  if (pgClientMaster) await pgClientMaster.end();

  console.log(`✅ Completed! ${totalOrders} promo discount orders placed (Dine-In: ${totalDineIn}, Takeaway: ${totalTakeaway}, Revenue: Rp ${totalRevenue.toLocaleString("id-ID")}).`);
}

module.exports = { triggerNormalOrders, triggerVoucherOrders, triggerDiscountOrders };
