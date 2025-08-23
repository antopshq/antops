import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  return new Response('WebSocket server is running', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
  })
}