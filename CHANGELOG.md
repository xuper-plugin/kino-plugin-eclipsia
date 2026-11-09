# Changelog

## 0.4.1

- The guard that serves the saved copy slept in chained steps of up to 4.5 s that were never cancelled, and Kino's call waits for a pending `kino.sleep`: a Home that had already finished was held until the guard ended. It now sleeps in steps of at most 250 ms and stops as soon as the build settles (`test/home-guard.test.mjs`).
- Home answers from the saved copy at its 10 s guard: the fresh build that used to go on behind it kept its requests running, and Kino waits for those before it delivers the answer (1.3k `home timeout` events in 14 days). They are now dropped with the call; a copy older than the guard is refreshed by the next call that finishes in time. The plugin asks Kino to drop the requests a call leaves running (`globalThis.__kinoDropPendingFetches = true`, read by Kino 0.9.54 and later; an older Kino ignores it), with a test (`test/dropFetches.test.mjs`).

## 0.4.0

- The browse screen paints the Inicio tab at once from the Home copy and keeps tab copies for 7 days, refreshing behind.
- home() keeps its rows (home1) and serves them when TMDB fails or is slow; TMDB lists are cached (6 h fresh, 24 h max) and shared by Home, Inicio, Películas and Series.
