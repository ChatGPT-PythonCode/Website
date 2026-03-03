/*
  In-site Blog Reader (Blogger JSONP feed)
  - Renders card grid
  - Opens posts in modal (no redirect)
  - Shareable URLs: blog.html?post=<POST_ID>
  - Share + Copy link
  - Cusdis comments per post thread (dark theme)
*/

const BLOG_FEED_URL =
  "https://uncscyberdesk.blogspot.com/feeds/posts/default?alt=json-in-script&callback=renderCyberdesk&max-results=12";

// ===== Helpers =====
function stripHtml(html) {
  const div = document.createElement("div");
  div.innerHTML = html || "";
  return (div.textContent || div.innerText || "").replace(/\s+/g, " ").trim();
}

function firstImageFromHtml(html) {
  const m = /<img[^>]+src=["']([^"']+)["']/i.exec(html || "");
  return m ? m[1] : "";
}

function toHttps(url) {
  if (!url) return "";
  return url.startsWith("http://") ? url.replace("http://", "https://") : url;
}

/**
 * Upgrade Blogger/Googleusercontent thumbnails (often s72) to a better size
 */
function upgradeBloggerImage(url, size = 1200) {
  url = toHttps(url || "");
  if (!url) return "";

  // /s72-c/ or /s320/ etc.
  url = url.replace(/\/s\d+(-c)?\//g, `/s${size}/`);

  // =s72-c or =s320 etc.
  url = url.replace(/=s\d+(-c)?/g, `=s${size}`);

  // =w###-h###
  url = url.replace(/=w\d+-h\d+(-c)?/g, `=s${size}`);

  if (/googleusercontent\.com/i.test(url) && !/(\/s\d+\/|=s\d+)/i.test(url)) {
    url += (url.includes("?") ? "&" : "?") + `s=${size}`;
  }
  return url;
}

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

/**
 * Blogger entry IDs sometimes look like:
 *   tag:blogger.com,1999:blog-123.post-456789
 * We'll prefer the numeric tail when possible.
 */
function normalizePostId(entry) {
  const raw = entry?.id?.$t || "";
  const m = /post-(\d+)/.exec(raw);
  if (m) return m[1];
  return raw || (entry?.published?.$t || String(Math.random()));
}

function escapeHtml(s) {
  return (s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// ===== State =====
let POSTS_BY_ID = new Map();
let ACTIVE_POST_ID = null;

// ===== Modal Elements =====
const modal = () => document.getElementById("post-modal");
const postBody = () => document.getElementById("post-body");
const commentsWrap = () => document.getElementById("post-comments");
const shareBtn = () => document.getElementById("shareBtn");
const copyBtn = () => document.getElementById("copyBtn");

// ===== Modal Control =====
function openModal() {
  const m = modal();
  if (!m) return;

  m.classList.add("is-open");
  m.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeModal({ updateUrl = true } = {}) {
  const m = modal();
  if (!m) return;

  m.classList.remove("is-open");
  m.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";

  if (updateUrl) {
    const url = new URL(window.location.href);
    url.searchParams.delete("post");
    history.pushState({ post: null }, "", url.toString());
  }

  ACTIVE_POST_ID = null;
}

// Close handlers (backdrop + X)
function wireModalClose() {
  const m = modal();
  if (!m) return;

  m.addEventListener("click", (e) => {
    const t = e.target;
    if (t && t.getAttribute && t.getAttribute("data-close") === "1") {
      closeModal({ updateUrl: true });
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && m.classList.contains("is-open")) {
      closeModal({ updateUrl: true });
    }
  });
}

// ===== Share/Copy =====
async function shareCurrentPost() {
  if (!ACTIVE_POST_ID) return;

  const post = POSTS_BY_ID.get(ACTIVE_POST_ID);
  if (!post) return;

  const url = new URL(window.location.href);
  const shareData = {
    title: post.title,
    text: post.title,
    url: url.toString(),
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      await copyCurrentLink();
      alert("Link copied.");
    }
  } catch {
    // user canceled / error
  }
}

async function copyCurrentLink() {
  const url = window.location.href;
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = url;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
}

// ===== Cusdis Comments =====
function loadCusdisComments(postId, postTitle) {
  const wrap = commentsWrap();
  if (!wrap) return;

  // Remove any previous instance
  wrap.innerHTML = "";

  // Build thread element
  const thread = document.createElement("div");
  thread.id = "cusdis_thread";
  thread.setAttribute("data-host", "https://cusdis.com");
  thread.setAttribute("data-app-id", "0d129439-eb52-49d3-bf9e-e1b634d27780");
  thread.setAttribute("data-theme", "dark"); // ✅ makes input/text white on dark

  // Unique thread per post
  thread.setAttribute("data-page-id", String(postId));
  thread.setAttribute("data-page-url", window.location.href);
  thread.setAttribute("data-page-title", postTitle || "Post");

  wrap.appendChild(thread);

  // Load script only once, then re-render on swaps
  if (!window.__CUSDIS_SCRIPT_LOADED__) {
    const s = document.createElement("script");
    s.src = "https://cusdis.com/js/cusdis.es.js";
    s.async = true;
    s.defer = true;
    s.onload = () => {
      tryRenderCusdis(thread);
    };
    document.body.appendChild(s);
    window.__CUSDIS_SCRIPT_LOADED__ = true;
  } else {
    tryRenderCusdis(thread);
  }
}

function tryRenderCusdis(threadEl) {
  try {
    if (window.CUSDIS && typeof window.CUSDIS.renderTo === "function") {
      window.CUSDIS.renderTo(threadEl);
    }
  } catch {
    // Cusdis may still auto-render; ignore
  }
}

// ===== Render a post in modal =====
function openPostById(postId, { pushUrl = true } = {}) {
  const post = POSTS_BY_ID.get(String(postId));
  if (!post) return;

  ACTIVE_POST_ID = String(postId);

  const contentHtml = post.contentHtml || "";
  const safeTitle = escapeHtml(post.title);
  const metaLine = `${post.dateText ? escapeHtml(post.dateText) : ""}`;

  const body = postBody();
  body.innerHTML = `
    <div class="blog-reader">
      <div class="blog-reader__meta">${metaLine}</div>
      <h2 class="blog-reader__title">${safeTitle}</h2>
      ${
        post.heroImage
          ? `<img class="blog-reader__img" src="${post.heroImage}" alt="" loading="lazy" decoding="async">`
          : ""
      }
      <div class="blog-reader__content">${contentHtml}</div>
    </div>
  `;

  // Update URL
  if (pushUrl) {
    const url = new URL(window.location.href);
    url.searchParams.set("post", String(postId));
    history.pushState({ post: String(postId) }, "", url.toString());
  }

  // Share/copy handlers
  if (shareBtn()) shareBtn().onclick = shareCurrentPost;
  if (copyBtn())
    copyBtn().onclick = async () => {
      await copyCurrentLink();
      alert("Link copied.");
    };

  // Load comments for this post
  loadCusdisComments(String(postId), post.title);

  openModal();
}

// ===== JSONP callback =====
window.renderCyberdesk = function renderCyberdesk(data) {
  const grid = document.getElementById("cyberdesk-grid");
  if (!grid) return;

  const entries = data?.feed?.entry || [];
  POSTS_BY_ID = new Map();
  grid.innerHTML = "";

  if (!entries.length) {
    grid.innerHTML = `
      <div class="download-card">
        <h3>No posts yet</h3>
        <p>Nothing to show right now.</p>
      </div>
    `;
    return;
  }

  entries.forEach((e) => {
    const title = e?.title?.$t || "Untitled";
    const published = e?.published?.$t || e?.updated?.$t || "";
    const dateText = formatDate(published);

    const html = e?.content?.$t || e?.summary?.$t || "";
    const text = stripHtml(html);
    const excerpt = text.length > 170 ? text.slice(0, 170) + "…" : text;

    const postId = normalizePostId(e);

    const thumbRaw = e?.media$thumbnail?.url || firstImageFromHtml(html);
    const heroImage = upgradeBloggerImage(thumbRaw, 1200);

    POSTS_BY_ID.set(String(postId), {
      id: String(postId),
      title,
      dateText,
      heroImage,
      contentHtml: html,
    });

    const card = document.createElement("div");
    card.className = "download-card blog-post-card";
    card.innerHTML = `
      ${
        heroImage
          ? `<img class="blog-img" src="${heroImage}" alt="" loading="lazy" decoding="async">`
          : `<div class="outlet-placeholder"></div>`
      }
      <div class="blog-meta">${dateText ? escapeHtml(dateText) : ""}</div>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(excerpt)}</p>
      <button class="btn secondary read-post" type="button" data-post-id="${escapeHtml(
        String(postId)
      )}">
        Read post
      </button>
    `;

    grid.appendChild(card);
  });

  // ✅ Event delegation (never dies)
  grid.addEventListener("click", (ev) => {
    const btn = ev.target && ev.target.closest ? ev.target.closest(".read-post") : null;
    if (!btn) return;
    const postId = btn.getAttribute("data-post-id");
    if (!postId) return;
    openPostById(postId, { pushUrl: true });
  });

  // Auto-open if user landed on share URL
  const url = new URL(window.location.href);
  const sharePostId = url.searchParams.get("post");
  if (sharePostId) {
    setTimeout(() => openPostById(sharePostId, { pushUrl: false }), 0);
  }

  // If popstate happened before feed loaded
  if (window.__PENDING_POST_ID__ && POSTS_BY_ID.has(String(window.__PENDING_POST_ID__))) {
    const pending = String(window.__PENDING_POST_ID__);
    window.__PENDING_POST_ID__ = null;
    setTimeout(() => openPostById(pending, { pushUrl: false }), 0);
  }
};

// ===== History back/forward: open/close based on ?post= =====
window.addEventListener("popstate", () => {
  const url = new URL(window.location.href);
  const postId = url.searchParams.get("post");

  if (postId) {
    if (POSTS_BY_ID.size && POSTS_BY_ID.has(String(postId))) {
      openPostById(postId, { pushUrl: false });
    } else {
      window.__PENDING_POST_ID__ = String(postId);
    }
  } else {
    if (modal() && modal().classList.contains("is-open")) {
      closeModal({ updateUrl: false });
    }
  }
});

// ===== Init =====
(function initBlog() {
  wireModalClose();

  // Load JSONP feed
  const s = document.createElement("script");
  s.src = BLOG_FEED_URL;
  document.body.appendChild(s);
})();
