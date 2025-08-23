#!/usr/bin/env node

/**
 * Development script to run change lifecycle automation periodically
 * This simulates what would normally be done by a cron job in production
 */

const fetch = require('node-fetch').default || require('node-fetch')

const API_URL = 'http://localhost:3001/api/cron/change-lifecycle'
const INTERVAL_MS = 60 * 1000 // Run every minute

console.log('🚀 Starting Change Lifecycle Automation')
console.log(`📡 Calling ${API_URL} every ${INTERVAL_MS / 1000} seconds`)
console.log('Press Ctrl+C to stop\n')

async function runAutomation() {
  try {
    console.log(`⏰ ${new Date().toISOString()} - Running automation...`)
    
    const response = await fetch(API_URL, { method: 'POST' })
    const result = await response.json()
    
    if (response.ok) {
      console.log('✅ Success:', result.message)
    } else {
      console.error('❌ Error:', result.error)
    }
  } catch (error) {
    console.error('💥 Failed to call automation:', error.message)
  }
  
  console.log('') // Empty line for readability
}

// Run immediately
runAutomation()

// Then run every minute
setInterval(runAutomation, INTERVAL_MS)

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping automation...')
  process.exit(0)
})