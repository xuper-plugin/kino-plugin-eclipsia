# Changelog

## 0.4.0

- The browse screen paints the Inicio tab at once from the Home copy and keeps tab copies for 7 days, refreshing behind.
- home() keeps its rows (home1) and serves them when TMDB fails or is slow; TMDB lists are cached (6 h fresh, 24 h max) and shared by Home, Inicio, Películas and Series.
