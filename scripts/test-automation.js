#!/usr/bin/env node

/**
 * Test script to demonstrate the change lifecycle automation
 * This script shows how to create a test change and watch it transition automatically
 */

const readline = require('readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

console.log('🧪 Change Lifecycle Automation Test')
console.log('=====================================\n')

console.log('This script helps you test the automatic status transitions.')
console.log('Here\'s how to test the automation:\n')

console.log('1. 📝 Create a new change in the web interface:')
console.log('   - Go to http://localhost:3000/changes')
console.log('   - Click "New Change"')
console.log('   - Fill in the form with test data')
console.log('   - Set Priority to any value')
console.log('   - Set "Scheduled For" to a time 1-2 minutes from now')
console.log('   - Save the change (status will be "Draft")\n')

console.log('2. 🎯 Approve the change:')
console.log('   - Click on your newly created change')
console.log('   - Click "Edit Change"')
console.log('   - Change Status from "Draft" to "Approved"')
console.log('   - Save changes\n')

console.log('3. ⏰ Wait for automation:')
console.log('   - The automation runs every 30 seconds')
console.log('   - When the scheduled time arrives, the change will automatically transition to "In Progress"')
console.log('   - Watch the server logs for automation messages')
console.log('   - Refresh the changes page to see the status update\n')

console.log('4. 📊 Monitor the process:')
console.log('   - Check automation status: curl http://localhost:3000/api/automation/changes')
console.log('   - Trigger manual run: curl -X POST "http://localhost:3000/api/automation/changes" -H "Authorization: Bearer dev-secret"')
console.log('   - Watch server console for log messages\n')

console.log('Expected log messages when automation triggers:')
console.log('   🔄 Processing scheduled changes at [timestamp]')
console.log('   🔍 Looking for approved changes scheduled before [timestamp]')
console.log('   📋 Found X changes ready to start')
console.log('   🎯 Processing change: [title] ([id]) scheduled for [time]')
console.log('   🚀 Change [id] automatically started\n')

console.log('The automation is currently running and will check every 30 seconds.')
console.log('You can also manually trigger it by calling the cron endpoint.')

rl.question('\nPress Enter to exit...', () => {
  console.log('\n✅ Happy testing! The automation will continue running in the background.')
  rl.close()
})