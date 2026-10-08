import app from "./app";
import { logger } from "./lib/logger";
import { env } from "./config/env";
import { initializeDatabase, isDatabaseConnected } from "./database/mysql";
import { refreshRealFootballData } from "./services/football.service";

async function start() {
  await initializeDatabase();
  if (isDatabaseConnected) {
    logger.info("MySQL database initialized successfully");
  } else {
    logger.warn("MySQL database is not connected; MatchZone is operating with real live football API data");
  }

  // Pre-fetch real matches on boot
  refreshRealFootballData().catch((err) => {
    logger.warn({ err }, "Initial real match fetch encountered an issue");
  });

  app.listen(env.port, () => {
    logger.info({ port: env.port }, "MatchZone API server listening with real football data engine");
  });
}

start().catch((err) => {
  logger.error({ err }, "Unable to start MatchZone API server");
  process.exit(1);
});

