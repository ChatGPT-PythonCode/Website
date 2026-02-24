const D_URL="https://raw.githubusercontent.com/EOBots/EOBot/main/downloads.json";
const PER=10;let d=[],p=1;
fetch(D_URL).then(r=>r.json()).then(j=>{d=j;render();});
function render(){
 const g=document.getElementById("downloads-grid");g.innerHTML="";
 d.slice((p-1)*PER,p*PER).forEach(i=>{
  g.innerHTML+=`
  <div class="download-card">
    <h3>${i.title}</h3>
    <p>${i.description}</p>
    <p class="cats">${i.categories.join(", ")}</p>
    <a class="btn secondary" href="${i.link}" target="_blank">Download</a>
  </div>`;
 });
 pages();
}
function pages(){
 const pg=document.getElementById("downloads-pagination");pg.innerHTML="";
 const t=Math.ceil(d.length/PER);
 for(let i=1;i<=t;i++){
  const b=document.createElement("button");
  b.className="page-btn"+(i===p?" active":"");
  b.textContent=i;b.onclick=()=>{p=i;render()};pg.appendChild(b);
 }
}