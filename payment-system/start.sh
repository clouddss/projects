#!/bin/bash
set -e

echo "Starting application..."

# Check if XVFB is available
if command -v xvfb-run &> /dev/null; then
    echo "Using XVFB for headless display"
    exec xvfb-run --auto-servernum --server-args="-screen 0 1280x800x24" pnpm run start
else
    echo "XVFB not available, starting without virtual display"
    exec pnpm run start
fi