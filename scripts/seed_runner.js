/**
 * Modular Seeder & Order Trigger Runner for Coffe Shop Web App
 * Forwarding wrapper to modular seeders/index.js
 * 
 * Usage:
 *   node scripts/seed_runner.js seed-products
 *   node scripts/seed_runner.js trigger-normal [--days=7] [--ordersPerDay=10]
 *   node scripts/seed_runner.js trigger-vouchers [--days=7] [--ordersPerDay=10]
 *   node scripts/seed_runner.js trigger-promos [--days=7] [--ordersPerDay=10]
 *   node scripts/seed_runner.js trigger-all [--days=7] [--ordersPerDay=10]
 */

require("../seeders/index.js");
