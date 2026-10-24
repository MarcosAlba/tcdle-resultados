# tcdle-resultados

Scraper de las finales del Turismo Carretera (2010 en adelante) para el futuro modo de TCdle "¿Cómo terminó la carrera?". Publica `datos/carreras-tc.json`; [TCdle](https://github.com/MarcosAlba/TC.dle) lo baja de un tag fijo.

## De dónde salen los datos

`https://tiempos.actc.org.ar/resultados` (el sitio de la ACTC lleva ahí). Sus filtros usan una API JSON (`/api/historico/resultados`) que solo responde dentro de una página abierta, porque la visita recibe una cookie de sesión de 15 minutos. Por eso el scraper usa Playwright: abre `/resultados` como cualquier visitante y hace los `fetch` desde ahí. No falsifica headers ni tokens, y **si el sitio pide Turnstile/CAPTCHA, el scraper se frena**: no se resuelve ni se esquiva.

Va despacio a propósito: un pedido cada 2 segundos, sin paralelo, y `cache/` guarda lo crudo de cada carrera para no volver a pedirlo.

## Uso

Hace falta Node 22.

```bash
npm install
npx playwright install chromium
npm run scrapear                  # 2010 hasta hoy, sin pisar lo que ya está
npm run scrapear -- --anio 2019   # un solo año
npm run validar                   # revisa datos/carreras-tc.json
npm test
```

Una carrera sin final publicada (suspendida o todavía sin cargar) se avisa y se saltea; se reintenta en la próxima corrida.

## Fotos de los pilotos

`npm run fotos` busca una foto para cada piloto de los resultados y la deja en `datos/fotos/` (webp de 320x400), con su crédito en `datos/fotos-pilotos.json`:

1. **ACTC**: el "torso" con fondo transparente de los pilotos activos (sale de los listados de las seis categorías).
2. **Wikipedia / Wikimedia Commons**: la imagen principal del artículo del piloto. Para no traer homónimos ni fotos que no son de él, solo vale si el artículo está en la categoría de pilotos del TC (o TC Pista / TC Mouras), si el archivo nombra al piloto y si Commons no la cataloga como foto de un auto. Se guardan autor, licencia y enlace a la original: TCdle los muestra en su página de créditos.

No vuelve a bajar las que ya están. Conviene mirar las nuevas antes de publicar.

## Contrato

`datos/carreras-tc.json` cumple `CatalogoCarreras` de `src/tipos.ts`: `{ version, generado, carreras }`, con cada carrera ordenada por fecha y sus resultados por posición. El `id` (`2019-05-rosario`) es estable. Un cambio incompatible sube `version`.

## Publicar una versión

`.github/workflows/actualizar.yml` corre los lunes y abre un PR con el JSON nuevo. Después de mergearlo:

```bash
git tag datos-v2 && git push --tags
```

En TCdle: cambiar `ETIQUETA` en `scripts/bajar-carreras.mjs` (o pasar el tag como argumento) y correr `npm run carreras`. Subir de versión puede cambiar la carrera del día, como en los otros catálogos de TCdle.
