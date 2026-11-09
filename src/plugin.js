import { makeBrowse } from "./browse/index.js";

// Kino waits for every request a call left running before it delivers the call's answer (quickjs-kt joins the pending async work), so a call that
// answered early at its own deadline or guard was still held until the requests it no longer needed ended. Asking Kino to drop what a call leaves
// running (the prelude reads this flag after every call; Kino 0.9.54 and later, an older one ignores it) lets the answer leave when it is ready.
globalThis.__kinoDropPendingFetches = true;


const TMDB_BASE  = "https://api.themoviedb.org/3";
const IMG_W500   = "https://image.tmdb.org/t/p/w500";
const IMG_W1280  = "https://image.tmdb.org/t/p/w1280";
const IMG_W300   = "https://image.tmdb.org/t/p/w300";
const VL_BASE    = "https://vidlink.pro/api/b";
const ENC_API    = "https://enc-dec.app/api";
const VL_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "Referer": "https://vidlink.pro/",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

// The MovieBox CDN answers 429 to any request without the Referer it expects; the player sends these with the stream.
var STREAM_HEADERS = { "Referer": "https://moviebox.ph/" };
function apiKey() { return kino.config.get("tmdbKey") || null; }

// Kino 0.9.53+ answers TMDB with the person's own key (theirs in Ajustes, or their Stremio TMDB addon's).
const hasKinoTmdb = () => typeof kino.tmdb === "function";

// What the person reads when no key is available anywhere.
const NO_KEY_MESSAGE =
  "Necesitas una llave de TMDB: ponla en este plugin o en Ajustes ▸ «Tu llave de TMDB», o instala un addon de TMDB de Stremio con tu llave.";

function noKey() {
  return kino.error("unavailable", "no TMDB key", { userMessage: NO_KEY_MESSAGE });
}

// A path with its query string ("/search/movie?query=x&page=2") as kino.tmdb's path + params.
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

const isSpanish = () => String(kino.lang || "").toLowerCase().startsWith("es");
const T = (es, en) => (isSpanish() ? es : en);
const withLanguage = (path) => (/[?&]language=/.test(path) ? path : path + (path.includes("?") ? "&" : "?") + "language=" + (isSpanish() ? "es-MX" : "en-US"));

// A plain Error reaches the error board as "thrown" with nothing to read; a kino.error keeps a class and the person gets a sentence.
function tmdbStatusError(status) {
  if (status === 401 || status === 403) return kino.error("unavailable", "TMDB " + status, { userMessage: "La llave de TMDB no es válida. Revísala en este plugin o en Ajustes ▸ «Tu llave de TMDB»." });
  if (status === 429) return kino.error("rate_limited", "TMDB " + status, { userMessage: "TMDB recibió demasiadas peticiones. Espera un momento e inténtalo de nuevo." });
  return kino.error("unavailable", "TMDB " + status, { userMessage: "TMDB no responde ahora. Inténtalo de nuevo en un rato." });
}

// kino.fetch waits 15 s by default and Home has about 20: one slow answer used to take the whole call.
const TMDB_MS = 8000;

// The plugin's own key wins (the person set it here); otherwise Kino's kino.tmdb; otherwise noKey().
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

/** True when some TMDB key can answer: this plugin's own, or Kino's kino.tmdb (which tells the person if it has none). */
const canTmdb = () => !!apiKey() || hasKinoTmdb();

function toItem(m) {
  const isTv = m.media_type === "tv" || (!m.media_type && !!m.first_air_date);
  const kind  = isTv ? "series" : "movie";
  return {
    id:       String(m.id),
    ref:      `${kind}:${m.id}`,
    title:    m.title || m.name || "",
    kind,
    year:     (m.release_date || m.first_air_date || "").slice(0, 4) || undefined,
    poster:   m.poster_path   ? IMG_W500  + m.poster_path   : undefined,
    backdrop: m.backdrop_path ? IMG_W1280 + m.backdrop_path : undefined,
    overview: m.overview || undefined,
    rating:   m.vote_average  ? Math.round(m.vote_average * 10) / 10 : undefined,
    ids:      { tmdb: m.id },
  };
}

function qualRank(q) {
  const s = String(q || "").toUpperCase().replace(/\s/g, "");
  if (s === "4K" || s === "2160P" || s === "2160") return 5;
  if (s === "1440P" || s === "1440")                return 4;
  if (s === "1080P" || s === "1080" || s === "FHD") return 3;
  if (s === "720P"  || s === "720"  || s === "HD")  return 2;
  if (s === "480P"  || s === "480")                 return 1;
  return 0;
}

// ── Search ───────────────────────────────────────────────────────────────────

export async function search({ q, type, cursor }) {
  if (!q || !canTmdb()) return { items: [] };
  const page = cursor ? Number(cursor) : 1;
  const mt   = type === "movie" ? "movie" : type === "series" ? "tv" : "multi";
  const data = await tmdb(`/search/${mt}?query=${encodeURIComponent(q)}&page=${page}&include_adult=false`);
  const items = (data.results || [])
    .filter(m => m.media_type !== "person")
    .map(toItem);
  return {
    items,
    next: data.page < data.total_pages ? String(page + 1) : undefined,
  };
}

// TMDB's first-page lists, shared by home(), section() and the browse screen. A list is fresh for LIST_FRESH_MS (no request), kept
// up to LIST_STALE_MS (served when TMDB fails). Memory holds the full items; storage a slim copy (the 256 KB are shared).
const LIST_FRESH_MS = 6 * 3600 * 1000;
const LIST_STALE_MS = 24 * 3600 * 1000;
const LIST_KEPT_ITEMS = 12;
const listMem = new Map(); // key -> { at, items }

const listKey = (path) => "tl1:" + (isSpanish() ? "es" : "en") + ":" + path;

function readList(key) {
  const m = listMem.get(key);
  if (m) return m;
  try {
    const o = JSON.parse(kino.storage.get(key) || "null");
    if (o && typeof o.at === "number" && Array.isArray(o.items)) { listMem.set(key, o); return o; }
  } catch (_) { /* no copy */ }
  return null;
}

function writeList(key, entry) {
  listMem.set(key, entry);
  try {
    const slim = { at: entry.at, items: entry.items.slice(0, LIST_KEPT_ITEMS).map((i) => (i.overview ? { ...i, overview: i.overview.slice(0, 120) } : i)) };
    kino.storage.set(key, JSON.stringify(slim), { ttlMs: LIST_STALE_MS });
  } catch (_) { /* full storage: memory only */ }
}

/** The items of one TMDB list: the kept copy when fresh, else TMDB (the kept copy, if under a day old, when TMDB fails). */
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

// ── Home ─────────────────────────────────────────────────────────────────────

// The last good Home, kept (rows only, trimmed to HOME_CACHE_MAX) so a Home whose lists all fail shows something, and so the browse
// screen's "inicio" tab paints from it (browse/index.js reads the same key).
const HOME_KEY = "home1";
const HOME_STALE_MS = 7 * 24 * 3600 * 1000;
const HOME_FRESH_MS = 6 * 3600 * 1000;
const HOME_CACHE_MAX = 60 * 1024;
const HOME_GUARD_MS = 10000;

function saveHome(rows) {
  try {
    for (let per = 20; per >= 4; per -= 4) {
      const text = JSON.stringify({ at: Date.now(), lang: isSpanish() ? "es" : "en", rows: rows.map((r) => ({ ...r, items: r.items.slice(0, per) })) });
      if (text.length <= HOME_CACHE_MAX) { kino.storage.set(HOME_KEY, text, { ttlMs: HOME_STALE_MS }); return; }
    }
  } catch (_) { /* full storage: no copy */ }
}

/** The kept Home rows no older than [maxAgeMs], in the person's language, else null. */
function savedHome(maxAgeMs) {
  try {
    const s = JSON.parse(kino.storage.get(HOME_KEY) || "null");
    const lang = isSpanish() ? "es" : "en";
    return s && Array.isArray(s.rows) && s.rows.length && (s.lang || lang) === lang && Date.now() - s.at < maxAgeMs ? s.rows : null;
  } catch (_) { return null; }
}

/**
 * Waits for [work] at most [ms], in short sleeps; true when it settled in time. Kino's call waits for a `kino.sleep` still pending, so the old
 * guard (sleeps of up to 4.5 s chained for the whole guard, never cancelled) held a Home that had already finished until the guard ended.
 */
async function settledWithin(ms, work) {
  let done = false;
  Promise.resolve(work).then(() => { done = true; }, () => { done = true; });
  const end = Date.now() + ms;
  while (!done && Date.now() < end) await kino.sleep(Math.min(250, Math.max(1, end - Date.now())));
  return done;
}

async function buildHome() {
  // Each list on its own: a slow or refused one leaves its row out instead of failing the whole Home; only when none answers is it an error.
  const lists = await Promise.all([
    "/trending/movie/week",
    "/trending/tv/week",
    "/movie/popular",
    "/tv/popular",
    "/movie/top_rated",
    "/tv/top_rated",
  ].map((path) => listItems(path).then((value) => ({ value }), (error) => ({ error }))));
  const failed = lists.filter((l) => l.error);
  if (failed.length === lists.length) throw failed[0].error;
  if (failed.length) kino.log("home: " + failed.length + " of " + lists.length + " lists failed: " + (failed[0].error && failed[0].error.code));
  const [trendM, trendS, popM, popS, topM, topS] = lists.map((l) => l.value || []);
  const rows = [
    { id: "trend-m", title: T("Tendencias · Películas", "Trending · Movies"), ref: "trend-m",
      genre: "peliculas", items: trendM },
    { id: "trend-s", title: T("Tendencias · Series", "Trending · Series"),    ref: "trend-s",
      items: trendS },
    { id: "pop-m",   title: T("Populares · Películas", "Popular · Movies"),  ref: "pop-m",
      genre: "peliculas", items: popM },
    { id: "pop-s",   title: T("Populares · Series", "Popular · Series"),     ref: "pop-s",
      items: popS },
    { id: "top-m",   title: T("Mejor valoradas · Películas", "Top rated · Movies"), ref: "top-m",
      genre: "peliculas", items: topM },
    { id: "top-s",   title: T("Mejor valoradas · Series", "Top rated · Series"),    ref: "top-s",
      items: topS },
  ].filter(r => r.items.length > 0);
  if (rows.length) saveHome(rows);
  return rows;
}

export async function home() {
  if (!canTmdb()) throw noKey();
  const saved = savedHome(HOME_STALE_MS);
  const fresh = buildHome();
  let rows;
  try {
    rows = saved ? ((await settledWithin(HOME_GUARD_MS, fresh)) ? await fresh : null) : await fresh;
  } catch (e) {
    if (saved) return saved;
    throw e;
  }
  fresh.catch(() => {});
  return rows && rows.length ? rows : saved || rows || [];
}

// ── Browse ────────────────────────────────────────────────────────────────────

const BROWSE_ENDPOINT = {
  "trend-m": "/trending/movie/week",
  "trend-s": "/trending/tv/week",
  "pop-m":   "/movie/popular",
  "pop-s":   "/tv/popular",
  "top-m":   "/movie/top_rated",
  "top-s":   "/tv/top_rated",
  "now-m":   "/movie/now_playing",
  "air-s":   "/tv/on_the_air",
};

export async function browse(ref, cursor) {
  if (!canTmdb()) return { items: [] };
  const page = cursor ? Number(cursor) : 2;
  const ep   = BROWSE_ENDPOINT[ref];
  if (!ep) return { items: [] };
  const data = await tmdb(`${ep}?page=${page}`);
  return {
    items: (data.results || []).map(toItem),
    next:  data.page < data.total_pages ? String(page + 1) : undefined,
  };
}

// ── The browse screen ───────────────────────────────────────────────────

// One tab of the browse screen as a section page: Inicio is the six home rows, Películas and Series their own shelves.
async function tabPage(tab) {
  const shelf = (id, title, path, genre) => listItems(path).then((items) => ({ id, title, ref: id, genre, items })).catch((e) => {
    if (e && e.code === "unavailable") throw e;
    kino.log("shelf " + id + " failed: " + (e && e.message));
    return null;
  });
  if (tab === "inicio") return { rows: await home() };
  const movies = tab === "peliculas";
  const jobs = movies
    ? [shelf("trend-m", T("Tendencias", "Trending"), "/trending/movie/week", "peliculas"), shelf("now-m", T("En cartelera", "Now playing"), "/movie/now_playing", "peliculas"),
       shelf("pop-m", T("Populares", "Popular"), "/movie/popular", "peliculas"), shelf("top-m", T("Mejor valoradas", "Top rated"), "/movie/top_rated", "peliculas")]
    : [shelf("trend-s", T("Tendencias", "Trending"), "/trending/tv/week"), shelf("air-s", T("En emisión", "On the air"), "/tv/on_the_air"),
       shelf("pop-s", T("Populares", "Popular"), "/tv/popular"), shelf("top-s", T("Mejor valoradas", "Top rated"), "/tv/top_rated")];
  return { rows: (await Promise.all(jobs)).filter((r) => r && r.items.length > 0) };
}

// The plugin's own section (a chip on the phone's Inicio, an entry in the TV's sidebar): Inicio, Películas and Series.
export async function section({ tab }) {
  const tabs = [{ id: "inicio", label: T("Inicio", "Home") }, { id: "peliculas", label: T("Películas", "Movies") }, { id: "series", label: "Series" }];
  const chosen = tabs.some((x) => x.id === tab) ? tab : tabs[0].id;
  if (!canTmdb()) throw noKey();
  // Inicio is the Home rows: when home() kept them lately they are reused instead of asking TMDB for the six lists again.
  const kept = chosen === "inicio" ? savedHome(HOME_FRESH_MS) : null;
  const { rows } = kept ? { rows: kept } : await tabPage(chosen);
  const answer = { tabs, tab: chosen, rows };
  const pick = rows.length ? rows[0].items.filter((x) => x.backdrop) : [];
  if (pick.length) {
    // Today's pick: the same all day, a different one tomorrow.
    const it = pick[Math.floor(Date.now() / 86400000) % pick.length];
    answer.hero = { title: it.title, text: it.overview ? it.overview.slice(0, 160) : T("Lo que está de moda.", "What is trending."), image: it.backdrop };
  }
  return answer;
}

let browseInstance = null;
const browseScreen = () => (browseInstance ??= makeBrowse({
  kino,
  loadTab: (tab) => tabPage(tab),
  searchTitles: async (q) => (await search({ q })).items,
}));

/** `screen(ctx)`: the plugin's own browse screen (a pure view: it draws what it holds and never waits for TMDB). */
export async function screen(ctx) {
  await null;
  return browseScreen().view(ctx && typeof ctx === "object" ? ctx : {});
}

/** `screenEvent(ev)`: the screen's events (its timers load a tab or a search, one per call). */
export async function screenEvent(ev) {
  await null;
  return browseScreen().event(ev && typeof ev === "object" ? ev : {});
}

// ── Episodes ──────────────────────────────────────────────────────────────────

export async function episodes(ref) {
  if (!canTmdb()) return { episodes: [] };
  const parts  = ref.split(":");
  const tmdbId = parts[1];
  const wantSeason = parts[2] ? Number(parts[2]) : null;

  const show      = await tmdb(`/tv/${tmdbId}`);
  const allSeasons = (show.seasons || []).filter(s => s.season_number > 0);
  const target     = wantSeason ?? allSeasons[0]?.season_number ?? 1;
  const sd         = await tmdb(`/tv/${tmdbId}/season/${target}`);

  const eps = (sd.episodes || []).map(ep => ({
    season:         ep.season_number,
    number:         ep.episode_number,
    ref:            `ep:${tmdbId}:${ep.season_number}:${ep.episode_number}`,
    title:          ep.name    || undefined,
    overview:       ep.overview || undefined,
    still:          ep.still_path ? IMG_W300 + ep.still_path : undefined,
    airDate:        ep.air_date   || undefined,
    runtimeMinutes: ep.runtime    || undefined,
  }));

  if (allSeasons.length <= 1) return { episodes: eps };

  return {
    episodes: eps,
    seasons: allSeasons.map(s => ({
      id:      `s:${tmdbId}:${s.season_number}`,
      ref:     `series:${tmdbId}:${s.season_number}`,
      title:   s.name || `${T("Temporada", "Season")} ${s.season_number}`,
      number:  s.season_number,
      current: s.season_number === target,
    })),
  };
}

// ── Resolve (Vidlink) ─────────────────────────────────────────────────────────

async function encryptId(tmdbId) {
  const r = await kino.fetch(`${ENC_API}/enc-vidlink?text=${tmdbId}`);
  if (!r.ok) return null;
  return r.json().result ?? null;
}

async function vidlinkStreams(tmdbId, mediaType, season, episode) {
  const enc = await encryptId(tmdbId);
  if (!enc) return [];

  const url = mediaType === "tv"
    ? `${VL_BASE}/tv/${enc}/${season}/${episode}`
    : `${VL_BASE}/movie/${enc}`;

  const r = await kino.fetch(url, { headers: VL_HEADERS });
  if (!r.ok) return [];
  const data = r.json();
  if (!data) return [];

  const out = [];

  // per-quality direct links
  if (data.stream && data.stream.qualities) {
    for (const [qKey, val] of Object.entries(data.stream.qualities)) {
      if (val && val.url && /^https?:/.test(val.url)) {
        out.push({ url: val.url, quality: qKey });
      }
    }
  }

  // HLS master playlist fallback
  if (!out.length && data.stream && data.stream.playlist && /^https?:/.test(data.stream.playlist)) {
    out.push({ url: data.stream.playlist, quality: "auto" });
  }

  // top-level url fallback
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
    url:          best.url,
    label:        best.quality !== "auto" ? best.quality : undefined,
    headers:      STREAM_HEADERS,
    alternatives: rest.map(s => ({ url: s.url, label: s.quality, headers: STREAM_HEADERS })),
  };
}

export async function resolve(ref) {
  const out = await resolveRef(ref);
  // The browse screen's "Continuar viendo": a play that found a copy is remembered.
  try { browseScreen().notePlayed(ref); } catch { /* never fails a play */ }
  return out;
}
