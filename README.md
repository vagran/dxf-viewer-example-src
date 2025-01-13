# dxf-viewer example

This is example of [dxf-viewer](https://github.com/vagran/dxf-viewer) package application. It is
written using [Quasar](https://quasar.dev/) framework for fancy UI.

See demo here: https://vagran.github.io/dxf-viewer-example/

The demo accepts `dxfUrl` query parameter in the page URL, so it can initially fetch and show
external DXF file. However, keep in mind that this functionality relies on external service
([allOrigins](https://allorigins.win)) to overcome CORS restrictions, which sometimes happens to
fail file fetching.

Run `npm run build` to build the distribution.
Run `npm run serve` to run development server.
