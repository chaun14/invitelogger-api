import "reflect-metadata"; // for decorators
import "dotenv/config.js"; // .env file

import { prodDataSource, dashDataSource, botDataSource } from "@config/orm";
import config, { Environments } from "@config";

import logger, { Level } from "@utils/logger.js";

import app from "./app.js";

const PORT: number | string = config.port ? Number(config.port) : 5780;

// Initialize TypeORM data sources
const initializeDataSources = async (): Promise<void> => {
  if (config.environment === Environments.Production) {
    await prodDataSource.initialize();
    logger(Level.Info, "Connection to prod database initialized");
  }

  await dashDataSource.initialize();
  logger(Level.Info, "Connection to dash database initialized");

  await botDataSource.initialize();
  logger(Level.Info, "Connection to bot database initialized");
};

// starts the server
const startServer = async (): Promise<void> => {
  await initializeDataSources();

  app.listen(PORT, () => logger(Level.Info, `Server running on port ${PORT}`));
};

startServer()
  .then(async () => {
    if (config.environment === Environments.Development) {
      // Log endpoints only in development mode
      const endpoints = (await import("express-list-endpoints")).default;
      console.log(endpoints(app));
    }
  })
  .catch((reason: any): void => {
    logger(Level.Error, reason); // Log any startup errors
    process.exit(1);
  });
