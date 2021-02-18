#!/bin/bash

cd dist || exit
git init
git add -A
git commit -m 'deploy'
git push -f git@github.com:vagran/dxf-viewer-example.git master
