/**
 * Finance, Purchasing, Suppliers & Inventory Seeder Module
 * File: seeders/finance_inventory.js
 */

const SEED_INGREDIENTS = [
  {
    sku: "ING-ARB-01",
    name: "Specialty Arabica Gayo Beans",
    category: "Coffee Beans",
    unit: "kg",
    current_stock: 45.5,
    min_stock_alert: 10.0,
    cost_per_unit: 145000,
  },
  {
    sku: "ING-ROB-01",
    name: "Fine Robusta Java Beans",
    category: "Coffee Beans",
    unit: "kg",
    current_stock: 35.0,
    min_stock_alert: 10.0,
    cost_per_unit: 85000,
  },
  {
    sku: "ING-MLK-01",
    name: "Fresh Whole Milk Pasteurized",
    category: "Dairy & Milk",
    unit: "L",
    current_stock: 80.0,
    min_stock_alert: 15.0,
    cost_per_unit: 18500,
  },
  {
    sku: "ING-MLK-02",
    name: "Oat Milk Barista Edition",
    category: "Dairy & Milk",
    unit: "L",
    current_stock: 30.0,
    min_stock_alert: 8.0,
    cost_per_unit: 39000,
  },
  {
    sku: "ING-SYR-01",
    name: "Madagascar Vanilla Syrup 750ml",
    category: "Syrups & Flavors",
    unit: "btl",
    current_stock: 14.0,
    min_stock_alert: 4.0,
    cost_per_unit: 95000,
  },
  {
    sku: "ING-SYR-02",
    name: "Salted Caramel Sauce 1L",
    category: "Syrups & Flavors",
    unit: "btl",
    current_stock: 10.0,
    min_stock_alert: 3.0,
    cost_per_unit: 115000,
  },
  {
    sku: "ING-POW-01",
    name: "Ceremonial Uji Matcha Powder",
    category: "Tea & Powders",
    unit: "kg",
    current_stock: 4.5,
    min_stock_alert: 1.5,
    cost_per_unit: 450000,
  },
  {
    sku: "ING-POW-02",
    name: "Belgian Dark Chocolate 70%",
    category: "Tea & Powders",
    unit: "kg",
    current_stock: 8.0,
    min_stock_alert: 2.0,
    cost_per_unit: 180000,
  },
  {
    sku: "ING-PKG-01",
    name: "Paper Hot Cup 12oz & Lid",
    category: "Packaging & Supplies",
    unit: "pcs",
    current_stock: 450.0,
    min_stock_alert: 100.0,
    cost_per_unit: 1250,
  },
  {
    sku: "ING-PKG-02",
    name: "Iced Clear Cup 16oz & Straw",
    category: "Packaging & Supplies",
    unit: "pcs",
    current_stock: 600.0,
    min_stock_alert: 150.0,
    cost_per_unit: 1400,
  },
];

const SEED_SUPPLIERS = [
  {
    code: "SUP-BKN",
    name: "PT Biji Kopi Nusantara",
    contact_person: "Budi Santoso",
    phone: "+62 812-3456-7890",
    email: "order@bijikopinusantara.id",
    address: "Jl. Riau No. 88, Bandung, Jawa Barat",
    payment_terms: "NET_30",
  },
  {
    code: "SUP-DFP",
    name: "CV Dairy Fresh Pasteur",
    contact_person: "Siti Rahma",
    phone: "+62 821-9876-5432",
    email: "sales@dairyfresh.co.id",
    address: "Jl. Raya Lembang No. 14, Bandung Barat",
    payment_terms: "NET_14",
  },
  {
    code: "SUP-SRT",
    name: "PT Sirup Rasa Tropis",
    contact_person: "Kevin Wijaya",
    phone: "+62 813-1122-3344",
    email: "hello@rasatropis.com",
    address: "Kawasan Industri Daan Mogot Blok C-2, Jakarta Barat",
    payment_terms: "NET_30",
  },
  {
    code: "SUP-ECO",
    name: "EcoPackaging Indonesia",
    contact_person: "Hendra Gunawan",
    phone: "+62 856-7788-9900",
    email: "info@ecopack.id",
    address: "Jl. Industri Modern Cikande No. 5, Serang",
    payment_terms: "COD",
  },
];

const SEED_EXPENSES = [
  {
    expense_number: "EXP-202611-001",
    category: "Electricity",
    title: "Store Monthly Electricity Token (PLN)",
    amount: 3250000,
    payment_method: "BANK_TRANSFER",
    notes: "Main store 13200VA prepaid token reload",
    status: "PAID",
    created_by: "admin@gmail.com",
    approved_by: "admin@gmail.com",
    expense_date: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    expense_number: "EXP-202611-002",
    category: "Utilities",
    title: "Store Clean Water Bill (PDAM)",
    amount: 450000,
    payment_method: "BANK_TRANSFER",
    notes: "October water utility payment",
    status: "PAID",
    created_by: "admin@gmail.com",
    approved_by: "admin@gmail.com",
    expense_date: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
  {
    expense_number: "EXP-202611-003",
    category: "Utilities",
    title: "Dedicated Fiber Internet (IndiHome)",
    amount: 650000,
    payment_method: "BANK_TRANSFER",
    notes: "100 Mbps guest & POS network",
    status: "PAID",
    created_by: "admin@gmail.com",
    approved_by: "admin@gmail.com",
    expense_date: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    expense_number: "EXP-202611-004",
    category: "Wages",
    title: "Barista Staff Bi-Weekly Payroll",
    amount: 6800000,
    payment_method: "BANK_TRANSFER",
    notes: "Payroll for 4 full-time baristas and 2 part-timers",
    status: "PAID",
    created_by: "admin@gmail.com",
    approved_by: "admin@gmail.com",
    expense_date: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    expense_number: "EXP-202611-005",
    category: "Maintenance",
    title: "Espresso Machine Quarterly Servicing",
    amount: 1200000,
    payment_method: "CASH",
    notes: "La Marzocco group head gasket replacement and water filter descaling",
    status: "PAID",
    created_by: "admin@gmail.com",
    approved_by: "admin@gmail.com",
    expense_date: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    expense_number: "EXP-202611-006",
    category: "Marketing",
    title: "Instagram & TikTok Local Area Ads",
    amount: 1500000,
    payment_method: "CREDIT_CARD",
    notes: "Targeting 5km coffee enthusiast radius for new seasonal drinks",
    status: "PAID",
    created_by: "admin@gmail.com",
    approved_by: "admin@gmail.com",
    expense_date: new Date().toISOString(),
  },
  {
    expense_number: "EXP-202611-007",
    category: "Supplies",
    title: "Cleaning and Sanitation Supplies",
    amount: 380000,
    payment_method: "CASH",
    notes: "Cafiza machine cleaner, sanitizers, and microfiber bar towels",
    status: "PAID",
    created_by: "admin@gmail.com",
    approved_by: "admin@gmail.com",
    expense_date: new Date().toISOString(),
  },
];

async function seedFinanceAndInventory({ pgClients, pgClientMaster }) {
  console.log("\n====================================================");
  console.log("📦 SEEDING INVENTORY & FINANCE DATA (POSTGRES DIRECT)");
  console.log("====================================================");

  let pgClientInv = null;
  let pgClientFin = null;
  const Client = require("pg").Client;

  const invDbUrl = process.env.INVENTORY_DB_URL || "postgres://postgres:postgres@103.150.226.122:54321/coffe_inventory?sslmode=disable";
  const finDbUrl = process.env.FINANCE_DB_URL || "postgres://postgres:postgres@103.150.226.122:54321/coffe_finance?sslmode=disable";

  try {
    pgClientInv = new Client({ connectionString: invDbUrl });
    await pgClientInv.connect();
    console.log("  ✔ Connected to coffe_inventory DB");
  } catch (err) {
    console.error("  ❌ Failed to connect to coffe_inventory DB:", err.message);
  }

  try {
    pgClientFin = new Client({ connectionString: finDbUrl });
    await pgClientFin.connect();
    console.log("  ✔ Connected to coffe_finance DB");
  } catch (err) {
    console.error("  ❌ Failed to connect to coffe_finance DB:", err.message);
  }

  const ingredientMap = {};

  // 1. Seed Ingredients
  if (pgClientInv) {
    console.log("\n--- Seeding Ingredients ---");
    for (const item of SEED_INGREDIENTS) {
      try {
        const res = await pgClientInv.query(
          `INSERT INTO ingredients (sku, name, category, unit, current_stock, min_stock_alert, cost_per_unit, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (sku) DO UPDATE 
           SET name = EXCLUDED.name,
               current_stock = EXCLUDED.current_stock,
               cost_per_unit = EXCLUDED.cost_per_unit
           RETURNING id, sku, name`,
          [item.sku, item.name, item.category, item.unit, item.current_stock, item.min_stock_alert, item.cost_per_unit, true]
        );
        const row = res.rows[0];
        ingredientMap[row.sku] = row;
        console.log(`  └─ [Ingredient] ${row.sku}: ${row.name}`);
      } catch (err) {
        console.error(`  ❌ Error inserting ingredient ${item.sku}:`, err.message);
      }
    }

    // 2. Link Menu Recipes if Master Data DB or Menu items exist
    if (pgClientMaster) {
      console.log("\n--- Linking Menu Recipes ---");
      try {
        const menuRes = await pgClientMaster.query("SELECT id, name FROM tm_menus LIMIT 15");
        const menus = menuRes.rows || [];
        const arbId = ingredientMap["ING-ARB-01"]?.id;
        const milkId = ingredientMap["ING-MLK-01"]?.id;
        const cupId = ingredientMap["ING-PKG-02"]?.id;

        if (arbId && milkId && menus.length > 0) {
          for (const m of menus) {
            try {
              // 18g coffee beans
              await pgClientInv.query(
                `INSERT INTO recipes (menu_id, ingredient_id, amount)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (menu_id, ingredient_id) DO NOTHING`,
                [m.id, arbId, 0.018]
              );
              // 150ml milk
              await pgClientInv.query(
                `INSERT INTO recipes (menu_id, ingredient_id, amount)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (menu_id, ingredient_id) DO NOTHING`,
                [m.id, milkId, 0.150]
              );
              if (cupId) {
                await pgClientInv.query(
                  `INSERT INTO recipes (menu_id, ingredient_id, amount)
                   VALUES ($1, $2, $3)
                   ON CONFLICT (menu_id, ingredient_id) DO NOTHING`,
                  [m.id, cupId, 1]
                );
              }
              console.log(`  └─ [Recipe Created] for Menu ID ${m.id} (${m.name})`);
            } catch {
              // ignore duplicate
            }
          }
        }
      } catch (err) {
        console.log("  ℹ Skip recipe link:", err.message);
      }
    }
  }

  // 3. Seed Suppliers & Purchases & Expenses
  if (pgClientFin) {
    console.log("\n--- Seeding Suppliers ---");
    const supplierMap = {};
    for (const sup of SEED_SUPPLIERS) {
      try {
        const res = await pgClientFin.query(
          `INSERT INTO suppliers (code, name, contact_person, phone, email, address, payment_terms, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (code) DO UPDATE
           SET name = EXCLUDED.name,
               phone = EXCLUDED.phone,
               email = EXCLUDED.email
           RETURNING id, code, name`,
          [sup.code, sup.name, sup.contact_person, sup.phone, sup.email, sup.address, sup.payment_terms, true]
        );
        const row = res.rows[0];
        supplierMap[row.code] = row;
        console.log(`  └─ [Supplier] ${row.code}: ${row.name}`);
      } catch (err) {
        console.error(`  ❌ Error inserting supplier ${sup.code}:`, err.message);
      }
    }

    console.log("\n--- Seeding Purchase Orders ---");
    const bknId = supplierMap["SUP-BKN"]?.id;
    const dfpId = supplierMap["SUP-DFP"]?.id;
    const srtId = supplierMap["SUP-SRT"]?.id;
    const ecoId = supplierMap["SUP-ECO"]?.id;

    const samplePOs = [
      {
        purchase_number: "PO-202611-001",
        supplier_id: bknId,
        status: "RECEIVED",
        payment_status: "PAID",
        payment_method: "BANK_TRANSFER",
        total_amount: 5800000,
        paid_amount: 5800000,
        invoice_number: "INV-BKN-8831",
        notes: "Monthly Arabica & Robusta green beans supply",
        created_by: "admin@gmail.com",
        received_by: "admin@gmail.com",
        purchase_date: new Date(Date.now() - 7 * 86400000),
        received_at: new Date(Date.now() - 6 * 86400000),
        items: [
          {
            ingredient_id: ingredientMap["ING-ARB-01"]?.id || "00000000-0000-0000-0000-000000000001",
            name: "Specialty Arabica Gayo Beans",
            unit: "kg",
            quantity: 30,
            unit_price: 145000,
            subtotal: 4350000,
          },
          {
            ingredient_id: ingredientMap["ING-ROB-01"]?.id || "00000000-0000-0000-0000-000000000002",
            name: "Fine Robusta Java Beans",
            unit: "kg",
            quantity: 17.06,
            unit_price: 85000,
            subtotal: 1450000,
          },
        ],
      },
      {
        purchase_number: "PO-202611-002",
        supplier_id: dfpId,
        status: "RECEIVED",
        payment_status: "PAID",
        payment_method: "BANK_TRANSFER",
        total_amount: 2650000,
        paid_amount: 2650000,
        invoice_number: "INV-DFP-1042",
        notes: "Weekly fresh dairy delivery",
        created_by: "admin@gmail.com",
        received_by: "admin@gmail.com",
        purchase_date: new Date(Date.now() - 5 * 86400000),
        received_at: new Date(Date.now() - 4 * 86400000),
        items: [
          {
            ingredient_id: ingredientMap["ING-MLK-01"]?.id || "00000000-0000-0000-0000-000000000003",
            name: "Fresh Whole Milk Pasteurized",
            unit: "L",
            quantity: 80,
            unit_price: 18500,
            subtotal: 1480000,
          },
          {
            ingredient_id: ingredientMap["ING-MLK-02"]?.id || "00000000-0000-0000-0000-000000000004",
            name: "Oat Milk Barista Edition",
            unit: "L",
            quantity: 30,
            unit_price: 39000,
            subtotal: 1170000,
          },
        ],
      },
      {
        purchase_number: "PO-202611-003",
        supplier_id: srtId,
        status: "ORDERED",
        payment_status: "UNPAID",
        payment_method: "BANK_TRANSFER",
        total_amount: 2090000,
        paid_amount: 0,
        invoice_number: "INV-SRT-5519",
        notes: "Restock flavoring syrups and caramel",
        created_by: "admin@gmail.com",
        purchase_date: new Date(Date.now() - 2 * 86400000),
        items: [
          {
            ingredient_id: ingredientMap["ING-SYR-01"]?.id || "00000000-0000-0000-0000-000000000005",
            name: "Madagascar Vanilla Syrup 750ml",
            unit: "btl",
            quantity: 10,
            unit_price: 95000,
            subtotal: 950000,
          },
          {
            ingredient_id: ingredientMap["ING-SYR-02"]?.id || "00000000-0000-0000-0000-000000000006",
            name: "Salted Caramel Sauce 1L",
            unit: "btl",
            quantity: 10,
            unit_price: 114000,
            subtotal: 1140000,
          },
        ],
      },
      {
        purchase_number: "PO-202611-004",
        supplier_id: ecoId,
        status: "PENDING",
        payment_status: "UNPAID",
        payment_method: "COD",
        total_amount: 1465000,
        paid_amount: 0,
        notes: "Hot cups and iced cups restocking quote",
        created_by: "admin@gmail.com",
        purchase_date: new Date(),
        items: [
          {
            ingredient_id: ingredientMap["ING-PKG-01"]?.id || "00000000-0000-0000-0000-000000000007",
            name: "Paper Hot Cup 12oz & Lid",
            unit: "pcs",
            quantity: 500,
            unit_price: 1250,
            subtotal: 625000,
          },
          {
            ingredient_id: ingredientMap["ING-PKG-02"]?.id || "00000000-0000-0000-0000-000000000008",
            name: "Iced Clear Cup 16oz & Straw",
            unit: "pcs",
            quantity: 600,
            unit_price: 1400,
            subtotal: 840000,
          },
        ],
      },
    ];

    for (const po of samplePOs) {
      if (!po.supplier_id) continue;
      try {
        const poRes = await pgClientFin.query(
          `INSERT INTO purchases (purchase_number, supplier_id, purchase_date, status, payment_status, payment_method, total_amount, paid_amount, invoice_number, notes, created_by, received_at, received_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           ON CONFLICT (purchase_number) DO UPDATE
           SET status = EXCLUDED.status,
               payment_status = EXCLUDED.payment_status,
               total_amount = EXCLUDED.total_amount
           RETURNING id, purchase_number`,
          [
            po.purchase_number,
            po.supplier_id,
            po.purchase_date,
            po.status,
            po.payment_status,
            po.payment_method,
            po.total_amount,
            po.paid_amount,
            po.invoice_number,
            po.notes,
            po.created_by,
            po.received_at,
            po.received_by,
          ]
        );
        const poId = poRes.rows[0].id;
        console.log(`  └─ [PO] ${po.purchase_number} (ID: ${poId})`);

        // Insert purchase items
        await pgClientFin.query("DELETE FROM purchase_items WHERE purchase_id = $1", [poId]);
        for (const it of po.items) {
          await pgClientFin.query(
            `INSERT INTO purchase_items (purchase_id, ingredient_id, ingredient_name, unit, quantity, unit_price, subtotal)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [poId, it.ingredient_id, it.name, it.unit, it.quantity, it.unit_price, it.subtotal]
          );
        }
      } catch (err) {
        console.error(`  ❌ Error inserting PO ${po.purchase_number}:`, err.message);
      }
    }

    console.log("\n--- Seeding Operational Expenses ---");
    for (const exp of SEED_EXPENSES) {
      try {
        await pgClientFin.query(
          `INSERT INTO expenses (expense_number, category, title, amount, payment_method, notes, status, created_by, approved_by, expense_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (expense_number) DO UPDATE
           SET amount = EXCLUDED.amount,
               category = EXCLUDED.category,
               title = EXCLUDED.title`,
          [
            exp.expense_number,
            exp.category,
            exp.title,
            exp.amount,
            exp.payment_method,
            exp.notes,
            exp.status,
            exp.created_by,
            exp.approved_by,
            exp.expense_date,
          ]
        );
        console.log(`  └─ [Expense] ${exp.expense_number}: ${exp.title} (Rp ${exp.amount.toLocaleString("id-ID")})`);
      } catch (err) {
        console.error(`  ❌ Error inserting Expense ${exp.expense_number}:`, err.message);
      }
    }
  }

  if (pgClientInv) await pgClientInv.end();
  if (pgClientFin) await pgClientFin.end();

  console.log("\n✔ FINANCE & INVENTORY SEEDING FINISHED SUCCESSFULLY!");
}

module.exports = {
  seedFinanceAndInventory,
  SEED_INGREDIENTS,
  SEED_SUPPLIERS,
  SEED_EXPENSES,
};
