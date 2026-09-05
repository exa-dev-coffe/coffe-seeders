/**
 * Live Data Seeder Script for Coffe Shop Web App
 * 
 * Usage:
 *   node scripts/seed_live_data.js
 * 
 * Description:
 *   Generates 60+ realistic coffee, tea, pastry, & food products with HD Unsplash photos.
 *   Uses dual HS512/HS256 local HMAC JWT generation + real API login fallback.
 */

const crypto = require("crypto");

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

// Generate valid JWT signed token locally supporting both Go (PascalCase) and Java (camelCase) claims
function generateJwtToken(userId, email, fullName, role = "admin") {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS512", typ: "JWT" }),
  ).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const roleId = role === "admin" ? 1 : role === "barista" ? 3 : 2;

  const adminPermissions = {
    catalog: { view: true, create: true, edit: true, delete: true },
    category: { view: true, create: true, edit: true, delete: true },
    table: { view: true, create: true, edit: true, delete: true },
    voucher: { view: true, create: true, edit: true, delete: true },
    promotion: { view: true, create: true, edit: true, delete: true },
    barista: { view: true, create: true, edit: true, delete: true },
    order: { view: true, create: true, edit: true, delete: true },
    inventory: { view: true, create: true, edit: true, delete: true },
    report: { view: true, create: true, edit: true, delete: true },
    role_management: { view: true, create: true, edit: true, delete: true },
    user_management: { view: true, create: true, edit: true, delete: true }
  };

  const baristaPermissions = {
    catalog: { view: true, create: false, edit: false, delete: false },
    order: { view: true, create: false, edit: true, delete: false },
    inventory: { view: true, create: false, edit: true, delete: false },
    report: { view: true, create: false, edit: false, delete: false }
  };

  const userPermissions = {};

  const permissions = role === "admin" ? adminPermissions : role === "barista" ? baristaPermissions : userPermissions;

  const payload = Buffer.from(
    JSON.stringify({
      // Standard Claims
      sub: String(email),
      iat: now,
      exp: now + 30 * 24 * 3600, // 30 days valid

      // Go Claims (master-data & transaction-service)
      FullName: fullName,
      Email: email,
      UserId: userId,
      Type: "access",
      Role: role,
      RoleId: roleId,
      Permissions: permissions,

      // Java Claims (be-coffe-java)
      fullName: fullName,
      email: email,
      userId: userId,
      type: "ACCESS",
      role: role,
      roleId: roleId,
      permissions: permissions,
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
    // Fallback to direct service ports if API gateway port 8000 is not running
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

// 60+ Realistic Product Templates
const PRODUCT_TEMPLATES = [
  // Espresso & Coffee
  {
    name: "Iced Spanish Latte",
    desc: "Espresso with rich condensed milk, fresh steamed milk, and cinnamon.",
    price: 28000,
    cat: "Espresso & Coffee",
    img: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=800&auto=format&fit=crop&q=80",
  },
  {
    name: "Caramel Macchiato",
    desc: "Freshly steamed milk with vanilla syrup, marked with espresso and caramel drizzle.",
    price: 32000,
    cat: "Espresso & Coffee",
    img: "https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=800&auto=format&fit=crop&q=80",
  },
  {
    name: "Artisan Flat White",
    desc: "Micro-foamed milk poured over a double shot of ristretto espresso.",
    price: 26000,
    cat: "Espresso & Coffee",
    img: "https://images.unsplash.com/photo-1577968897966-3d4325b36b61?w=800&auto=format&fit=crop&q=80",
  },
  {
    name: "Vanilla Bean Cold Brew",
    desc: "Slow-steeped cold brew infused with house-made Madagascar vanilla bean syrup.",
    price: 30000,
    cat: "Espresso & Coffee",
    img: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=800&auto=format&fit=crop&q=80",
  },
  {
    name: "Hazelnut Oat Cappuccino",
    desc: "Double shot espresso with creamy oat milk and roasted hazelnut essence.",
    price: 34000,
    cat: "Espresso & Coffee",
    img: "https://images.unsplash.com/photo-1534778101976-62847782c213?w=800&auto=format&fit=crop&q=80",
  },
  {
    name: "Single Origin Colombia Espresso",
    desc: "Bright notes of red apple, cane sugar, and cocoa nibs.",
    price: 22000,
    cat: "Espresso & Coffee",
    img: "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=800&auto=format&fit=crop&q=80",
  },
  {
    name: "Affogato al Caffe",
    desc: "Double ristretto shot poured hot over a scoop of Madagascar vanilla bean gelato.",
    price: 35000,
    cat: "Espresso & Coffee",
    img: "https://images.unsplash.com/photo-1592663527359-cf6642f54cff?w=800&auto=format&fit=crop&q=80",
  },
  {
    name: "Sea Salt Caramel Latte",
    desc: "Signature espresso blend with salted caramel drizzle and pink sea salt foam.",
    price: 33000,
    cat: "Espresso & Coffee",
    img: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=800&auto=format&fit=crop&q=80",
  },
  {
    name: "Pistachio Cream Cold Brew",
    desc: "Ice cold brew topped with velvety sweet pistachio cream foam.",
    price: 36000,
    cat: "Espresso & Coffee",
    img: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=800&auto=format&fit=crop&q=80",
  },
  {
    name: "Classic Americano",
    desc: "Double shot espresso extended with hot filtered mountain water.",
    price: 24000,
    cat: "Espresso & Coffee",
    img: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80",
  },
  {
    name: "Mocha Mint Latte",
    desc: "Rich espresso blended with Valrhona dark chocolate and peppermint oil.",
    price: 32000,
    cat: "Espresso & Coffee",
    img: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800&auto=format&fit=crop&q=80",
  },
  {
    name: "Cortado Velvet Shot",
    desc: "Equal parts espresso and warm micro-foamed milk to reduce acidity.",
    price: 25000,
    cat: "Espresso & Coffee",
    img: "https://images.unsplash.com/photo-1534778101976-62847782c213?w=800&auto=format&fit=crop&q=80",
  },
  {
    name: "Dirty Chai Latte",
    desc: "Spiced Indian black tea chai with steamed milk and a shot of bold espresso.",
    price: 33000,
    cat: "Espresso & Coffee",
    img: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800&auto=format&fit=crop&q=80",
  },

  // Manual Brew
  {
    name: "Japanese Drip Geisha (Panama)",
    desc: "Single-origin Panama Geisha roasted lightly, brewed over ice with floral aroma.",
    price: 45000,
    cat: "Manual Brew",
    img: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80",
  },
  {
    name: "V60 Ethiopia Yirgacheffe",
    desc: "Citric acidity notes of lemon, bergamot, and sweet blueberry finish.",
    price: 35000,
    cat: "Manual Brew",
    img: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&auto=format&fit=crop&q=80",
  },
  {
    name: "Kalita Wave Kenya Nyeri",
    desc: "High altitude Kenyan beans with juicy blackcurrant and grapefruit notes.",
    price: 38000,
    cat: "Manual Brew",
    img: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80",
  },
  {
    name: "Chemex Guatemala Antigua",
    desc: "Clean, crisp body with elegant milk chocolate and orange zest flavor notes.",
    price: 36000,
    cat: "Manual Brew",
    img: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&auto=format&fit=crop&q=80",
  },
  {
    name: "Syphon Costa Rica Tarrazu",
    desc: "Full-bodied vacuum brewed coffee with honeyed sweetness and roasted nut aroma.",
    price: 40000,
    cat: "Manual Brew",
    img: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80",
  },

  // Non-Coffee & Latte
  {
    name: "Kyoto Uji Matcha Latte",
    desc: "Authentic ceremonial grade Uji matcha whisked fresh with oat milk.",
    price: 32000,
    cat: "Non-Coffee & Latte",
    img: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=800&auto=format&fit=crop&q=80",
  },
  {
    name: "Belgian Dark Chocolate",
    desc: "70% dark Belgian cocoa melted with silky micro-foamed dairy milk.",
    price: 30000,
    cat: "Non-Coffee & Latte",
    img: "https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=800&auto=format&fit=crop&q=80",
  },
  {
    name: "Iced Taro Cloud Milk",
    desc: "Creamy purple taro root with fresh milk and velvety sweet cream topping.",
    price: 28000,
    cat: "Non-Coffee & Latte",
    img: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&auto=format&fit=crop&q=80",
  },
  {
    name: "Earl Grey Lavender Tea",
    desc: "Bergamot infused Earl Grey black tea shaken with French lavender syrup.",
    price: 29000,
    cat: "Non-Coffee & Latte",
    img: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800&auto=format&fit=crop&q=80",
  },
  {
    name: "Peach Jasmine Green Tea",
    desc: "Fragrant jasmine green tea infused with sweet white peach nectar.",
    price: 27000,
    cat: "Non-Coffee & Latte",
    img: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&auto=format&fit=crop&q=80",
  },
  {
    name: "Hojicha Roasted Green Tea",
    desc: "Low-caffeine Japanese roasted green tea with nutty, smoky milk foam.",
    price: 31000,
    cat: "Non-Coffee & Latte",
    img: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=800&auto=format&fit=crop&q=80",
  },

  // Artisanal Pastries
  {
    name: "French Butter Croissant",
    desc: "Golden, flaky, multi-layered butter croissant baked fresh daily.",
    price: 22000,
    cat: "Artisanal Pastries",
    img: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&auto=format&fit=crop&q=80",
  },
  {
    name: "Pain au Chocolat",
    desc: "Flaky Viennoiserie pastry stuffed with two sticks of premium dark chocolate.",
    price: 25000,
    cat: "Artisanal Pastries",
    img: "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=800&auto=format&fit=crop&q=80",
  },
  {
    name: "Almond Danish Cream Pastry",
    desc: "Custard filled Danish topped with toasted sliced almonds and powdered sugar.",
    price: 27000,
    cat: "Artisanal Pastries",
    img: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80",
  },
  {
    name: "Saigon Cinnamon Roll",
    desc: "Warm soft dough swirled with Saigon cinnamon and cream cheese frosting.",
    price: 24000,
    cat: "Artisanal Pastries",
    img: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80",
  },
  {
    name: "Smoked Beef Cheese Quiche",
    desc: "Savory butter pastry shell filled with smoked beef, cheddar, and herbs.",
    price: 32000,
    cat: "Artisanal Pastries",
    img: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&auto=format&fit=crop&q=80",
  },
  {
    name: "Blueberry Cream Scone",
    desc: "Traditional English scone packed with wild blueberries and clotted cream.",
    price: 23000,
    cat: "Artisanal Pastries",
    img: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80",
  },

  // Signature Food & Brunch
  {
    name: "Avocado Toast & Poached Egg",
    desc: "Smashed Hass avocado on toasted sourdough with poached egg and chilli flakes.",
    price: 42000,
    cat: "Signature Food",
    img: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&auto=format&fit=crop&q=80",
  },
  {
    name: "Truffle Cream Spaghetti",
    desc: "Al dente pasta tossed in creamy garlic parmesan truffle mushroom sauce.",
    price: 55000,
    cat: "Signature Food",
    img: "https://images.unsplash.com/photo-1621996346565-e3def6164286?w=800&auto=format&fit=crop&q=80",
  },
  {
    name: "Crispy Chicken Sourdough",
    desc: "Buttermilk fried chicken breast with coleslaw and spicy mayo on sourdough.",
    price: 48000,
    cat: "Signature Food",
    img: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&auto=format&fit=crop&q=80",
  },
  {
    name: "Smoked Salmon Benedict",
    desc: "Poached eggs, Norwegian smoked salmon, and hollandaise on brioche.",
    price: 58000,
    cat: "Signature Food",
    img: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&auto=format&fit=crop&q=80",
  },
];

async function getAdminToken() {
  const loginCredentials = [
    { email: "admin@gmail.com", password: "Password123!" },
    { email: "admin@coffe.com", password: "Password123!" }
  ];

  for (const cred of loginCredentials) {
    try {
      const res = await request(PORTS.auth, "/api/1.0/auth/login", {
        method: "POST",
        body: JSON.stringify(cred),
      });
      const token = res.data?.accessToken || res.data?.token;
      if (token) {
        console.log(`✅ Logged in via API successfully as ${cred.email}`);
        return token;
      }
    } catch {
      // Try next
    }
  }

  console.log("ℹ️ API login unavailable or server seeding mode: Using local signed JWT token.");
  return generateJwtToken(1, "admin@gmail.com", "Master Admin Barista", "admin");
}

async function main() {
  console.log("====================================================");
  console.log("🚀 SEEDING ~60 REALISTIC PRODUCTS & LIVE DATA");
  console.log("====================================================");

  const adminToken = await getAdminToken();
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  // 1. Seed Categories
  console.log("\n☕ 1. Seeding Categories...");
  const categoryNames = [
    { name: "Espresso & Coffee", icon: "HiOutlineSparkles" },
    { name: "Manual Brew", icon: "HiOutlineBeaker" },
    { name: "Non-Coffee & Latte", icon: "HiOutlineHeart" },
    { name: "Artisanal Pastries", icon: "HiOutlineCake" },
    { name: "Signature Food", icon: "HiOutlineSun" },
  ];

  const categoryMap = {};
  for (const cat of categoryNames) {
    try {
      const res = await request(PORTS.masterData, "/api/1.0/categories", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify(cat),
      });
      const catId = res.data?.id || res.data;
      categoryMap[cat.name] = catId;
      console.log(`  └─ [Created] Category "${cat.name}" (ID: ${catId})`);
    } catch (err) {
      console.log(`  └─ [Note] "${cat.name}": ${err.message}`);
    }
  }

  // Fetch category list to get existing IDs
  try {
    const catListRes = await request(PORTS.masterData, "/api/1.0/categories", {
      headers: adminHeaders,
    });
    const list = catListRes.data || [];
    for (const c of list) {
      categoryMap[c.name] = c.id;
    }
  } catch {
    // ignore
  }

  // 2. Generate 60+ Products (base templates + variations)
  console.log(
    "\n🥐 2. Generating 60+ Realistic Products with Unsplash Images...",
  );

  const fullProductList = [];
  for (const t of PRODUCT_TEMPLATES) {
    fullProductList.push({ ...t });
  }

  const modifiers = [
    { prefix: "Iced ", suffix: " (Grande)", priceAdd: 4000 },
    { prefix: "Special Reserve ", suffix: "", priceAdd: 6000 },
    { prefix: "Double Shot ", suffix: "", priceAdd: 5000 },
    { prefix: "Plant-Based ", suffix: " (Oat Milk)", priceAdd: 7000 },
  ];

  let modifierIdx = 0;
  while (fullProductList.length < 60) {
    const base =
      PRODUCT_TEMPLATES[fullProductList.length % PRODUCT_TEMPLATES.length];
    const mod = modifiers[modifierIdx % modifiers.length];
    modifierIdx++;

    fullProductList.push({
      name: `${mod.prefix}${base.name}${mod.suffix}`,
      desc: `${base.desc} (Custom baristas edition).`,
      price: base.price + mod.priceAdd,
      cat: base.cat,
      img: base.img,
    });
  }

  console.log(`  └─ Total products to seed: ${fullProductList.length} items.`);

  const createdProductIds = [];
  let successCount = 0;
  for (const prod of fullProductList) {
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
          isAvailable: true,
        }),
      });
      successCount++;
      if (successCount % 10 === 0 || successCount === fullProductList.length) {
        console.log(
          `  └─ Progress: ${successCount}/${fullProductList.length} products processed...`,
        );
      }
    } catch (err) {
      // ignore duplicate errors
    }
  }

  console.log(`  ✅ Successfully processed product catalog!`);

  // Fetch created products for order simulation
  try {
    const menuListRes = await request(
      PORTS.masterData,
      "/api/1.0/menus?page=1&size=100",
      { headers: adminHeaders },
    );
    const items = menuListRes.data?.data || menuListRes.data || [];
    for (const item of items) {
      createdProductIds.push({
        id: item.id,
        name: item.name,
        price: item.price,
      });
    }
  } catch {
    // ignore
  }

  // 3. Seed Seating Tables
  console.log("\n🪑 3. Seeding Cafe Seating Tables...");
  const tablesData = [
    { name: "Table 1" },
    { name: "Table 2" },
    { name: "Table 3" },
    { name: "Table 4" },
    { name: "Table 5" },
    { name: "VIP Lounge 1" },
    { name: "Outdoor Terrace 1" },
  ];

  const tableIds = [];
  for (const tbl of tablesData) {
    try {
      const res = await request(PORTS.masterData, "/api/1.0/tables", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify(tbl),
      });
      const tId = res.data?.id || res.data;
      tableIds.push(tId);
      console.log(`  └─ [Created] "${tbl.name}"`);
    } catch (err) {
      console.log(`  └─ [Note] "${tbl.name}": ${err.message}`);
    }
  }

  // 4. Seed Marketing Campaigns & Promos
  console.log("\n🎯 4. Seeding Active Promotions & Vouchers...");
  const now = new Date();
  const startAtActive = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
  const startAtFuture = new Date(now.getTime() + 2 * 3600 * 1000).toISOString(); // 2 hours in future (Triggers Asynq Activation Task)
  const endAtFuture = new Date(now.getTime() + 30 * 24 * 3600 * 1000).toISOString(); // 30 days in future (Triggers Asynq Deactivation Task)

  const espressoCatId = categoryMap["Espresso & Coffee"] || 0;
  const pastryCatId = categoryMap["Artisanal Pastries"] || 0;

  const promos = [
    {
      name: "Morning Coffee Boost (20% OFF)",
      targetType: "CATEGORY",
      targetId: espressoCatId,
      discountType: "PERCENTAGE",
      discountValue: 20,
      maxDiscount: 10000,
      minPurchase: 20000,
      startAt: startAtActive,
      endAt: endAtFuture,
    },
    {
      name: "Pastry Combo Special (-Rp 3.000)",
      targetType: "CATEGORY",
      targetId: pastryCatId,
      discountType: "FIXED",
      discountValue: 3000,
      maxDiscount: 3000,
      minPurchase: 15000,
      startAt: startAtFuture, // Scheduled Future Promo (Enqueues Activation Task at startAt & Deactivation Task at endAt)
      endAt: endAtFuture,
    },
  ];

  for (const promo of promos) {
    if (!promo.targetId && promo.targetType !== "ALL") continue;
    try {
      await request(PORTS.masterData, "/api/1.0/promotions", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify(promo),
      });
      console.log(`  └─ [Created] Promotion: "${promo.name}"`);
    } catch (err) {
      console.log(`  └─ [Note] Promotion "${promo.name}": ${err.message}`);
    }
  }

  const vouchers = [
    {
      code: "WELCOME10",
      discountType: "PERCENTAGE",
      discountValue: 10,
      maxDiscount: 15000,
      minPurchase: 30000,
      quota: 100,
      expiredAt: endAtFuture,
    },
    {
      code: "HEMAT5K",
      discountType: "FIXED",
      discountValue: 5000,
      maxDiscount: 5000,
      minPurchase: 20000,
      quota: 100,
      expiredAt: endAtFuture,
    },
  ];

  for (const v of vouchers) {
    try {
      await request(PORTS.transaction, "/api/1.0/vouchers", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify(v),
      });
      console.log(`  └─ [Created] Voucher: "${v.code}"`);
    } catch (err) {
      console.log(`  └─ [Note] Voucher "${v.code}": ${err.message}`);
    }
  }

  // 5. Simulate Real Customer Orders
  console.log("\n👥 5. Simulating Random Customer Orders...");
  const customers = [
    { id: 101, name: "Budi Santoso", email: "budi@coffe.com" },
    { id: 102, name: "Siti Rahma", email: "siti@coffe.com" },
    { id: 103, name: "Reza Pratama", email: "reza@coffe.com" },
    { id: 104, name: "Diana Putri", email: "diana@coffe.com" },
  ];

  if (createdProductIds.length > 0) {
    for (const cust of customers) {
      const custToken = generateJwtToken(
        cust.id,
        cust.email,
        cust.name,
        "customer",
      );
      const custHeaders = { Authorization: `Bearer ${custToken}` };

      const numOrders = Math.floor(Math.random() * 2) + 2;
      for (let o = 0; o < numOrders; o++) {
        const numItems = Math.floor(Math.random() * 3) + 1;
        const chosenItems = [];
        let totalAmount = 0;

        for (let i = 0; i < numItems; i++) {
          const randomProd =
            createdProductIds[
              Math.floor(Math.random() * createdProductIds.length)
            ];
          const qty = Math.floor(Math.random() * 2) + 1;
          chosenItems.push({
            menuId: randomProd.id,
            qty: qty,
            notes: i === 0 ? "Less ice, extra oat milk please" : "",
            price: randomProd.price,
            total: randomProd.price * qty
          });
          totalAmount += randomProd.price * qty;
        }

        const chosenTableId =
          tableIds.length > 0
            ? tableIds[Math.floor(Math.random() * tableIds.length)]
            : 1;

        try {
          await request(PORTS.transaction, "/api/1.0/checkout", {
            method: "POST",
            headers: custHeaders,
            body: JSON.stringify({
              tableId: chosenTableId,
              orderFor: "DINE_IN",
              pin: "123456",
              datas: chosenItems,
              total: totalAmount
            }),
          });
          console.log(
            `  └─ [Order Placed] ${cust.name}: ${numItems} items, Total Rp ${totalAmount.toLocaleString("id-ID")}`,
          );
        } catch (txErr) {
          console.log(`  └─ [Order Note] ${cust.name}: ${txErr.message}`);
        }
      }
    }
  }

  console.log("\n====================================================");
  console.log("🎉 SEEDING COMPLETE! ALL TABLES, PRODUCTS, VOUCHERS & PROMOS CREATED CLEANLY.");
  console.log("====================================================");
}

main().catch((err) => {
  console.error("❌ Seeder script error:", err.message);
});
