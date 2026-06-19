import path from "path";
import type { Server } from "http";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { app } from "./app";
import { initializeDatabase } from "./src/lib/db";

const PORT = parseInt(process.env.PORT ?? "3000", 10);

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
