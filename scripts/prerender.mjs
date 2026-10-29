import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DIST = resolve(ROOT, "dist");
const BASE_URL = "https://alfacomp.uz";

const RU={a:"a",b:"b",v:"v",g:"g",d:"d",e:"e",yo:"yo",zh:"zh",z:"z",i:"i",y:"y",k:"k",l:"l",m:"m",n:"n",o:"o",p:"p",r:"r",s:"s",t:"t",u:"u",f:"f",kh:"kh",ts:"ts",ch:"ch",sh:"sh",shch:"shch","":"","y2":"y","":"","e2":"e",yu:"yu",ya:"ya"};
const MAP={["\u0430"]:"a",["\u0431"]:"b",["\u0432"]:"v",["\u0433"]:"g",["\u0434"]:"d",["\u0435"]:"e",["\u0451"]:"yo",["\u0436"]:"zh",["\u0437"]:"z",["\u0438"]:"i",["\u0439"]:"y",["\u043a"]:"k",["\u043b"]:"l",["\u043c"]:"m",["\u043d"]:"n",["\u043e"]:"o",["\u043f"]:"p",["\u0440"]:"r",["\u0441"]:"s",["\u0442"]:"t",["\u0443"]:"u",["\u0444"]:"f",["\u0445"]:"kh",["\u0446"]:"ts",["\u0447"]:"ch",["\u0448"]:"sh",["\u0449"]:"shch",["\u044a"]:"",[ "\u044b"]:"y",["\u044c"]:"",[ "\u044d"]:"e",["\u044e"]:"yu",["\u044f"]:"ya"};

function slugify(t){if(!t)return"";return t.toLowerCase().split("").map(c=>MAP[c]??c).join("").replace(/['''<>{}|`^\\[\\]]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").replace(/-{2,}/g,"-");}
function slug(p){return slugify(p.name)+"-"+p.id;}
function eh(s){if(!s)return"";return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");}
function ej(o){return JSON.stringify(o).replace(/<\/script>/gi,"<\\/script>");}
function img(i,id){if(!i)return BASE_URL+"/banner.jpg";const t=String(i).trim();if(t.startsWith("data:")){if(id===97)return BASE_URL+"/products/097_Hopestar_A6_CLUB_%2B_Microphone.png";return BASE_URL+"/banner.jpg";}if(t.match(/^https?:/))return t;if(t.startsWith("/"))return BASE_URL+t;return BASE_URL+"/"+t;}
const CSLUGS={"\u0418\u0411\u041f":"ups","\u041c\u043e\u043d\u0438\u0442\u043e\u0440\u044b":"monitors","\u0421\u0435\u0442\u044c":"networking","\u041a\u043e\u043c\u043f\u043b\u0435\u043a\u0442\u0443\u044e\u0449\u0438\u0435":"components","\u041c\u043e\u043d\u043e\u0431\u043b\u043e\u043a\u0438":"all-in-one","\u0410\u043a\u0441\u0435\u0441\u0441\u0443\u0430\u0440\u044b":"accessories","\u041a\u043e\u043b\u043e\u043d\u043a\u0438":"speakers","\u041a\u0440\u043e\u043d\u0448\u0442\u0435\u0439\u043d\u044b":"mounts","Deco":"deco","Wi-Fi \u0440\u043e\u0443\u0442\u0435\u0440\u044b":"wifi-routers","\u041c\u044b\u0448\u043a\u0438":"mice","\u0412\u0438\u0434\u0435\u043e\u043a\u0430\u0440\u0442\u044b":"videocards","\u041a\u043e\u043c\u043f\u044c\u044e\u0442\u0435\u0440\u044b":"computers","\u041f\u041a":"computers"};
function cs(c){return CSLUGS[c]??slugify(c);}

const CATS={monitors:{name:"\u041c\u043e\u043d\u0438\u0442\u043e\u0440\u044b",t:"\u041a\u0443\u043f\u0438\u0442\u044c \u0438\u0433\u0440\u043e\u0432\u043e\u0439 \u0438\u043b\u0438 \u043e\u0444\u0438\u0441\u043d\u044b\u0439 \u043c\u043e\u043d\u0438\u0442\u043e\u0440 \u0432 \u0422\u0430\u0448\u043a\u0435\u043d\u0442\u0435 \u2014 MSI, ASUS, Dell, LG | AlfaComp",d:"\u0418\u0433\u0440\u043e\u0432\u044b\u0435 \u0438 \u043f\u0440\u043e\u0444\u0435\u0441\u0441\u0438\u043e\u043d\u0430\u043b\u044c\u043d\u044b\u0435 \u043c\u043e\u043d\u0438\u0442\u043e\u0440\u044b 2K, 4K, OLED \u0432 \u0422\u0430\u0448\u043a\u0435\u043d\u0442\u0435. MSI, ASUS, Dell, LG, Samsung. \u041e\u0444\u0438\u0446\u0438\u0430\u043b\u044c\u043d\u0430\u044f \u0433\u0430\u0440\u0430\u043d\u0442\u0438\u044f, \u0434\u043e\u0441\u0442\u0430\u0432\u043a\u0430 \u043f\u043e \u0423\u0437\u0431\u0435\u043a\u0438\u0441\u0442\u0430\u043d\u0443."},ups:{name:"\u0418\u0411\u041f",t:"\u041a\u0443\u043f\u0438\u0442\u044c \u0418\u0411\u041f Ion \u0432 \u0422\u0430\u0448\u043a\u0435\u043d\u0442\u0435 \u2014 \u0437\u0430\u0449\u0438\u0442\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u043e\u0432, \u041f\u041a \u0438 \u0434\u043e\u043c\u0430 | AlfaComp",d:"\u0418\u0411\u041f Ion \u0432 \u0422\u0430\u0448\u043a\u0435\u043d\u0442\u0435: Ion \u0434\u043b\u044f \u041f\u041a, \u0441\u0435\u0440\u0432\u0435\u0440\u043e\u0432 \u0438 \u043c\u0435\u0434\u0442\u0435\u0445\u043d\u0438\u043a\u0438. \u041c\u043e\u0449\u043d\u043e\u0441\u0442\u044c \u043e\u0442 650VA \u0434\u043e 120kVA. \u041e\u0444\u0438\u0446\u0438\u0430\u043b\u044c\u043d\u0430\u044f \u0433\u0430\u0440\u0430\u043d\u0442\u0438\u044f AlfaComp."},components:{name:"\u041a\u043e\u043c\u043f\u043b\u0435\u043a\u0442\u0443\u044e\u0449\u0438\u0435",t:"\u041a\u0443\u043f\u0438\u0442\u044c \u043a\u043e\u043c\u043f\u043b\u0435\u043a\u0442\u0443\u044e\u0449\u0438\u0435 \u0434\u043b\u044f \u041f\u041a \u0432 \u0422\u0430\u0448\u043a\u0435\u043d\u0442\u0435 | AlfaComp",d:"\u041a\u043e\u043c\u043f\u043b\u0435\u043a\u0442\u0443\u044e\u0449\u0438\u0435 \u0434\u043b\u044f \u0441\u0431\u043e\u0440\u043a\u0438 \u041f\u041a \u0432 \u0422\u0430\u0448\u043a\u0435\u043d\u0442\u0435: \u0432\u0438\u0434\u0435\u043e\u043a\u0430\u0440\u0442\u044b RTX, DDR4/DDR5, NVMe SSD. \u0413\u0430\u0440\u0430\u043d\u0442\u0438\u044f AlfaComp."},networking:{name:"\u0421\u0435\u0442\u044c",t:"\u0421\u0435\u0442\u0435\u0432\u043e\u0435 \u043e\u0431\u043e\u0440\u0443\u0434\u043e\u0432\u0430\u043d\u0438\u0435 \u0432 \u0422\u0430\u0448\u043a\u0435\u043d\u0442\u0435 | AlfaComp",d:"\u041f\u0440\u043e\u0444\u0435\u0441\u0441\u0438\u043e\u043d\u0430\u043b\u044c\u043d\u043e\u0435 \u0441\u0435\u0442\u0435\u0432\u043e\u0435 \u043e\u0431\u043e\u0440\u0443\u0434\u043e\u0432\u0430\u043d\u0438\u0435 \u0432 \u0422\u0430\u0448\u043a\u0435\u043d\u0442\u0435: \u043a\u043e\u043c\u043c\u0443\u0442\u0430\u0442\u043e\u0440\u044b, \u043f\u0430\u0442\u0447-\u043a\u043e\u0440\u0434\u044b, \u0441\u0435\u0442\u0435\u0432\u044b\u0435 \u043a\u0430\u0440\u0442\u044b. AlfaComp."},"wifi-routers":{name:"Wi-Fi \u0440\u043e\u0443\u0442\u0435\u0440\u044b",t:"\u041a\u0443\u043f\u0438\u0442\u044c Wi-Fi \u0440\u043e\u0443\u0442\u0435\u0440 \u0432 \u0422\u0430\u0448\u043a\u0435\u043d\u0442\u0435 \u2014 Wi-Fi 6 \u0438 Wi-Fi 7 | AlfaComp",d:"\u0421\u043e\u0432\u0440\u0435\u043c\u0435\u043d\u043d\u044b\u0435 Wi-Fi \u0440\u043e\u0443\u0442\u0435\u0440\u044b Wi-Fi 6 \u0438 Wi-Fi 7 \u0432 \u0422\u0430\u0448\u043a\u0435\u043d\u0442\u0435. \u0412\u044b\u0441\u043e\u043a\u0430\u044f \u0441\u043a\u043e\u0440\u043e\u0441\u0442\u044c, \u0441\u0442\u0430\u0431\u0438\u043b\u044c\u043d\u043e\u0435 \u043f\u043e\u043a\u0440\u044b\u0442\u0438\u0435. AlfaComp."},deco:{name:"Deco",t:"\u041a\u0443\u043f\u0438\u0442\u044c Mesh-\u0441\u0438\u0441\u0442\u0435\u043c\u044b Deco \u0432 \u0422\u0430\u0448\u043a\u0435\u043d\u0442\u0435 | AlfaComp",d:"Mesh-\u0441\u0438\u0441\u0442\u0435\u043c\u044b TP-Link Deco \u0432 \u0422\u0430\u0448\u043a\u0435\u043d\u0442\u0435: \u0431\u0435\u0441\u0448\u043e\u0432\u043d\u044b\u0439 Wi-Fi \u0434\u043b\u044f \u043a\u0432\u0430\u0440\u0442\u0438\u0440 \u0438 \u043e\u0444\u0438\u0441\u043e\u0432. AlfaComp."},"all-in-one":{name:"\u041c\u043e\u043d\u043e\u0431\u043b\u043e\u043a\u0438",t:"\u041a\u0443\u043f\u0438\u0442\u044c \u043c\u043e\u043d\u043e\u0431\u043b\u043e\u043a \u0432 \u0422\u0430\u0448\u043a\u0435\u043d\u0442\u0435 | AlfaComp",d:"\u041c\u043e\u043d\u043e\u0431\u043b\u043e\u043a\u0438 Intel \u0438 AMD \u0432 \u0422\u0430\u0448\u043a\u0435\u043d\u0442\u0435. \u0418\u043f\u0441-\u044d\u043a\u0440\u0430\u043d, \u044d\u043a\u043e\u043d\u043e\u043c\u0438\u044f \u043f\u0440\u043e\u0441\u0442\u0440\u0430\u043d\u0441\u0442\u0432\u0430. AlfaComp."},accessories:{name:"\u0410\u043a\u0441\u0435\u0441\u0441\u0443\u0430\u0440\u044b",t:"\u041a\u043e\u043c\u043f\u044c\u044e\u0442\u0435\u0440\u043d\u044b\u0435 \u0430\u043a\u0441\u0435\u0441\u0441\u0443\u0430\u0440\u044b \u0432 \u0422\u0430\u0448\u043a\u0435\u043d\u0442\u0435 | AlfaComp",d:"\u041a\u0430\u0447\u0435\u0441\u0442\u0432\u0435\u043d\u043d\u044b\u0435 \u0430\u043a\u0441\u0435\u0441\u0441\u0443\u0430\u0440\u044b \u0434\u043b\u044f \u043a\u043e\u043c\u043f\u044c\u044e\u0442\u0435\u0440\u043e\u0432 \u0432 \u0422\u0430\u0448\u043a\u0435\u043d\u0442\u0435. AlfaComp."},mounts:{name:"\u041a\u0440\u043e\u043d\u0448\u0442\u0435\u0439\u043d\u044b",t:"\u041a\u0443\u043f\u0438\u0442\u044c \u043a\u0440\u043e\u043d\u0448\u0442\u0435\u0439\u043d\u044b \u0434\u043b\u044f \u043c\u043e\u043d\u0438\u0442\u043e\u0440\u043e\u0432 \u0432 \u0422\u0430\u0448\u043a\u0435\u043d\u0442\u0435 | AlfaComp",d:"\u042d\u0440\u0433\u043e\u043d\u043e\u043c\u0438\u0447\u043d\u044b\u0435 \u043a\u0440\u043e\u043d\u0448\u0442\u0435\u0439\u043d\u044b VESA \u0434\u043b\u044f \u043c\u043e\u043d\u0438\u0442\u043e\u0440\u043e\u0432 \u0432 \u0422\u0430\u0448\u043a\u0435\u043d\u0442\u0435. AlfaComp."},speakers:{name:"\u041a\u043e\u043b\u043e\u043d\u043a\u0438",t:"\u041a\u0443\u043f\u0438\u0442\u044c \u043a\u043e\u043b\u043e\u043d\u043a\u0438 \u0434\u043b\u044f \u041f\u041a \u0432 \u0422\u0430\u0448\u043a\u0435\u043d\u0442\u0435 | AlfaComp",d:"\u0410\u043a\u0443\u0441\u0442\u0438\u0447\u0435\u0441\u043a\u0438\u0435 \u0441\u0438\u0441\u0442\u0435\u043c\u044b \u0438 \u043a\u043e\u043b\u043e\u043d\u043a\u0438 \u0434\u043b\u044f \u041f\u041a \u0432 \u0422\u0430\u0448\u043a\u0435\u043d\u0442\u0435. \u0427\u0438\u0441\u0442\u044b\u0439 \u0437\u0432\u0443\u043a. AlfaComp."},mice:{name:"\u041c\u044b\u0448\u043a\u0438",t:"\u041a\u0443\u043f\u0438\u0442\u044c \u043c\u044b\u0448\u044c \u0432 \u0422\u0430\u0448\u043a\u0435\u043d\u0442\u0435 \u2014 \u0438\u0433\u0440\u043e\u0432\u044b\u0435 \u0438 \u0431\u0435\u0441\u043f\u0440\u043e\u0432\u043e\u0434\u043d\u044b\u0435 | AlfaComp",d:"\u0418\u0433\u0440\u043e\u0432\u044b\u0435 \u0438 \u043e\u0444\u0438\u0441\u043d\u044b\u0435 \u043c\u044b\u0448\u0438 \u0432 \u0422\u0430\u0448\u043a\u0435\u043d\u0442\u0435. AlfaComp."},videocards:{name:"\u0412\u0438\u0434\u0435\u043e\u043a\u0430\u0440\u0442\u044b",t:"\u041a\u0443\u043f\u0438\u0442\u044c \u0432\u0438\u0434\u0435\u043e\u043a\u0430\u0440\u0442\u0443 \u0432 \u0422\u0430\u0448\u043a\u0435\u043d\u0442\u0435 \u2014 NVIDIA GeForce RTX | AlfaComp",d:"\u041e\u0440\u0438\u0433\u0438\u043d\u0430\u043b\u044c\u043d\u044b\u0435 \u0432\u0438\u0434\u0435\u043e\u043a\u0430\u0440\u0442\u044b NVIDIA GeForce RTX \u0432 \u0422\u0430\u0448\u043a\u0435\u043d\u0442\u0435. AlfaComp.uz."},computers:{name:"\u041a\u043e\u043c\u043f\u044c\u044e\u0442\u0435\u0440\u044b",t:"\u041a\u0443\u043f\u0438\u0442\u044c \u043a\u043e\u043c\u043f\u044c\u044e\u0442\u0435\u0440 \u0432 \u0422\u0430\u0448\u043a\u0435\u043d\u0442\u0435 \u2014 \u0438\u0433\u0440\u043e\u0432\u044b\u0435 \u041f\u041a \u0438 \u0440\u0430\u0431\u043e\u0447\u0438\u0435 \u0441\u0442\u0430\u043d\u0446\u0438\u0438 | AlfaComp",d:"\u041a\u0443\u043f\u0438\u0442\u044c \u0433\u043e\u0442\u043e\u0432\u044b\u0439 \u043a\u043e\u043c\u043f\u044c\u044e\u0442\u0435\u0440 \u0438\u043b\u0438 \u0441\u0431\u043e\u0440\u043a\u0430 \u041f\u041a \u0432 \u0422\u0430\u0448\u043a\u0435\u043d\u0442\u0435. \u0418\u0433\u0440\u043e\u0432\u044b\u0435 \u0441 RTX. \u0413\u0430\u0440\u0430\u043d\u0442\u0438\u044f 3 \u043b\u0435\u0442. AlfaComp.uz"}};

async function fp(){
  const u=process.env.VITE_SUPABASE_URL||"https://vtlzfcjxpnrsqlsrvyer.supabase.co";
  const k=process.env.VITE_SUPABASE_PUBLISHABLE_KEY||"sb_publishable_Ieiof0ojLifGDUpgD6ldVA_utmqM2nZ";
  console.log("[prerender] Fetching products...");
  for(let i=1;i<=3;i++){
    try{
      const r=await fetch(u+"/rest/v1/products?select=id,name,category,image,price,in_stock&order=id.asc",{headers:{apikey:k,Authorization:"Bearer "+k}});
      if(!r.ok)throw new Error("HTTP "+r.status);
      const d=await r.json();
      if(!Array.isArray(d)||d.length<50)throw new Error("Only "+d.length+" products");
      return d;
    }catch(e){console.warn("[prerender] Attempt "+i+"/3: "+e.message);if(i<3)await new Promise(r=>setTimeout(r,1500));}
  }
  throw new Error("FATAL: Could not fetch products");
}

const KEYWORDS_FILE = resolve(__dirname, "category_keywords_map.json");
let KEYWORDS_MAP = {};
let HOME_KEYWORDS_STR = "";
if (existsSync(KEYWORDS_FILE)) {
  try {
    const rawK = JSON.parse(readFileSync(KEYWORDS_FILE, "utf-8"));
    KEYWORDS_MAP = rawK.category_keywords || {};
    HOME_KEYWORDS_STR = (rawK.home_keywords || []).slice(0, 15).join(", ");
  } catch (e) {
    console.warn("[prerender] Could not read category_keywords_map.json:", e.message);
  }
}

function inj(raw, { title, desc, canon, oimg, otype, noindex, schemas, keywords, subject, topic, oalt, isHome }) {
  let h = raw;

  // --- 1. Strip hreflang tags from all non-home pages ---
  if (!isHome) {
    h = h.replace(/<link\s+rel="alternate"\s+hreflang="[^"]*"\s+href="[^"]*"\s*\/?>/gi, "");
  }

  // --- 2. Strip the BreadcrumbList from index.html that would leak to all pages ---
  // Remove the static breadcrumb script block (home-only, 1 item)
  h = h.replace(/<script\s+type="application\/ld\+json">\s*\{\s*"@context"\s*:\s*"https:\/\/schema\.org"\s*,\s*"@type"\s*:\s*"BreadcrumbList"[\s\S]*?<\/script>/gi, "");

  // --- 3. Replace title and description ---
  h = h.replace(/<title>[^<]*<\/title>/, "<title>" + eh(title) + "</title>");
  h = h.replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i, '<meta name="description" content="' + eh(desc) + '" />');

  // --- 4. Update optional meta tags ---
  if (keywords) {
    h = h.replace(/<meta\s+name="keywords"\s+content="[^"]*"\s*\/?>/i, '<meta name="keywords" content="' + eh(keywords) + '" />');
  }
  if (subject) {
    h = h.replace(/<meta\s+name="subject"\s+content="[^"]*"\s*\/?>/i, '<meta name="subject" content="' + eh(subject) + '" />');
  }
  if (topic) {
    h = h.replace(/<meta\s+name="topic"\s+content="[^"]*"\s*\/?>/i, '<meta name="topic" content="' + eh(topic) + '" />');
  }

  // --- 5. Strip all OG/Twitter/canonical tags from index.html (will be re-injected below) ---
  h = h.replace(/<meta\s+property="og:title"\s+content="[^"]*"\s*\/>/g, "");
  h = h.replace(/<meta\s+property="og:description"\s+content="[^"]*"\s*\/>/g, "");
  h = h.replace(/<meta\s+property="og:url"\s+content="[^"]*"\s*\/>/g, "");
  h = h.replace(/<meta\s+property="og:type"\s+content="[^"]*"\s*\/>/g, "");
  h = h.replace(/<meta\s+property="og:locale[^"]*"\s+content="[^"]*"\s*\/?>/gi, "");
  h = h.replace(/<meta\s+property="og:image"\s+content="[^"]*"\s*\/>/g, "");
  h = h.replace(/<meta\s+property="og:image:width"\s+content="[^"]*"\s*\/>/g, "");
  h = h.replace(/<meta\s+property="og:image:height"\s+content="[^"]*"\s*\/>/g, "");
  h = h.replace(/<meta\s+property="og:image:alt"\s+content="[^"]*"\s*\/>/g, "");
  h = h.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/>/g, "");
  h = h.replace(/<meta\s+name="twitter:card"\s+content="[^"]*"\s*\/>/g, "");
  h = h.replace(/<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/>/g, "");
  h = h.replace(/<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/>/g, "");
  h = h.replace(/<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/>/g, "");

  // --- 6. Strip existing robots tag; will restore correctly below ---
  h = h.replace(/<meta\s+[^>]*name=["']robots["'][^>]*\/?>/gi, "");

  // Determine og:image alt text
  const imgAlt = oalt || title || "AlfaComp — компьютеры, мониторы и комплектующие в Ташкенте";
  // Determine image dimensions (use 1200×630 for banners, square-ish for product images)
  const isProductImg = oimg && !oimg.includes("banner.jpg");
  const imgW = isProductImg ? "800" : "1200";
  const imgH = isProductImg ? "800" : "630";

  const x = [
    // 3. Robots: always restore with max-image-preview:large for indexable pages, noindex for user pages
    noindex
      ? '<meta name="robots" content="noindex, follow" />'
      : '<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />',
    // Canonical — always inject (fixes missing canonical on home page)
    '<link rel="canonical" href="' + eh(canon) + '" />',
    '<meta property="og:locale" content="ru_RU" />',
    // OG tags with proper width/height/alt
    '<meta property="og:title" content="' + eh(title) + '" />',
    '<meta property="og:description" content="' + eh(desc) + '" />',
    '<meta property="og:image" content="' + eh(oimg) + '" />',
    '<meta property="og:image:width" content="' + imgW + '" />',
    '<meta property="og:image:height" content="' + imgH + '" />',
    '<meta property="og:image:alt" content="' + eh(imgAlt) + '" />',
    '<meta property="og:url" content="' + eh(canon) + '" />',
    '<meta property="og:type" content="' + eh(otype || "website") + '" />',
    // Twitter
    '<meta name="twitter:card" content="summary_large_image" />',
    '<meta name="twitter:title" content="' + eh(title) + '" />',
    '<meta name="twitter:description" content="' + eh(desc) + '" />',
    '<meta name="twitter:image" content="' + eh(oimg) + '" />',
    // LD+JSON schemas
    ...(schemas || []).map(s => '<script type="application/ld+json">' + ej(s) + '</script>'),
  ].join("\n    ");
  h = h.replace("</head>", "    " + x + "\n  </head>");
  return h;
}

function wp(rel,html){
  const f=resolve(DIST,rel,"index.html");const dir=dirname(f);
  if(!existsSync(dir))mkdirSync(dir,{recursive:true});
  writeFileSync(f,html,"utf-8");
  if(rel&&!rel.endsWith(".html")){
    const fHtml=resolve(DIST,rel+".html");const dirHtml=dirname(fHtml);
    if(!existsSync(dirHtml))mkdirSync(dirHtml,{recursive:true});
    writeFileSync(fHtml,html,"utf-8");
  }
}

async function main(){
  const ip=resolve(DIST,"index.html");
  if(!existsSync(ip)){console.error("[prerender] dist/index.html not found");process.exit(1);}
  const base=readFileSync(ip,"utf-8");
  let pc=0;
  const prods=await fp().catch(e=>{console.error("[prerender]",e.message);process.exit(1);});
  console.log("[prerender] Got "+prods.length+" products");
  for(const p of prods){
    if(!p.id||!p.name)continue;
    const s=slug(p);const url=BASE_URL+"/product/"+s;const im=img(p.image, p.id);const cat=cs(p.category||"");
    const priceUZS = (p.price && p.price < 5000) ? Math.round(p.price * 14000) : (p.price || 0);
    const priceFormatted = priceUZS > 0 ? String(priceUZS).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '';
    const priceStr = priceFormatted ? ` Цена: ${priceFormatted} сум.` : '';
    const pDesc = `Купить ${p.name} в Ташкенте.${priceStr} Официальная гарантия и доставка по Узбекистану — AlfaComp.uz.`;
    const pKeywords = `${p.name}, купить ${p.name} в Ташкенте, ${p.category || ""}, цена ${p.name}, характеристики, магазин электроники Ташкент, AlfaComp, доставка по Узбекистану`;
    wp("product/"+s,inj(base,{
      title:p.name+" — купить в Ташкенте | AlfaComp",
      desc: pDesc,
      keywords: pKeywords,
      subject: `${p.name} — купить в Ташкенте`,
      topic: p.category || "Компьютерная техника",
      oalt: `${p.name} — купить в Ташкенте | AlfaComp`,
      canon:url,oimg:im,otype:"product",
      schemas:[
        {"@context":"https://schema.org","@type":"Product","name":p.name,"description":pDesc,"image":[im],"sku":"ALFA-"+p.id,
         "offers":{"@type":"Offer","url":url,"priceCurrency":"UZS","price":priceUZS,
           "availability":p.in_stock!==false?"https://schema.org/InStock":"https://schema.org/OutOfStock",
           "itemCondition":"https://schema.org/NewCondition",
           "seller":{"@type":"Organization","name":"AlfaComp","url":BASE_URL+"/"}}},
        {"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[
          {"@type":"ListItem","position":1,"name":"Главная","item":BASE_URL+"/"},
          {"@type":"ListItem","position":2,"name":p.category||"Каталог","item":BASE_URL+"/category/"+cat},
          {"@type":"ListItem","position":3,"name":p.name,"item":url},
        ]},
      ],
    }));
    pc++;
  }
  console.log("[prerender] OK "+pc+" product pages");
  let cc=0;
  for(const[cs2,seo]of Object.entries(CATS)){
    const url=BASE_URL+"/category/"+cs2;
    const catKwArr = KEYWORDS_MAP[cs2] || [];
    const catKw = Array.isArray(catKwArr) && catKwArr.length > 0 ? catKwArr.slice(0, 15).join(", ") : (HOME_KEYWORDS_STR.split(", ").slice(0, 15).join(", "));
    const catHtml=inj(base,{
      title:seo.t,
      desc:seo.d,
      keywords: catKw,
      subject: `${seo.name} в Ташкенте`,
      topic: seo.name,
      canon:url,
      oimg:BASE_URL+"/banner.jpg",
      schemas:[{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[
        {"@type":"ListItem","position":1,"name":"Главная","item":BASE_URL+"/"},
        {"@type":"ListItem","position":2,"name":seo.name,"item":url},
      ]}],
    });
    wp("category/"+cs2,catHtml);
    wp(cs2,catHtml);
    cc+=2;
  }
  wp("gpu",inj(base,{
    title:CATS.videocards.t,
    desc:CATS.videocards.d,
    keywords: KEYWORDS_MAP["videocards"] || HOME_KEYWORDS_STR,
    subject: "Видеокарты в Ташкенте",
    topic: "Видеокарты",
    canon:BASE_URL+"/category/videocards",
    oimg:BASE_URL+"/banner.jpg"
  }));
  cc++;
  console.log("[prerender] OK "+cc+" category routes");

  const catHubHtml=inj(base,{
    title:"Каталог компьютерной техники и мониторов в Ташкенте | AlfaComp",
    desc:"Полный каталог техники AlfaComp в Ташкенте: игровые ПК, мониторы 144–360 Гц, комплектующие, ИБП Ion, сетевое оборудование. Официальная гарантия, быстрая доставка по Узбекистану.",
    keywords: "каталог компьютерной техники Ташкент, купить компьютер, купить монитор, комплектующие для ПК, видеокарты RTX, ИБП Ion, Wi-Fi роутеры, моноблоки, мыши, кронштейны, AlfaComp",
    subject: "Каталог компьютерной техники и мониторов в Ташкенте",
    topic: "Компьютерная техника",
    canon:BASE_URL+"/catalog",
    oimg:BASE_URL+"/banner.jpg",
  });
  wp("category",catHubHtml);
  wp("catalog",catHubHtml);
  wp("products",catHubHtml);
  console.log("[prerender] OK 3 catalog hub routes (/category, /catalog, /products)");

  const SP=[
    {p:"about",t:"\u041e \u043a\u043e\u043c\u043f\u0430\u043d\u0438\u0438 AlfaComp \u2014 \u043c\u0430\u0433\u0430\u0437\u0438\u043d \u043a\u043e\u043c\u043f\u044c\u044e\u0442\u0435\u0440\u043e\u0432 \u0432 \u0422\u0430\u0448\u043a\u0435\u043d\u0442\u0435",d:"AlfaComp \u2014 \u043e\u0444\u0438\u0446\u0438\u0430\u043b\u044c\u043d\u044b\u0439 \u0434\u0438\u043b\u0435\u0440 MSI, ASUS, Dell, LG \u0432 \u0422\u0430\u0448\u043a\u0435\u043d\u0442\u0435. \u041f\u0440\u043e\u0434\u0430\u0436\u0430 \u041f\u041a, \u043c\u043e\u043d\u0438\u0442\u043e\u0440\u043e\u0432, \u0418\u0411\u041f \u0441 \u0433\u0430\u0440\u0430\u043d\u0442\u0438\u0435\u0439 \u0434\u043e 3 \u043b\u0435\u0442.",c:BASE_URL+"/about"},
    {p:"delivery",t:"\u0414\u043e\u0441\u0442\u0430\u0432\u043a\u0430 \u0438 \u043e\u043f\u043b\u0430\u0442\u0430 \u2014 AlfaComp \u0422\u0430\u0448\u043a\u0435\u043d\u0442",d:"\u0423\u0441\u043b\u043e\u0432\u0438\u044f \u0434\u043e\u0441\u0442\u0430\u0432\u043a\u0438 AlfaComp: \u043a\u0443\u0440\u044c\u0435\u0440, \u0441\u0430\u043c\u043e\u0432\u044b\u0432\u043e\u0437, Payme, Click. \u0414\u043e\u0441\u0442\u0430\u0432\u043a\u0430 \u043f\u043e \u0423\u0437\u0431\u0435\u043a\u0438\u0441\u0442\u0430\u043d\u0443.",c:BASE_URL+"/delivery"},
    {p:"warranty",t:"\u0413\u0430\u0440\u0430\u043d\u0442\u0438\u044f \u0438 \u0432\u043e\u0437\u0432\u0440\u0430\u0442 \u2014 AlfaComp \u0422\u0430\u0448\u043a\u0435\u043d\u0442",d:"\u041e\u0444\u0438\u0446\u0438\u0430\u043b\u044c\u043d\u0430\u044f \u0433\u0430\u0440\u0430\u043d\u0442\u0438\u044f \u0432 AlfaComp \u2014 \u043e\u0442 1 \u0434\u043e 3 \u043b\u0435\u0442. \u0423\u0441\u043b\u043e\u0432\u0438\u044f \u0432\u043e\u0437\u0432\u0440\u0430\u0442\u0430 \u0438 \u043e\u0431\u043c\u0435\u043d\u0430.",c:BASE_URL+"/warranty"},
    {p:"contacts",t:"\u041a\u043e\u043d\u0442\u0430\u043a\u0442\u044b AlfaComp \u2014 \u0430\u0434\u0440\u0435\u0441 \u0438 \u0442\u0435\u043b\u0435\u0444\u043e\u043d",d:"\u041c\u0430\u0433\u0430\u0437\u0438\u043d AlfaComp: \u0431\u0430\u0437\u0430\u0440 \u00ab\u041c\u0430\u043b\u0438\u043a\u0430\u00bb, \u0431\u043b\u043e\u043a \u042127, \u0422\u0430\u0448\u043a\u0435\u043d\u0442. \u0422\u0435\u043b: +998 88 320 33 33. \u0420\u0430\u0431\u043e\u0442\u0430: 09:00\u201319:00.",c:BASE_URL+"/contacts"},
    {p:"guides",t:"\u0420\u0443\u043a\u043e\u0432\u043e\u0434\u0441\u0442\u0432\u0430 \u043f\u043e \u0432\u044b\u0431\u043e\u0440\u0443 \u041f\u041a \u2014 AlfaComp \u0431\u043b\u043e\u0433",d:"\u041f\u043e\u043b\u0435\u0437\u043d\u044b\u0435 \u0441\u0442\u0430\u0442\u044c\u0438 \u0438 \u0433\u0430\u0439\u0434\u044b \u043f\u043e \u0432\u044b\u0431\u043e\u0440\u0443 \u043a\u043e\u043c\u043f\u044c\u044e\u0442\u0435\u0440\u043e\u0432, \u043c\u043e\u043d\u0438\u0442\u043e\u0440\u043e\u0432 \u0438 \u0418\u0411\u041f \u043e\u0442 \u044d\u043a\u0441\u043f\u0435\u0440\u0442\u043e\u0432 AlfaComp.",c:BASE_URL+"/guides"},
    {p:"blog",t:"\u0420\u0443\u043a\u043e\u0432\u043e\u0434\u0441\u0442\u0432\u0430 \u043f\u043e \u0432\u044b\u0431\u043e\u0440\u0443 \u041f\u041a \u2014 AlfaComp \u0431\u043b\u043e\u0433",d:"\u041f\u043e\u043b\u0435\u0437\u043d\u044b\u0435 \u0441\u0442\u0430\u0442\u044c\u0438 \u0438 \u0433\u0430\u0439\u0434\u044b \u043f\u043e \u0432\u044b\u0431\u043e\u0440\u0443 \u043a\u043e\u043c\u043f\u044c\u044e\u0442\u0435\u0440\u043e\u0432, \u043c\u043e\u043d\u0438\u0442\u043e\u0440\u043e\u0432 \u0438 \u0418\u0411\u041f \u043e\u0442 \u044d\u043a\u0441\u043f\u0435\u0440\u0442\u043e\u0432 AlfaComp.",c:BASE_URL+"/guides"},
    {p:"articles",t:"\u0420\u0443\u043a\u043e\u0432\u043e\u0434\u0441\u0442\u0432\u0430 \u043f\u043e \u0432\u044b\u0431\u043e\u0440\u0443 \u041f\u041a \u2014 AlfaComp \u0431\u043b\u043e\u0433",d:"\u041f\u043e\u043b\u0435\u0437\u043d\u044b\u0435 \u0441\u0442\u0430\u0442\u044c\u0438 \u0438 \u0433\u0430\u0439\u0434\u044b \u043f\u043e \u0432\u044b\u0431\u043e\u0440\u0443 \u043a\u043e\u043c\u043f\u044c\u044e\u0442\u0435\u0440\u043e\u0432, \u043c\u043e\u043d\u0438\u0442\u043e\u0440\u043e\u0432 \u0438 \u0418\u0411\u041f \u043e\u0442 \u044d\u043a\u0441\u043f\u0435\u0440\u0442\u043e\u0432 AlfaComp.",c:BASE_URL+"/guides"},
    {p:"download",t:"\u0421\u043a\u0430\u0447\u0430\u0442\u044c Android \u043f\u0440\u0438\u043b\u043e\u0436\u0435\u043d\u0438\u0435 \u2014 AlfaComp",d:"\u0421\u043a\u0430\u0447\u0430\u0439\u0442\u0435 \u043e\u0444\u0438\u0446\u0438\u0430\u043b\u044c\u043d\u043e\u0435 \u043c\u043e\u0431\u0438\u043b\u044c\u043d\u043e\u0435 \u043f\u0440\u0438\u043b\u043e\u0436\u0435\u043d\u0438\u0435 AlfaComp \u0434\u043b\u044f Android. \u041a\u0430\u0442\u0430\u043b\u043e\u0433 \u0442\u0435\u0445\u043d\u0438\u043a\u0438 \u0432 \u0432\u0430\u0448\u0435\u043c \u0441\u043c\u0430\u0440\u0442\u0444\u043e\u043d\u0435.",c:BASE_URL+"/download"},
  ];
  for(const pg of SP){
    wp(pg.p,inj(base,{title:pg.t,desc:pg.d,canon:pg.c,oimg:BASE_URL+"/banner.jpg"}));
  }
  console.log("[prerender] OK "+SP.length+" info pages");

  const userPages=[
    {p:"cart",t:"\u041a\u043e\u0440\u0437\u0438\u043d\u0430 \u043f\u043e\u043a\u0443\u043f\u043e\u043a \u2014 AlfaComp",d:"\u041a\u043e\u0440\u0437\u0438\u043d\u0430 \u0438\u043d\u0442\u0435\u0440\u043d\u0435\u0442-\u043c\u0430\u0433\u0430\u0437\u0438\u043d\u0430 \u043a\u043e\u043c\u043f\u044c\u044e\u0442\u0435\u0440\u043d\u043e\u0439 \u0442\u0435\u0445\u043d\u0438\u043a\u0438 AlfaComp.",c:BASE_URL+"/cart"},
    {p:"checkout",t:"\u041e\u0444\u043e\u0440\u043c\u043b\u0435\u043d\u0438\u0435 \u0437\u0430\u043a\u0430\u0437\u0430 \u2014 AlfaComp",d:"\u041e\u0444\u043e\u0440\u043c\u043b\u0435\u043d\u0438\u0435 \u0437\u0430\u043a\u0430\u0437\u0430 \u0432 \u043c\u0430\u0433\u0430\u0437\u0438\u043d\u0435 \u0442\u0435\u0445\u043d\u0438\u043a\u0438 AlfaComp.",c:BASE_URL+"/cart"},
    {p:"basket",t:"\u041a\u043e\u0440\u0437\u0438\u043d\u0430 \u043f\u043e\u043a\u0443\u043f\u043e\u043a \u2014 AlfaComp",d:"\u041a\u043e\u0440\u0437\u0438\u043d\u0430 \u0438\u043d\u0442\u0435\u0440\u043d\u0435\u0442-\u043c\u0430\u0433\u0430\u0437\u0438\u043d\u0430 \u043a\u043e\u043c\u043f\u044c\u044e\u0442\u0435\u0440\u043d\u043e\u0439 \u0442\u0435\u0445\u043d\u0438\u043a\u0438 AlfaComp.",c:BASE_URL+"/cart"},
    {p:"korzina",t:"\u041a\u043e\u0440\u0437\u0438\u043d\u0430 \u043f\u043e\u043a\u0443\u043f\u043e\u043a \u2014 AlfaComp",d:"\u041a\u043e\u0440\u0437\u0438\u043d\u0430 \u0438\u043d\u0442\u0435\u0440\u043d\u0435\u0442-\u043c\u0430\u0433\u0430\u0437\u0438\u043d\u0430 \u043a\u043e\u043c\u043f\u044c\u044e\u0442\u0435\u0440\u043d\u043e\u0439 \u0442\u0435\u0445\u043d\u0438\u043a\u0438 AlfaComp.",c:BASE_URL+"/cart"},
    {p:"profile",t:"\u041b\u0438\u0447\u043d\u044b\u0439 \u043a\u0430\u0431\u0438\u043d\u0435\u0442 \u043f\u043e\u043a\u0443\u043f\u0430\u0442\u0435\u043b\u044f \u2014 AlfaComp",d:"\u041f\u0440\u043e\u0444\u0438\u043b\u044c \u043f\u043e\u043a\u0443\u043f\u0430\u0442\u0435\u043b\u044f \u0432 \u043c\u0430\u0433\u0430\u0437\u0438\u043d\u0435 \u0442\u0435\u0445\u043d\u0438\u043a\u0438 AlfaComp.",c:BASE_URL+"/profile"},
  ];
  for(const up of userPages){
    wp(up.p,inj(base,{title:up.t,desc:up.d,canon:up.c,oimg:BASE_URL+"/banner.jpg",noindex:true}));
  }
  console.log("[prerender] OK "+userPages.length+" user pages with noindex");

  // --- HOME PAGE: inject canonical + robots (keep hreflang since isHome=true keeps them) ---
  const homeHtml = inj(base, {
    title: "Купить компьютер и монитор в Ташкенте — Магазин ПК AlfaComp.uz",
    desc: "Купить мощный игровой компьютер, мониторы MSI, ASUS, Dell, LG и комплектующие в Ташкенте. Сборка ПК на заказ, ИБП Ion, гарантия до 3 лет и доставка по Узбекистану — AlfaComp.uz",
    canon: BASE_URL + "/",
    oimg: BASE_URL + "/banner.jpg",
    oalt: "AlfaComp — компьютеры, мониторы и комплектующие в Ташкенте",
    isHome: true,
  });
  writeFileSync(resolve(DIST, "index.html"), homeHtml, "utf-8");
  console.log("[prerender] OK home page (canonical + robots injected)");

  const total=pc+cc+3+SP.length+userPages.length+1;
  console.log("[prerender] DONE: "+total+" total routes pre-rendered.");
}
main().catch(e=>{console.error("[prerender] FATAL:",e);process.exit(1);});