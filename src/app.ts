import "reflect-metadata";
import "dotenv/config.js";

import express, { Express, Request, Response } from "express";
import cors from "cors";

// middlewares
import httpLogger from "@middlewares/httpLogger.js";
import errorHandler from "@middlewares/errorHandler.js";

// routes
import v1Router from "@routes/v1/router.js";
import internalsRouter from "@routes/internals/router.js";

// logger
import logger, { Level } from "@utils/logger.js";

// config
import config, { Environments } from "@config";
import { botDataSource, dashDataSource } from "@config/orm";

const app: Express = express();
const PORT: number | string = config.port ? Number(config.port) : 5780;

// initialize data sources (typeorm)
const initializeDataSources = async (): Promise<void> => {
  await botDataSource.initialize();
  logger(Level.Info, "Connection to bot database initialized");

  await dashDataSource.initialize();
  logger(Level.Info, "Connection to dash database initialized");
};

// start app
const main = async (): Promise<void> => {
  await initializeDataSources();

  app.use(httpLogger);

  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());

  app.use(
    express.raw({ verify: (req: Request, _res: Response, buf: Buffer) => (req.rawBody = buf) })
  );

  app.use(
    cors({
      origin: "*",
      methods: ["GET", "POST"],
      allowedHeaders: ["origin", "X-Requested-With", "Content-Type", "Accept", "Authorization"],
    })
  );

  /*
   * TODO-01: Switch to a global "internal" prefix
   */
  app.use("/", internalsRouter);
  app.use("/v1", v1Router);

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ message: "Resource Not Found" });
  });

  app.use(errorHandler);

  app.listen(PORT, () => logger(Level.Info, `Server running on port ${PORT}`));
};

main()
  .then(async () => {
    if (config.environment === Environments.Development) {
      const endpoints = (await import("express-list-endpoints")).default;
      console.log(endpoints(app));
    }
  })
  .catch((reason: any): void => {
    logger(Level.Error, reason);
    process.exit(1);
  });
