#!/bin/bash

# Remove any chrome-extension directory
rm -rf chrome-extension

# Remove any bruno.zip files
rm bruno.zip

# Create a new chrome-extension directory
mkdir chrome-extension

# Copy build
cp -r packages/bruno-app/out/* chrome-extension

# Copy the chrome extension files
cp -r packages/bruno-chrome-extension/* chrome-extension

# Filenames starting with "_" are reserved for use by the system
mv chrome-extension/_next chrome-extension/next
sed -i'' -e 's@/_next/@/next/@g' chrome-extension/**.html

# Remove sourcemaps
find chrome-extension -name '*.map' -type f -delete

# Compress the chrome-extension directory into a zip file
zip -r bruno.zip chrome-extension