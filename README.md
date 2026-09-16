# dxf-viewer example

This is example of [dxf-viewer](https://github.com/vagran/dxf-viewer) package application. It is
written using [Quasar](https://quasar.dev/) framework for fancy UI.

See demo here: https://vagran.github.io/dxf-viewer-example/

Run `npm run build` to build the distribution.
Run `npm run serve` to run development server.

## Loading a file by URL

The page accepts a `dxfUrl` query parameter, so it can fetch and show a DXF file on startup.
A URL on another host is fetched through the [allOrigins](https://allorigins.win) CORS proxy, which
sometimes happens to fail; a same-origin URL, including a relative one such as
`?dxfUrl=/drawings/site-plan.dxf`, is fetched directly.
