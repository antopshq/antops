const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = process.env.PORT || 3000

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  // Initialize WebSocket server
  let wsServer
  try {
    // Use dynamic import for ES modules
    import('./src/lib/websocket-server.js').then(({ wsServer: webSocketServer }) => {
      wsServer = webSocketServer
      const io = wsServer.init(server)
      
      // Make WebSocket available globally for API routes
      global.io = io
      global.userSessions = wsServer.userSessions || new Map()
      
      console.log('🚀 WebSocket server initialized')
    }).catch(err => {
      console.warn('⚠️  WebSocket server failed to initialize:', err.message)
      console.log('📱 App will work without real-time features')
    })
  } catch (err) {
    console.warn('⚠️  WebSocket server not available:', err.message)
  }
  
  server.listen(port, (err) => {
    if (err) throw err
    console.log(`> Ready on http://${hostname}:${port}`)
    
    if (dev) {
      console.log('🔧 Development mode - WebSocket on same port')
    } else {
      console.log('🚀 Production mode - WebSocket integrated')
    }
  })
})