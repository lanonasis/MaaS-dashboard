
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Mail } from "lucide-react";

const Github = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z"
    />
  </svg>
);

const Twitter = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const Linkedin = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.063 2.063 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0z" />
  </svg>
);

export const Footer = () => {
  const year = new Date().getFullYear();
  
  return (
    <footer className="border-t border-gray-200/40 dark:border-gray-700/40 bg-background py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand Section */}
          <div className="md:col-span-1">
            <a href="https://lanonasis.com" className="flex items-center gap-2 text-xl font-semibold tracking-tight mb-4">
              <span className="text-primary">LanOnasis</span>
              <span className="text-foreground">Platform</span>
            </a>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">
              A Memory-as-a-Service platform for AI agents and developers — persistent, vector-enabled memory with semantic search, secure API key management, and MCP integration.
            </p>
            <div className="flex items-center space-x-4">
              <a
                href="#"
                className="text-muted-foreground hover:text-foreground transition-colors duration-300"
                aria-label="GitHub"
              >
                <Github className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="text-muted-foreground hover:text-foreground transition-colors duration-300"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="text-muted-foreground hover:text-foreground transition-colors duration-300"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-5 w-5" />
              </a>
              <a
                href="mailto:info@lanonasis.com"
                className="text-muted-foreground hover:text-foreground transition-colors duration-300"
                aria-label="Email"
              >
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Links Sections */}
          <div>
            <h3 className="text-sm font-medium uppercase tracking-wider text-foreground mb-4">
              Platform
            </h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://lanonasis.com#ecosystem"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                >
                  Platform Features
                </a>
              </li>
              <li>
                <a
                  href="https://lanonasis.com#pricing"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                >
                  Pricing
                </a>
              </li>
              <li>
                <a
                  href="https://lanonasis.com#roadmap"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                >
                  Roadmap
                </a>
              </li>
              <li>
                <a
                  href="https://api.lanonasis.com/"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                >
                  Status
                </a>
              </li>
              <li>
                <a
                  href="https://docs.lanonasis.com"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                >
                  API Documentation
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-medium uppercase tracking-wider text-foreground mb-4">
              Company
            </h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://lanonasis.com#story"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                >
                  About Us
                </a>
              </li>
              <li>
                <a
                  href="https://lanonasis.com#contact"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                >
                  Careers
                </a>
              </li>
              <li>
                <a
                  href="https://lanonasis.com#blog"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                >
                  Blog
                </a>
              </li>
              <li>
                <a
                  href="https://lanonasis.com#press"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                >
                  Press
                </a>
              </li>
              <li>
                <a
                  href="https://lanonasis.com#partners"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                >
                  Partners
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-medium uppercase tracking-wider text-foreground mb-4">
              Resources
            </h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://docs.lanonasis.com"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                >
                  Documentation
                </a>
              </li>
              <li>
                <a
                  href="https://docs.lanonasis.com/guides"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                >
                  Guides
                </a>
              </li>
              <li>
                <a
                  href="https://lanonasis.com#contact"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                >
                  Support
                </a>
              </li>
              <li>
                <a
                  href="https://lanonasis.com#security"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                >
                  Security
                </a>
              </li>
              <li>
                <a
                  href="https://lanonasis.com/privacy"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="https://lanonasis.com/terms"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                >
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-gray-200/40 dark:border-gray-700/40 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-muted-foreground mb-4 md:mb-0">
            © {year} LanOnasis. All rights reserved.
          </p>
          <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-6">
            <a
              href="https://lanonasis.com/privacy"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
            >
              Privacy Policy
            </a>
            <a
              href="https://lanonasis.com/terms"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
            >
              Terms of Service
            </a>
            <a
              href="https://lanonasis.com/cookies"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
            >
              Cookie Policy
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
