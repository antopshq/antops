#!/bin/bash

echo "🚀 Starting change lifecycle automation..."
curl -X POST http://localhost:3001/api/automation/control \
  -H "Content-Type: application/json" \
  -d '{"action": "start", "intervalMs": 30000}'
echo ""
echo "✅ Automation started (runs every 30 seconds)"