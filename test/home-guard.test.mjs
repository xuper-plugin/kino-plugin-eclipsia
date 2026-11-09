// Home answers from the saved copy after a guard. The old guard chained `kino.sleep` of up to 4.5 s and never cancelled them; Kino's call waits for
// a pending sleep, so a Home that had already finished was held until the guard ended. The guard now sleeps in short steps and stops when the build settles.
import test from "node:test";
import assert from "node:assert/strict";

const SAVED = [{ id: "pop-m", title: "Guardada", items: [{ id: "m1", ref: "m:1", title: "Uno", kind: "movie" }] }];

function install({ fetch }) {
  const clock = { t: 1_800_000_000_000 };
  const realNow = Date.now;
  Date.now = () => clock.t;
  const mem = new Map([["home1", JSON.stringify({ at: clock.t, lang: "es", rows: SAVED })]]);
  let pendingSleepMs = 0;
  globalThis.kino = {
    lang: "es-CO",
    config: { get: (k) => (k === "tmdbKey" ? "k" : "") },
    storage: { get: (k) => mem.get(k) ?? null, set: (k, v) => { mem.set(k, v); }, remove: (k) => { mem.delete(k); } },
    log() {},
    sleep: async (ms) => { pendingSleepMs = Math.max(pendingSleepMs, ms); clock.t += ms; },
    error: (code, message) => Object.assign(new Error(message), { code }),
    fetch,
  };
  return { clock, longestSleep: () => pendingSleepMs, restore: () => { Date.now = realNow; } };
}
let n = 0;
const load = () => import("../src/plugin.js?x=" + ++n);

test("a build that never answers: the saved copy is served at the 10 s guard, and no single sleep is longer than 250 ms", async () => {
  const t = install({ fetch: () => new Promise(() => {}) });
  try {
    const { home } = await load();
    const t0 = t.clock.t;
    const rows = await home();
    assert.deepEqual(rows.map((r) => r.id), ["pop-m"]);
    const took = t.clock.t - t0;
    assert.ok(took >= 9_500 && took <= 11_000, "answered at the guard: " + took + " ms");
    assert.ok(t.longestSleep() <= 250, "short sleeps only (longest " + t.longestSleep() + " ms)");
  } finally { t.restore(); }
});

test("a build that fails at once: the saved copy answers at once", async () => {
  const t = install({ fetch: async () => { throw Object.assign(new Error("net"), { code: "network" }); } });
  try {
    const { home } = await load();
    const t0 = t.clock.t;
    const rows = await home();
    assert.deepEqual(rows.map((r) => r.id), ["pop-m"]);
    assert.ok(t.clock.t - t0 < 5_000, "well before the guard (the client's own retries aside): " + (t.clock.t - t0));
  } finally { t.restore(); }
});
