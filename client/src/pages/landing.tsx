import React from "react";
import { RichPanel } from "@/components/rich-panel";
import { Brain, Shield, Zap, Globe, Code2, CheckCircle2, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white font-sans selection:bg-[#007ACC]/30">
      
      {/* Navigation */}
      <nav className="border-b border-white/10 bg-[#0D0D0D]/80 backdrop-blur-md fixed w-full z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-[#007ACC] rounded flex items-center justify-center">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold tracking-tight text-lg">Lanonasis</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#docs" className="hover:text-white transition-colors">Documentation</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <Button variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-none h-8">
              Sign In
            </Button>
            <Button className="bg-[#007ACC] hover:bg-[#0063A5] text-white h-8">
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
            <div className="absolute top-20 left-1/4 w-96 h-96 bg-[#007ACC]/20 rounded-full blur-[100px]" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center relative z-10">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-[#007ACC]">
              <Zap className="h-3 w-3" />
              <span>Now Available for VS Code</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.1]">
              Your AI Memory <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#007ACC] to-purple-400">
                Orchestrator
              </span>
            </h1>
            
            <p className="text-lg text-gray-400 max-w-xl leading-relaxed">
              Lanonasis acts as your development brain, managing context, API keys, and project memories. 
              Stop searching for the same snippet twice.
            </p>
            
            <div className="flex flex-wrap gap-4">
              <Button className="h-12 px-8 bg-[#007ACC] hover:bg-[#0063A5] text-white text-base rounded-full shadow-[0_0_20px_rgba(0,122,204,0.3)]">
                Install Extension
              </Button>
              <Button variant="outline" className="h-12 px-8 border-white/10 bg-transparent hover:bg-white/5 text-white text-base rounded-full">
                View Demo
              </Button>
            </div>

            <div className="pt-8 flex items-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Vector Storage</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Semantic Search</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Secure Keys</span>
              </div>
            </div>
          </div>

          <div className="relative">
            {/* IDE Preview Mockup */}
            <div className="relative rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-[#1E1E1E] aspect-[4/3] lg:aspect-auto lg:h-[600px]">
                <div className="absolute inset-0 flex">
                    {/* Fake Code Area */}
                    <div className="flex-1 p-6 space-y-4 opacity-50 hidden sm:block">
                        <div className="h-4 w-32 bg-white/10 rounded" />
                        <div className="space-y-2">
                            <div className="h-4 w-full bg-white/5 rounded" />
                            <div className="h-4 w-2/3 bg-white/5 rounded" />
                            <div className="h-4 w-4/5 bg-white/5 rounded" />
                        </div>
                        <div className="h-32 w-full bg-white/5 rounded border border-white/5 mt-8" />
                    </div>
                    
                    {/* The Panel Component */}
                    <div className="w-full sm:w-[400px] h-full border-l border-white/10 shrink-0">
                        <RichPanel />
                    </div>
                </div>
            </div>
            
            {/* Decorative Elements */}
            <div className="absolute -top-6 -right-6 h-24 w-24 bg-gradient-to-br from-[#007ACC] to-purple-600 rounded-2xl blur-2xl opacity-40 -z-10" />
            <div className="absolute -bottom-6 -left-6 h-32 w-32 bg-gradient-to-tr from-[#007ACC] to-cyan-500 rounded-full blur-3xl opacity-30 -z-10" />
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-6 bg-[#0A0A0A]">
        <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16 space-y-4">
                <h2 className="text-3xl font-bold">Engineered for Developers</h2>
                <p className="text-gray-400 max-w-2xl mx-auto">
                    Built to integrate seamlessly into your workflow, providing intelligence without the context switching.
                </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                <FeatureCard 
                    icon={Brain}
                    title="Semantic Memory"
                    description="Don't rely on keywords. Our vector engine understands the intent behind your queries to fetch relevant code snippets and docs."
                />
                <FeatureCard 
                    icon={Shield}
                    title="Scoped Security"
                    description="Manage API keys with granular permissions. Never expose production secrets in your development environment again."
                />
                <FeatureCard 
                    icon={Globe}
                    title="Universal Sync"
                    description="Your context follows you. Move from desktop IDE to web dashboard without losing your train of thought."
                />
                <FeatureCard 
                    icon={Code2}
                    title="Context Orchestrator"
                    description="Paste meeting notes, error logs, or requirements into the chat. We'll organize it into actionable memory."
                />
                <FeatureCard 
                    icon={Zap}
                    title="Instant Recall"
                    description="Access your team's collective knowledge in milliseconds directly from your sidebar."
                />
                <FeatureCard 
                    icon={Briefcase}
                    title="Project Compartments"
                    description="Keep personal projects separate from client work. Automatic context switching based on your active workspace."
                />
            </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 px-6 bg-[#050505]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-[#007ACC]" />
                <span className="font-bold text-gray-300">Lanonasis</span>
            </div>
            <div className="text-sm text-gray-500">
                © 2025 Lanonasis Inc. All rights reserved.
            </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }: { icon: any, title: string, description: string }) {
    return (
        <div className="p-6 rounded-2xl bg-[#151515] border border-white/5 hover:border-[#007ACC]/50 transition-colors group">
            <div className="h-12 w-12 rounded-lg bg-[#1E1E1E] flex items-center justify-center mb-4 group-hover:bg-[#007ACC]/10 transition-colors">
                <Icon className="h-6 w-6 text-gray-300 group-hover:text-[#007ACC] transition-colors" />
            </div>
            <h3 className="text-xl font-bold mb-2">{title}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
        </div>
    )
}
