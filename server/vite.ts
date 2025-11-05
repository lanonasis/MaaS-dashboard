import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function setupVite(app: express.Application, server: any) {
  const vite = await createViteServer({
    server: {
      middlewareMode: true,
      hmr: { server }
    },
    appType: "spa"
  });

  app.use(vite.middlewares);

  app.use((req, res, next) => {
    const url = req.originalUrl;

    if (url.startsWith('/api')) {
      return next();
    }

    vite.transformIndexHtml(url, fs.readFileSync(path.resolve(__dirname, "..", "index.html"), "utf-8"))
      .then((template) => {
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      })
      .catch((e) => {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      });
  });
}

export function serveStatic(app: express.Application) {
  const distPath = path.resolve(__dirname, "..", "dist", "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
