import { LucideIcon } from "lucide-react";

export interface Memory {
  id: string;
  title: string;
  type: "todo" | "code" | "docs" | "status" | "workflow";
  date: Date;
  tags: string[];
  content: string;
  icon: LucideIcon;
}

export interface ApiKey {
  id: string;
  name: string;
  scope: string;
  created: string;
  lastUsed: string;
}
