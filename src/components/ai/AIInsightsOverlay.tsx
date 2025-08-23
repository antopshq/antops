'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip } from '@/components/ui/tooltip'
import {
  AlertTriangle,
  Shield,
  TrendingUp,
  Zap,
  Clock,
  Target,
  Brain,
  ChevronRight,
  Info
} from 'lucide-react'
import { AIInsight } from '@/hooks/useAIInsights'

interface AIInsightsOverlayProps {
  insights: AIInsight
  showDetailed?: boolean
  onAnalyzeClick?: () => void
  className?: string
}

export function AIInsightsOverlay({ 
  insights, 
  showDetailed = false, 
  onAnalyzeClick,
  className = ''
}: AIInsightsOverlayProps) {
  const [showFullDetails, setShowFullDetails] = useState(false)

  const getRiskColor = (riskCategory: string) => {
    switch (riskCategory) {
      case 'critical': return 'text-red-500 bg-red-50 border-red-200'
      case 'high': return 'text-orange-500 bg-orange-50 border-orange-200'
      case 'medium': return 'text-yellow-500 bg-yellow-50 border-yellow-200'
      case 'low': return 'text-green-500 bg-green-50 border-green-200'
      default: return 'text-gray-500 bg-gray-50 border-gray-200'
    }
  }

  const getRiskIcon = (riskCategory: string) => {
    switch (riskCategory) {
      case 'critical': return <AlertTriangle className="w-3 h-3" />
      case 'high': return <TrendingUp className="w-3 h-3" />
      case 'medium': return <Shield className="w-3 h-3" />
      case 'low': return <Target className="w-3 h-3" />
      default: return <Info className="w-3 h-3" />
    }
  }

  const formatTimeframe = (timeframe: string) => {
    return timeframe.replace(/(\d+)([a-z])/g, '$1 $2')
  }

  // Compact overlay for normal view
  if (!showDetailed) {
    return (
      <div className={`absolute top-1 right-1 flex items-center gap-1 ${className}`}>
        {/* Risk indicator */}
        <Tooltip content={
          <div>
            <div className="font-medium">Risk Score: {insights.riskScore}/100</div>
            <div className="text-xs opacity-80">
              {insights.riskCategory.toUpperCase()} risk level
            </div>
            <div className="text-xs opacity-80">
              Confidence: {Math.round(insights.confidenceLevel * 100)}%
            </div>
          </div>
        }>
          <Badge 
            variant="outline" 
            className={`text-xs px-1.5 py-0.5 ${getRiskColor(insights.riskCategory)}`}
          >
            {getRiskIcon(insights.riskCategory)}
            <span className="ml-1">{insights.riskScore}</span>
          </Badge>
        </Tooltip>

        {/* AI analysis indicator */}
        <Tooltip content={
          <div>
            <div className="font-medium">AI Analysis Available</div>
            <div className="text-xs opacity-80">
              {insights.recommendations.length} recommendations
            </div>
            <div className="text-xs opacity-80">
              {insights.predictedFailures.length} failure predictions
            </div>
          </div>
        }>
          <Badge variant="outline" className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 border-blue-200">
            <Brain className="w-3 h-3" />
          </Badge>
        </Tooltip>

        {/* Analyze button */}
        {onAnalyzeClick && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onAnalyzeClick}
            className="h-6 w-6 p-0 hover:bg-blue-50"
          >
            <ChevronRight className="w-3 h-3" />
          </Button>
        )}
      </div>
    )
  }

  // Detailed overlay for expanded view
  return (
    <Card className={`absolute top-full left-0 mt-2 w-80 z-50 shadow-lg ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-blue-500" />
            AI Analysis
          </div>
          <Badge 
            variant="outline" 
            className={`text-xs ${getRiskColor(insights.riskCategory)}`}
          >
            {getRiskIcon(insights.riskCategory)}
            <span className="ml-1">{insights.riskCategory.toUpperCase()}</span>
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Risk Score */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Risk Score</span>
          <div className="flex items-center gap-2">
            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full ${
                  insights.riskScore >= 75 ? 'bg-red-500' :
                  insights.riskScore >= 50 ? 'bg-orange-500' :
                  insights.riskScore >= 25 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${insights.riskScore}%` }}
              />
            </div>
            <span className="text-sm font-medium">{insights.riskScore}/100</span>
          </div>
        </div>

        {/* Confidence */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Confidence</span>
          <span className="text-sm font-medium">{Math.round(insights.confidenceLevel * 100)}%</span>
        </div>

        {/* Top Recommendations */}
        {insights.recommendations.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Top Recommendations</h4>
            <div className="space-y-1">
              {insights.recommendations.slice(0, 2).map((rec, index) => (
                <div key={index} className="text-xs text-muted-foreground bg-blue-50 p-2 rounded">
                  {rec}
                </div>
              ))}
              {insights.recommendations.length > 2 && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setShowFullDetails(!showFullDetails)}
                  className="text-xs p-0 h-auto"
                >
                  {showFullDetails ? 'Show Less' : `+${insights.recommendations.length - 2} more`}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Failure Predictions */}
        {insights.predictedFailures.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Failure Predictions</h4>
            <div className="space-y-1">
              {insights.predictedFailures.slice(0, 2).map((failure, index) => (
                <div key={index} className="text-xs bg-red-50 p-2 rounded border border-red-100">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-3 h-3 text-red-500" />
                    <span className="font-medium">{Math.round(failure.probability * 100)}% probability</span>
                    <Badge variant="outline" className="text-xs">
                      {failure.impact}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground">{failure.description}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatTimeframe(failure.timeframe)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3" />
            <span>{insights.metadata.analysisType}</span>
          </div>
          <span>Updated {insights.lastUpdated.toLocaleTimeString()}</span>
        </div>

        {/* Full details expansion */}
        {showFullDetails && (
          <div className="space-y-2 border-t pt-2">
            {/* All Recommendations */}
            {insights.recommendations.slice(2).map((rec, index) => (
              <div key={index + 2} className="text-xs text-muted-foreground bg-blue-50 p-2 rounded">
                {rec}
              </div>
            ))}

            {/* Dependencies */}
            {insights.dependencies.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Dependencies</h4>
                <div className="space-y-1">
                  {insights.dependencies.map((dep, index) => (
                    <div key={index} className="text-xs bg-gray-50 p-2 rounded">
                      <div className="flex items-center justify-between">
                        <span>{dep.componentId}</span>
                        <Badge variant="outline" className="text-xs">
                          Impact: {dep.impactScore}/100
                        </Badge>
                      </div>
                      <div className="text-muted-foreground">{dep.relationship}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}