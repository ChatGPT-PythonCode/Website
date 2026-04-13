
(function(){
  const CONFIG = window.LULS_CONFIG || {};
  const FEED_BASE = CONFIG.bloggerFeedBase || "https://freeaudiosounds.blogspot.com/feeds/posts/default";
  const blogArchiveUrl = "blog.html";
  const grid = document.getElementById("home-blog-grid");
  const homeBlogLink = document.getElementById("home-blog-link");
  if (homeBlogLink) homeBlogLink.href = blogArchiveUrl;

  function stripHtml(html){
    const div = document.createElement("div");
    div.innerHTML = html || "";
    return (div.textContent || div.innerText || "").replace(/\s+/g, " ").trim();
  }

  function firstImageFromHtml(html){
    const m = /<img[^>]+src=["']([^"']+)["']/i.exec(html || "");
    return m ? m[1] : "";
  }

  function toHttps(url){
    if(!url) return "";
    return url.startsWith("http://") ? url.replace("http://","https://") : url;
  }

  function upgradeBloggerImage(url, size = 1200){
    url = toHttps(url || "");
    if(!url) return "";
    url = url.replace(/\/s\d+(-c)?\//g, `/s${size}/`);
    url = url.replace(/=s\d+(-c)?/g, `=s${size}`);
    url = url.replace(/=w\d+-h\d+(-c)?/g, `=s${size}`);
    if (/googleusercontent\.com/i.test(url) && !/(\/s\d+\/|=s\d+)/i.test(url)) {
      url += (url.includes("?") ? "&" : "?") + `s=${size}`;
    }
    return url;
  }

  function normalizePostId(entry){
    const raw = entry?.id?.$t || "";
    const m = /post-(\d+)/.exec(raw);
    if (m) return m[1];
    return raw || String(Math.random());
  }

  function formatDate(iso){
    if(!iso) return "";
    try{
      return new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric"
      });
    }catch(_){
      return "";
    }
  }

  function escapeHtml(s){
    return (s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  window.renderHomeBlogPreview = function renderHomeBlogPreview(data){
    if(!grid) return;
    const entries = data?.feed?.entry || [];
    grid.innerHTML = "";

    if(!entries.length){
      grid.innerHTML = '<div class="home-empty"><h3>No posts yet</h3><p>The blog preview is ready, but the feed did not return posts.</p></div>';
      return;
    }

    entries.slice(0, 3).forEach((entry) => {
      const title = entry?.title?.$t || "Untitled";
      const published = entry?.published?.$t || entry?.updated?.$t || "";
      const dateText = formatDate(published);
      const html = entry?.content?.$t || entry?.summary?.$t || "";
      const text = stripHtml(html);
      const excerpt = text.length > 160 ? text.slice(0, 160) + "…" : text;
      const postId = normalizePostId(entry);
      const thumbRaw = entry?.media$thumbnail?.url || firstImageFromHtml(html);
      const image = upgradeBloggerImage(thumbRaw, 1200);
      const href = `${blogArchiveUrl}?post=${encodeURIComponent(postId)}`;

      const card = document.createElement("article");
      card.className = "download-card";
      card.innerHTML = `
        ${image ? `<img class="blog-img" src="${image}" alt="" loading="lazy" decoding="async">` : `<div class="outlet-placeholder"></div>`}
        <div class="blog-meta">${escapeHtml(dateText)}</div>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(excerpt)}</p>
        <div class="card-actions">
          <a class="btn secondary" href="${href}">Read post</a>
        </div>
      `;
      grid.appendChild(card);
    });
  };

  const s = document.createElement("script");
  s.src = `${FEED_BASE}?alt=json-in-script&callback=renderHomeBlogPreview&max-results=3`;
  document.body.appendChild(s);
})();
