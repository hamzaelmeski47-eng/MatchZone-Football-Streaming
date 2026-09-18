import app from "./app";
import { logger } from "./lib/logger";
import { env } from "./config/env";
import { initializeDatabase } from "./database/mysql";

async function start() {
  await initializeDatabase();

  app.listen(env.port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port: env.port }, "MatchZone API server listening");
  });
}

start().catch((err) => {
  logger.error({ err }, "Unable to start MatchZone API server");
  process.exit(1);
});
