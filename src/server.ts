import "reflect-metadata"; // for decorators
import "dotenv/config.js"; // .env file

import { prodDataSource, dashDataSource, botDataSource } from "@config/orm";
import config, { Environments } from "@config";

import logger, { Level } from "@utils/logger.js";

import app from "./app.js";

const PORT: number | string = config.port ? Number(config.port) : 5780;

// Initialize TypeORM data sources
const initializeDataSources = async (): Promise<void> => {
  if (config.environment === Environments.PRODUCTION) {
    await prodDataSource.initialize();
    logger(Level.INFO, "Connection to prod database initialized");
  }

  await dashDataSource.initialize();
  logger(Level.INFO, "Connection to dash database initialized");

  await botDataSource.initialize();
  logger(Level.INFO, "Connection to bot database initialized");
};

// starts the server
const startServer = async (): Promise<void> => {
  await initializeDataSources();

  app.listen(PORT, () => logger(Level.INFO, `Server running on port ${PORT}`));
};

startServer()
  .then(async () => {
    if (config.environment === Environments.DEVELOPMENT) {
      // Log endpoints only in development mode
      const endpoints = (await import("express-list-endpoints")).default;
      console.log(endpoints(app));
    }
  })
  .catch((reason: any): void => {
    logger(Level.ERROR, reason); // Log any startup errors
    process.exit(1);
  });
