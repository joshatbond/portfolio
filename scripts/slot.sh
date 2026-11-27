#!/bin/sh
# Run a heavy command through `slot` (a local CPU-slot queue) when it's installed,
# or straight away otherwise (CI, other machines).
if command -v slot >/dev/null 2>&1; then exec slot "$@"; else exec "$@"; fi
