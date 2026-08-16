import path from "path";
import type { Server } from "http";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { app } from "./app";
import { initializeDatabase } from "./src/lib/db";

const PORT = parseInt(process.env.PORT ?? "3000", 10);

// Without these, any error that escapes an await/try-catch chain anywhere in
// the app (a stray rejection deep in a dependency, a dropped DB connection,
// etc.) silently kills the *entire* Node process — Node's default behavior
// for unhandled rejections since v15. That looks like "the server randomly
// crashed" with zero diagnostic info, and in dev, tsx watch quietly restarts
// it a moment later, making it look like nothing happened. Logging loudly
// here turns that into an actionable stack trace instead of a mystery.
process.on("unhandledRejection", (reason) => {
  console.error("[FATAL] Unhandled promise rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("[FATAL] Uncaught exception:", error);
  // The process may be in a corrupted state after a truly uncaught throw —
  // exit deliberately rather than keep serving requests on shaky ground.
  // In dev this gets picked back up immediately by `tsx watch`.
  process.exit(1);
});

async function start(): Promise<void> {
  try {
    await initializeDatabase();

    const server: Server = app.listen(PORT, () => {
      console.info(`API server running on http://localhost:${PORT}`);
      console.info(`Health check: http://localhost:${PORT}/health`);
    });

    const shutdown = (signal: string): void => {
      console.info(`Received ${signal}, shutting down API server...`);
      server.close(() => process.exit(0));
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

start();
