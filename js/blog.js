fetch("https://lockedinreviews.blogspot.com/feeds/posts/default?alt=json-in-script&callback=cb");
function cb(d){
 const g=document.getElementById("blog-grid");
 d.feed.entry.forEach(p=>{
  const url=p.link.find(l=>l.rel==="alternate").href;
  g.innerHTML+=`
  <div class="card">
    <h3>${p.title.$t}</h3>
    <p>${(p.summary?.$t||"").slice(0,140)}...</p>
    <a class="btn secondary" href="${url}" target="_blank">Read</a>
  </div>`;
 });
}