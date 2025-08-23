import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { path } = await params
    
    // Reconstruct the file path
    const filePath = join(process.cwd(), 'uploads', ...path)
    
    // Security: Ensure the path is within the uploads directory
    const uploadsDir = join(process.cwd(), 'uploads')
    if (!filePath.startsWith(uploadsDir)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    
    // Check if file exists
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }
    
    // Additional security: Check if user belongs to the organization in the path
    const pathParts = path
    if (pathParts.length > 0 && pathParts[0] !== user.organizationId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    
    // Read and serve the file
    const fileBuffer = await readFile(filePath)
    const fileName = path[path.length - 1]
    
    // Determine content type
    const ext = fileName.toLowerCase().split('.').pop()
    const contentTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'pdf': 'application/pdf',
      'txt': 'text/plain',
      'log': 'text/plain'
    }
    
    const contentType = contentTypes[ext || ''] || 'application/octet-stream'
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Cache-Control': 'private, max-age=3600'
      }
    })
  } catch (error) {
    console.error('File serving error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}