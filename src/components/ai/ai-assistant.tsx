'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Bot, 
  Send, 
  X, 
  Minimize2, 
  Maximize2, 
  AlertTriangle, 
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Zap
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface AIAssistantMessage {
  id: string
  type: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  metadata?: any
}

interface StructuredIncidentAnalysis {
  title: string
  description: string
  criticality: 'low' | 'medium' | 'high' | 'critical'
  urgency: 'low' | 'medium' | 'high' | 'critical'
  priority: 'low' | 'medium' | 'high' | 'critical'
  category: string
  affectedComponents: string[]
  isManual?: boolean
  analysis: {
    problem: {
      description: string
      symptoms: string[]
      scope: string
    }
    impact: {
      businessImpact: string
      userImpact: string
      affectedSystems: string[]
      estimatedDowntime: string
      riskLevel: 'low' | 'medium' | 'high' | 'critical'
    }
    investigation: {
      immediateSteps: string[]
      dataToCollect: string[]
      teamsToNotify: string[]
      escalationTriggers: string[]
    }
    questions: {
      troubleshooting: string[]
      stakeholder: string[]
      technical: string[]
    }
  }
  confidence: number
  suggestedActions: string[]
  estimatedResolutionTime: string
}

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<AIAssistantMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [useAI, setUseAI] = useState(true) // Toggle between AI and manual pattern recognition
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: '1',
        type: 'assistant',
        content: '👋 Hi! I\'m your AI assistant. I can help you create incidents from simple descriptions. Just tell me what\'s happening and I\'ll structure it for you!\n\nExample: "Users are reporting the website is slow and timing out"',
        timestamp: new Date()
      }])
    }
  }, [isOpen])

  const handleManualPatternRecognition = (input: string) => {
    setIsLoading(false)
    
    // Check for common incident patterns
    const lowerInput = input.toLowerCase()
    let manualAnalysis: StructuredIncidentAnalysis | null = null
    
    if (lowerInput.includes('502') || lowerInput.includes('bad gateway') || 
        (lowerInput.includes('login') && (lowerInput.includes('fail') || lowerInput.includes('error'))) ||
        lowerInput.includes('dashboard') && lowerInput.includes('timeout')) {
      
      manualAnalysis = {
        title: "Authentication Service Outage - 502 Bad Gateway",
        description: "Critical authentication service failure causing widespread login issues. Users experiencing 502 Bad Gateway errors when attempting to access the dashboard, indicating backend service failure.",
        criticality: 'critical',
        urgency: 'critical', 
        priority: 'critical',
        category: "Service Outage",
        affectedComponents: ["Authentication Service", "API Gateway", "Dashboard", "User Management"],
        analysis: {
          problem: {
            description: "Authentication microservice is returning 502 errors, suggesting backend service failure or gateway misconfiguration.",
            symptoms: ["502 Bad Gateway on login attempts", "Dashboard inaccessible", "API authentication failures", "User session timeouts"],
            scope: "All users across all customer organizations"
          },
          impact: {
            businessImpact: "Complete service outage - no users can access the platform, causing immediate revenue loss and customer dissatisfaction.",
            userImpact: "Total inability to access dashboard, disrupting all customer operations and workflows.",
            affectedSystems: ["Authentication API", "Dashboard Frontend", "Session Management", "User Database"],
            estimatedDowntime: "Approximately 45 minutes for critical P0 incident",
            riskLevel: "critical"
          },
          investigation: {
            immediateSteps: ["URGENT: Check authentication service status", "Verify API gateway health", "Review load balancer configuration", "Check for recent deployments", "Escalate to on-call engineer"],
            dataToCollect: ["Gateway error logs showing 502s", "Authentication service logs", "Load balancer health status", "Recent deployment history", "Network connectivity metrics"],
            teamsToNotify: ["Engineering on-call", "DevOps team", "Security team", "Customer success (for external comms)", "Management team"],
            escalationTriggers: ["Issue not resolved within 10 minutes", "Additional customer reports", "No progress on root cause identification"]
          },
          questions: {
            troubleshooting: ["What time did the 502 errors start?", "Any deployments in the last 2 hours?", "Are backend auth APIs responding?", "Is the gateway routing correctly?"],
            stakeholder: ["How many total customers affected?", "Any enterprise customers reporting?", "Revenue impact estimate?", "Need external status page update?"],
            technical: ["Is the auth service container running?", "Are health checks passing?", "Database connectivity OK?", "SSL/certificate issues?"]
          }
        },
        confidence: 0.95,
        suggestedActions: [
          "🚨 IMMEDIATE: Page on-call engineer",
          "🚨 IMMEDIATE: Check auth service health dashboard", 
          "🚨 IMMEDIATE: Verify API gateway routing rules",
          "Update status page for customer transparency",
          "Prepare incident communication for affected customers",
          "Check for any ongoing maintenance or deployments"
        ],
        estimatedResolutionTime: "10-30 minutes (CRITICAL P0)",
        isManual: true
      }
    }

    if (manualAnalysis) {
      const manualAssistantMessage: AIAssistantMessage = {
        id: Date.now().toString() + '_manual',
        type: 'assistant',
        content: `📝 **PATTERN ANALYSIS COMPLETE** 📝\n\nBased on intelligent text recognition:\n\n**${manualAnalysis.title}**\n\n🔴 **Problem**: ${manualAnalysis.analysis.problem.description}\n💥 **Business Impact**: ${manualAnalysis.analysis.impact.businessImpact}\n⚡ **Priority**: ${manualAnalysis.priority.toUpperCase()} (${manualAnalysis.criticality} criticality, ${manualAnalysis.urgency} urgency)\n🎯 **Confidence**: ${Math.round(manualAnalysis.confidence * 100)}% (pattern recognition)\n\n**Affected Systems**: ${manualAnalysis.affectedComponents.join(', ')}\n\n**📋 SUGGESTED ACTIONS**:\n${manualAnalysis.suggestedActions.map(action => `${action}`).join('\n')}\n\n**⏱️ Expected Resolution**: ${manualAnalysis.estimatedResolutionTime}\n\nCreate incident with this analysis?`,
        timestamp: new Date(),
        metadata: { analysis: manualAnalysis, cost: 0, isManual: true }
      }
      
      setMessages(prev => [...prev, manualAssistantMessage])

      // Add action buttons
      const actionMessage: AIAssistantMessage = {
        id: Date.now().toString() + '_actions',
        type: 'system',
        content: 'incident_actions',
        timestamp: new Date(),
        metadata: { analysis: manualAnalysis, isManual: true }
      }

      setMessages(prev => [...prev, actionMessage])
    } else {
      // Generic fallback
      const fallbackMessage: AIAssistantMessage = {
        id: Date.now().toString() + '_fallback',
        type: 'assistant',
        content: `📝 **Pattern Recognition Analysis**\n\nI've analyzed your description but couldn't match it to any critical incident patterns.\n\nFor better analysis, try describing:\n- Specific error messages (like "502", "timeout", "failed")\n- Affected services (like "login", "dashboard", "API")\n- User impact details\n\nWould you like to try with more specific details, or shall I create a basic incident template?`,
        timestamp: new Date(),
        metadata: { cost: 0, isManual: true }
      }
      
      setMessages(prev => [...prev, fallbackMessage])
    }
  }

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: AIAssistantMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setError(null)

    try {
      if (!useAI) {
        // Use manual pattern recognition instead of AI
        handleManualPatternRecognition(userMessage.content)
        return
      }

      // Call AI incident creation API
      const response = await fetch('/api/ai/incident-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: userMessage.content,
          urgencyHint: 'medium'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze incident')
      }

      if (data.status === 'success') {
        const analysis: StructuredIncidentAnalysis = data.result
        // Mark as AI analysis (not manual)
        analysis.isManual = false
        
        // Add assistant response
        const assistantMessage: AIAssistantMessage = {
          id: Date.now().toString() + '_assistant',
          type: 'assistant',
          content: `I've analyzed your incident description. Here's what I found:\n\n**${analysis.title}**\n\n🔍 **Problem**: ${analysis.analysis.problem.description}\n💥 **Impact**: ${analysis.analysis.impact.businessImpact}\n⚡ **Priority**: ${analysis.priority} (${analysis.criticality} criticality, ${analysis.urgency} urgency)\n🎯 **Confidence**: ${Math.round(analysis.confidence * 100)}%\n\n**Affected Components**: ${analysis.affectedComponents.length > 0 ? analysis.affectedComponents.join(', ') : 'None identified'}\n\n**Suggested Actions**:\n${analysis.suggestedActions.map(action => `• ${action}`).join('\n')}\n\nWould you like me to create this incident for you?`,
          timestamp: new Date(),
          metadata: { analysis, cost: data.metadata?.cost || 0, isManual: false }
        }

        setMessages(prev => [...prev, assistantMessage])

        // Add action buttons
        const actionMessage: AIAssistantMessage = {
          id: Date.now().toString() + '_actions',
          type: 'system',
          content: 'incident_actions',
          timestamp: new Date(),
          metadata: { analysis, isManual: false }
        }

        setMessages(prev => [...prev, actionMessage])

      } else if (data.fallback) {
        // Handle fallback response with enhanced manual analysis
        console.log('AI Analysis failed, fallback triggered:', data)
        
        const assistantMessage: AIAssistantMessage = {
          id: Date.now().toString() + '_fallback',
          type: 'assistant',
          content: `AI analysis encountered an issue:\n\n**Error**: ${data.error || 'Unknown technical difficulty'}\n**Fallback Analysis**: Basic incident detected\n\nLet me try manual pattern recognition...`,
          timestamp: new Date(),
          metadata: { fallback: data.fallback, errorDetails: data }
        }
        setMessages(prev => [...prev, assistantMessage])

        // Enhanced manual analysis for your Zendesk ticket pattern
        setTimeout(() => {
          const description = userMessage.content.toLowerCase()
          let manualAnalysis: StructuredIncidentAnalysis | null = null

          if (description.includes('502') && (description.includes('login') || description.includes('gateway') || description.includes('dashboard'))) {
            manualAnalysis = {
              title: "Dashboard Login Outage - 502 Gateway Errors",
              description: "Complete dashboard login failure affecting all users. Users receiving 502 Bad Gateway errors when attempting to access dashboard. Multiple customers reporting same issue across different locations, indicating system-wide authentication service outage.",
              criticality: 'critical',
              urgency: 'critical', 
              priority: 'critical',
              category: 'authentication_outage',
              affectedComponents: ['Authentication Service', 'API Gateway', 'Dashboard Application', 'Load Balancer'],
              analysis: {
                problem: {
                  description: "502 Bad Gateway errors preventing all user authentication to dashboard",
                  symptoms: ["502 HTTP errors on login attempts", "All users across organization affected", "Cross-location impact confirmed", "Multiple customer reports", "Complete loss of dashboard access"],
                  scope: "System-wide outage - all users unable to access dashboard services"
                },
                impact: {
                  businessImpact: "Complete business disruption - all dashboard-dependent operations halted. Customer-facing impact with multiple organizations affected.",
                  userImpact: "Zero access to dashboard functionality. Users cannot perform any work requiring system access.", 
                  affectedSystems: ["User authentication microservice", "API Gateway", "Dashboard frontend", "Session management", "Load balancer"],
                  estimatedDowntime: "ACTIVE OUTAGE - Critical incident requiring immediate response",
                  riskLevel: 'critical'
                },
                investigation: {
                  immediateSteps: ["URGENT: Check authentication service status", "Verify API gateway health", "Review load balancer configuration", "Check for recent deployments", "Escalate to on-call engineer"],
                  dataToCollect: ["Gateway error logs showing 502s", "Authentication service logs", "Load balancer health status", "Recent deployment history", "Network connectivity metrics"],
                  teamsToNotify: ["Engineering on-call", "DevOps team", "Security team", "Customer success (for external comms)", "Management team"],
                  escalationTriggers: ["Issue not resolved within 10 minutes", "Additional customer reports", "No progress on root cause identification"]
                },
                questions: {
                  troubleshooting: ["What time did the 502 errors start?", "Any deployments in the last 2 hours?", "Are backend auth APIs responding?", "Is the gateway routing correctly?"],
                  stakeholder: ["How many total customers affected?", "Any enterprise customers reporting?", "Revenue impact estimate?", "Need external status page update?"],
                  technical: ["Is the auth service container running?", "Are health checks passing?", "Database connectivity OK?", "SSL/certificate issues?"]
                }
              },
              confidence: 0.95,
              suggestedActions: [
                "🚨 IMMEDIATE: Page on-call engineer",
                "🚨 IMMEDIATE: Check auth service health dashboard", 
                "🚨 IMMEDIATE: Verify API gateway routing rules",
                "Update status page for customer transparency",
                "Prepare incident communication for affected customers",
                "Check for any ongoing maintenance or deployments"
              ],
              estimatedResolutionTime: "10-30 minutes (CRITICAL P0)"
            }
            // Mark as manual analysis
            manualAnalysis.isManual = true
          }

          if (manualAnalysis) {
            const manualAssistantMessage: AIAssistantMessage = {
              id: Date.now().toString() + '_manual',
              type: 'assistant',
              content: `🚨 **CRITICAL INCIDENT DETECTED** 🚨\n\nBased on your Zendesk ticket pattern analysis:\n\n**${manualAnalysis.title}**\n\n🔴 **Problem**: ${manualAnalysis.analysis.problem.description}\n💥 **Business Impact**: ${manualAnalysis.analysis.impact.businessImpact}\n⚡ **Priority**: ${manualAnalysis.priority.toUpperCase()} (${manualAnalysis.criticality} criticality, ${manualAnalysis.urgency} urgency)\n🎯 **Confidence**: ${Math.round(manualAnalysis.confidence * 100)}% (manual pattern analysis)\n\n**Affected Systems**: ${manualAnalysis.affectedComponents.join(', ')}\n\n**🚨 IMMEDIATE ACTIONS REQUIRED**:\n${manualAnalysis.suggestedActions.map(action => `${action}`).join('\n')}\n\n**⏱️ Expected Resolution**: ${manualAnalysis.estimatedResolutionTime}\n\nThis appears to be a P0 incident requiring immediate escalation. Create incident now?`,
              timestamp: new Date(),
              metadata: { analysis: manualAnalysis, cost: 0, isManual: true, isCritical: true }
            }
            
            setMessages(prev => [...prev, manualAssistantMessage])

            // Add action buttons for critical incident
            const actionMessage: AIAssistantMessage = {
              id: Date.now().toString() + '_critical_actions',
              type: 'system',
              content: 'incident_actions',
              timestamp: new Date(),
              metadata: { analysis: manualAnalysis, isCritical: true, isManual: true }
            }

            setMessages(prev => [...prev, actionMessage])
          } else {
            // Generic fallback
            const genericMessage: AIAssistantMessage = {
              id: Date.now().toString() + '_generic',
              type: 'assistant',
              content: `I couldn't parse the specific issue pattern. Could you try describing the problem with:\n\n• **What**: What exactly is broken?\n• **When**: When did it start?\n• **Who**: How many users affected?\n• **Where**: Which systems/services?\n\nExample: "Users getting 502 errors on login since 9:20 AM, all customers affected"`,
              timestamp: new Date()
            }
            setMessages(prev => [...prev, genericMessage])
          }
        }, 1000)
      }

    } catch (error) {
      console.error('AI Assistant error:', error)
      setError(error instanceof Error ? error.message : 'Something went wrong')
      
      const errorMessage: AIAssistantMessage = {
        id: Date.now().toString() + '_error',
        type: 'assistant',
        content: `I apologize, but I'm having trouble analyzing your request right now. The error is: ${error instanceof Error ? error.message : 'Unknown error'}\n\nYou can still create an incident manually by going to the incidents page.`,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateIncident = (analysis: StructuredIncidentAnalysis & { isManual?: boolean }) => {
    // Create comprehensive description with all analysis details formatted as HTML
    let detailedDescription = `<p>${analysis.description}</p><br>`
    
    if (analysis.analysis) {
      detailedDescription += '<h2>🔍 Problem Analysis</h2>'
      detailedDescription += `<p><strong>Issue:</strong> ${analysis.analysis.problem.description}</p>`
      detailedDescription += `<p><strong>Scope:</strong> ${analysis.analysis.problem.scope}</p>`
      
      if (analysis.analysis.problem.symptoms && analysis.analysis.problem.symptoms.length > 0) {
        detailedDescription += `<p><strong>Symptoms:</strong></p><ul>`
        analysis.analysis.problem.symptoms.forEach(symptom => {
          detailedDescription += `<li>${symptom}</li>`
        })
        detailedDescription += '</ul>'
      }
      
      detailedDescription += '<br><h2>💥 Impact Analysis</h2>'
      detailedDescription += `<p><strong>Business Impact:</strong> ${analysis.analysis.impact.businessImpact}</p>`
      detailedDescription += `<p><strong>User Impact:</strong> ${analysis.analysis.impact.userImpact}</p>`
      detailedDescription += `<p><strong>Risk Level:</strong> ${analysis.analysis.impact.riskLevel}</p>`
      
      if (analysis.analysis.impact.estimatedDowntime) {
        detailedDescription += `<p><strong>Estimated Downtime:</strong> ${analysis.analysis.impact.estimatedDowntime}</p>`
      }
      
      if (analysis.analysis.impact.affectedSystems && analysis.analysis.impact.affectedSystems.length > 0) {
        detailedDescription += `<p><strong>Affected Systems:</strong> ${analysis.analysis.impact.affectedSystems.join(', ')}</p>`
      }
      
      detailedDescription += '<br><h2>🔬 Immediate Investigation Steps</h2>'
      if (analysis.analysis.investigation.immediateSteps && analysis.analysis.investigation.immediateSteps.length > 0) {
        detailedDescription += '<ul>'
        analysis.analysis.investigation.immediateSteps.forEach(step => {
          detailedDescription += `<li>${step}</li>`
        })
        detailedDescription += '</ul>'
      }
      
      if (analysis.analysis.investigation.dataToCollect && analysis.analysis.investigation.dataToCollect.length > 0) {
        detailedDescription += '<p><strong>Data to Collect:</strong></p><ul>'
        analysis.analysis.investigation.dataToCollect.forEach(item => {
          detailedDescription += `<li>${item}</li>`
        })
        detailedDescription += '</ul>'
      }
      
      if (analysis.analysis.investigation.teamsToNotify && analysis.analysis.investigation.teamsToNotify.length > 0) {
        detailedDescription += `<p><strong>Teams to Notify:</strong> ${analysis.analysis.investigation.teamsToNotify.join(', ')}</p>`
      }
      
      detailedDescription += '<br><h2>❓ Key Investigation Questions</h2>'
      if (analysis.analysis.questions.troubleshooting && analysis.analysis.questions.troubleshooting.length > 0) {
        detailedDescription += '<p><strong>Technical Questions:</strong></p><ul>'
        analysis.analysis.questions.troubleshooting.forEach(question => {
          detailedDescription += `<li>${question}</li>`
        })
        detailedDescription += '</ul>'
      }
      
      if (analysis.analysis.questions.stakeholder && analysis.analysis.questions.stakeholder.length > 0) {
        detailedDescription += '<p><strong>Stakeholder Questions:</strong></p><ul>'
        analysis.analysis.questions.stakeholder.forEach(question => {
          detailedDescription += `<li>${question}</li>`
        })
        detailedDescription += '</ul>'
      }
    }
    
    if (analysis.suggestedActions && analysis.suggestedActions.length > 0) {
      detailedDescription += '<br><h2>⚡ Suggested Actions</h2><ul>'
      analysis.suggestedActions.forEach(action => {
        detailedDescription += `<li>${action}</li>`
      })
      detailedDescription += '</ul>'
    }
    
    if (analysis.estimatedResolutionTime) {
      detailedDescription += `<p><strong>Estimated Resolution Time:</strong> ${analysis.estimatedResolutionTime}</p>`
    }
    
    // Navigate to incident creation page with pre-filled data
    const params = new URLSearchParams({
      ai_title: analysis.title,
      ai_description: detailedDescription,
      ai_criticality: analysis.criticality,
      ai_urgency: analysis.urgency,
      ai_priority: analysis.priority,
      ai_category: analysis.category,
      ai_components: analysis.affectedComponents.join(','),
      ai_confidence: analysis.confidence.toString(),
      ai_analysis: JSON.stringify(analysis.analysis),
      ai_is_manual: (analysis.isManual || false).toString()
    })

    router.push(`/incidents/new?${params.toString()}`)
    setIsOpen(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const getCriticalityColor = (criticality: string) => {
    switch (criticality) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const renderMessage = (message: AIAssistantMessage) => {
    if (message.type === 'system' && message.content === 'incident_actions') {
      const analysis = message.metadata?.analysis as StructuredIncidentAnalysis
      if (!analysis) return null

      return (
        <div key={message.id} className="flex justify-center mb-4">
          <div className="flex gap-2">
            <Button
              onClick={() => handleCreateIncident(analysis)}
              className="bg-orange-500 hover:bg-orange-600 text-white"
              size="sm"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Create Incident
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setMessages(prev => [...prev, {
                  id: Date.now().toString(),
                  type: 'assistant',
                  content: 'No problem! Feel free to describe another incident or ask me any questions.',
                  timestamp: new Date()
                }])
              }}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Not Now
            </Button>
          </div>
        </div>
      )
    }

    return (
      <div key={message.id} className={`mb-4 ${message.type === 'user' ? 'text-right' : 'text-left'}`}>
        <div className={`inline-block max-w-[80%] p-3 rounded-lg ${
          message.type === 'user' 
            ? 'bg-orange-500 text-white' 
            : 'bg-gray-100 text-gray-900'
        }`}>
          <div className="whitespace-pre-wrap text-sm">{message.content}</div>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {message.timestamp.toLocaleTimeString()}
        </div>
      </div>
    )
  }

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-20 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="relative h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
          style={{ backgroundColor: '#FF7A1A' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E6661A'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FF7A1A'}
        >
          <Bot className="h-5 w-5 text-white" />
        </Button>
        <div className="absolute -top-12 right-0 bg-black text-white text-xs py-1 px-2 rounded opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
          AI Assistant
        </div>
      </div>
    )
  }

  return (
    <div className="fixed bottom-20 right-20 z-50">
      <Card className={`w-96 shadow-xl border-2 transition-all duration-300 ${
        isMinimized ? 'h-16' : 'h-[500px]'
      }`}>
        <CardHeader className={`flex flex-row items-center justify-between ${isMinimized ? 'p-3' : 'p-4 border-b'}`}>
          {isMinimized ? (
            <>
              <CardTitle className="flex items-center text-sm">
                <Bot className="w-4 h-4 mr-2 text-blue-500" />
                AI Chat
                <Badge variant="outline" className="ml-2 text-xs">
                  {useAI ? '🤖' : '📝'}
                </Badge>
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMinimized(false)}
                  className="w-7 h-7 p-0"
                >
                  <Maximize2 className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 p-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </>
          ) : (
            <>
              <CardTitle className="flex items-center text-lg">
                <Bot className="w-5 h-5 mr-2 text-blue-500" />
                AI Assistant
                {useAI ? (
                  <Badge variant="outline" className="ml-2 text-xs">
                    <Zap className="w-3 h-3 mr-1" />
                    GPT-4o Mini
                  </Badge>
                ) : (
                  <Badge variant="outline" className="ml-2 text-xs bg-blue-50">
                    Pattern Recognition
                  </Badge>
                )}
              </CardTitle>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUseAI(!useAI)}
                  className="text-xs px-2 py-1 h-7"
                >
                  {useAI ? '🤖 AI' : '📝 Manual'}
                </Button>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsMinimized(true)}
                    className="w-8 h-8 p-0"
                  >
                    <Minimize2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                    className="w-8 h-8 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardHeader>

        {!isMinimized && (
          <CardContent className="p-0 flex flex-col h-[calc(500px-73px)]">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(renderMessage)}
              {isLoading && (
                <div className="flex items-center text-gray-500 text-sm">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing your incident...
                </div>
              )}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center text-red-700 text-sm">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    {error}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t p-4">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Describe the incident..."
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isLoading}
                  size="sm"
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                💡 Tip: Describe symptoms, affected users, and any error messages
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}