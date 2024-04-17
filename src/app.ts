import "reflect-metadata";
import "dotenv/config.js";

import express, { Express, NextFunction, Request, Response } from "express";

// middlewares
import httpLogger from "@middlewares/httpLogger.js";
import errorHandler from "@middlewares/errorHandler.js";

// routes
import v1 from "@routes/v1.js";
import payments from "@routes/payments/tebex.js";
import votes from "@routes/votes/index.js";
import internal from "@routes/internal/index.js";
import migration from "@routes/integrations/index.js";

// logger
import logger, { Level } from "@utils/logger.js";

// config
import config from "@config";
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

  app.use((req: Request, _res: Response, next: NextFunction): void => {
    req.rawBody = Buffer.alloc(0);

    req.on("data", (chunk): void => {
      req.rawBody = Buffer.concat([req.rawBody, chunk]);
    });

    next();
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
      "Access-Control-Allow-Headers",
      "origin, X-Requested-With, Content-Type, Accept, Authorization"
    );

    if (req.method === "OPTIONS") {
      res.header("Access-Control-Allow-Methods", "GET, POST");
      res.status(200).json({});
    } else {
      next();
    }
  });

  app.use("/", payments);
  app.use("/", votes);
  app.use("/v1", v1);
  app.use("/internal", internal);
  app.use("/integrations", migration);
  app.get("/", (_req: Request, res: Response) => res.redirect("/v1"));

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ message: "not found" });
  });

  app.use(errorHandler);

  app.listen(PORT, () => logger(Level.Info, `Server running on port ${PORT}`));
};

main().catch((reason: any): void => {
  logger(Level.Error, reason);
  process.exit(1);
});
