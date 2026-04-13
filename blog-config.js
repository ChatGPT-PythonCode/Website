const D_URL = "downloads.json";
const PER = 12;

let all = [];
let page = 1;

function uniq(arr){
  return Array.from(new Set(arr)).sort((a,b)=>a.localeCompare(b));
}

function getQuery(){
  const q = (document.getElementById("downloads-search")?.value || "").trim().toLowerCase();
  const cat = (document.getElementById("downloads-category")?.value || "").trim().toLowerCase();
  return { q, cat };
}

function normalizeItem(i){
  const title = (i.title || i.name || "Untitled").toString();
  const description = (i.description || i.desc || "").toString();
  const link = (i.link || i.url || i.download || "").toString();
  let categories = i.categories || i.category || i.tags || [];
  if(typeof categories === "string") categories = categories.split(",").map(s=>s.trim()).filter(Boolean);
  if(!Array.isArray(categories)) categories = [];
  categories = categories.map(c=>c.toString());
  return { title, description, link, categories };
}

function filterData(){
  const { q, cat } = getQuery();
  return all.filter(i=>{
    const hay = (i.title + " " + i.description + " " + (i.categories||[]).join(" ")).toLowerCase();
    if(q && !hay.includes(q)) return false;
    if(cat && !(i.categories||[]).some(c=>c.toLowerCase()===cat)) return false;
    return true;
  });
}

function ensureModal(){
  let overlay = document.getElementById("downloads-modal");
  if(overlay) return overlay;

  overlay = document.createElement("div");
  overlay.id = "downloads-modal";
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal-card" role="dialog" aria-modal="true" aria-label="Download details">
      <button class="modal-close" type="button" aria-label="Close">×</button>
      <div class="modal-body">
        <h2 class="modal-title"></h2>
        <div class="modal-cats"></div>
        <p class="modal-desc"></p>
        <div class="modal-actions"></div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = () => {
    overlay.classList.remove("open");
    document.body.classList.remove("no-scroll");
  };

  overlay.addEventListener("click", (e)=>{
    if(e.target === overlay) close();
  });
  overlay.querySelector(".modal-close")?.addEventListener("click", close);
  document.addEventListener("keydown", (e)=>{
    if(e.key === "Escape" && overlay.classList.contains("open")) close();
  });

  return overlay;
}

function openModal(item){
  const overlay = ensureModal();
  overlay.querySelector(".modal-title").textContent = item.title;

  const cats = overlay.querySelector(".modal-cats");
  cats.innerHTML = "";
  if(item.categories?.length){
    cats.innerHTML = item.categories.map(c=>`<span class="chip">${c}</span>`).join("");
  }

  overlay.querySelector(".modal-desc").textContent = item.description || "";

  const actions = overlay.querySelector(".modal-actions");
  actions.innerHTML = "";
  if(item.link){
    const a = document.createElement("a");
    a.className = "btn secondary";
    a.href = item.link;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = "Download";
    actions.appendChild(a);
  }

  overlay.classList.add("open");
  document.body.classList.add("no-scroll");
}

function render(){
  const grid = document.getElementById("downloads-grid");
  const count = document.getElementById("downloads-count");
  const pagination = document.getElementById("downloads-pagination");
  if(!grid) return;

  const filtered = filterData();
  const total = filtered.length;

  if(count){
    count.textContent = total ? `${total} download${total===1?"":"s"} found` : "No downloads found";
  }

  grid.innerHTML = "";

  const start = (page-1)*PER;
  const slice = filtered.slice(start, start+PER);

  slice.forEach(item=>{
    const card = document.createElement("div");
    card.className = "download-card";

    const h = document.createElement("h3");
    h.textContent = item.title;

    const cats = document.createElement("p");
    cats.className = "cats";
    cats.textContent = (item.categories || []).join(", ");
    if(!(item.categories||[]).length) cats.style.display = "none";

    const actions = document.createElement("div");
    actions.className = "card-actions";

    if(item.link){
      const a = document.createElement("a");
      a.className = "btn secondary";
      a.href = item.link;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = "Download";
      a.addEventListener("click", (e)=>e.stopPropagation());
      actions.appendChild(a);
    }

    const more = document.createElement("button");
    more.className = "btn ghost";
    more.type = "button";
    more.textContent = "Read";
    more.addEventListener("click", (e)=>{ e.stopPropagation(); openModal(item); });
    actions.appendChild(more);

    card.appendChild(h);
    card.appendChild(cats);
    card.appendChild(actions);

    grid.appendChild(card);
  });

  // pagination
  if(!pagination) return;
  pagination.innerHTML = "";
  const pages = Math.max(1, Math.ceil(total / PER));
  for(let i=1;i<=pages;i++){
    const b = document.createElement("button");
    b.className = "page-btn" + (i===page ? " active" : "");
    b.textContent = String(i);
    b.addEventListener("click", ()=>{ page=i; render(); window.scrollTo({top:0, behavior:"smooth"}); });
    pagination.appendChild(b);
  }
}

async function init(){
  try{
    const res = await fetch(D_URL, { cache: "no-store" });
    const data = await res.json();
    all = (Array.isArray(data) ? data : (data.items || data.downloads || [])).map(normalizeItem);
  }catch(e){
    console.error("Failed to load downloads.json", e);
    all = [];
  }

  // categories dropdown
  const sel = document.getElementById("downloads-category");
  if(sel){
    const cats = uniq(all.flatMap(i=>i.categories||[])).filter(Boolean);
    sel.innerHTML = `<option value="">All categories</option>` + cats.map(c=>`<option value="${c}">${c}</option>`).join("");
  }

  // events
  document.getElementById("downloads-search")?.addEventListener("input", ()=>{ page=1; render(); });
  document.getElementById("downloads-category")?.addEventListener("change", ()=>{ page=1; render(); });

  render();
}

document.addEventListener("DOMContentLoaded", init);
