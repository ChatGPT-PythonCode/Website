/*
  Cyberdesk Blog (Blogger) – JSONP feed so it works on static hosting (no CORS).
  Source: https://uncscyberdesk.blogspot.com/
*/

function cyberdeskStripHtml(html){
  const div = document.createElement('div');
  div.innerHTML = html || '';
  return (div.textContent || div.innerText || '').replace(/\s+/g, ' ').trim();
}

function cyberdeskFirstImage(html){
  const m = /<img[^>]+src=["']([^"']+)["']/i.exec(html || '');
  return m ? m[1] : '';
}

function cyberdeskToHttps(url){
  if(!url) return '';
  return url.startsWith('http://') ? url.replace('http://', 'https://') : url;
}

/**
 * Blogger/Googleusercontent images often come as tiny thumbnails like:
 *   .../s72-c/...
 *   ...=s72-c
 * When stretched full-width they look blurry.
 * This upgrades them to a larger size (default s1200).
 */
function cyberdeskUpgradeBloggerImage(url, size = 1200){
  url = cyberdeskToHttps(url || '');
  if(!url) return '';

  // Replace common path tokens: /s72-c/ , /s72/ , /s1600/ , /s320-c/ etc.
  url = url.replace(/\/s\d+(-c)?\//g, `/s${size}/`);

  // Replace common query-ish tokens: =s72-c , =s72 , =s1600 , etc.
  url = url.replace(/=s\d+(-c)?/g, `=s${size}`);

  // Some variants use "=w###-h###". If present, prefer size.
  url = url.replace(/=w\d+-h\d+(-c)?/g, `=s${size}`);

  // If it's a googleusercontent image and still doesn't have a size token,
  // append one to encourage higher quality.
  if(/googleusercontent\.com/i.test(url) && !(/(\/s\d+\/|=s\d+)/i.test(url))){
    url += (url.includes('?') ? '&' : '?') + `s=${size}`;
  }

  return url;
}

function renderCyberdesk(data){
  const grid = document.getElementById('cyberdesk-grid');
  if(!grid) return;

  const entries = (data && data.feed && data.feed.entry) ? data.feed.entry : [];
  grid.innerHTML = '';

  if(!entries.length){
    grid.innerHTML = '<div class="download-card"><h3>No posts yet</h3><p>Nothing to show right now.</p></div>';
    return;
  }

  entries.forEach(e => {
    const title = e?.title?.$t || 'Untitled';
    const linkObj = (e.link || []).find(l => l.rel === 'alternate') || (e.link || [])[0];
    const url = linkObj?.href || 'https://uncscyberdesk.blogspot.com/';
    const published = e?.published?.$t || e?.updated?.$t || '';

    let dateStr = '';
    try{
      dateStr = published
        ? new Date(published).toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' })
        : '';
    }catch(_){ /* ignore */ }

    const html = e?.summary?.$t || e?.content?.$t || '';
    const text = cyberdeskStripHtml(html);
    const excerpt = text.length > 170 ? text.slice(0, 170) + '…' : text;

    // Raw thumb from Blogger (often tiny) OR first image in post
    const thumbRaw = e?.media$thumbnail?.url || cyberdeskFirstImage(html);

    // Upgrade to high-res so it doesn't look blurry when displayed larger
    const thumb = cyberdeskUpgradeBloggerImage(thumbRaw, 1200);

    const card = document.createElement('div');
    card.className = 'download-card blog-post-card';
    card.innerHTML = `
      ${thumb
        ? `<img class="blog-img" src="${thumb}" alt="" loading="lazy" decoding="async">`
        : `<div class="outlet-placeholder"></div>`
      }
      <div class="blog-meta">${dateStr ? dateStr + ' • ' : ''}uncscyberdesk</div>
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
  const s = document.createElement('script');
  s.src = 'https://uncscyberdesk.blogspot.com/feeds/posts/default?alt=json-in-script&callback=renderCyberdesk&max-results=12';
  document.body.appendChild(s);
})();
