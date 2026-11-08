// Real photos for the sights and food, loaded on demand from Wikipedia (Wikimedia Commons images).
// Each place id maps to the title of an English Wikipedia article (or a list of titles, for places whose
// first article has few photos). The first article's lead image is the first slide, then more large
// landscape photos from the same article(s) rotate in. Every slide links back to its source page, which
// carries the author and licence. Food pins are areas, not restaurants, so they show the dish itself.
(function () {
  var WIKI = {
    "rmstation": "Rocky Mountaineer",
    "canadaplace": "Canada Place",
    "gastown": "Gastown",
    "scienceworld": "Science World (Vancouver)",
    "chinatown": "Dr. Sun Yat-Sen Classical Chinese Garden",
    "stanley": "Stanley Park",
    "aquarium": "Vancouver Aquarium",
    "lionsgate": "Lions Gate Bridge",
    "englishbay": "English Bay, Vancouver",
    "granville": "Granville Island",
    "kits": "Kitsilano",
    "qe": "Bloedel Conservatory",
    "vandusen": "VanDusen Botanical Garden",
    "moa": "Museum of Anthropology at UBC",
    "capilano": [
      "Capilano Suspension Bridge",
      "Capilano River"
    ],
    "grouse": "Grouse Mountain",
    "cypress": [
      "Cypress Mountain",
      "Cypress Provincial Park"
    ],
    "burnaby": ["Burnaby Mountain", "Simon Fraser University", "Burnaby"],
    "seymour": [
      "Mount Seymour Provincial Park",
      "Mount Seymour"
    ],
    "lynn": "Lynn Canyon Park",
    "deepcove": "Deep Cove, North Vancouver",
    "steveston": "Steveston, British Columbia",
    "buddhist": "International Buddhist Temple",
    "horseshoe": "Horseshoe Bay, West Vancouver",
    "britannia": "Britannia Mine Museum",
    "shannon": "Shannon Falls Provincial Park",
    "gondola": [
      "Sea to Sky Gondola",
      "Squamish, British Columbia"
    ],
    "chief": "Stawamus Chief",
    "brandywine": [
      "Brandywine Falls Provincial Park",
      "Garibaldi Provincial Park"
    ],
    "garibaldi": "Garibaldi Lake",
    "whistler": "Whistler, British Columbia",
    "peak2peak": "Peak 2 Peak Gondola",
    "innerharbour": "Victoria Harbour (British Columbia)",
    "empress": "The Empress (hotel)",
    "parliament": "British Columbia Parliament Buildings",
    "rbcm": "Royal British Columbia Museum",
    "butchart": "Butchart Gardens",
    "craigdarroch": "Craigdarroch Castle",
    "wharf": [
      "Victoria, British Columbia"
    ],
    "vicchina": "Chinatown, Victoria",
    "nanaimo": [
      "Nanaimo",
      "Nanaimo Harbour"
    ],
    "langley": "Fort Langley National Historic Site",
    "bridalveil": [
      "Bridal Veil Falls Provincial Park",
      "Chilliwack"
    ],
    "harrison": "Harrison Hot Springs",
    "hope": "Hope, British Columbia",
    "othello": "Coquihalla Canyon Provincial Park",
    "dimsum": "Dim sum",
    "hkcafe": "Cha chaan teng",
    "szechuan": "Sichuan cuisine",
    "nightmarket": [
      "Richmond Night Market",
      "Richmond, British Columbia"
    ],
    "taiwan": [
      "Bubble tea",
      "Beef noodle soup"
    ],
    "siumei": "Siu mei",
    "fishchips": "Fish and chips",
    "japadog": [
      "Japadog",
      "Hot dog"
    ],
    "ramen": "Ramen",
    "sushi": "Sushi",
    "korean": "Korean barbecue",
    "salmon": [
      "Smoked salmon",
      "Lox"
    ],
    "poutine": "Poutine",
    "italian": [
      "Gelato",
      "Espresso"
    ],
    "market": "Granville Island",
    "greek": "Souvlaki",
    "indian": [
      "Curry",
      "Punjabi cuisine"
    ],
    "vietnamese": "Pho",
    "mexican": "Taco",
    "filipino": "Adobo",
    "persian": [
      "Chelow kabab",
      "Iranian cuisine"
    ],
    "donuts": "Doughnut",
    "brew": [
      "Craft beer",
      "Squamish, British Columbia"
    ],
    "fondue": [
      "Fondue",
      "Raclette"
    ],
    "tea": "Tea (meal)",
    "fishwharf": "Fish and chips",
    "nanaimobar": "Nanaimo bar",
    "berries": "Blueberry",
    "valleyfarm": "Chilliwack",
    "hopepie": "Pie"
  };
  var mem = {}, memMore = {}, memLead = {}, memList = {};
  var API = 'https://en.wikipedia.org/api/rest_v1/page/summary/';
  var MEDIA = 'https://en.wikipedia.org/api/rest_v1/page/media-list/';
  var INFO = 'https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=imageinfo&iiprop=url|size|mime&iiurlwidth=960&titles=';
  var KEY = 'vanphoto1:', KEY_MORE = 'vanmore1:';
  var MAX = 6, EVERY = 4500;
  var BAD = /\b(map|maps|logo|flag|icon|diagram|chart|locator|symbol|seal|plaque|poster|stamp)\b|coat of arms/i;
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function cached(key) { try { var h = sessionStorage.getItem(key); return h ? JSON.parse(h) : null; } catch (e) { return null; } }
  function store(key, v) { try { sessionStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* storage may be unavailable */ } }
  function fileName(src) { var m = /\/thumb\/\w\/\w\w\/([^/]+)\//.exec(src || ''); return m ? decodeURIComponent(m[1]).replace(/_/g, ' ') : null; }
  function titles(id) { var t = WIKI[id]; return !t ? [] : (Array.isArray(t) ? t : [t]); }

  // An article's lead image: fast, and always the first slide.
  function leadOf(title) {
    if (memLead[title]) return memLead[title];
    var hit = cached(KEY + title);
    if (hit) { memLead[title] = Promise.resolve(hit); return memLead[title]; }
    memLead[title] = fetch(API + encodeURIComponent(title.replace(/ /g, '_')), { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || !d.thumbnail) return null;
        var big = d.thumbnail.source;
        // Wikimedia only serves fixed thumbnail widths; 960 is one of them.
        if (d.originalimage && d.originalimage.width >= 1000) big = d.thumbnail.source.replace(/\/\d+px-/, '/960px-');
        var out = { src: big, fallback: d.thumbnail.source, name: fileName(d.thumbnail.source), page: d.content_urls && d.content_urls.desktop ? d.content_urls.desktop.page : 'https://en.wikipedia.org/wiki/' + encodeURIComponent(title) };
        store(KEY + title, out);
        return out;
      })
      .catch(function () { delete memLead[title]; return null; });
    return memLead[title];
  }

  // More photos from one article, in the order its editors placed them. Only large landscape JPEGs; no maps, logos or flags.
  function moreOf(title) {
    if (memMore[title]) return memMore[title];
    var hit = cached(KEY_MORE + title);
    if (hit) { memMore[title] = Promise.resolve(hit); return memMore[title]; }
    memMore[title] = fetch(MEDIA + encodeURIComponent(title.replace(/ /g, '_')), { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        var files = ((d && d.items) || []).filter(function (it) { return it.type === 'image' && /\.jpe?g$/i.test(it.title) && !BAD.test(it.title.replace(/_/g, ' ')); })
          .map(function (it) { return it.title; }).slice(0, 16);
        if (!files.length) return [];
        return fetch(INFO + encodeURIComponent(files.join('|'))).then(function (r) { return r.ok ? r.json() : null; }).then(function (q) {
          var pages = (q && q.query && q.query.pages) || {}, by = {};
          Object.keys(pages).forEach(function (k) { by[pages[k].title] = pages[k]; });
          var out = [];
          files.forEach(function (f) {
            var pg = by[f.replace(/_/g, ' ')], ii = pg && pg.imageinfo && pg.imageinfo[0];
            if (!ii || ii.mime !== 'image/jpeg' || ii.width < 1200 || !ii.height) return;
            var ratio = ii.width / ii.height;
            if (ratio < 1.25 || ratio > 3) return;
            out.push({ src: ii.thumburl, name: f.replace(/^File:/, '').replace(/_/g, ' '), page: 'https://commons.wikimedia.org/wiki/' + encodeURI(f.replace(/ /g, '_')) });
          });
          store(KEY_MORE + title, out);
          return out;
        });
      })
      .catch(function () { delete memMore[title]; return []; });
    return memMore[title];
  }

  function load(id) { var t = titles(id); return t.length ? leadOf(t[0]) : Promise.resolve(null); }

  // Extra slides for a place: the first article's other photos, then (only if still short) the next articles' lead and photos.
  function more(id) {
    var t = titles(id);
    if (!t.length) return Promise.resolve([]);
    if (memList[id]) return memList[id];
    memList[id] = t.reduce(function (chain, title, i) {
      return chain.then(function (list) {
        if (list.length >= MAX) return list;
        if (i === 0) return moreOf(title).then(function (r) { return list.concat(r); });
        return Promise.all([leadOf(title), moreOf(title)]).then(function (r) {
          return list.concat(r[0] ? [{ src: r[0].src, name: r[0].name, page: r[0].page, lead: true }] : [], r[1]);
        });
      });
    }, Promise.resolve([]));
    return memList[id];
  }

  // Fill a placeholder element with a photo slideshow. `stillWanted` guards against the card having changed meanwhile.
  function fill(box, id, stillWanted, done) {
    if (!box) return;
    var lead0 = null, slides = [], cur = 0, timer = null, paused = false, dots = null, cr = null;
    var alive = function () { return box.isConnected && (!stillWanted || stillWanted()); };

    function show(n) {
      if (!slides.length) return;
      cur = (n + slides.length) % slides.length;
      slides.forEach(function (s, k) { s.img.className = k === cur ? 'in' : ''; });
      if (dots) [].forEach.call(dots.children, function (d, k) { d.className = k === cur ? 'on' : ''; });
      if (cr) { cr.href = slides[cur].page; cr.textContent = slides[cur].lead ? '📷 Wikipedia' : '📷 Wikimedia'; }
    }
    function restart() {
      clearInterval(timer); timer = null;
      if (reduced || slides.length < 2) return;
      timer = setInterval(function () {
        if (!alive()) { clearInterval(timer); return; }
        if (!paused) show(cur + 1);
      }, EVERY);
    }
    function buildDots() {
      if (slides.length < 2) return;
      if (!dots) { dots = document.createElement('div'); dots.className = 'dots'; box.appendChild(dots); }
      dots.innerHTML = '';
      slides.forEach(function (s, k) {
        var b = document.createElement('button');
        b.type = 'button'; b.setAttribute('aria-label', 'Photo ' + (k + 1) + ' of ' + slides.length);
        b.addEventListener('click', function (ev) { ev.stopPropagation(); show(k); restart(); });
        dots.appendChild(b);
      });
      show(cur);
    }
    function add(src, page, lead, fallback, first) {
      var img = new Image();
      img.alt = ''; img.referrerPolicy = 'no-referrer'; img.decoding = 'async';
      img.onload = function () {
        if (!alive()) return;
        var s = { img: img, page: page, lead: lead };
        if (first) {
          box.hidden = false; box.innerHTML = '';
          box.appendChild(img);
          cr = document.createElement('a');
          cr.className = 'cr'; cr.target = '_blank'; cr.rel = 'noopener';
          box.appendChild(cr);
          box.addEventListener('mouseenter', function () { paused = true; });
          box.addEventListener('mouseleave', function () { paused = false; });
          slides.push(s); show(0);
          if (done) done();
          more(id).then(function (list) {
            if (!alive()) return;
            var seen = {};
            if (lead0.name) seen[lead0.name] = 1;
            list.filter(function (it) { if (seen[it.name]) return false; seen[it.name] = 1; return true; })
              .slice(0, MAX - 1).forEach(function (it) { add(it.src, it.page, !!it.lead, null, false); });
          });
        } else {
          box.insertBefore(img, cr);
          slides.push(s); buildDots(); restart();
        }
      };
      img.onerror = function () { if (fallback && img.src !== fallback) img.src = fallback; };
      img.src = src;
    }

    load(id).then(function (ph) {
      if (!ph || !alive()) return;
      lead0 = ph;
      add(ph.src, ph.page, true, ph.fallback, true);
    });
  }

  window.VAN_PHOTO = { has: function (id) { return titles(id).length > 0; }, load: load, more: more, fill: fill };
})();
