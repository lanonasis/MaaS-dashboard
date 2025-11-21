import React from "react";
import { RichPanel } from "@/components/rich-panel";
import { Brain, Shield, Zap, Globe, Code2, CheckCircle2, Briefcase, Terminal, Copy, Check, Sparkles, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function LandingPage() {
  const [copied, setCopied] = useState(false);
  const installCommand = "npm install @lanonasis/memory-client @LanOnasis/sdk @lanonasis/security-sdk";

  const handleCopy = () => {
    navigator.clipboard.writeText(installCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0D0D0D] via-[#0A0A0A] to-[#050505] text-white font-sans selection:bg-[#007ACC]/30">
      
      {/* Navigation */}
      <nav className="border-b border-white/10 bg-[#0D0D0D]/80 backdrop-blur-xl fixed w-full z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="h-8 w-8 bg-gradient-to-br from-[#007ACC] to-[#0E639C] rounded-lg flex items-center justify-center group-hover:shadow-lg group-hover:shadow-[#007ACC]/30 transition-all">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold tracking-tight text-lg">Lanonasis</span>
          </div>
          <div className="flex items-center gap-8 text-sm text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#sdk" className="hover:text-white transition-colors">SDK</a>
            <a href="#security" className="hover:text-white transition-colors">Security</a>
            <Button variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-none h-8 rounded-lg">
              Sign In
            </Button>
            <Button className="bg-gradient-to-r from-[#007ACC] to-[#0E639C] hover:shadow-lg hover:shadow-[#007ACC]/50 text-white h-8 rounded-lg group">
              Get Started
              <ArrowRight className="ml-2 h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
            <div className="absolute top-20 left-1/4 w-96 h-96 bg-[#007ACC]/20 rounded-full blur-[120px]" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center relative z-10">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-[#007ACC]/30 text-xs font-medium text-[#007ACC] hover:bg-white/10 transition-colors">
              <Zap className="h-3.5 w-3.5 animate-pulse" />
              <span>V1.2.0 – Production Ready for VS Code</span>
            </div>
            
            <h1 className="text-6xl md:text-7xl font-bold tracking-tighter leading-[1.1]">
              Your AI Memory <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#007ACC] via-purple-400 to-[#0E639C]">
                Orchestrator
              </span>
            </h1>
            
            <p className="text-lg text-gray-400 max-w-xl leading-relaxed">
              Stop searching for the same code snippet twice. Lanonasis acts as your development brain—managing context, API keys, and project memories with semantic intelligence. Designed for developers who think in vectors.
            </p>
            
            <div className="space-y-4 pt-4">
                <div className="flex items-center gap-2 text-sm font-mono text-gray-400 mb-3">
                    <Terminal className="h-4 w-4 text-[#007ACC]" />
                    <span>Get started in seconds with our SDKs:</span>
                </div>
                <div className="flex items-center gap-2 p-4 bg-gradient-to-r from-[#1E1E1E] to-[#252526] border border-[#3C3C3C] hover:border-[#007ACC]/30 rounded-lg max-w-lg group transition-all">
                    <code className="text-sm text-[#007ACC] flex-1 font-mono">{installCommand}</code>
                    <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                        onClick={handleCopy}
                    >
                        {copied ? <Check className="h-4 w-4 text-green-500 animate-pulse" /> : <Copy className="h-4 w-4" />}
                    </Button>
                </div>
                <p className="text-xs text-gray-500">Includes @lanonasis/memory-client, @LanOnasis/sdk, and @lanonasis/security-sdk</p>
            </div>

            <div className="flex flex-wrap gap-4 pt-6">
              <Button className="h-12 px-8 bg-gradient-to-r from-[#007ACC] to-[#0E639C] hover:shadow-lg hover:shadow-[#007ACC]/40 text-white text-base rounded-lg font-medium group">
                Install Now
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button variant="outline" className="h-12 px-8 border-white/10 bg-transparent hover:bg-white/5 text-white text-base rounded-lg font-medium">
                View Docs
              </Button>
            </div>

            <div className="pt-4 flex items-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-2 hover:text-gray-400 transition-colors">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Vector Storage</span>
              </div>
              <div className="flex items-center gap-2 hover:text-gray-400 transition-colors">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Semantic Search</span>
              </div>
              <div className="flex items-center gap-2 hover:text-gray-400 transition-colors">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Scoped Keys</span>
              </div>
            </div>
          </div>

          <div className="relative">
            {/* IDE Preview Mockup */}
            <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[#1E1E1E] aspect-[4/3] lg:aspect-auto lg:h-[600px] hover:border-[#007ACC]/30 transition-colors group">
                <div className="absolute inset-0 flex">
                    {/* Fake Code Area */}
                    <div className="flex-1 p-6 space-y-4 opacity-50 hidden sm:block">
                        <div className="h-4 w-32 bg-white/10 rounded animate-pulse" />
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
                
                {/* Glow effect on hover */}
                <div className="absolute -inset-1 bg-gradient-to-r from-[#007ACC] to-purple-600 rounded-2xl blur-2xl opacity-0 group-hover:opacity-20 transition-opacity -z-10" />
            </div>
            
            {/* Decorative Elements */}
            <div className="absolute -top-6 -right-6 h-32 w-32 bg-gradient-to-br from-[#007ACC] to-purple-600 rounded-3xl blur-3xl opacity-30 -z-10" />
            <div className="absolute -bottom-6 -left-6 h-40 w-40 bg-gradient-to-tr from-[#007ACC] to-cyan-500 rounded-full blur-3xl opacity-20 -z-10" />
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 px-6 bg-[#0A0A0A]">
        <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16 space-y-4">
                <h2 className="text-4xl font-bold">Engineered for Developers</h2>
                <p className="text-gray-400 max-w-2xl mx-auto text-lg">
                    Built with intelligence, security, and zero context-switching friction.
                </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                <FeatureCard 
                    icon={Brain}
                    title="Semantic Memory"
                    description="Vector search powered by embeddings. Find relevant code in milliseconds, not keywords."
                />
                <FeatureCard 
                    icon={Shield}
                    title="Scoped Security"
                    description="Generate environment-specific keys with granular permissions. Auto-rotation every 90 days."
                />
                <FeatureCard 
                    icon={Lock}
                    title="End-to-End Encryption"
                    description="Your memories stay yours. Local-first architecture with optional sync."
                />
                <FeatureCard 
                    icon={Code2}
                    title="Context Orchestrator"
                    description="Paste meeting notes, logs, or requirements. AI organizes it into actionable memory."
                />
                <FeatureCard 
                    icon={Zap}
                    title="Instant Recall"
                    description="Access your team's collective knowledge directly from VS Code sidebar."
                />
                <FeatureCard 
                    icon={Briefcase}
                    title="Project Compartments"
                    description="Separate personal projects from client work. Auto context-switching by workspace."
                />
            </div>
        </div>
      </section>

      {/* SDK Showcase */}
      <section id="sdk" className="py-24 px-6 bg-[#0D0D0D]">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-bold">Three Powerful SDKs</h2>
            <p className="text-gray-400 text-lg">Everything you need to build with Lanonasis</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <SDKCard 
              icon={Brain}
              title="@lanonasis/memory-client"
              description="Access your vector memory store with semantic search, filtering, and analytics."
            />
            <SDKCard 
              icon={Zap}
              title="@LanOnasis/sdk"
              description="Core orchestrator API. Authentication, context management, and task execution."
            />
            <SDKCard 
              icon={Lock}
              title="@lanonasis/security-sdk"
              description="Generate, rotate, and manage scoped API keys with audit trails."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 px-6 bg-[#050505]">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Brain className="h-5 w-5 text-[#007ACC]" />
                <span className="font-bold text-gray-300">Lanonasis</span>
              </div>
              <p className="text-sm text-gray-500">Your AI Memory Orchestrator</p>
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-3">Product</h3>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="hover:text-white transition-colors cursor-pointer">Features</li>
                <li className="hover:text-white transition-colors cursor-pointer">Pricing</li>
                <li className="hover:text-white transition-colors cursor-pointer">Docs</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-3">Resources</h3>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="hover:text-white transition-colors cursor-pointer">GitHub</li>
                <li className="hover:text-white transition-colors cursor-pointer">Blog</li>
                <li className="hover:text-white transition-colors cursor-pointer">Status</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-3">Company</h3>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="hover:text-white transition-colors cursor-pointer">About</li>
                <li className="hover:text-white transition-colors cursor-pointer">Privacy</li>
                <li className="hover:text-white transition-colors cursor-pointer">Terms</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-sm text-gray-500">
              © 2025 Lanonasis Inc. All rights reserved.
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <a href="#" className="hover:text-white transition-colors">Status</a>
              <a href="#" className="hover:text-white transition-colors">API Docs</a>
              <a href="#" className="hover:text-white transition-colors">Security</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }: { icon: any, title: string, description: string }) {
    return (
        <div className="p-6 rounded-2xl bg-gradient-to-br from-[#151515] to-[#0A0A0A] border border-white/5 hover:border-[#007ACC]/30 transition-all group cursor-pointer hover:shadow-xl hover:shadow-[#007ACC]/10">
            <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-[#007ACC]/20 to-[#0E639C]/20 flex items-center justify-center mb-4 group-hover:from-[#007ACC]/30 group-hover:to-[#0E639C]/30 transition-all">
                <Icon className="h-6 w-6 text-[#007ACC] group-hover:text-white transition-colors" />
            </div>
            <h3 className="text-lg font-bold mb-2 group-hover:text-white transition-colors">{title}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
        </div>
    )
}

function SDKCard({ icon: Icon, title, description }: { icon: any, title: string, description: string }) {
    return (
        <div className="p-6 rounded-xl bg-gradient-to-br from-[#1E1E1E] to-[#151515] border border-[#2D2D2D] hover:border-[#007ACC]/50 transition-all group">
          <div className="flex items-center gap-3 mb-4">
            <Icon className="h-5 w-5 text-[#007ACC]" />
            <code className="text-sm font-mono text-[#007ACC]">{title}</code>
          </div>
          <p className="text-sm text-gray-400 mb-4">{description}</p>
          <Button size="sm" variant="ghost" className="text-[#007ACC] hover:text-white group gap-2">
            Learn More
            <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
    )
}
