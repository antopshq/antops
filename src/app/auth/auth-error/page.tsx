import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

export default function AuthError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600" style={{background: 'linear-gradient(135deg, #fa8c16 0%, #ff7875 50%, #ffa940 100%)'}}>
      <Card className="w-full max-w-md border-0 shadow-sm">
        <CardHeader className="space-y-4 pb-6">
          <div className="flex justify-center">
            <img 
              src="/ANTOPS.png" 
              alt="ANTOPS Logo" 
              className="h-20 w-auto"
            />
          </div>
          <CardTitle className="text-2xl font-semibold text-center">Authentication Error</CardTitle>
          <CardDescription className="text-center text-gray-600">
            The authentication link is invalid or has expired
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Link Expired</h3>
            <p className="text-gray-600 mb-6">
              This authentication link is no longer valid. Please request a new password reset.
            </p>
            
            <div className="space-y-3">
              <Link href="/auth/forgot-password">
                <Button className="w-full">
                  Request New Password Reset
                </Button>
              </Link>
              
              <Link href="/auth/signin">
                <Button variant="outline" className="w-full">
                  Back to Sign In
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}