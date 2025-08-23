#!/bin/bash

echo "🛑 Stopping change lifecycle automation..."
curl -X POST http://localhost:3001/api/automation/control \
  -H "Content-Type: application/json" \
  -d '{"action": "stop"}'
echo ""
echo "✅ Automation stopped"