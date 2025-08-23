import { NextRequest } from 'next/server'
import { Server as SocketIOServer } from 'socket.io'
import { Server as HTTPServer } from 'http'
import { wsServer } from '@/lib/websocket-server'

let io: SocketIOServer | undefined

export async function GET(req: NextRequest) {
  if (!io) {
    console.log('Initializing WebSocket server...')
    
    // Create HTTP server instance
    const httpServer = new HTTPServer()
    
    // Initialize WebSocket server
    io = wsServer.init(httpServer)
    
    console.log('WebSocket server initialized')
  }

  return new Response('WebSocket server is running', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
  })
}

// Export the io instance for use in other API routes
export { io }