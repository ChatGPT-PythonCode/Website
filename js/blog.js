/*
  LULS Blog – in-page reader (no off-site redirects)
  Uses Blogger JSONP feed so it works on static hosting (no CORS).
*/

function lulsStripHtml(html){
  const div = document.createElement("div");
  div.innerHTML = html || "";
  return (div.textContent || div.innerText || "").replace(/\s+/g, " ").trim();
}

function lulsFirstImage(html){
  const m = /<img[^>]+src=["']([^"']+)["']/i.exec(html || "");
  return m ? m[1] : "";
}

function lulsToHttps(url){
  if(!url) return "";
  return url.startsWith("http://") ? url.replace("http://", "https://") : url;
}

/** Upgrade tiny blogger thumbs (s72) to larger sizes to avoid blur. */
function lulsUpgradeBloggerImage(url, size = 1200){
  url = lulsToHttps(url || "");
  if(!url) return "";

  url = url.replace(/\/s\d+(-c)?\//g, `/s${size}/`);
  url = url.replace(/=s\d+(-c)?/g, `=s${size}`);
  url = url.replace(/=w\d+-h\d+(-c)?/g, `=s${size}`);

  if(/googleusercontent\.com/i.test(url) && !/(\/s\d+\/|=s\d+)/i.test(url)){
    url += (url.includes("?") ? "&" : "?") + `s=${size}`;
  }
  return url;
}

function lulsUpgradeImagesInHtml(html, size = 1200){
  if(!html) return "";
  // Replace any googleusercontent sizing tokens inside HTML
  return html
    .replace(/(https?:\/\/[^"']*googleusercontent\.com[^"']*)(\/s\d+(-c)?\/)/gi, (m, p1) => `${p1}/s${size}/`)
    .replace(/(https?:\/\/[^"']*googleusercontent\.com[^"']*)(=s\d+(-c)?)/gi, (m, p1) => `${p1}=s${size}`);
}

function lulsSanitizeHtml(html){
  if(!html) return "";
  // remove scripts (keep formatting/images/links)
  return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
}

function openPostModal(post){
  const modal = document.getElementById("postModal");
  const titleEl = document.getElementById("postTitle");
  const metaEl = document.getElementById("postMeta");
  const contentEl = document.getElementById("postContent");
  if(!modal || !titleEl || !metaEl || !contentEl) return;

  const published = post?.published?.$t || post?.updated?.$t || "";
  let dateStr = "";
  try{
    dateStr = published
      ? new Date(published).toLocaleDateString(undefined, {year:"numeric", month:"short", day:"numeric"})
      : "";
  }catch(e){}

  titleEl.textContent = post?.title?.$t || "Untitled";
  metaEl.textContent = dateStr ? dateStr : "";

  const rawHtml = (post?.content?.$t || post?.summary?.$t || "");
  const upgraded = lulsUpgradeImagesInHtml(rawHtml, 1200);
  const safe = lulsSanitizeHtml(upgraded);

  contentEl.innerHTML = safe || "<p>No content available.</p>";

  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");

  // prevent background scroll
  document.documentElement.classList.add("modal-open");
  document.body.classList.add("modal-open");
}

function closePostModal(){
  const modal = document.getElementById("postModal");
  if(!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.documentElement.classList.remove("modal-open");
  document.body.classList.remove("modal-open");
}

function renderCyberdesk(data){
  const grid = document.getElementById("cyberdesk-grid");
  if(!grid) return;

  const entries = (data && data.feed && data.feed.entry) ? data.feed.entry : [];
  window.__lulsBlogEntries = entries;

  grid.innerHTML = "";

  if(!entries.length){
    grid.innerHTML = '<div class="download-card"><h3>No posts yet</h3><p>Nothing to show right now.</p></div>';
    return;
  }

  entries.forEach((e, idx)=>{
    const title = e?.title?.$t || "Untitled";
    const published = e?.published?.$t || e?.updated?.$t || "";

    let dateStr = "";
    try{
      dateStr = published
        ? new Date(published).toLocaleDateString(undefined, {year:"numeric", month:"short", day:"numeric"})
        : "";
    }catch(err){}

    const html = e?.summary?.$t || e?.content?.$t || "";
    const text = lulsStripHtml(html);
    const excerpt = text.length > 170 ? text.slice(0,170) + "…" : text;

    const thumbRaw = e?.media$thumbnail?.url || lulsFirstImage(html);
    const thumb = lulsUpgradeBloggerImage(thumbRaw, 1200);

    const card = document.createElement("div");
    card.className = "download-card blog-post-card";
    card.innerHTML = `
      ${
        thumb
          ? `<img class="blog-img" src="${thumb}" alt="" loading="lazy" decoding="async">`
          : `<div class="outlet-placeholder"></div>`
      }
      <div class="blog-meta">${dateStr || ""}</div>
      <h3>${title}</h3>
      <p>${excerpt}</p>
      <button class="btn secondary blog-read" type="button" data-idx="${idx}">Read post</button>
    `;
    grid.appendChild(card);
  });

  // click delegation for Read buttons (bind once, keep working after modal closes)
  if(!grid.dataset.readBound){
    grid.addEventListener("click", (ev)=>{
      const btn = ev.target.closest(".blog-read");
      if(!btn) return;
      const idx = Number(btn.getAttribute("data-idx"));
      const post = (window.__lulsBlogEntries || [])[idx];
      if(post) openPostModal(post);
    });
    grid.dataset.readBound = "1";
  }
}

// JSONP global callback
window.renderCyberdesk = renderCyberdesk;

(function initBlogModal(){
  document.addEventListener("click", (ev)=>{
    const close = ev.target.closest("[data-close='1']");
    if(close) closePostModal();
  });
  document.addEventListener("keydown", (ev)=>{
    if(ev.key === "Escape") closePostModal();
  });
})();

(function loadCyberdesk(){
  const s = document.createElement("script");
  // Keep source internal; no mention in page text.
  s.src = "https://uncscyberdesk.blogspot.com/feeds/posts/default?alt=json-in-script&callback=renderCyberdesk&max-results=12";
  document.body.appendChild(s);
})();
