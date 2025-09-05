import { Suspense } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import ResetPasswordFormWrapper from '@/components/auth/reset-password-form-wrapper'

export default function ResetPassword() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600">
        <Card className="w-full max-w-md border-0 shadow-sm">
          <CardContent className="flex items-center justify-center p-6">
            <div className="text-center">Loading...</div>
          </CardContent>
        </Card>
      </div>
    }>
      <ResetPasswordFormWrapper />
    </Suspense>
  )
}