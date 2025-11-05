import { createServer } from "http";
import app from "./index";
import { setupVite, serveStatic } from "./vite";

const PORT = process.env.PORT || 5000;
const server = createServer(app);

if (process.env.NODE_ENV === "production") {
  serveStatic(app);
} else {
  await setupVite(app, server);
}

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
