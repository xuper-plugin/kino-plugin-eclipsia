// src/browse/model.js
var TAB_IDS = ["inicio", "peliculas", "series"];
var MAX_SLIDES = 6;
var MAX_RAILS = 8;
var MAX_RAIL_ITEMS = 20;
var MAX_SLIDE_TEXT = 160;
var HTTPS = /^https:\/\//;
function cardOf(item) {
  const out = { id: `${item.kind}-${item.id}`, ref: item.ref, title: item.title, kind: item.kind };
  const poster = item.poster || item.logo;
  if (poster && HTTPS.test(poster)) out.poster = poster;
  if (item.backdrop && HTTPS.test(item.backdrop)) out.backdrop = item.backdrop;
  if (item.rating !== void 0) out.rating = item.rating;
  if (item.year !== void 0) out.year = item.year;
  if (item.ids && item.ids.tmdb) out.ids = { tmdb: item.ids.tmdb };
  if (item.adult === true) out.adult = true;
  return out;
}
function slidesOf(rows) {
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  for (const row of rows) {
    for (const item of row.items) {
      if (out.length >= MAX_SLIDES) return out;
      if (item.adult === true || seen.has(item.id) || !item.backdrop || !HTTPS.test(item.backdrop)) continue;
      const text = typeof item.overview === "string" ? item.overview.trim() : "";
      if (text === "") continue;
      seen.add(item.id);
      out.push({
        id: item.id,
        ref: item.ref,
        kind: item.kind,
        title: item.title,
        image: item.backdrop,
        text: text.length <= MAX_SLIDE_TEXT ? text : `${text.slice(0, MAX_SLIDE_TEXT - 1).trimEnd()}\u2026`
      });
    }
  }
  return out;
}
function railsOf(rows) {
  return rows.filter((r) => r.items && r.items.length > 0).slice(0, MAX_RAILS).map((r) => ({
    id: r.id,
    title: r.title,
    ...r.ref ? { ref: r.ref } : {},
    items: r.items.slice(0, MAX_RAIL_ITEMS).map(cardOf)
  }));
}
function tabOf(page) {
  const rows = page && Array.isArray(page.rows) ? page.rows : [];
  const rails = railsOf(rows);
  if (rails.length === 0) return null;
  return { slides: slidesOf(rows), rails };
}
function playedKey(ref) {
  const r = String(ref || "");
  let m = /^movie:(\d{1,10})$/.exec(r);
  if (m) return `m:${m[1]}`;
  m = /^ep:(\d{1,10}):/.exec(r);
  return m ? `s:${m[1]}` : "";
}
function recentOf(keys, tabs) {
  if (keys.length === 0) return [];
  const byKey = /* @__PURE__ */ new Map();
  for (const data of tabs) {
    for (const rail2 of data.rails) {
      for (const card of rail2.items) {
        const k = card.ids && card.ids.tmdb ? `${card.kind === "series" ? "s" : "m"}:${card.ids.tmdb}` : "";
        if (k && !byKey.has(k)) byKey.set(k, card);
      }
    }
  }
  const out = [];
  const used = /* @__PURE__ */ new Set();
  for (const key of keys) {
    const card = byKey.get(key);
    if (card && !used.has(card.id)) {
      used.add(card.id);
      out.push(card);
    }
  }
  return out;
}

// src/browse/words.js
var WORDS = {
  tabHome: ["Inicio", "Home"],
  tabMovies: ["Pel\xEDculas", "Movies"],
  tabSeries: ["Series", "Series"],
  brWatch: ["Ver", "Watch"],
  brInfo: ["M\xE1s informaci\xF3n", "More info"],
  brRecent: ["Continuar viendo", "Continue watching"],
  brSearch: ["Buscar", "Search"],
  brSearchHint: ["Buscar en Eclipsia", "Search Eclipsia"],
  brSearchTitle: ["Buscar", "Search"],
  brSearchedBefore: ["Buscado recientemente", "Recently searched"],
  brNoResults: ["No encontramos nada con esas palabras.", "Nothing matched those words."],
  brSearchFailed: ["No se pudo buscar. Revisa tu conexi\xF3n e int\xE9ntalo de nuevo.", "The search failed. Check your connection and try again."],
  brFailed: ["No se pudo cargar esta secci\xF3n. Revisa tu conexi\xF3n e int\xE9ntalo de nuevo.", "This section could not be loaded. Check your connection and try again."],
  brRetry: ["Reintentar", "Retry"],
  brEmpty: ["A\xFAn no hay nada aqu\xED.", "Nothing here yet."],
  brBack: ["Atr\xE1s", "Back"],
  brClose: ["Cerrar", "Close"],
  brSettings: ["Configuraci\xF3n", "Settings"]
};
var both = (key) => ({ es: WORDS[key][0], en: WORDS[key][1] });
var KEYS = Object.keys(WORDS);

// src/browse/logo.js
var LOGO_ASPECT = "3.33:1";
var LOGO_DATA = "data:image/png;base64,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";

// src/browse/view.js
var TAB_KEYS = { inicio: "tabHome", peliculas: "tabMovies", series: "tabSeries" };
var POLL_MS = 1500;
var SEARCH_CAP = 60;
var twin = (key, field = "text", vars) => {
  const w = both(key, vars);
  return { [field]: w.es, [field + "En"]: w.en };
};
var logo = () => ({
  type: "Image",
  key: "logo",
  url: LOGO_DATA,
  aspect: LOGO_ASPECT,
  fit: "contain",
  h: 40,
  alt: "Eclipsia",
  altEn: "Eclipsia",
  fallback: { type: "Text", text: "Eclipsia", textEn: "Eclipsia", style: "h4" }
});
var tabBar = (active) => ({ type: "TabBar", key: "tabs", divider: false, value: active, onChanged: "tab", tabs: TAB_IDS.map((id) => ({ value: id, ...twin(TAB_KEYS[id], "label") })) });
var railSkeleton = (n) => ({
  type: "Column",
  key: "skel" + n,
  gap: 8,
  children: [
    { type: "Skeleton", shape: "line", width: 120 },
    { type: "Row", gap: 12, sizes: ["compact"], children: [1, 2, 3].map((i) => ({ type: "Skeleton", shape: "card", key: `sk${n}c${i}`, flex: 1 })) },
    { type: "Row", gap: 12, sizes: ["medium", "expanded"], children: [1, 2, 3, 4, 5, 6].map((i) => ({ type: "Skeleton", shape: "card", key: `sk${n}w${i}`, flex: 1 })) }
  ]
});
var gridSkeleton = () => ({
  type: "Column",
  key: "gridSkeleton",
  gap: 12,
  children: [
    ...[1, 2].map((r) => ({ type: "Row", gap: 12, sizes: ["compact"], key: `gc${r}`, children: [1, 2, 3].map((i) => ({ type: "Skeleton", shape: "card", key: `gc${r}-${i}`, flex: 1 })) })),
    ...[1, 2].map((r) => ({ type: "Row", gap: 12, sizes: ["medium", "expanded"], key: `gw${r}`, children: [1, 2, 3, 4, 5, 6].map((i) => ({ type: "Skeleton", shape: "card", key: `gw${r}-${i}`, flex: 1 })) }))
  ]
});
var heroSkeleton = () => ({ type: "Skeleton", key: "heroSkeleton", shape: "block", height: { compact: 200, expanded: 320 } });
var slideNode = (s) => ({
  type: "heroCard",
  key: "slide-" + s.id,
  h: { compact: 200, expanded: 240 },
  ...s.logo ? { logo: s.logo } : {},
  title: s.title,
  text: s.text,
  image: s.image,
  buttons: [
    {
      type: "ElevatedButton",
      key: "watch-" + s.id,
      ...twin("brWatch", "labelText"),
      icon: "play",
      onPressed: { go: { play: { ref: s.ref, kind: s.kind, id: s.id, title: s.title } } }
    },
    {
      type: "TextButton",
      key: "info-" + s.id,
      ...twin("brInfo", "labelText"),
      onPressed: { go: { title: { ref: s.ref, kind: s.kind, id: s.id, title: s.title } } }
    }
  ]
});
var hero = (slides) => slides.length === 1 ? slideNode(slides[0]) : {
  type: "PageView",
  key: "hero" + slides.length,
  autoPlayMs: 6e3,
  children: slides.map(slideNode)
};
var rail = (r, key, titleOverride, size = "medium") => ({
  type: "titleRail",
  key,
  ...titleOverride || { title: r.title },
  ...r.ref ? { ref: r.ref } : {},
  items: r.items,
  size
});
function browseView({ tab, data, recent, pending, failed, device = "phone" }) {
  const tv = device === "tv";
  const gear = { type: "IconButton", key: "settingsButton", icon: "settings", ...twin("brSettings", "labelText"), ...twin("brSettings", "tooltip"), onPressed: { event: "go", arg: "settings" } };
  const active = TAB_IDS.includes(tab) ? tab : TAB_IDS[0];
  const body = [];
  if (data) {
    if (data.slides.length > 0) body.push(hero(data.slides));
    else if (pending) body.push(heroSkeleton());
    if (recent.length > 0) body.push(rail({ items: recent }, "recent", twin("brRecent", "title"), tv ? "small" : "medium"));
    for (const r of data.rails) body.push(rail(r, "rail-" + String(r.id).replace(/[^A-Za-z0-9_-]/g, "_"), null, tv ? "small" : "medium"));
    if (data.rails.length === 0) body.push({ type: "Text", ...twin("brEmpty", "text"), color: "muted" });
  } else if (failed) {
    body.push({
      type: "MaterialBanner",
      key: "loadFailed",
      role: "error",
      ...twin("brFailed"),
      action: { ...twin("brRetry", "label"), onTap: "retry" }
    });
  } else {
    body.push(heroSkeleton(), railSkeleton(1), railSkeleton(2), railSkeleton(3));
  }
  return {
    type: "Scaffold",
    appBar: {
      type: "AppBar",
      // One bar instead of two (Kino 0.9.81+; an older Kino draws its own bar above and this one under it): the close button where
      // Kino's was and the plugin's logo where its name was (its name when the logo cannot be drawn), with no line under it.
      mergeWithKinoBar: true,
      dense: true,
      divider: false,
      leading: { type: "IconButton", key: "close", icon: "close", ...twin("brClose", "labelText"), ...twin("brClose", "tooltip"), onPressed: { go: { close: true } } },
      // On a TV the search is a button of the bar (a floating one is hard to reach with a remote); elsewhere it floats.
      actions: tv ? [{ type: "IconButton", key: "searchButton", icon: "search", ...twin("brSearch", "labelText"), ...twin("brSearch", "tooltip"), onPressed: "openSearch" }, gear] : [gear],
      title: tv ? { type: "Row", key: "titleRow", gap: 24, crossAxisAlignment: "center", children: [logo(), tabBar(active)] } : logo()
    },
    ...tv ? {} : { floatingActionButton: { type: "FloatingActionButton", key: "searchFab", icon: "search", ...twin("brSearch", "tooltip"), onPressed: "openSearch" } },
    // The tabs stay pinned under the bar; only the rows scroll.
    body: { type: "Column", key: "page", children: [
      // The tabs line up with the bar's buttons and the cards below (a wide window and the TV pad their content by 24).
      ...tv ? [] : [{ type: "Column", key: "tabsRow", padding: { compact: 0, expanded: 24 }, children: [tabBar(active)] }],
      { type: "SingleChildScrollView", key: "browse-" + active, flex: 1, children: [{ type: "Column", padding: { compact: 12, expanded: 24 }, gap: 16, children: body }] }
    ] },
    ...pending ? { every: { ms: POLL_MS, event: "tick" } } : {}
  };
}
function settingsView() {
  return {
    type: "Scaffold",
    appBar: {
      type: "AppBar",
      mergeWithKinoBar: true,
      dense: true,
      divider: false,
      leading: { type: "IconButton", key: "back", icon: "arrow_back", ...twin("brBack", "labelText"), ...twin("brBack", "tooltip"), onPressed: "back" },
      title: logo()
    },
    body: { type: "SingleChildScrollView", key: "settings-page", children: [{ type: "Column", padding: { compact: 12, expanded: 24 }, gap: 16, children: [{ type: "settings", key: "form" }] }] }
  };
}
function searchView({ query, status, items, history = [], device = "phone" }) {
  const tv = device === "tv";
  const searchForm = () => ({
    type: "Form",
    key: "searchForm",
    onSubmitted: "search",
    gap: 8,
    children: tv ? [{ type: "Row", key: "searchRow", gap: 16, crossAxisAlignment: "center", children: [
      { type: "TextField", key: "q", kind: "text", value: query, ...twin("brSearchHint", "labelText"), maxLength: 100, autofocus: true, weight: 1 },
      { type: "ElevatedButton", key: "searchGo", ...twin("brSearch", "labelText"), icon: "search", submit: true }
    ] }] : [
      { type: "TextField", key: "q", kind: "text", value: query, ...twin("brSearchHint", "labelText"), maxLength: 100, autofocus: true },
      { type: "ElevatedButton", key: "searchGo", ...twin("brSearch", "labelText"), icon: "search", submit: true }
    ]
  });
  const body = tv ? [] : [searchForm()];
  if (status === "fail") {
    body.push({ type: "MaterialBanner", key: "searchFailed", role: "error", ...twin("brSearchFailed"), action: { ...twin("brRetry", "label"), onTap: "sretry" } });
  } else if (status === "done" && items) {
    if (items.length === 0) body.push({ type: "Text", ...twin("brNoResults", "text"), color: "muted" });
    else body.push({ type: "titleGrid", key: "results", columns: { compact: 3, expanded: 6 }, items: items.slice(0, SEARCH_CAP) });
  } else if (status !== "idle") {
    body.push(gridSkeleton());
  } else if (history.length > 0) {
    body.push({ type: "Text", ...twin("brSearchedBefore", "text"), style: "h4" });
    body.push({ type: "titleGrid", key: "history", columns: { compact: 3, expanded: 6 }, items: history.slice(0, SEARCH_CAP) });
  }
  return {
    type: "Scaffold",
    appBar: {
      type: "AppBar",
      mergeWithKinoBar: true,
      dense: true,
      divider: false,
      leading: { type: "IconButton", key: "back", icon: "arrow_back", ...twin("brBack", "labelText"), ...twin("brBack", "tooltip"), onPressed: "back" },
      ...tv ? { title: searchForm() } : twin("brSearchTitle", "title")
    },
    body: { type: "SingleChildScrollView", key: "search-page", children: [{ type: "Column", padding: { compact: 12, expanded: 24 }, gap: 16, children: body }] },
    ...status === "loading" ? { every: { ms: 1e3, event: "stick" } } : {}
  };
}

// src/browse/metaCache.js
var KEY = "meta2";
var MAX = 260;
var CALL_MS = 8e3;
var CONCURRENCY = 3;
var HTTPS2 = /^https:\/\//;
function makeMetaCache({ kino: kino2, clock = { now: () => Date.now() } }) {
  const usable = () => {
    try {
      return typeof kino2.meta === "function" && kino2.meta.byTitle === true;
    } catch (_) {
      return false;
    }
  };
  let book = null;
  function read() {
    if (book) return book;
    try {
      const o = JSON.parse(kino2.storage.get(KEY) || "null");
      book = o && typeof o === "object" && !Array.isArray(o) ? o : {};
    } catch (_) {
      book = {};
    }
    return book;
  }
  function write() {
    try {
      const ids = Object.keys(book);
      if (ids.length > MAX) for (const id of ids.slice(0, ids.length - MAX)) delete book[id];
      kino2.storage.set(KEY, JSON.stringify(book));
    } catch (_) {
    }
  }
  function known(id) {
    const e = read()[id];
    if (!e) return {};
    return {
      ...e.t > 0 ? { tmdb: e.t } : {},
      ...e.l && HTTPS2.test(e.l) ? { logo: e.l } : {},
      ...e.b && HTTPS2.test(e.b) && e.o ? { backdrop: e.b, overview: e.o } : {}
    };
  }
  const asked = (id) => Object.hasOwn(read(), id);
  function dress(cards) {
    return cards.map((c) => {
      const k = known(c.id);
      const withId = k.tmdb && !(c.ids && c.ids.tmdb) ? { ...c, ids: { ...c.ids || {}, tmdb: k.tmdb } } : c;
      return k.backdrop && !withId.backdrop ? { ...withId, backdrop: k.backdrop } : withId;
    });
  }
  async function fill(cards, budgetMs) {
    if (!usable()) return 0;
    const b = read();
    const end = clock.now() + budgetMs;
    let asked2 = 0;
    let stop = false;
    const todo = cards.filter((c) => c && typeof c.id === "string" && !Object.hasOwn(b, c.id) && !(c.ids && c.ids.tmdb && c.noLogo));
    let next = 0;
    const worker = async () => {
      while (!stop && next < todo.length) {
        if (clock.now() + CALL_MS > end) return;
        const c = todo[next++];
        const year = c.year !== void 0 ? { year: c.year } : {};
        try {
          const a = await kino2.meta({ type: c.kind === "series" ? "series" : "movie", title: c.title, ...year });
          b[c.id] = {
            t: a && a.ids && Number.isInteger(a.ids.tmdb) ? a.ids.tmdb : 0,
            l: a && typeof a.logo === "string" ? a.logo : "",
            b: a && typeof a.backdrop === "string" ? a.backdrop : "",
            o: a && typeof a.overview === "string" ? a.overview.slice(0, 160) : ""
          };
          asked2++;
        } catch (e) {
          if (e && e.code === "rate_limited") stop = true;
        }
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    if (asked2 > 0) write();
    return asked2;
  }
  return { known, asked, dress, fill, usable };
}

// src/browse/index.js
var TAB_KEY = "browseTab";
var SNAP_PREFIX = "browse1:";
var SNAP_TTL_MS = 7 * 24 * 3600 * 1e3;
var HOME_KEY = "home1";
var SNAP_MAX = 20 * 1024;
var RECENT_KEY = "recent1";
var RECENT_MAX = 12;
var HIST_KEY = "searchHist1";
var HIST_MAX = 24;
var MAX_META_TICKS = 30;
function metaAsk(c) {
  const title = String(c.title).replace(/\s*[([][^)\]]*[)\]]/g, "").replace(/\s+/g, " ").trim() || String(c.title);
  const y = /\((19|20)\d{2}\)/.exec(String(c.title));
  return { id: c.id, title, kind: c.kind, ...y ? { year: parseInt(y[0].slice(1, 5), 10) } : {} };
}
var MAX_LOAD_TRIES = 3;
function makeBrowse({ kino: kino2, loadTab, searchTitles }) {
  const meta = makeMetaCache({ kino: kino2 });
  const slidesFrom = (rails) => {
    const out = [];
    for (const r of rails) for (const c of r.items) {
      if (out.length >= 5) return out;
      const k = meta.known(c.id);
      if (!k.backdrop || c.adult === true || out.some((s) => s.id === c.id)) continue;
      out.push({ id: c.id, ref: c.ref, kind: c.kind, title: c.title, image: k.backdrop, text: k.overview, ...k.logo ? { logo: k.logo } : {} });
    }
    return out;
  };
  const uniform = (items) => items.every((i) => i.backdrop) ? items : items.map(({ backdrop, ...rest }) => rest);
  const enrich = (data) => data ? {
    slides: data.slides.length > 0 ? data.slides.map((s) => {
      const k = meta.known(s.id);
      return k.logo ? { ...s, logo: k.logo } : s;
    }) : slidesFrom(data.rails),
    rails: data.rails.map((r) => ({ ...r, items: uniform(meta.dress(r.items)) }))
  } : data;
  const metaTries = /* @__PURE__ */ new Map();
  const memo = /* @__PURE__ */ new Map();
  const log = (...a) => {
    try {
      kino2.log("[animes]", ...a);
    } catch (_) {
    }
  };
  const get = (k) => {
    try {
      return kino2.storage.get(k);
    } catch (_) {
      return null;
    }
  };
  const set = (k, v, opts) => {
    try {
      kino2.storage.set(k, v, opts);
    } catch (_) {
    }
  };
  function readSnap(tab) {
    try {
      const o = JSON.parse(get(SNAP_PREFIX + tab) || "null");
      return o && Date.now() - o.at < SNAP_TTL_MS && o.data && Array.isArray(o.data.rails) ? o.data : null;
    } catch (_) {
      return null;
    }
  }
  function writeSnap(tab, data) {
    for (let per = 10; per >= 3; per -= 2) {
      const slim2 = { slides: data.slides, rails: data.rails.map((r) => ({ ...r, items: r.items.slice(0, per) })) };
      const text = JSON.stringify({ at: Date.now(), data: slim2 });
      if (text.length <= SNAP_MAX) {
        set(SNAP_PREFIX + tab, text, { ttlMs: SNAP_TTL_MS });
        return;
      }
    }
  }
  function homeSeed(tab) {
    if (tab !== "inicio") return null;
    try {
      const o = JSON.parse(get(HOME_KEY) || "null");
      return o && Array.isArray(o.rows) && o.rows.length ? tabOf({ rows: o.rows }) : null;
    } catch (_) {
      return null;
    }
  }
  const stored = () => {
    const t = get(TAB_KEY);
    return TAB_IDS.includes(t) ? t : null;
  };
  const remember = (tab) => set(TAB_KEY, tab);
  function dataOf(tab) {
    if (memo.has(tab)) return memo.get(tab).data;
    const snap = readSnap(tab) || homeSeed(tab);
    if (snap) {
      memo.set(tab, { data: snap, whole: false });
      return snap;
    }
    return null;
  }
  const readKeys = () => {
    try {
      const a = JSON.parse(get(RECENT_KEY) || "[]");
      return Array.isArray(a) ? a.filter((k) => typeof k === "string") : [];
    } catch (_) {
      return [];
    }
  };
  function notePlayed(ref) {
    try {
      const key = playedKey(ref);
      if (key === "") return;
      const keys = readKeys();
      if (keys[0] === key) return;
      set(RECENT_KEY, JSON.stringify([key, ...keys.filter((k) => k !== key)].slice(0, RECENT_MAX)));
    } catch (_) {
    }
  }
  const slim = (c) => ({ id: c.id, ref: c.ref, title: c.title, kind: c.kind, ...c.poster ? { poster: c.poster } : {} });
  function readHistory() {
    try {
      const a = JSON.parse(get(HIST_KEY) || "[]");
      return Array.isArray(a) ? a.filter((c) => c && typeof c.id === "string" && typeof c.ref === "string" && typeof c.title === "string").slice(0, HIST_MAX) : [];
    } catch (_) {
      return [];
    }
  }
  function rememberFound(cards) {
    try {
      const fresh = cards.filter((c) => c.adult !== true).slice(0, 12).map(slim);
      const ids = new Set(fresh.map((c) => c.id));
      set(HIST_KEY, JSON.stringify([...fresh, ...readHistory().filter((c) => !ids.has(c.id))].slice(0, HIST_MAX)));
    } catch (_) {
    }
  }
  let found = null;
  const tabFromArgs = (route) => {
    const a = route && route.args && typeof route.args === "object" ? route.args : {};
    return TAB_IDS.includes(a.tab) ? a.tab : null;
  };
  function needed(tab, device) {
    const order = [tab, ...TAB_IDS.filter((t) => t !== tab)];
    return order.filter((t, i) => (i === 0 || device !== "tv") && !(memo.get(t) && memo.get(t).whole));
  }
  function view(ctx) {
    const st = ctx.state && typeof ctx.state === "object" ? ctx.state : {};
    if (ctx.route && ctx.route.name === "settings") return settingsView();
    if (ctx.route && ctx.route.name === "search") {
      const query = typeof st.sq === "string" ? st.sq : "";
      const items = found && found.q === query ? found.items : null;
      const status = query === "" ? "idle" : st.sstate === "fail" ? "fail" : items ? "done" : "loading";
      return searchView({ query, status, items, history: query === "" ? readHistory() : [], device: ctx.device });
    }
    const tab = TAB_IDS.includes(st.tab) ? st.tab : tabFromArgs(ctx.route) ?? stored() ?? TAB_IDS[0];
    const data = enrich(dataOf(tab));
    const loaded = TAB_IDS.map((t) => memo.get(t)).filter(Boolean).map((m) => m.data);
    const pending = Array.isArray(st.pending) && st.pending.length > 0;
    return browseView({ tab, data, recent: uniform(meta.dress(recentOf(readKeys(), loaded))), pending, failed: !!(st.failed && st.failed[tab]), device: ctx.device });
  }
  async function load(tab) {
    const page = await loadTab(tab);
    const data = tabOf(page);
    if (data) {
      memo.set(tab, { data, whole: true });
      writeSnap(tab, data);
    }
    return data !== null;
  }
  const loadTries = /* @__PURE__ */ new Map();
  function failLoad(tab, rest, failed) {
    const n = (loadTries.get(tab) || 0) + 1;
    loadTries.set(tab, n);
    if (n < MAX_LOAD_TRIES) rest.push(tab);
    else {
      failed[tab] = true;
      loadTries.delete(tab);
    }
  }
  const events = {
    open({ route, state, device }) {
      const tab = tabFromArgs(route) ?? (TAB_IDS.includes(state.tab) ? state.tab : stored() ?? TAB_IDS[0]);
      for (const t of TAB_IDS) dataOf(t);
      return { state: { tab, pending: needed(tab, device), failed: null } };
    },
    tab({ value, arg, state }) {
      const tab = TAB_IDS.includes(value) ? value : TAB_IDS.includes(arg) ? arg : null;
      if (!tab) return null;
      remember(tab);
      dataOf(tab);
      const failed = { ...state.failed || {} };
      delete failed[tab];
      const pending = [tab, ...Array.isArray(state.pending) ? state.pending.filter((t) => t !== tab) : []];
      return { state: { tab, pending: memo.get(tab) && memo.get(tab).whole ? pending.slice(1) : pending, failed } };
    },
    retry({ state, device }) {
      const tab = TAB_IDS.includes(state.tab) ? state.tab : TAB_IDS[0];
      return { state: { failed: null, pending: [tab, ...needed(tab, device).filter((t) => t !== tab)] } };
    },
    async tick({ state }) {
      const pending = Array.isArray(state.pending) ? state.pending : [];
      if (pending.length === 0) return null;
      const [next, ...rest] = pending;
      const failed = { ...state.failed || {} };
      if (next.startsWith("meta:")) {
        const tabId = next.slice(5);
        const m = memo.get(tabId);
        if (!m) return { state: { pending: rest } };
        const cards = [...m.data.slides, ...m.data.rails.flatMap((r) => r.items.slice(0, 6)), ...m.data.rails.flatMap((r) => r.items.slice(6))];
        const asked = await meta.fill(cards.map(metaAsk), 12e3);
        const made = slidesFrom(m.data.rails);
        if (made.length > m.data.slides.length) {
          m.data = { ...m.data, slides: made.map(({ logo: logo2, ...rest2 }) => rest2) };
          writeSnap(tabId, m.data);
        }
        const tries = (metaTries.get(tabId) || 0) + 1;
        metaTries.set(tabId, tries);
        if (asked > 0 && tries < MAX_META_TICKS && cards.some((c) => !meta.asked(c.id))) return { state: { pending: [next, ...rest] } };
        return { state: { pending: rest } };
      }
      try {
        const ok = await load(next);
        if (!ok) failLoad(next, rest, failed);
        else delete failed[next];
        if (ok && meta.usable()) rest.unshift("meta:" + next);
      } catch (e) {
        log("browse tab", e && e.code || "error");
        failLoad(next, rest, failed);
      }
      return { state: { pending: rest, failed } };
    },
    // The floating button: straight to the search page, empty and ready for the words.
    openSearch() {
      return { route: { push: "search" }, state: { sq: "", sstate: null } };
    },
    search({ value, route }) {
      const q = value && typeof value.q === "string" ? value.q.trim().slice(0, 100) : "";
      if (q === "") return null;
      const state = { sq: q, sstate: "loading" };
      return route && route.name === "search" ? { state } : { route: { push: "search" }, state };
    },
    // The search page's timer: one search per press, then no timer.
    async stick({ state }) {
      const q = typeof state.sq === "string" ? state.sq : "";
      if (q === "" || state.sstate !== "loading") return null;
      try {
        const out = await searchTitles(q);
        found = { q, items: (Array.isArray(out) ? out : []).slice(0, 60).map(cardOf) };
        rememberFound(found.items);
        return { state: { sstate: "done" } };
      } catch (e) {
        log("browse search", e && e.code || "error");
        return { state: { sstate: "fail" } };
      }
    },
    sretry({ state }) {
      return typeof state.sq === "string" && state.sq !== "" ? { state: { sstate: "loading" } } : null;
    },
    // The gear: the plugin's settings are a page of their own, one Back away.
    go({ arg }) {
      return arg === "settings" ? { route: { push: "settings" }, state: { fromBrowse: true } } : null;
    },
    back({ state, route }) {
      if (route && route.name === "settings" && !state.fromBrowse) return { close: true };
      return { route: { pop: true }, state: { sq: null, sstate: null } };
    }
  };
  async function event(ev) {
    const handler = Object.hasOwn(events, ev.name) ? events[ev.name] : null;
    return handler ? await handler({ ...ev, state: ev.state || {} }) ?? null : null;
  }
  return { view, event, notePlayed };
}

// src/plugin.js
globalThis.__kinoDropPendingFetches = true;
var TMDB_BASE = "https://api.themoviedb.org/3";
var IMG_W500 = "https://image.tmdb.org/t/p/w500";
var IMG_W1280 = "https://image.tmdb.org/t/p/w1280";
var IMG_W300 = "https://image.tmdb.org/t/p/w300";
var VL_BASE = "https://vidlink.pro/api/b";
var ENC_API = "https://enc-dec.app/api";
var VL_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "Referer": "https://vidlink.pro/"
};
var STREAM_HEADERS = { "Referer": "https://moviebox.ph/" };
function apiKey() {
  return kino.config.get("tmdbKey") || null;
}
var hasKinoTmdb = () => typeof kino.tmdb === "function";
var NO_KEY_MESSAGE = "Necesitas una llave de TMDB: ponla en este plugin o en Ajustes \u25B8 \xABTu llave de TMDB\xBB, o instala un addon de TMDB de Stremio con tu llave.";
function noKey() {
  return kino.error("unavailable", "no TMDB key", { userMessage: NO_KEY_MESSAGE });
}
function splitQuery(path) {
  const i = path.indexOf("?");
  if (i < 0) return { path, params: {} };
  const params = {};
  for (const pair of path.slice(i + 1).split("&")) {
    if (!pair) continue;
    const eq = pair.indexOf("=");
    const k = decodeURIComponent(eq < 0 ? pair : pair.slice(0, eq));
    params[k] = eq < 0 ? "" : decodeURIComponent(pair.slice(eq + 1));
  }
  return { path: path.slice(0, i), params };
}
var isSpanish = () => String(kino.lang || "").toLowerCase().startsWith("es");
var T = (es, en) => isSpanish() ? es : en;
var withLanguage = (path) => /[?&]language=/.test(path) ? path : path + (path.includes("?") ? "&" : "?") + "language=" + (isSpanish() ? "es-MX" : "en-US");
function tmdbStatusError(status) {
  if (status === 401 || status === 403) return kino.error("unavailable", "TMDB " + status, { userMessage: "La llave de TMDB no es v\xE1lida. Rev\xEDsala en este plugin o en Ajustes \u25B8 \xABTu llave de TMDB\xBB." });
  if (status === 429) return kino.error("rate_limited", "TMDB " + status, { userMessage: "TMDB recibi\xF3 demasiadas peticiones. Espera un momento e int\xE9ntalo de nuevo." });
  return kino.error("unavailable", "TMDB " + status, { userMessage: "TMDB no responde ahora. Int\xE9ntalo de nuevo en un rato." });
}
var TMDB_MS = 8e3;
async function tmdb(rawPath) {
  const path = withLanguage(rawPath);
  const k = apiKey();
  if (k) {
    const sep = path.includes("?") ? "&" : "?";
    const r = await kino.fetch(`${TMDB_BASE}${path}${sep}api_key=${k}`, { timeoutMs: TMDB_MS });
    if (!r.ok) throw tmdbStatusError(r.status);
    return r.json();
  }
  if (!hasKinoTmdb()) throw noKey();
  const q = splitQuery(path);
  try {
    return await kino.tmdb(q.path, q.params);
  } catch (e) {
    if (e && e.code === "no_tmdb_key") throw noKey();
    throw e;
  }
}
var canTmdb = () => !!apiKey() || hasKinoTmdb();
function toItem(m) {
  const isTv = m.media_type === "tv" || !m.media_type && !!m.first_air_date;
  const kind = isTv ? "series" : "movie";
  return {
    id: String(m.id),
    ref: `${kind}:${m.id}`,
    title: m.title || m.name || "",
    kind,
    year: (m.release_date || m.first_air_date || "").slice(0, 4) || void 0,
    poster: m.poster_path ? IMG_W500 + m.poster_path : void 0,
    backdrop: m.backdrop_path ? IMG_W1280 + m.backdrop_path : void 0,
    overview: m.overview || void 0,
    rating: m.vote_average ? Math.round(m.vote_average * 10) / 10 : void 0,
    ids: { tmdb: m.id }
  };
}
function qualRank(q) {
  const s = String(q || "").toUpperCase().replace(/\s/g, "");
  if (s === "4K" || s === "2160P" || s === "2160") return 5;
  if (s === "1440P" || s === "1440") return 4;
  if (s === "1080P" || s === "1080" || s === "FHD") return 3;
  if (s === "720P" || s === "720" || s === "HD") return 2;
  if (s === "480P" || s === "480") return 1;
  return 0;
}
async function search({ q, type, cursor }) {
  if (!q || !canTmdb()) return { items: [] };
  const page = cursor ? Number(cursor) : 1;
  const mt = type === "movie" ? "movie" : type === "series" ? "tv" : "multi";
  const data = await tmdb(`/search/${mt}?query=${encodeURIComponent(q)}&page=${page}&include_adult=false`);
  const items = (data.results || []).filter((m) => m.media_type !== "person").map(toItem);
  return {
    items,
    next: data.page < data.total_pages ? String(page + 1) : void 0
  };
}
var LIST_FRESH_MS = 6 * 3600 * 1e3;
var LIST_STALE_MS = 24 * 3600 * 1e3;
var LIST_KEPT_ITEMS = 12;
var listMem = /* @__PURE__ */ new Map();
var listKey = (path) => "tl1:" + (isSpanish() ? "es" : "en") + ":" + path;
function readList(key) {
  const m = listMem.get(key);
  if (m) return m;
  try {
    const o = JSON.parse(kino.storage.get(key) || "null");
    if (o && typeof o.at === "number" && Array.isArray(o.items)) {
      listMem.set(key, o);
      return o;
    }
  } catch (_) {
  }
  return null;
}
function writeList(key, entry) {
  listMem.set(key, entry);
  try {
    const slim = { at: entry.at, items: entry.items.slice(0, LIST_KEPT_ITEMS).map((i) => i.overview ? { ...i, overview: i.overview.slice(0, 120) } : i) };
    kino.storage.set(key, JSON.stringify(slim), { ttlMs: LIST_STALE_MS });
  } catch (_) {
  }
}
async function listItems(path) {
  const key = listKey(path);
  const kept = readList(key);
  const age = kept ? Date.now() - kept.at : Infinity;
  if (kept && age < LIST_FRESH_MS) return kept.items;
  try {
    const d = await tmdb(path);
    const items = (d.results || []).map(toItem);
    writeList(key, { at: Date.now(), items });
    return items;
  } catch (e) {
    if (kept && age < LIST_STALE_MS) return kept.items;
    throw e;
  }
}
var HOME_KEY2 = "home1";
var HOME_STALE_MS = 7 * 24 * 3600 * 1e3;
var HOME_FRESH_MS = 6 * 3600 * 1e3;
var HOME_CACHE_MAX = 60 * 1024;
var HOME_GUARD_MS = 1e4;
function saveHome(rows) {
  try {
    for (let per = 20; per >= 4; per -= 4) {
      const text = JSON.stringify({ at: Date.now(), lang: isSpanish() ? "es" : "en", rows: rows.map((r) => ({ ...r, items: r.items.slice(0, per) })) });
      if (text.length <= HOME_CACHE_MAX) {
        kino.storage.set(HOME_KEY2, text, { ttlMs: HOME_STALE_MS });
        return;
      }
    }
  } catch (_) {
  }
}
function savedHome(maxAgeMs) {
  try {
    const s = JSON.parse(kino.storage.get(HOME_KEY2) || "null");
    const lang = isSpanish() ? "es" : "en";
    return s && Array.isArray(s.rows) && s.rows.length && (s.lang || lang) === lang && Date.now() - s.at < maxAgeMs ? s.rows : null;
  } catch (_) {
    return null;
  }
}
async function settledWithin(ms, work) {
  let done = false;
  Promise.resolve(work).then(() => {
    done = true;
  }, () => {
    done = true;
  });
  const end = Date.now() + ms;
  while (!done && Date.now() < end) await kino.sleep(Math.min(250, Math.max(1, end - Date.now())));
  return done;
}
async function buildHome() {
  const lists = await Promise.all([
    "/trending/movie/week",
    "/trending/tv/week",
    "/movie/popular",
    "/tv/popular",
    "/movie/top_rated",
    "/tv/top_rated"
  ].map((path) => listItems(path).then((value) => ({ value }), (error) => ({ error }))));
  const failed = lists.filter((l) => l.error);
  if (failed.length === lists.length) throw failed[0].error;
  if (failed.length) kino.log("home: " + failed.length + " of " + lists.length + " lists failed: " + (failed[0].error && failed[0].error.code));
  const [trendM, trendS, popM, popS, topM, topS] = lists.map((l) => l.value || []);
  const rows = [
    {
      id: "trend-m",
      title: T("Tendencias \xB7 Pel\xEDculas", "Trending \xB7 Movies"),
      ref: "trend-m",
      genre: "peliculas",
      items: trendM
    },
    {
      id: "trend-s",
      title: T("Tendencias \xB7 Series", "Trending \xB7 Series"),
      ref: "trend-s",
      items: trendS
    },
    {
      id: "pop-m",
      title: T("Populares \xB7 Pel\xEDculas", "Popular \xB7 Movies"),
      ref: "pop-m",
      genre: "peliculas",
      items: popM
    },
    {
      id: "pop-s",
      title: T("Populares \xB7 Series", "Popular \xB7 Series"),
      ref: "pop-s",
      items: popS
    },
    {
      id: "top-m",
      title: T("Mejor valoradas \xB7 Pel\xEDculas", "Top rated \xB7 Movies"),
      ref: "top-m",
      genre: "peliculas",
      items: topM
    },
    {
      id: "top-s",
      title: T("Mejor valoradas \xB7 Series", "Top rated \xB7 Series"),
      ref: "top-s",
      items: topS
    }
  ].filter((r) => r.items.length > 0);
  if (rows.length) saveHome(rows);
  return rows;
}
async function home() {
  if (!canTmdb()) throw noKey();
  const saved = savedHome(HOME_STALE_MS);
  const fresh = buildHome();
  let rows;
  try {
    rows = saved ? await settledWithin(HOME_GUARD_MS, fresh) ? await fresh : null : await fresh;
  } catch (e) {
    if (saved) return saved;
    throw e;
  }
  fresh.catch(() => {
  });
  return rows && rows.length ? rows : saved || rows || [];
}
var BROWSE_ENDPOINT = {
  "trend-m": "/trending/movie/week",
  "trend-s": "/trending/tv/week",
  "pop-m": "/movie/popular",
  "pop-s": "/tv/popular",
  "top-m": "/movie/top_rated",
  "top-s": "/tv/top_rated",
  "now-m": "/movie/now_playing",
  "air-s": "/tv/on_the_air"
};
async function browse(ref, cursor) {
  if (!canTmdb()) return { items: [] };
  const page = cursor ? Number(cursor) : 2;
  const ep = BROWSE_ENDPOINT[ref];
  if (!ep) return { items: [] };
  const data = await tmdb(`${ep}?page=${page}`);
  return {
    items: (data.results || []).map(toItem),
    next: data.page < data.total_pages ? String(page + 1) : void 0
  };
}
async function tabPage(tab) {
  const shelf = (id, title, path, genre) => listItems(path).then((items) => ({ id, title, ref: id, genre, items })).catch((e) => {
    if (e && e.code === "unavailable") throw e;
    kino.log("shelf " + id + " failed: " + (e && e.message));
    return null;
  });
  if (tab === "inicio") return { rows: await home() };
  const movies = tab === "peliculas";
  const jobs = movies ? [
    shelf("trend-m", T("Tendencias", "Trending"), "/trending/movie/week", "peliculas"),
    shelf("now-m", T("En cartelera", "Now playing"), "/movie/now_playing", "peliculas"),
    shelf("pop-m", T("Populares", "Popular"), "/movie/popular", "peliculas"),
    shelf("top-m", T("Mejor valoradas", "Top rated"), "/movie/top_rated", "peliculas")
  ] : [
    shelf("trend-s", T("Tendencias", "Trending"), "/trending/tv/week"),
    shelf("air-s", T("En emisi\xF3n", "On the air"), "/tv/on_the_air"),
    shelf("pop-s", T("Populares", "Popular"), "/tv/popular"),
    shelf("top-s", T("Mejor valoradas", "Top rated"), "/tv/top_rated")
  ];
  return { rows: (await Promise.all(jobs)).filter((r) => r && r.items.length > 0) };
}
async function section({ tab }) {
  const tabs = [{ id: "inicio", label: T("Inicio", "Home") }, { id: "peliculas", label: T("Pel\xEDculas", "Movies") }, { id: "series", label: "Series" }];
  const chosen = tabs.some((x) => x.id === tab) ? tab : tabs[0].id;
  if (!canTmdb()) throw noKey();
  const kept = chosen === "inicio" ? savedHome(HOME_FRESH_MS) : null;
  const { rows } = kept ? { rows: kept } : await tabPage(chosen);
  const answer = { tabs, tab: chosen, rows };
  const pick = rows.length ? rows[0].items.filter((x) => x.backdrop) : [];
  if (pick.length) {
    const it = pick[Math.floor(Date.now() / 864e5) % pick.length];
    answer.hero = { title: it.title, text: it.overview ? it.overview.slice(0, 160) : T("Lo que est\xE1 de moda.", "What is trending."), image: it.backdrop };
  }
  return answer;
}
var browseInstance = null;
var browseScreen = () => browseInstance ?? (browseInstance = makeBrowse({
  kino,
  loadTab: (tab) => tabPage(tab),
  searchTitles: async (q) => (await search({ q })).items
}));
async function screen(ctx) {
  await null;
  return browseScreen().view(ctx && typeof ctx === "object" ? ctx : {});
}
async function screenEvent(ev) {
  await null;
  return browseScreen().event(ev && typeof ev === "object" ? ev : {});
}
async function episodes(ref) {
  if (!canTmdb()) return { episodes: [] };
  const parts = ref.split(":");
  const tmdbId = parts[1];
  const wantSeason = parts[2] ? Number(parts[2]) : null;
  const show = await tmdb(`/tv/${tmdbId}`);
  const allSeasons = (show.seasons || []).filter((s) => s.season_number > 0);
  const target = wantSeason ?? allSeasons[0]?.season_number ?? 1;
  const sd = await tmdb(`/tv/${tmdbId}/season/${target}`);
  const eps = (sd.episodes || []).map((ep) => ({
    season: ep.season_number,
    number: ep.episode_number,
    ref: `ep:${tmdbId}:${ep.season_number}:${ep.episode_number}`,
    title: ep.name || void 0,
    overview: ep.overview || void 0,
    still: ep.still_path ? IMG_W300 + ep.still_path : void 0,
    airDate: ep.air_date || void 0,
    runtimeMinutes: ep.runtime || void 0
  }));
  if (allSeasons.length <= 1) return { episodes: eps };
  return {
    episodes: eps,
    seasons: allSeasons.map((s) => ({
      id: `s:${tmdbId}:${s.season_number}`,
      ref: `series:${tmdbId}:${s.season_number}`,
      title: s.name || `${T("Temporada", "Season")} ${s.season_number}`,
      number: s.season_number,
      current: s.season_number === target
    }))
  };
}
async function encryptId(tmdbId) {
  const r = await kino.fetch(`${ENC_API}/enc-vidlink?text=${tmdbId}`);
  if (!r.ok) return null;
  return r.json().result ?? null;
}
async function vidlinkStreams(tmdbId, mediaType, season, episode) {
  const enc = await encryptId(tmdbId);
  if (!enc) return [];
  const url = mediaType === "tv" ? `${VL_BASE}/tv/${enc}/${season}/${episode}` : `${VL_BASE}/movie/${enc}`;
  const r = await kino.fetch(url, { headers: VL_HEADERS });
  if (!r.ok) return [];
  const data = r.json();
  if (!data) return [];
  const out = [];
  if (data.stream && data.stream.qualities) {
    for (const [qKey, val] of Object.entries(data.stream.qualities)) {
      if (val && val.url && /^https?:/.test(val.url)) {
        out.push({ url: val.url, quality: qKey });
      }
    }
  }
  if (!out.length && data.stream && data.stream.playlist && /^https?:/.test(data.stream.playlist)) {
    out.push({ url: data.stream.playlist, quality: "auto" });
  }
  if (!out.length && data.url && /^https?:/.test(data.url)) {
    out.push({ url: data.url, quality: data.quality || "auto" });
  }
  return out.sort((a, b) => qualRank(b.quality) - qualRank(a.quality));
}
async function resolveRef(ref) {
  const parts = ref.split(":");
  let streams;
  if (parts[0] === "movie") {
    streams = await vidlinkStreams(parts[1], "movie");
  } else if (parts[0] === "ep") {
    const [, tmdbId, season, episode] = parts;
    streams = await vidlinkStreams(tmdbId, "tv", season, episode);
  } else {
    throw kino.error("not_found");
  }
  if (!streams.length) throw kino.error("not_found");
  const [best, ...rest] = streams;
  return {
    url: best.url,
    label: best.quality !== "auto" ? best.quality : void 0,
    headers: STREAM_HEADERS,
    alternatives: rest.map((s) => ({ url: s.url, label: s.quality, headers: STREAM_HEADERS }))
  };
}
async function resolve(ref) {
  const out = await resolveRef(ref);
  try {
    browseScreen().notePlayed(ref);
  } catch {
  }
  return out;
}
export {
  browse,
  episodes,
  home,
  resolve,
  screen,
  screenEvent,
  search,
  section
};
