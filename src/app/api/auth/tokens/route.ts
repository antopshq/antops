import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { 
  createApiToken, 
  getUserApiTokens, 
  revokeApiToken, 
  deleteApiToken, 
  updateApiToken,
  type CreateTokenRequest 
} from '@/lib/api-tokens'

// GET /api/auth/tokens - List user's API tokens
export async function GET() {
  try {
    const user = await getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const tokens = await getUserApiTokens(user.id)
    
    return NextResponse.json({ tokens })
    
  } catch (error) {
    console.error('Error fetching API tokens:', error)
    return NextResponse.json(
      { error: 'Failed to fetch API tokens' },
      { status: 500 }
    )
  }
}

// POST /api/auth/tokens - Create new API token
export async function POST(request: NextRequest) {
  try {
    const user = await getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { name, expiresAt, permissions, scope }: CreateTokenRequest = body
    
    // Validate input
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Token name is required' },
        { status: 400 }
      )
    }
    
    if (name.length > 100) {
      return NextResponse.json(
        { error: 'Token name must be less than 100 characters' },
        { status: 400 }
      )
    }
    
    // Validate permissions if provided
    const validPermissions = ['read', 'write']
    if (permissions && !Array.isArray(permissions)) {
      return NextResponse.json(
        { error: 'Permissions must be an array' },
        { status: 400 }
      )
    }
    
    if (permissions && !permissions.every(p => validPermissions.includes(p))) {
      return NextResponse.json(
        { error: `Invalid permissions. Valid options: ${validPermissions.join(', ')}` },
        { status: 400 }
      )
    }
    
    // Validate scope if provided
    const validScopes = ['full', 'read_only', 'incidents_only', 'changes_only', 'problems_only']
    if (scope && !validScopes.includes(scope)) {
      return NextResponse.json(
        { error: `Invalid scope. Valid options: ${validScopes.join(', ')}` },
        { status: 400 }
      )
    }
    
    // Validate expiration date if provided
    if (expiresAt) {
      const expDate = new Date(expiresAt)
      if (isNaN(expDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid expiration date format' },
          { status: 400 }
        )
      }
      
      if (expDate <= new Date()) {
        return NextResponse.json(
          { error: 'Expiration date must be in the future' },
          { status: 400 }
        )
      }
    }
    
    const generatedToken = await createApiToken(user.id, user.organizationId, {
      name: name.trim(),
      expiresAt,
      permissions,
      scope
    })
    
    return NextResponse.json({
      token: generatedToken.token, // Full token - only shown once!
      tokenData: generatedToken.tokenData,
      message: 'API token created successfully. Save this token now - it will not be shown again.'
    }, { status: 201 })
    
  } catch (error) {
    console.error('Error creating API token:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create API token' },
      { status: 500 }
    )
  }
}

// PUT /api/auth/tokens - Update API token (bulk operations)
export async function PUT(request: NextRequest) {
  try {
    const user = await getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { action, tokenId, ...data } = body
    
    if (!action || !tokenId) {
      return NextResponse.json(
        { error: 'Action and tokenId are required' },
        { status: 400 }
      )
    }
    
    let success = false
    
    switch (action) {
      case 'revoke':
        success = await revokeApiToken(tokenId, user.id)
        break
        
      case 'update':
        success = await updateApiToken(tokenId, user.id, data)
        break
        
      default:
        return NextResponse.json(
          { error: 'Invalid action. Valid actions: revoke, update' },
          { status: 400 }
        )
    }
    
    if (!success) {
      return NextResponse.json(
        { error: 'Operation failed' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Error updating API token:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to update API token' },
      { status: 500 }
    )
  }
}

// DELETE /api/auth/tokens?id=<token-id> - Delete API token permanently
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const tokenId = searchParams.get('id')
    
    if (!tokenId) {
      return NextResponse.json(
        { error: 'Token ID is required' },
        { status: 400 }
      )
    }
    
    const success = await deleteApiToken(tokenId, user.id)
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete token' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Error deleting API token:', error)
    return NextResponse.json(
      { error: 'Failed to delete API token' },
      { status: 500 }
    )
  }
}