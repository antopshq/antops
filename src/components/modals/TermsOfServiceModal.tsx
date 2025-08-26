'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'

interface TermsOfServiceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TermsOfServiceModal({ open, onOpenChange }: TermsOfServiceModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh]">
        <DialogHeader>
          <DialogTitle>ANTOPS Terms of Service</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-full pr-4">
          <div className="space-y-6 text-sm">
            <div>
              <p className="font-semibold">Last Updated: August 27, 2025</p>
              <p className="font-semibold text-orange-600">Status: BETA/PILOT - Subject to Change</p>
            </div>

            <p>
              These Terms of Service ("Terms") govern your use of ANTOPS, an IT Service Management platform operated by ANTOPS, Inc. ("we," "us," or "our").
            </p>

            <div>
              <h3 className="font-semibold text-lg mb-2">Acceptance of Terms</h3>
              <p>By creating an account or using ANTOPS, you agree to these Terms and our Privacy Policy. If you don't agree, please don't use our service.</p>
              
              <div className="mt-4">
                <h4 className="font-medium mb-2">Beta/Pilot Agreement</h4>
                <ul className="list-disc ml-6 space-y-1">
                  <li>ANTOPS is currently in beta/pilot phase</li>
                  <li>Features and terms may change with short notice</li>
                  <li>Your feedback helps us improve the platform</li>
                  <li>Service availability and performance may vary</li>
                </ul>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">Account and Registration</h3>
              
              <div className="mb-4">
                <h4 className="font-medium mb-2">Eligibility</h4>
                <ul className="list-disc ml-6 space-y-1">
                  <li>You must be at least 16 years old</li>
                  <li>You must provide accurate account information</li>
                  <li>You must have authority to bind your organization</li>
                  <li>One account per user (no shared accounts)</li>
                </ul>
              </div>

              <div className="mb-4">
                <h4 className="font-medium mb-2">Account Security</h4>
                <ul className="list-disc ml-6 space-y-1">
                  <li>You're responsible for your login credentials</li>
                  <li>Keep your password and API tokens secure</li>
                  <li>Notify us immediately of any security breaches</li>
                  <li>Don't share accounts or allow unauthorized access</li>
                </ul>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">Acceptable Use</h3>
              
              <div className="mb-4">
                <h4 className="font-medium mb-2">Permitted Uses</h4>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Manage IT services and infrastructure</li>
                  <li>Collaborate with your team members</li>
                  <li>Use AI features for legitimate analysis</li>
                  <li>Integrate with your existing tools via API</li>
                </ul>
              </div>

              <div className="mb-4">
                <h4 className="font-medium mb-2">Prohibited Uses</h4>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Violate any laws or regulations</li>
                  <li>Infringe on others' intellectual property</li>
                  <li>Transmit harmful, offensive, or illegal content</li>
                  <li>Attempt to hack, disrupt, or overload our systems</li>
                  <li>Use the service for unauthorized commercial purposes</li>
                  <li>Share access credentials with unauthorized parties</li>
                </ul>
              </div>

              <div className="mb-4">
                <h4 className="font-medium mb-2">Rate Limits and Fair Use</h4>
                <ul className="list-disc ml-6 space-y-1">
                  <li>AI features limited to 5 scans per user per day</li>
                  <li>API rate limits apply to prevent abuse</li>
                  <li>Excessive usage may result in temporary restrictions</li>
                  <li>Commercial usage requires appropriate subscription</li>
                </ul>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">Data and Content</h3>
              
              <div className="mb-4">
                <h4 className="font-medium mb-2">Your Data</h4>
                <ul className="list-disc ml-6 space-y-1">
                  <li>You retain ownership of your data</li>
                  <li>You grant us license to process and store your data</li>
                  <li>You're responsible for data accuracy and legality</li>
                  <li>You can export your data at any time</li>
                </ul>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">Disclaimers and Limitations</h3>
              
              <div className="mb-4">
                <h4 className="font-medium mb-2">Service Disclaimers</h4>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Service provided "AS IS" without warranties</li>
                  <li>No guarantee of uptime, performance, or results</li>
                  <li>Features may have bugs or limitations</li>
                  <li>AI recommendations are suggestions, not guarantees</li>
                </ul>
              </div>

              <div className="mb-4">
                <h4 className="font-medium mb-2">Liability Limitations</h4>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Our liability limited to amount paid by you</li>
                  <li>We're not liable for indirect or consequential damages</li>
                  <li>You use the service at your own risk</li>
                  <li>Maximum liability: $100 or amount paid, whichever is greater</li>
                </ul>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">Termination</h3>
              <ul className="list-disc ml-6 space-y-1">
                <li>You can delete your account anytime</li>
                <li>We may suspend accounts for terms violations</li>
                <li>Data will be deleted according to our Privacy Policy</li>
                <li>No refunds unless required by law</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">Contact Information</h3>
              <div className="space-y-2">
                <p><strong>General Questions:</strong> support@antopshq.com</p>
                <p><strong>Legal Notices:</strong> legal@antopshq.com</p>
                <p><strong>Abuse Reports:</strong> abuse@antopshq.com</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="font-semibold text-orange-600">
                BETA DISCLAIMER: These Terms of Service are subject to significant change as we develop ANTOPS during the beta/pilot phase. We appreciate your understanding and participation as we build the future of IT service management together.
              </p>
            </div>

            <div className="border-t pt-4">
              <p className="italic">
                By using ANTOPS, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service and our Privacy Policy.
              </p>
              <p className="font-semibold">
                Effective Date: These terms are effective as of the date last updated above and apply to all users of the ANTOPS platform.
              </p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}