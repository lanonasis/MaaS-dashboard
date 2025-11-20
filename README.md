# Lanonasis Memory 🧠

**Your AI-Powered Development Context Orchestrator**

Lanonasis Memory is an intelligent side-panel interface designed for developers to manage AI interactions, code snippets, and project context through a vector-based memory system. It bridges the gap between your ephemeral thoughts and your persistent codebase.

![Lanonasis Dashboard Mockup](attached_assets/Screenshot%202025-11-14%20at%2016.52.51_1763599232942.png)

## 🚀 Key Features

### 🧠 Intelligent Memory Bank
- **Vector Storage**: Context is stored semantically, not just keyword-matched.
- **Snippet Management**: Save code blocks, requirements, and docs with one click.
- **Tagging System**: Organize memories by project, type (TODO, Code, Docs), or custom tags.

### 🤖 AI Orchestrator
- **Context Aware**: The AI understands your current workspace and suggests relevant memories.
- **Task Execution**: Ask the orchestrator to "Summarize these meeting notes" or "Find the API key for staging."
- **Smart Paste**: The bottom chat interface doubles as a context ingestion engine.

### 🔒 Enterprise Security
- **Scoped API Keys**: Create and manage environment-specific keys (Dev, Staging, Prod) directly within the UI.
- **Local-First Architecture**: Options for local vector storage to keep sensitive data on your machine.

### ⚡ Seamless Integration
- **VS Code Native**: Designed to live in your sidebar (`Ctrl+Shift+P -> Lanonasis: Open`).
- **Web Dashboard**: Access your memory bank from any browser for remote work.
- **Chrome Extension**: Clip context from documentation sites directly into your memory bank.

## 🎨 Design Aesthetics

Built with a **Developer-First** design philosophy:

- **Palette**: Dark Mode native (`#1E1E1E` background) with VS Code Blue (`#007ACC`) accents.
- **Typography**: `JetBrains Mono` for code legibility, `Inter` for UI elements.
- **Interaction**: Subtle `framer-motion` animations for card entries and hover states.
- **Components**:
    - **Memory Cards**: Interactive cards with quick-copy actions and metadata badges.
    - **Collapsible Sections**: "Memory Assistant" vs "Memory Bank" separation.
    - **Chat/Input**: A unified interface for prompting and pasting context.

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Framer Motion
- **Routing**: Wouter
- **State**: TanStack Query
- **UI Library**: Radix UI (Headless), Lucide Icons

## 📦 Getting Started

1.  **Install Dependencies**:
    ```bash
    npm install
    ```
2.  **Run Development Server**:
    ```bash
    npm run dev
    ```
3.  **View the Prototype**:
    - Landing Page: `http://localhost:5000/`
    - Dashboard View: `http://localhost:5000/dashboard`
    - VS Code Mockup: `http://localhost:5000/vscode`

## 🔮 Roadmap

- [ ] **Team Sync**: Shared memory banks for engineering teams.
- [ ] **Linear Integration**: Auto-create memories from Linear issues.
- [ ] **Local LLM Support**: Run the orchestrator completely offline using Ollama.

---

*Concept & Design by Lanonasis Design Engineering Team*
