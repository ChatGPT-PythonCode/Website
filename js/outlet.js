const OUTLET_URL="https://raw.githubusercontent.com/HelloSpaghettiBot/Portfolio/main/products.json";
const PER_PAGE=10;let data=[],page=1;
fetch(OUTLET_URL).then(r=>r.json()).then(d=>{data=d;render();});
function render(){
 const q=document.getElementById("outlet-search").value.toLowerCase();
 const f=data.filter(i=>i.title.toLowerCase().includes(q));
 const g=document.getElementById("outlet-grid");g.innerHTML="";
 f.slice((page-1)*PER_PAGE,page*PER_PAGE).forEach(i=>{
  g.innerHTML+=`
  <div class="template-card">
    ${i.image?`<img src="${i.image}" class="outlet-img">`:`<div class="outlet-placeholder"></div>`}
    <h3>${i.title}</h3>
    <p>${i.description||""}</p>
    <a class="btn secondary" href="${i.url}" target="_blank">View</a>
  </div>`;
 });
 paginate(f.length);
}
function paginate(total){
 const p=document.getElementById("outlet-pagination");p.innerHTML="";
 const pages=Math.ceil(total/PER_PAGE);
 for(let i=1;i<=pages;i++){
  const b=document.createElement("button");
  b.className="page-btn"+(i===page?" active":"");
  b.textContent=i;
  b.onclick=()=>{page=i;render()};
  p.appendChild(b);
 }
}
document.getElementById("outlet-search").oninput=()=>{page=1;render()};