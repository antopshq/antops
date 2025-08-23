#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Ensure .next directory exists and has proper structure
const nextDir = path.join(__dirname, '..', '.next');
const routesManifestPath = path.join(nextDir, 'routes-manifest.json');

// Create .next directory if it doesn't exist
if (!fs.existsSync(nextDir)) {
  fs.mkdirSync(nextDir, { recursive: true });
  console.log('Created .next directory');
}

// Create a minimal routes-manifest.json if it doesn't exist
// This prevents the ENOENT error during development
if (!fs.existsSync(routesManifestPath)) {
  const minimalManifest = {
    version: 3,
    pages404: true,
    basePath: "",
    redirects: [],
    rewrites: [],
    headers: [],
    staticRoutes: [],
    dynamicRoutes: []
  };
  
  fs.writeFileSync(routesManifestPath, JSON.stringify(minimalManifest, null, 2));
  console.log('Created minimal routes-manifest.json to prevent ENOENT errors');
}

console.log('Development environment setup complete');