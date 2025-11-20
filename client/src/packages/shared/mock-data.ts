import { Terminal, FileCode, Hash, Zap } from "lucide-react";
import { Memory, ApiKey } from "./types";

export const MOCK_MEMORIES: Memory[] = [
  {
    id: "1",
    title: "Onasis-CORE - Development TODO",
    type: "todo",
    date: new Date(2025, 10, 14),
    tags: ["2"],
    content: "Implement vector storage for context persistence.",
    icon: Terminal
  },
  {
    id: "2",
    title: "Code from /vscode-api-guidelines.md",
    type: "code",
    date: new Date(2025, 10, 14),
    tags: ["2"],
    content: "Follow the strict API guidelines for extension development.",
    icon: FileCode
  },
  {
    id: "3",
    title: "Code from /lanonasis-maas/.kiro/ide-extension-ux-enhancement/requirements.md",
    type: "code",
    date: new Date(2025, 10, 14),
    tags: ["2"],
    content: "Requirements for the UX enhancement of the IDE extension.",
    icon: FileCode
  },
  {
    id: "4",
    title: "CLI v3.2.13+ Features & Capabilities (Nov 2025)",
    type: "docs",
    date: new Date(2025, 10, 13),
    tags: ["6"],
    content: "New CLI features include auto-completion and faster indexing.",
    icon: Hash
  },
  {
    id: "5",
    title: "Documentation Status & Gap Analysis (Nov 2025)",
    type: "docs",
    date: new Date(2025, 10, 13),
    tags: ["5"],
    content: "Gap analysis shows missing docs for the new vector API.",
    icon: Hash
  },
  {
    id: "6",
    title: "MCP Server Status - 17 Tools Production Ready (Nov 2025)",
    type: "status",
    date: new Date(2025, 10, 13),
    tags: ["6"],
    content: "17 tools are now production ready on the MCP server.",
    icon: Zap
  },
  {
    id: "7",
    title: "CI/CD & Workflow Improvements (Nov 2025)",
    type: "workflow",
    date: new Date(2025, 10, 13),
    tags: ["6"],
    content: "Improved CI/CD pipelines with faster build times.",
    icon: Terminal
  }
];

export const MOCK_API_KEYS: ApiKey[] = [
  { id: "key_1", name: "Production Key", scope: "read:write", created: "2025-10-01", lastUsed: "Just now" },
  { id: "key_2", name: "Development Key", scope: "read", created: "2025-11-15", lastUsed: "2 hours ago" },
];
