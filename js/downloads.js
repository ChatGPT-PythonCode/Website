const D_URL = "https://raw.githubusercontent.com/EOBots/EOBot/main/downloads.json";
const PER = 10;

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

function filterData(){
  const { q, cat } = getQuery();
  return all.filter(item=>{
    const title = (item.title || "").toLowerCase();
    const desc = (item.description || "").toLowerCase();
    const cats = (item.categories || []).map(c=>String(c).toLowerCase());
    const matchesText = !q || title.includes(q) || desc.includes(q) || cats.join(" ").includes(q);
    const matchesCat = !cat || cats.includes(cat);
    return matchesText && matchesCat;
  });
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

  slice.forEach(i=>{
    const cats = Array.isArray(i.categories) ? i.categories : (i.categories ? [i.categories] : []);
    grid.innerHTML += `
      <div class="download-card">
        <h3>${i.title || "Untitled"}</h3>
        <p>${i.description || ""}</p>
        ${cats.length ? `<p class="cats">${cats.join(", ")}</p>` : ""}
        ${i.link ? `<a class="btn secondary" href="${i.link}" target="_blank" rel="noopener">Download</a>` : ""}
      </div>
    `;
  });

  // pagination
  if(!pagination) return;
  pagination.innerHTML = "";
  const pages = Math.max(1, Math.ceil(total / PER));
  for(let i=1;i<=pages;i++){
    const b = document.createElement("button");
    b.className = "page-btn" + (i===page ? " active" : "");
    b.textContent = i;
    b.onclick = ()=>{ page=i; render(); };
    pagination.appendChild(b);
  }
}

function wire(){
  const search = document.getElementById("downloads-search");
  const cat = document.getElementById("downloads-category");
  if(search){
    search.addEventListener("input", ()=>{ page=1; render(); });
  }
  if(cat){
    cat.addEventListener("change", ()=>{ page=1; render(); });
  }
}

function populateCategories(){
  const select = document.getElementById("downloads-category");
  if(!select) return;
  const cats = uniq(all.flatMap(i => Array.isArray(i.categories) ? i.categories : (i.categories ? [i.categories] : []))
                    .map(c=>String(c).trim())
                    .filter(Boolean));
  // keep first option
  const keep = select.querySelector("option[value='']") ? [select.querySelector("option[value='']")] : [];
  select.innerHTML = "";
  keep.forEach(o=>select.appendChild(o));
  cats.forEach(c=>{
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    select.appendChild(opt);
  });
}

fetch(D_URL)
  .then(r=>r.json())
  .then(j=>{
    all = Array.isArray(j) ? j : [];
    populateCategories();
    wire();
    render();
  })
  .catch(()=>{
    const grid = document.getElementById("downloads-grid");
    if(grid){
      grid.innerHTML = '<div class="download-card"><h3>Could not load downloads</h3><p>Please try again later.</p></div>';
    }
  });
