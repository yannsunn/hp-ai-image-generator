#!/bin/bash
set -e

echo "Starting Vercel build..."

# Install root dependencies
npm install

# Build frontend
cd frontend
npm install

# Run build directly
npm run build

echo "Build completed successfully!"