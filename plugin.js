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

function apiKey() { return kino.config.get("tmdbKey") || null; }

async function tmdb(path) {
  const k = apiKey();
  if (!k) return null;
  const sep = path.includes("?") ? "&" : "?";
  const r = await kino.fetch(`${TMDB_BASE}${path}${sep}api_key=${k}`);
  if (!r.ok) throw new Error("TMDB " + r.status);
  return r.json();
}

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
  if (!q || !apiKey()) return { items: [] };
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

// ── Home ─────────────────────────────────────────────────────────────────────

export async function home() {
  if (!apiKey()) return [];
  const [trendM, trendS, popM, popS, topM, topS] = await Promise.all([
    tmdb("/trending/movie/week"),
    tmdb("/trending/tv/week"),
    tmdb("/movie/popular"),
    tmdb("/tv/popular"),
    tmdb("/movie/top_rated"),
    tmdb("/tv/top_rated"),
  ]);
  return [
    { id: "trend-m", title: "Tendencias · Películas", ref: "trend-m",
      genre: "peliculas", items: (trendM.results || []).map(toItem) },
    { id: "trend-s", title: "Tendencias · Series",    ref: "trend-s",
      items: (trendS.results || []).map(toItem) },
    { id: "pop-m",   title: "Populares · Películas",  ref: "pop-m",
      genre: "peliculas", items: (popM.results || []).map(toItem) },
    { id: "pop-s",   title: "Populares · Series",     ref: "pop-s",
      items: (popS.results || []).map(toItem) },
    { id: "top-m",   title: "Mejor valoradas · Películas", ref: "top-m",
      genre: "peliculas", items: (topM.results || []).map(toItem) },
    { id: "top-s",   title: "Mejor valoradas · Series",    ref: "top-s",
      items: (topS.results || []).map(toItem) },
  ].filter(r => r.items.length > 0);
}

// ── Browse ────────────────────────────────────────────────────────────────────

const BROWSE_ENDPOINT = {
  "trend-m": "/trending/movie/week",
  "trend-s": "/trending/tv/week",
  "pop-m":   "/movie/popular",
  "pop-s":   "/tv/popular",
  "top-m":   "/movie/top_rated",
  "top-s":   "/tv/top_rated",
};

export async function browse(ref, cursor) {
  if (!apiKey()) return { items: [] };
  const page = cursor ? Number(cursor) : 2;
  const ep   = BROWSE_ENDPOINT[ref];
  if (!ep) return { items: [] };
  const data = await tmdb(`${ep}?page=${page}`);
  return {
    items: (data.results || []).map(toItem),
    next:  data.page < data.total_pages ? String(page + 1) : undefined,
  };
}

// ── Episodes ──────────────────────────────────────────────────────────────────

export async function episodes(ref) {
  if (!apiKey()) return { episodes: [] };
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
      title:   s.name || `Temporada ${s.season_number}`,
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

export async function resolve(ref) {
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
    alternatives: rest.map(s => ({ url: s.url, label: s.quality })),
  };
}
