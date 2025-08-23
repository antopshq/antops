'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  Shield,
  Target,
  RefreshCw,
  Eye,
  Settings,
  BarChart3,
  Clock,
  Wrench
} from 'lucide-react'
import { AIInsight } from '@/hooks/useAIInsights'

interface AIDashboardProps {
  insights: Map<string, AIInsight>
  overallRiskScore: number
  onRefreshAll?: () => void
  onToggleRiskHighlight?: (show: boolean) => void
  onAnalyzeAll?: () => void
  onCreateChange?: (recommendation: string, componentId: string, componentTitle: string) => void
  loading?: boolean
  className?: string
}

export function AIDashboard({
  insights,
  overallRiskScore,
  onRefreshAll,
  onToggleRiskHighlight,
  onAnalyzeAll,
  onCreateChange,
  loading = false,
  className = ''
}: AIDashboardProps) {
  const [showRiskHighlight, setShowRiskHighlight] = useState(true)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  // Calculate risk statistics
  const riskStats = useMemo(() => {
    const stats = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      total: insights.size
    }

    insights.forEach(insight => {
      stats[insight.riskCategory]++
    })

    return stats
  }, [insights])

  // Get top risk components
  const topRiskComponents = useMemo(() => {
    return Array.from(insights.values())
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 5)
  }, [insights])

  // Get recent predictions
  const recentPredictions = useMemo(() => {
    const predictions = Array.from(insights.values())
      .flatMap(insight => 
        insight.predictedFailures.map(failure => ({
          componentId: insight.componentId,
          componentTitle: insight.componentTitle || insight.componentId,
          ...failure
        }))
      )
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 3)

    return predictions
  }, [insights])

  // Get recommended changes from all components
  const recommendedChanges = useMemo(() => {
    const changes = Array.from(insights.values())
      .filter(insight => insight.recommendations && insight.recommendations.length > 0)
      .flatMap(insight => 
        insight.recommendations.map(recommendation => ({
          componentId: insight.componentId,
          componentTitle: insight.componentTitle || insight.componentId,
          recommendation,
          riskCategory: insight.riskCategory,
          riskScore: insight.riskScore
        }))
      )
      .sort((a, b) => {
        // Sort by risk priority first, then by risk score
        const riskPriority = { critical: 4, high: 3, medium: 2, low: 1 }
        const aPriority = riskPriority[a.riskCategory] || 0
        const bPriority = riskPriority[b.riskCategory] || 0
        if (aPriority !== bPriority) return bPriority - aPriority
        return b.riskScore - a.riskScore
      })
      .slice(0, 8) // Show top 8 recommendations

    return changes
  }, [insights])

  const handleToggleHighlight = () => {
    const newState = !showRiskHighlight
    setShowRiskHighlight(newState)
    onToggleRiskHighlight?.(newState)
  }

  const getRiskColor = (category: string) => {
    switch (category) {
      case 'critical': return 'text-red-600 bg-red-50'
      case 'high': return 'text-orange-600 bg-orange-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'low': return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getRiskIcon = (category: string) => {
    switch (category) {
      case 'critical': return <AlertTriangle className="w-4 h-4" />
      case 'high': return <TrendingUp className="w-4 h-4" />
      case 'medium': return <Shield className="w-4 h-4" />
      case 'low': return <Target className="w-4 h-4" />
      default: return <BarChart3 className="w-4 h-4" />
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>

      <div className="space-y-4">
        {/* Overall Risk Score */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Overall Infrastructure Risk
              <div className="text-2xl font-bold">{overallRiskScore}/100</div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Progress value={overallRiskScore} className="h-3 mb-2" />
            <div className="text-xs text-muted-foreground">
              Based on analysis of {insights.size} components
            </div>
          </CardContent>
        </Card>

        {/* Risk Distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Risk Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {Object.entries(riskStats).filter(([key]) => key !== 'total').map(([category, count]) => {
                const componentsInCategory = Array.from(insights.values()).filter(insight => insight.riskCategory === category)
                const isExpanded = expandedSection === `risk-${category}`
                
                return (
                  <div key={category}>
                    <div 
                      className="flex items-center justify-between py-1 cursor-pointer hover:bg-gray-50 rounded px-2 -mx-2"
                      onClick={() => setExpandedSection(isExpanded ? null : `risk-${category}`)}
                    >
                      <div className="flex items-center gap-2">
                        {getRiskIcon(category)}
                        <span className="text-sm capitalize font-medium">{category}</span>
                        {count > 0 && (
                          <Button variant="ghost" size="sm" className="h-4 w-4 p-0 ml-1">
                            {isExpanded ? '−' : '+'}
                          </Button>
                        )}
                      </div>
                      <Badge variant="outline" className={`text-xs px-2 py-1 ${getRiskColor(category)}`}>
                        {count} components
                      </Badge>
                    </div>
                    
                    {/* Expanded component list */}
                    {isExpanded && componentsInCategory.length > 0 && (
                      <div className="mt-2 ml-6 space-y-2">
                        {componentsInCategory.map((insight) => (
                          <div key={insight.componentId} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border">
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded bg-gray-300 flex items-center justify-center">
                                <div className="w-2 h-2 bg-gray-600 rounded"></div>
                              </div>
                              <span className="text-sm">{insight.componentTitle || insight.componentId}</span>
                            </div>
                            <Badge variant="outline" className={`text-xs ${getRiskColor(insight.riskCategory)}`}>
                              {insight.riskScore}/100
                            </Badge>
                          </div>
                        ))}
                        
                        {/* Show recommendations for this category if available */}
                        {componentsInCategory.length > 0 && componentsInCategory[0].recommendations.length > 0 && (
                          <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
                            <h5 className="text-xs font-medium mb-1">Common Recommendations:</h5>
                            <ul className="text-xs text-muted-foreground space-y-1">
                              {componentsInCategory[0].recommendations.slice(0, 2).map((rec, i) => (
                                <li key={i} className="flex items-start gap-1">
                                  <span className="text-blue-500 mt-0.5">•</span>
                                  <span>{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

      </div>


      {/* Failure Predictions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            Failure Predictions
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpandedSection(expandedSection === 'predictions' ? null : 'predictions')}
            >
              {expandedSection === 'predictions' ? '−' : '+'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {recentPredictions.length > 0 ? recentPredictions.map((prediction, index) => (
              <div key={index} className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{prediction.componentTitle}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs px-2 py-1">
                      {Math.round(prediction.probability * 100)}% risk
                    </Badge>
                  </div>
                </div>
                <div className="text-sm text-gray-700 mb-2">
                  {prediction.description}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  Expected timeframe: {prediction.timeframe}
                </div>
              </div>
            )) : (
              <div className="text-center py-6 text-sm text-muted-foreground">
                <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
                No failure predictions detected
              </div>
            )}
            
            {expandedSection === 'predictions' && recentPredictions.length > 0 && (
              <div className="mt-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Wrench className="w-4 h-4" />
                  Recommended Actions
                </h4>
                <ul className="text-sm space-y-1">
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 mt-1">•</span>
                    <span>Monitor resource usage closely</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 mt-1">•</span>
                    <span>Prepare scaling procedures</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 mt-1">•</span>
                    <span>Review backup systems</span>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Changes to be Made */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            Changes to be Made
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpandedSection(expandedSection === 'changes' ? null : 'changes')}
            >
              {expandedSection === 'changes' ? '−' : '+'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {recommendedChanges.length > 0 ? (
              <>
                {recommendedChanges.slice(0, expandedSection === 'changes' ? recommendedChanges.length : 4).map((change, index) => (
                  <div 
                    key={`${change.componentId}-${index}`} 
                    className="p-3 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 cursor-pointer transition-colors"
                    onClick={() => onCreateChange?.(change.recommendation, change.componentId, change.componentTitle)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-900">{change.componentTitle}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-xs px-2 py-1 ${getRiskColor(change.riskCategory)}`}>
                          {change.riskCategory}
                        </Badge>
                        <Wrench className="w-4 h-4 text-blue-600" />
                      </div>
                    </div>
                    <div className="text-sm text-blue-800 mb-2">
                      {change.recommendation}
                    </div>
                    <div className="text-xs text-blue-600 font-medium">
                      Click to create change request
                    </div>
                  </div>
                ))}
                
                {recommendedChanges.length > 4 && expandedSection !== 'changes' && (
                  <div className="text-center text-xs text-muted-foreground pt-2">
                    {recommendedChanges.length - 4} more recommendations available
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-6 text-sm text-muted-foreground">
                <Wrench className="w-8 h-8 mx-auto mb-2 opacity-50" />
                No change recommendations available
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}