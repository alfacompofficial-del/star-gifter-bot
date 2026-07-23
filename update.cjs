const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://kpuqkdodgcspopidfuat.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwdXFrZG9kZ2NzcG9waWRmdWF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MjQwMjgsImV4cCI6MjA5MzMwMDAyOH0.OIbSk3jz3uUG6OtQplx1gQK5vaVJ3qq2_sujqUAIeBI";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const priceUpdates = [
  ["Ion 600t-33", 33],
  ["Ion a600-35", 35],
  ["Ion a800-46", 46],
  ["Ion a1500-105", 105],
  ["Ion a2000-145", 145],
  ["Ion v650 -41", 41],
  ["Ion v850-54", 54],
  ["Ion v1000t-67", 67],
  ["Ion v1000-78", 78],
  ["Ion v1000lcd 85", 85],
  ["Ion v1200t-88", 88],
  ["Ion v2000-185", 185],
  ["Ion v2000lcd -190", 190],
  ["Ion v3000 lcd -335", 335],
  ["Ion G2000lcd -440", 440],
  ["Ion g3000lcd 550", 550],
  ["Ion g6000 v2 lcd -1230", 1230],
  ["Ion g10.000 v2 lcd -1500", 1500],
  ["Ion wp 1000lcd -230", 230],
  ["Ion wp 2000lcd -440", 440],
  ["Ion wp 3000lcd -540", 540],
  ["Ion wp 6000lcd -1200", 1200],
  ["Ion wp 10.000 lcd -1400", 1400],
  ["Ion 20KVA G3 PRO", 3800],
  ["ION 30KVA G3 PRO", 4900],
  ["ION 40KVA G3 PRO", 5950],
  ["ION 80KVA 64KW", 13000],
  ["ION 120KVA 96KW", 19000],
  ["REDMI G27Q 2K 200HZ", 165],
  ["Philips 27m2n3500", 195],
  ["Philips 27m2n3500uf", 225],
  ["Redmi x27g", 110],
  ["Mercusys 4g LTE", 26],
  ["Mercusys ms108gp poe", 25],
  ["MERCUSYS MR80X", 32],
  ["Mercusy mr70x ax1800 wifi6", 31],
  ["Mercusys MR62X", 22],
  ["Mercusys MR60X", 23],
  ["MERCUSYS MR47BE", 125],
  ["Mercusys WIFI 7 MR27BE", 55],
  ["Mercusys WIFI 7 MR25BE", 50],
  ["Mercusys MB130-4G", 30],
  ["Mercusys MB115-4G", 30],
  ["Mercusys WI-FI 6E MA86XE", 22],
  ["MERCUSYS WIFI 6E MA80XE", 21],
  ["MERCUSYS WIFI 6E MA70XE", 17],
  ["MERCUSYS WI-FI 6E HALO H80X 3Pck", 90],
  ["MERCUSYS WI-FI 6E HALO H70X 3Pck", 90],
  ["MERCUSYS WI-FI 6E HALO H60X 3Pck", 65],
  ["MERCUSYS WI-FI 6E HALO H50g 3Pck", 65],
  ["MERCUSYS HALO WI-FI 7 H27BE (3-PACK)", 130],
  ["Deco X68 (1-pack) AX3600 Tri-Band", 107],
  ["Deco X60 (3-pack) AX5400", 286],
  ["Deco X60 (2-pack) AX5400", 200],
  ["Deco X60 (1-pack) AX5400", 107],
  ["Deco X55 (3-pack) AX3000 Tri-Band", 229],
  ["Deco X55 (2-pack) AX3000", 157],
  ["Deco X55 (1-pack) AX3000", 86],
  ["Deco X50 Pro (3-pack) AX3000", 250],
  ["Deco X50 Pro (2-pack) AX3000", 186],
  ["Deco X50 Pro (1-pack) AX3000", 107],
  ["Deco X20 (3-pack) AX1800", 200],
  ["Deco X20 (2-pack) AX1800", 143],
  ["Deco X20 (1-pack) AX1800", 79],
  ["Deco M9 Plus (3-pack) AC2200", 229],
  ["Deco M9 Plus (2-pack) AC2200", 157],
  ["Deco M9 Plus (1-pack) AC2200", 86],
  ["Deco M5 (3-pack) AC1300", 143],
  ["Deco M5 (2-pack) AC1300", 107],
  ["Deco M5 (1-pack) AC130", 57],
  ["Deco M4 (3-pack) AC1200", 121],
  ["Deco M4 (2-pack) AC1200", 86],
  ["Deco M4 (1-pack) AC1200", 50],
  ["Deco M3W (3-pack) AC1200", 107],
  ["Deco M3W (2-pack) AC1200", 79],
  ["Deco M3W (1-pack) AC1200", 43],
  ["Archer AX90 AX6600", 286],
  ["Archer AX73 AX5400", 157],
  ["Archer AX50 AX3000", 107],
  ["Archer C80 AC1900", 79],
  ["Archer C6U AC1200", 43],
  ["Archer C6 AC1200", 36],
  ["Archer C50 AC1200", 29],
  ["Archer C24 AC750", 22],
  ["4tb 990 pro", 400],
  ["4tb kingston", 320],
  ["Wd red plus 12TB", 335],
  ["WD RED PLUS 10TB", 299],
  ["WD RED PLUS 8TB", 220],
  ["WD RED PLUS 4TB", 190],
  ["Wd MY PASSPORT 5TB USB", 140],
  ["usb hdd apacer 1tb", 60],
  ["Usb hdd apacer 2tb", 75],
  ["Usb ssd 1tb", 100],
  ["Usp ssd 2tb", 1],
  ["Msi h610", 57],
  ["ULTRA 9285K", 550],
  ["I7 -14700K", 350],
  ["I7 14700kf", 320],
  ["I9 13900k", 395],
  ["Asus RTX 5060 OC 8GB", 350],
  ["ZOTAG GAMING RTX5060 8GB", 340],
  ["Acer AIO 23,8 IPS 120HZ", 515],
  ["Acer AIO 27 IPS 120HZ", 620],
  ["LENOVO AIO 23.8 100HZ IPS", 620],
  ["LENOVO AIO 23.8 100HZ IPS", 660],
  ["Usb DVD", 32],
  ["Aula F75 3 IN 1 GASKET KEYBOARD", 50],
  ["Aula f75 ru RED SWITCH", 35],
  ["Aula f99 pro ru", 60],
  ["Aula s98 pro ru", 60],
  ["Aula sc380 pro", 25],
  ["Yandex stansiya 3", 320],
  ["YANDEX MAX 65W", 370],
  ["Sony M6 Black", 330],
  ["Hopestor A85", 85],
  ["Hopestor A80", 65],
  ["LDT101-C012 White+Blue 24\"-57\" up to 30kg", 56],
  ["LDT99-C024 White 24\"-45\" up to 27kg", 96],
  ["LDT99-C012 White 24\"-57\" up to 27kg", 51],
  ["LDT95-C012 Black+White 24\"-57\" up to 30kg", 51],
  ["LDT94-C012E White 17\"-40\" up to 12kg", 19],
  ["LDT93-C012 Black+White 17\"-45\" up to 16kg", 29],
  ["LDT88-C012 Space Grey+White 17\"-32\" up to 9kg", 16],
  ["LDT85-C024 White 17\"-35\" up to 20kg", 86],
  ["LDT85-C012L White 17\"-49\" up to 20kg RGB Gaming", 64],
  ["LDT81N-C024 White 17\"-35\" up to 20kg", 82],
  ["LDT81N-C012 White 17\"-49\" up to 20kg", 43],
  ["LDT39-C024 Black 17\"-32\" up to 8kg", 75],
  ["LDT39-C012U Black 17\"-32\" up to 8kg", 81],
  ["LDT39-C012 Black 17\"-32\" up to 8kg", 43],
  ["LDT85-C012-KP01 White 17\"-40\" up to 12kg", 43]
];

function normalizeStr(str) {
  return str.toLowerCase().replace(/[\s\-]/g, '').trim();
}

async function run() {
  console.log("Fetching products from Supabase...");
  const { data: products, error } = await supabase.from('products').select('*');
  if (error) {
    console.error("Error fetching:", error);
    return;
  }
  
  console.log(`Found ${products.length} products in DB.`);

  let updatedCount = 0;
  let notFoundCount = 0;

  for (const [targetName, newPrice] of priceUpdates) {
    const normTarget = normalizeStr(targetName);
    const matchedProduct = products.find(p => normalizeStr(p.name).includes(normTarget) || normTarget.includes(normalizeStr(p.name)));
    
    if (matchedProduct) {
      if (matchedProduct.price !== newPrice) {
         console.log(`Updating ${matchedProduct.name} (ID: ${matchedProduct.id}): $${matchedProduct.price} -> $${newPrice}`);
         const { error: updErr } = await supabase.from('products').update({ price: newPrice }).eq('id', matchedProduct.id);
         if (updErr) {
             console.error(`Failed to update ${matchedProduct.name}:`, updErr);
         } else {
             updatedCount++;
         }
      } else {
         console.log(`Skipping ${matchedProduct.name}, price is already $${newPrice}`);
      }
    } else {
      console.log(`⚠️ Not found in DB: "${targetName}"`);
      notFoundCount++;
    }
  }

  console.log(`\nDone! Updated: ${updatedCount}, Not Found: ${notFoundCount}`);
}

run();
