import { AIAnalysis } from '@/types/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Brain,
  AlertTriangle,
  Leaf,
  Gauge,
  Sprout,
  Truck,
  Store,
  Lightbulb,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIAnalysisCardProps {
  analysis: AIAnalysis;
}

export function AIAnalysisCard({ analysis }: AIAnalysisCardProps) {
  const getConfidenceColor = (level: string | null) => {
    if (!level) return 'bg-muted';
    const lower = level.toLowerCase();
    if (lower.includes('high')) return 'bg-success text-success-foreground';
    if (lower.includes('medium')) return 'bg-warning text-warning-foreground';
    return 'bg-destructive text-destructive-foreground';
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">AI Quality Analysis</CardTitle>
              <CardDescription>Powered by Gemini AI</CardDescription>
            </div>
          </div>
          {analysis.confidence_level && (
            <Badge className={cn(getConfidenceColor(analysis.confidence_level))}>
              <Gauge className="mr-1 h-3 w-3" />
              {analysis.confidence_level}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* Degradation Point */}
        {analysis.degradation_point && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <span>Quality Degradation Point</span>
            </div>
            <p className="text-sm text-muted-foreground pl-6">
              {analysis.degradation_point}
            </p>
          </div>
        )}

        {/* Environmental Impact */}
        {analysis.environmental_impact && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Leaf className="h-4 w-4 text-primary" />
              <span>Environmental Impact</span>
            </div>
            <p className="text-sm text-muted-foreground pl-6">
              {analysis.environmental_impact}
            </p>
          </div>
        )}

        <Separator />

        {/* Suggestions */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Lightbulb className="h-4 w-4 text-accent" />
            <span>Improvement Suggestions</span>
          </div>

          <div className="grid gap-4">
            {/* Farmer Suggestions */}
            {analysis.farmer_suggestions && (
              <div className="rounded-lg border border-farmer/20 bg-farmer/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sprout className="h-4 w-4 text-farmer" />
                  <span className="font-medium text-sm">For the Farmer</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {analysis.farmer_suggestions}
                </p>
              </div>
            )}

            {/* Transporter Suggestions */}
            {analysis.transporter_suggestions && (
              <div className="rounded-lg border border-transporter/20 bg-transporter/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="h-4 w-4 text-transporter" />
                  <span className="font-medium text-sm">For the Transporter</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {analysis.transporter_suggestions}
                </p>
              </div>
            )}

            {/* Vendor Suggestions */}
            {analysis.vendor_suggestions && (
              <div className="rounded-lg border border-vendor/20 bg-vendor/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Store className="h-4 w-4 text-vendor" />
                  <span className="font-medium text-sm">For the Vendor</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {analysis.vendor_suggestions}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
