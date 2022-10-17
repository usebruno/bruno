#!/bin/bash

# Remove out directory
rm -rf packages/bruno-electron/out

# Remove web directory
rm -rf packages/bruno-electron/web

# Create a new web directory
mkdir packages/bruno-electron/web

# Copy build
cp -r packages/bruno-app/out/* packages/bruno-electron/web


# Change paths in next
sed -i'' -e 's@/_next/@_next/@g' packages/bruno-electron/web/**.html

# Remove sourcemaps
find packages/bruno-electron/web -name '*.map' -type f -delete

npm run pack-app --workspace=packages/bruno-electron 