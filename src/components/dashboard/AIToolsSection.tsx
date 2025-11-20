/**
 * AI Tools Section - Dashboard view for tool configuration
 * Integrates ToolManager into the main dashboard
 */

import React from 'react';
import { ToolManager } from '@/components/ai/ToolManager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, Sparkles } from 'lucide-react';

export function AIToolsSection() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600">
          <Brain className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            AI Assistant Configuration
            <Sparkles className="h-6 w-6 text-blue-600" />
          </h1>
          <p className="text-muted-foreground mt-1">
            Empower your AI assistant with tools and integrations
          </p>
        </div>
      </div>

      <ToolManager />
    </div>
  );
}
