#!/usr/bin/env node

/**
 * Development script to run change lifecycle automation periodically
 * This simulates what would normally be done by a cron job in production
 */

// Use built-in fetch (Node.js 18+)

const API_URL = 'http://localhost:3000/api/automation/changes'
const INTERVAL_MS = 30 * 1000 // Run every 30 seconds

console.log('🚀 Starting Change Lifecycle Automation')
console.log(`📡 Calling ${API_URL} every ${INTERVAL_MS / 1000} seconds`)
console.log('Press Ctrl+C to stop\n')

async function runAutomation() {
  try {
    console.log(`⏰ ${new Date().toISOString()} - Running automation...`)
    
    const response = await fetch(API_URL, { 
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET || 'dev-secret'}`
      }
    })
    const result = await response.json()
    
    if (response.ok) {
      console.log('✅ Success:', `${result.results.autoStarted} changes started, ${result.results.completionPrompts} prompts sent`)
      if (result.results.errors.length > 0) {
        console.log('⚠️ Errors:', result.results.errors)
      }
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