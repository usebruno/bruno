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

if [ "$1" == "snap" ]; then
  echo "Building snap distribution"
  npm run dist:snap --workspace=packages/bruno-electron 
else
  echo "Please pass a build distribution type"
fi