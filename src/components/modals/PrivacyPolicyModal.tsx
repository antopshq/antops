'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'

interface PrivacyPolicyModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PrivacyPolicyModal({ open, onOpenChange }: PrivacyPolicyModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh]">
        <DialogHeader>
          <DialogTitle>ANTOPS Privacy Policy</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-full pr-4">
          <div className="space-y-6 text-sm">
            <div>
              <p className="font-semibold">Last Updated: August 27, 2025</p>
              <p className="font-semibold text-orange-600">Status: BETA/PILOT - Subject to Change</p>
            </div>

            <p>
              This Privacy Policy describes how ANTOPS ("we," "us," or "our") collects, uses, and protects your information when you use our IT Service Management platform.
            </p>

            <div>
              <h3 className="font-semibold text-lg mb-2">Information We Collect</h3>
              
              <div className="mb-4">
                <h4 className="font-medium mb-2">Account Information</h4>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Name, email address, job title</li>
                  <li>Organization details</li>
                  <li>Authentication credentials (securely hashed)</li>
                </ul>
              </div>

              <div className="mb-4">
                <h4 className="font-medium mb-2">Usage Data</h4>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Login times and IP addresses</li>
                  <li>Feature usage and navigation patterns</li>
                  <li>API calls and system interactions</li>
                  <li>Performance metrics and error logs</li>
                </ul>
              </div>

              <div className="mb-4">
                <h4 className="font-medium mb-2">Content Data</h4>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Incidents, problems, and change requests you create</li>
                  <li>Infrastructure diagrams and component data</li>
                  <li>Comments, attachments, and collaboration data</li>
                  <li>AI analysis requests and results</li>
                </ul>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">How We Use Your Information</h3>
              
              <div className="mb-4">
                <h4 className="font-medium mb-2">Service Provision</h4>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Provide and maintain the ANTOPS platform</li>
                  <li>Process your requests and transactions</li>
                  <li>Enable collaboration within your organization</li>
                  <li>Generate insights and analytics</li>
                </ul>
              </div>

              <div className="mb-4">
                <h4 className="font-medium mb-2">AI Features</h4>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Process infrastructure data for AI-powered analysis</li>
                  <li>Generate security and performance recommendations</li>
                  <li>Provide intelligent insights (anonymized data may be used to improve AI models)</li>
                </ul>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">Data Sharing and Disclosure</h3>
              
              <div className="mb-4">
                <h4 className="font-medium mb-2">Within Your Organization</h4>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Data is shared with team members in your organization</li>
                  <li>Role-based access controls limit data visibility</li>
                  <li>Organization administrators can manage user permissions</li>
                </ul>
              </div>

              <div className="mb-4">
                <h4 className="font-medium mb-2">We Do Not</h4>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Sell your personal information</li>
                  <li>Share data with unauthorized third parties</li>
                  <li>Use your data for advertising purposes</li>
                </ul>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">Data Security</h3>
              
              <div className="mb-4">
                <h4 className="font-medium mb-2">Protection Measures</h4>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Industry-standard encryption (TLS/SSL)</li>
                  <li>Secure authentication and API tokens</li>
                  <li>Regular security audits and monitoring</li>
                  <li>Access controls and user permissions</li>
                </ul>
              </div>

              <div className="mb-4">
                <h4 className="font-medium mb-2">Your Responsibilities</h4>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Use strong, unique passwords</li>
                  <li>Keep API tokens secure and confidential</li>
                  <li>Report security concerns immediately</li>
                  <li>Follow your organization's data policies</li>
                </ul>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">Your Rights</h3>
              
              <div className="mb-4">
                <h4 className="font-medium mb-2">Access and Control</h4>
                <ul className="list-disc ml-6 space-y-1">
                  <li>View and update your personal information</li>
                  <li>Download your data (data portability)</li>
                  <li>Delete your account and associated data</li>
                  <li>Control email notification preferences</li>
                </ul>
              </div>

              <div className="mb-4">
                <h4 className="font-medium mb-2">GDPR Rights (EU Users)</h4>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Right to access your personal data</li>
                  <li>Right to rectification of inaccurate data</li>
                  <li>Right to erasure ("right to be forgotten")</li>
                  <li>Right to restrict or object to processing</li>
                  <li>Right to data portability</li>
                </ul>
              </div>

              <div className="mb-4">
                <h4 className="font-medium mb-2">CCPA Rights (California Users)</h4>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Right to know what personal information is collected</li>
                  <li>Right to delete personal information</li>
                  <li>Right to opt-out of sale (we don't sell data)</li>
                  <li>Right to non-discrimination</li>
                </ul>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">Data Retention</h3>
              
              <div className="mb-4">
                <h4 className="font-medium mb-2">Account Data</h4>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Retained while your account is active</li>
                  <li>Deleted within 30 days of account termination</li>
                  <li>Some data may be retained for legal/security purposes</li>
                </ul>
              </div>

              <div className="mb-4">
                <h4 className="font-medium mb-2">Usage Logs</h4>
                <ul className="list-disc ml-6 space-y-1">
                  <li>System logs retained for 90 days</li>
                  <li>Security logs retained for 1 year</li>
                  <li>Analytics data anonymized after 2 years</li>
                </ul>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">Cookies and Tracking</h3>
              
              <div className="mb-4">
                <h4 className="font-medium mb-2">Essential Cookies</h4>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Authentication and session management</li>
                  <li>Security and fraud prevention</li>
                  <li>Core platform functionality</li>
                </ul>
              </div>

              <div className="mb-4">
                <h4 className="font-medium mb-2">No Advertising Cookies</h4>
                <ul className="list-disc ml-6 space-y-1">
                  <li>We do not use cookies for advertising</li>
                  <li>No third-party advertising networks</li>
                  <li>No behavioral tracking for marketing</li>
                </ul>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">Children's Privacy</h3>
              <ul className="list-disc ml-6 space-y-1">
                <li>ANTOPS is not intended for users under 16</li>
                <li>We do not knowingly collect data from children</li>
                <li>Contact us if you believe a child has provided information</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">Contact Information</h3>
              <div className="space-y-2">
                <p><strong>Privacy Questions:</strong> privacy@antopshq.com</p>
                <p><strong>Data Protection Officer:</strong> dpo@antopshq.com</p>
                <p><strong>General Support:</strong> support@antopshq.com</p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">Exercising Your Rights</h3>
              
              <div className="mb-4">
                <h4 className="font-medium mb-2">European Union (GDPR)</h4>
                <ol className="list-decimal ml-6 space-y-1">
                  <li>Email info@antopshq.com with your request</li>
                  <li>Include proof of identity</li>
                  <li>Specify which right you want to exercise</li>
                  <li>We will respond within 30 days</li>
                </ol>
              </div>

              <div className="mb-4">
                <h4 className="font-medium mb-2">California (CCPA)</h4>
                <ol className="list-decimal ml-6 space-y-1">
                  <li>Email info@antopshq.com with "CCPA Request"</li>
                  <li>Include your name and email address</li>
                  <li>Specify which right you want to exercise</li>
                  <li>We will respond within 45 days</li>
                </ol>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="font-semibold text-orange-600">
                BETA DISCLAIMER: This Privacy Policy is subject to change as we develop and refine our platform during the beta/pilot phase. We appreciate your understanding and feedback as we build ANTOPS together.
              </p>
            </div>

            <div className="border-t pt-4">
              <p className="italic">
                This policy is effective as of the 27th of August, 2025. From that date onward, these policies apply to all users of the ANTOPS platform.
              </p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}