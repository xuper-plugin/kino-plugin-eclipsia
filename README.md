# Eclipsia — plugin de Kino

Películas y series con el catálogo de **TMDB** y los videos de **Vidlink**, hasta 4K.

## Instalar

En Kino: **Ajustes ▸ Plugins ▸ Agregar**, y escribe `xuper-plugin/kino-plugin-eclipsia`. Kino muestra la hoja de consentimiento (a qué hosts llega y qué permisos pide) antes de instalar nada.

## Qué trae

- Inicio, exploración («Ver más»), búsqueda y episodios, a partir del catálogo de TMDB.
- La reproducción resuelve los servidores de Vidlink (`vidlink.pro`, con `enc-dec.app` para descifrar su respuesta). El video puede salir de otros hosts: Kino pide aprobar «puede reproducir video desde cualquier servidor».

## Ajustes

- **Clave de la API de TMDB (v3 auth):** el plugin no lleva clave propia; pega la tuya en *TMDB API Key*. Sin ella, el Inicio y la búsqueda avisan que falta.

## Hosts declarados

`api.themoviedb.org` (catálogo), `vidlink.pro` y `enc-dec.app` (reproducción).

## Licencia

Apache-2.0 (ver `LICENSE`). El plugin no aloja ni almacena contenido: muestra lo que devuelve el servicio indicado arriba, y lo que se ve a través de él
es responsabilidad de quien lo usa. No está afiliado con los servicios ni con los sitios que menciona.
