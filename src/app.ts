/** source/server.ts */
import express, { Express, NextFunction, Request, Response } from "express";
import { createConnection } from "typeorm";
import "dotenv/config.js";
import "reflect-metadata";

// middlewares
import errorHandler from "@middlewares/errorHandler.js";
import morgan from "morgan";

// routes
import v1 from "@routes/v1.js";
import payments from "@routes/payments/tebex.js";
import votes from "@routes/votes/index.js";
import internal from "@routes/internal/index.js";
import migration from "@routes/integrations/index.js";

async function main(): Promise<void> {
  await createConnection("bot");
  console.log("Connection to bot database created");
  await createConnection("prodbot");
  console.log("Connection to main bot database created");
  await createConnection("dash");
  console.log("Connection to dash database created");

  const app: Express = express();

  /** Logging */
  app.use(morgan("dev"));
  /** Parse the request */
  app.use(express.urlencoded({ extended: false }));

  // retrieve raw body for webhook validation
  app.use((req: Request, _res: Response, next: NextFunction): void => {
    req.rawBody = Buffer.alloc(0);

    req.on("data", (chunk): void => {
      req.rawBody = Buffer.concat([req.rawBody, chunk]);
    });

    next();
  });

  app.use(express.text());

  /** Takes care of JSON data */
  app.use(express.json());

  /** RULES OF OUR API */
  app.use((req: Request, res: Response, next: NextFunction): void => {
    // set the CORS policy
    res.header("Access-Control-Allow-Origin", "*");
    // set the CORS headers
    res.header(
      "Access-Control-Allow-Headers",
      "origin, X-Requested-With,Content-Type,Accept, Authorization"
    );
    // set the CORS method headers
    if (req.method === "OPTIONS") {
      res.header("Access-Control-Allow-Methods", "GET PATCH DELETE POST");
      res.status(200).json({});
      return;
    }
    next();
  });

  /** Routes */
  app.use("/", payments);
  app.use("/", votes);
  app.use("/v1", v1);
  app.use("/internal", internal);
  app.use("/integrations", migration);
  app.get("/", (_req: Request, res: Response) => res.redirect("/v1"));

  /** Not found */
  app.use((_req: Request, res: Response): void => {
    const error: Error = new Error("not found");
    res.status(404).json({
      message: error.message,
    });

    return;
  });

  /** Error handling */
  app.use(errorHandler);

  /** Server */
  const PORT: number | string = process.env.PORT ? process.env.PORT : 5780;
  app.listen(PORT, () => console.log(`The server is running on port ${PORT}`));
}

main().catch((reason: any): void => {
  console.log(reason);
  process.exit(1);
});
