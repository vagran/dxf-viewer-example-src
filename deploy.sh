#!/bin/bash
# Publishes dist/ to a GitHub Pages site, by force-pushing it as that repository's entire tree.
#
#     ./deploy.sh          stable   -> https://vagran.github.io/dxf-viewer-example/
#     ./deploy.sh --rc     preview  -> https://vagran.github.io/dxf-viewer-example-preview/
#
# Build the matching bundle first -- `npm run build` or `npm run build:rc`. The two differ in the
# base path baked into index.html, so a bundle pushed to the wrong site loads none of its assets
# and shows a blank page. The push is a force-push and there is no previous version left to roll
# back to, so that mismatch is checked here rather than discovered in a browser.
#
# GitHub Pages serves one site per repository, which is why the preview is a second repository
# rather than a second branch or a subdirectory of the first.

set -e

case "${1:-}" in
    "")   REPO=dxf-viewer-example;         SCRIPT="npm run build" ;;
    --rc) REPO=dxf-viewer-example-preview; SCRIPT="npm run build:rc" ;;
    *)    echo "Usage: $0 [--rc]" >&2; exit 1 ;;
esac

# A GitHub Pages project site is served at https://<user>.github.io/<repo>/, so the repository name
# is also the base path the bundle must have been built against. Same derivation as
# DeploymentBase() in vite.config.js -- keep the two agreeing.
BASE="/${REPO}/"

cd "$(dirname "$0")"

if [ ! -f dist/index.html ]; then
    echo "No dist/index.html. Run: $SCRIPT" >&2
    exit 1
fi

# Vite rewrites every asset reference against `base`, so the base a bundle was built for is
# readable straight out of the markup.
if ! grep -q "\"${BASE}assets/" dist/index.html; then
    echo "dist/ was not built for ${BASE} -- wrong target, refusing to push." >&2
    echo "Run: $SCRIPT" >&2
    exit 1
fi

cd dist
rm -rf .git
git init
git add -A
git commit -m 'deploy'
# HEAD:master rather than master: `git init` names the branch from init.defaultBranch, which is
# not necessarily what Pages serves.
git push -f "git@github.com:vagran/${REPO}.git" HEAD:master
