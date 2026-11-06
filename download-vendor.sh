#!/bin/sh
# Downloads Chart.js and Lucide into ./vendor so the app has no CDN dependency.
mkdir -p vendor
curl -L -o vendor/chart.umd.min.js https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js
curl -L -o vendor/lucide.min.js https://cdn.jsdelivr.net/npm/lucide@0.400.0/dist/umd/lucide.min.js
echo "Done. Commit the vendor/ folder."
