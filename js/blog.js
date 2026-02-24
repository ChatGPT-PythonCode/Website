/*
  Cyberdesk Blog (Blogger) – JSONP feed so it works on static hosting (no CORS).
  Source: https://uncscyberdesk.blogspot.com/
*/

function cyberdeskStripHtml(html){
  const div = document.createElement("div");
  div.innerHTML = html || "";
  return (div.textContent || div.innerText || "").replace(/\s+/g, " ").trim();
}

function cyberdeskFirstImage(html){
  const m = /<img[^>]+src=["']([^"']+)["']/i.exec(html || "");
  return m ? m[1] : "";
}

function renderCyberdesk(data){
  const grid = document.getElementById("cyberdesk-grid");
  if(!grid) return;

  const entries = (data && data.feed && data.feed.entry) ? data.feed.entry : [];
  grid.innerHTML = "";

  if(!entries.length){
    grid.innerHTML = '<div class="download-card"><h3>No posts yet</h3><p>Nothing to show right now.</p></div>';
    return;
  }

  entries.forEach(e=>{
    const title = e?.title?.$t || "Untitled";
    const linkObj = (e.link || []).find(l => l.rel === "alternate") || (e.link || [])[0];
    const url = linkObj?.href || "https://uncscyberdesk.blogspot.com/";
    const published = e?.published?.$t || e?.updated?.$t || "";
    let dateStr = "";
    try{
      dateStr = published ? new Date(published).toLocaleDateString(undefined, {year:"numeric", month:"short", day:"numeric"}) : "";
    }catch(err){}

    const html = e?.summary?.$t || e?.content?.$t || "";
    const text = cyberdeskStripHtml(html);
    const excerpt = text.length > 170 ? text.slice(0,170) + "…" : text;

    const thumb = e?.media$thumbnail?.url || cyberdeskFirstImage(html);

    const card = document.createElement("div");
    card.className = "download-card blog-post-card";
    card.innerHTML = `
      ${thumb ? `<img class="blog-img" src="${thumb}" alt="">` : `<div class="outlet-placeholder"></div>`}
      <div class="blog-meta">${dateStr ? dateStr + " • " : ""}uncscyberdesk</div>
      <h3>${title}</h3>
      <p>${excerpt}</p>
      <a class="btn secondary" href="${url}" target="_blank" rel="noopener">Read post</a>
    `;
    grid.appendChild(card);
  });
}

// JSONP global callback for Blogger
window.renderCyberdesk = renderCyberdesk;

(function loadCyberdesk(){
  const s = document.createElement("script");
  s.src = "https://uncscyberdesk.blogspot.com/feeds/posts/default?alt=json-in-script&callback=renderCyberdesk&max-results=12";
  document.body.appendChild(s);
})();