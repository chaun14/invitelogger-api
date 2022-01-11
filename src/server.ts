/** source/server.ts */
import http from "http";
import express, { ErrorRequestHandler, Express, NextFunction, Router } from "express";
import { createConnection } from "typeorm";
import dotEnv from "dotenv";
import "reflect-metadata";

// middlewares
import errorHandler from "./middlewares/errorHandler";
import morgan from "morgan";
import bodyParser from "body-parser";

// routes
import v1 from "./routes/v1";
import payments from "./routes/payments/tebex";
import votes from "./routes/votes/index";

dotEnv.config();

async function main() {
  await createConnection("bot");
  console.log("Connection to bot database created");
  await createConnection("dash");
  console.log("Connection to dash database created");

  const app: Express = express();

  /** Logging */
  app.use(morgan("dev"));
  /** Parse the request */
  app.use(express.urlencoded({ extended: false }));

  // retrieve raw body for webhook validation
  app.use(
    bodyParser.json({
      verify: function (req, res, buf, encoding) {
        req.rawBody = buf;
      },
    })
  );

  /** Takes care of JSON data */
  app.use(express.json());

  /** RULES OF OUR API */
  app.use((req, res, next) => {
    // set the CORS policy
    res.header("Access-Control-Allow-Origin", "*");
    // set the CORS headers
    res.header("Access-Control-Allow-Headers", "origin, X-Requested-With,Content-Type,Accept, Authorization");
    // set the CORS method headers
    if (req.method === "OPTIONS") {
      res.header("Access-Control-Allow-Methods", "GET PATCH DELETE POST");
      return res.status(200).json({});
    }
    next();
  });

  /** Routes */
  app.use("/", payments);
  app.use("/", votes);
  app.use("/v1", v1);

  /** Not found */
  app.use((req, res, next) => {
    const error = new Error("not found");
    return res.status(404).json({
      message: error.message,
    });
  });

  /** Error handling */
  app.use(errorHandler);

  /** Server */
  const httpServer = http.createServer(app);
  const PORT: number | string = process.env.PORT ? process.env.PORT : 5780;
  httpServer.listen(PORT, () => console.log(`The server is running on port ${PORT}`));
}

main().catch((reason: any) => {
  console.log(reason);
  process.exit(1);
});
