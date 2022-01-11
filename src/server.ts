/** source/server.ts */
import http from "http";
import express, { ErrorRequestHandler, Express, NextFunction, Router } from "express";
import morgan from "morgan";
import bodyParser from "body-parser";
import dotEnv from "dotenv";
import "reflect-metadata";

// routes
import payments from "./routes/payments/tebex";
import votes from "./routes/votes/index";
import dummy from "./routes/dummy";
import invites from "./routes/invites";
import { createConnection } from "typeorm";
import errorHandler from "./middlewares/errorHandler";

dotEnv.config();

async function main() {
  await createConnection("bot")
  console.log("Connection to bot database created")
  await createConnection("dash")
  console.log("Connection to dash database created")

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

  const v1: Router = express.Router();
  
  /** RULES OF OUR API */
  v1.use((req, res, next) => {
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
  v1.use("/", payments);
  v1.use("/", votes);
  v1.use("/", dummy);
  v1.use("/invites/", invites);

  app.use('/v1', v1);
  
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
  console.log(reason)
  process.exit(1)
})