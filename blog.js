/*
  LULS Blog – in-page reader (no off-site redirects)
  Uses Blogger JSONP feed so it works on static hosting (no CORS).
  Adds shareable, unique URLs per post via ?post=<id>
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

function lulsGetPostId(entry){
  // Prefer the numeric post id from Blogger tag id: "...post-1234567890"
  const raw = entry?.id?.$t || "";
  const m = /post-(\d+)/.exec(raw);
  if(m) return m[1];

  // Fallback: try to use the alternate link URL as an id
  const linkObj = (entry?.link || []).find(l => l.rel === "alternate") || (entry?.link || [])[0];
  return encodeURIComponent(linkObj?.href || raw || "");
}

function lulsGetRequestedPostId(){
  const u = new URL(window.location.href);
  return u.searchParams.get("post") || "";
}

function lulsSetUrlForPost(postId, replace = false){
  const u = new URL(window.location.href);
  if(postId){
    u.searchParams.set("post", postId);
  }else{
    u.searchParams.delete("post");
  }
  const newUrl = u.pathname + (u.search ? u.search : "") + (u.hash ? u.hash : "");
  const state = postId ? { postId } : {};
  if(replace) history.replaceState(state, "", newUrl);
  else history.pushState(state, "", newUrl);
  window.__lulsCurrentPostId = postId || "";
  window.__lulsCurrentPostUrl = window.location.href;
}

function lulsFindPostById(postId){
  const entries = window.__lulsBlogEntries || [];
  return entries.find(e => lulsGetPostId(e) === postId) || null;
}

function lulsOpenPost(post, opts = { pushUrl: true }){
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

  const postId = lulsGetPostId(post);
  window.__lulsCurrentPostId = postId;
  window.__lulsCurrentPostUrl = window.location.href;

  // Update the URL so it is shareable and unique
  if(opts.pushUrl){
    lulsSetUrlForPost(postId, false);
  }else{
    // ensure state is correct on initial open from URL
    lulsSetUrlForPost(postId, true);
  }

  // Wire share buttons
  lulsUpdateShareButtons(postId, titleEl.textContent);
}

function lulsCloseModal(opts = { popUrl: true }){
  const modal = document.getElementById("postModal");
  if(!modal) return;

  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");

  document.documentElement.classList.remove("modal-open");
  document.body.classList.remove("modal-open");

  if(opts.popUrl){
    // Return to base blog URL without adding another history entry.
    lulsSetUrlForPost("", true);
  }
}

function lulsUpdateShareButtons(postId, title){
  const shareBtn = document.getElementById("postShare");
  const copyBtn = document.getElementById("postCopyLink");
  if(!shareBtn && !copyBtn) return;

  const url = window.location.href; // already has ?post=

  if(shareBtn && !shareBtn.dataset.bound){
    shareBtn.addEventListener("click", async ()=>{
      const shareData = { title: title || "Blog post", text: title || "Blog post", url };
      try{
        if(navigator.share){
          await navigator.share(shareData);
        }else{
          await navigator.clipboard.writeText(url);
          shareBtn.textContent = "Copied!";
          setTimeout(()=> shareBtn.textContent = "Share", 1200);
        }
      }catch(e){
        // ignore canceled shares
      }
    });
    shareBtn.dataset.bound = "1";
  }

  if(copyBtn && !copyBtn.dataset.bound){
    copyBtn.addEventListener("click", async ()=>{
      try{
        await navigator.clipboard.writeText(url);
        copyBtn.textContent = "Copied!";
        setTimeout(()=> copyBtn.textContent = "Copy link", 1200);
      }catch(e){
        // Fallback for older browsers
        const ta = document.createElement("textarea");
        ta.value = url;
        document.body.appendChild(ta);
        ta.select();
        try{ document.execCommand("copy"); }catch(_){}
        document.body.removeChild(ta);
        copyBtn.textContent = "Copied!";
        setTimeout(()=> copyBtn.textContent = "Copy link", 1200);
      }
    });
    copyBtn.dataset.bound = "1";
  }
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

    const postId = lulsGetPostId(e);

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
      <button class="btn secondary blog-read" type="button" data-postid="${postId}" data-idx="${idx}">Read post</button>
    `;
    grid.appendChild(card);
  });

  // click delegation for Read buttons (bind once, keep working after modal closes)
  if(!grid.dataset.readBound){
    grid.addEventListener("click", (ev)=>{
      const btn = ev.target.closest(".blog-read");
      if(!btn) return;
      const postId = btn.getAttribute("data-postid") || "";
      const post = postId ? lulsFindPostById(postId) : null;
      if(post) lulsOpenPost(post, { pushUrl: true });
    });
    grid.dataset.readBound = "1";
  }

  // If the page was loaded with ?post=..., open it
  const requested = lulsGetRequestedPostId();
  if(requested){
    const post = lulsFindPostById(requested);
    if(post){
      lulsOpenPost(post, { pushUrl: false }); // use replaceState to keep history clean
    }
  }
}

// JSONP global callback
window.renderCyberdesk = renderCyberdesk;

(function initBlogModal(){
  // Close interactions
  document.addEventListener("click", (ev)=>{
    const close = ev.target.closest("[data-close='1']");
    if(close) lulsCloseModal({ popUrl: true });
  });
  document.addEventListener("keydown", (ev)=>{
    if(ev.key === "Escape") lulsCloseModal({ popUrl: true });
  });

  // Back/forward controls
  window.addEventListener("popstate", (ev)=>{
    const postId = ev?.state?.postId || lulsGetRequestedPostId() || "";
    if(postId){
      const post = lulsFindPostById(postId);
      if(post){
        lulsOpenPost(post, { pushUrl: false });
      }
    }else{
      lulsCloseModal({ popUrl: false });
    }
  });

  // If someone lands directly on blog.html?post=... ensure state is set for that URL
  const requested = lulsGetRequestedPostId();
  if(requested){
    history.replaceState({ postId: requested }, "", window.location.href);
  }
})();

(function loadCyberdesk(){
  const s = document.createElement("script");
  // Keep source internal; no mention in page text.
  s.src = "https://uncscyberdesk.blogspot.com/feeds/posts/default?alt=json-in-script&callback=renderCyberdesk&max-results=12";
  document.body.appendChild(s);
})();
