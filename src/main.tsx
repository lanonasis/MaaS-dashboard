import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Enhanced extension error detection - ONLY suppress errors that are DEFINITELY from extensions
// Be very specific to avoid blocking legitimate app errors (like Supabase errors)
const isExtensionError = (
  error: string | Error | unknown,
  filename?: string
): boolean => {
  const msg =
    typeof error === "string"
      ? error
      : (error as Error)?.message || String(error);
  const file = filename || (error as Error)?.stack || "";
  const fullCheck = msg + " " + file;

  // Only suppress if we have STRONG evidence it's from an extension
  // Check for extension URLs in filename/stack FIRST (most reliable)
  const hasExtensionUrl =
    file?.includes("chrome-extension://") ||
    file?.includes("moz-extension://") ||
    file?.includes("safari-extension://");

  if (hasExtensionUrl) {
    return true; // Definitely from extension
  }

  // Check for specific extension error patterns (but be careful not to match Supabase errors)
  const isExtensionPattern =
    msg?.includes("No tab with id") ||
    msg?.includes("jamToggleDumpStore") ||
    msg?.includes("runtime.lastError") ||
    msg?.includes("message port closed") ||
    msg?.includes("Receiving end does not exist") ||
    (msg?.includes("mobx-state-tree") && !msg?.includes("supabase")) ||
    (msg?.includes("detectedLibs") && !msg?.includes("supabase")) ||
    (msg?.includes("ScreenshotMachineModel") && !msg?.includes("supabase")) ||
    (msg?.includes("heuristicsRedefinitions") && !msg?.includes("supabase")) ||
    (msg?.includes("extensionState") && !msg?.includes("supabase")) ||
    (msg?.includes("utils.js") && !msg?.includes("supabase"));

  // Only suppress if it's an extension pattern AND not from our app
  if (isExtensionPattern) {
    // Double-check: if it mentions Supabase, auth, session, or our app domains, don't suppress
    const isAppRelated =
      fullCheck.includes("supabase") ||
      fullCheck.includes("auth") ||
      fullCheck.includes("session") ||
      fullCheck.includes("lanonasis") ||
      fullCheck.includes("/src/") ||
      fullCheck.includes("dashboard");

    return !isAppRelated; // Suppress only if NOT app-related
  }

  // Check for service worker errors (but only if not from our app)
  if (
    file?.includes("sw.js") &&
    !file?.includes("/src/") &&
    !file?.includes("dashboard")
  ) {
    return true;
  }

  return false; // Default: don't suppress (let legitimate errors through)
};

// Global error handler to filter out Chrome extension errors
// IMPORTANT: Only suppress errors that are DEFINITELY from extensions
// Never suppress Supabase or app errors
window.addEventListener("error", (event) => {
  const isExt = isExtensionError(event.message, event.filename);

  // Only prevent default for DEFINITE extension errors
  // If there's any doubt (e.g., mentions Supabase, auth, session), let it through
  if (isExt) {
    // Double-check it's not app-related before suppressing
    const errorContext = (event.message || "") + " " + (event.filename || "");
    const isAppRelated =
      errorContext.includes("supabase") ||
      errorContext.includes("auth") ||
      errorContext.includes("session") ||
      errorContext.includes("lanonasis") ||
      errorContext.includes("/src/") ||
      errorContext.includes("dashboard");

    if (!isAppRelated) {
      event.preventDefault(); // Only suppress if definitely extension and not app-related
    }
  }
  // If not extension error, let it propagate normally (don't prevent default)
});

// Handle unhandled promise rejections from extensions
// IMPORTANT: Only suppress rejections that are DEFINITELY from extensions
// Never suppress Supabase or app rejections
window.addEventListener("unhandledrejection", (event) => {
  const error = event.reason;
  const errorMsg =
    typeof error === "string" ? error : error?.message || String(error || "");
  const errorStack = error?.stack || "";
  const isExt = isExtensionError(errorMsg, errorStack);

  // Only prevent default for DEFINITE extension rejections
  // If there's any doubt (e.g., mentions Supabase, auth, session), let it through
  if (isExt) {
    // Double-check it's not app-related before suppressing
    const errorContext = errorMsg + " " + errorStack;
    const isAppRelated =
      errorContext.includes("supabase") ||
      errorContext.includes("auth") ||
      errorContext.includes("session") ||
      errorContext.includes("lanonasis") ||
      errorContext.includes("/src/") ||
      errorContext.includes("dashboard");

    if (!isAppRelated) {
      event.preventDefault(); // Only suppress if definitely extension and not app-related
    }
  }
  // If not extension rejection, let it propagate normally (don't prevent default)
});

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
