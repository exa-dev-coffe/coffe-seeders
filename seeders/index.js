/**
 * Main Modular Entrypoint for Coffe Shop Seeders & Order Triggers
 * File: seeders/index.js
 * 
 * Usage:
 *   node seeders/index.js seed-products
 *   node seeders/index.js trigger-normal [--days=7] [--ordersPerDay=10]
 *   node seeders/index.js trigger-vouchers [--days=7] [--ordersPerDay=10]
 *   node seeders/index.js trigger-promos [--days=7] [--ordersPerDay=10]
 *   node seeders/index.js trigger-all [--days=7] [--ordersPerDay=10]
 */

const crypto = require("crypto");
const { seedProducts } = require("./products");
const { triggerNormalOrders, triggerVoucherOrders, triggerDiscountOrders } = require("./orders");

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
      sub: String(email),
      iat: now,
      exp: now + 30 * 24 * 3600,

      // Go Claims
      FullName: fullName,
      Email: email,
      UserId: userId,
      Type: "access",
      Role: role,
      RoleId: roleId,
      Permissions: permissions,

      // Java Claims
      fullName: fullName,
      email: email,
      userId: userId,
      type: "ACCESS",
      role: role,
      roleId: roleId,
      permissions: permissions
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

async function main() {
  console.log("====================================================");
  console.log(`🚀 COFFE SHOP SEEDER & ORDER TRIGGER RUNNER`);
  console.log(`   Command: node seeders/index.js ${command}`);
  console.log("====================================================");

  const adminToken = generateJwtToken(1, "admin@gmail.com", "Master Admin", "admin");
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  const contextParams = { days: DAYS, ordersPerDay: ORDERS_PER_DAY, request, PORTS, generateJwtToken, adminHeaders, getPgClients };

  switch (command) {
    case "seed-products":
      await seedProducts(contextParams);
      break;

    case "trigger-normal":
      await triggerNormalOrders(contextParams);
      break;

    case "trigger-vouchers":
      await triggerVoucherOrders(contextParams);
      break;

    case "trigger-promos":
      await triggerDiscountOrders(contextParams);
      break;

    case "trigger-all":
    case "all":
      await seedProducts(contextParams);
      await triggerNormalOrders(contextParams);
      await triggerVoucherOrders(contextParams);
      await triggerDiscountOrders(contextParams);
      break;

    default:
      console.log(`
Available Commands:
  node seeders/index.js seed-products       -> Seed Categories & Products with HD Unsplash Images
  node seeders/index.js trigger-normal     -> Trigger Normal Orders (No Promo/Voucher)
  node seeders/index.js trigger-vouchers   -> Trigger Orders with Vouchers
  node seeders/index.js trigger-promos     -> Trigger Orders with Marketing Promotions & Discounts
  node seeders/index.js trigger-all        -> Execute All Steps In Sequence

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
