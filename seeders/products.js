/**
 * Products & Categories Seeder Module
 * File: seeders/products.js
 */

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

async function seedProducts({ request, PORTS, adminHeaders }) {
  console.log("\n====================================================");
  console.log("☕ SEEDING PRODUCTS & CATEGORIES WITH REAL HD IMAGES");
  console.log("====================================================");

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
    } catch {
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
    } catch {
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

  console.log(`✅ Completed! ${count} products & categories ready.`);
}

module.exports = { seedProducts, PRODUCTS_SEED_DATA };
