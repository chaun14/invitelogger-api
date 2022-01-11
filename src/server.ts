/** source/server.ts */
import http from "http";
import express, { ErrorRequestHandler, Express, NextFunction } from "express";
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

  const router: Express = express();

  /** Logging */
  router.use(morgan("dev"));
  /** Parse the request */
  router.use(express.urlencoded({ extended: false }));
  
  // retrieve raw body for webhook validation
  router.use(
    bodyParser.json({
      verify: function (req, res, buf, encoding) {
        req.rawBody = buf;
      },
    })
  );
  
  /** Takes care of JSON data */
  router.use(express.json());
  
  /** RULES OF OUR API */
  router.use((req, res, next) => {
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
  router.use("/", payments);
  router.use("/", votes);
  router.use("/", dummy);
  router.use("/invites/", invites);
  
  /** Not found */
  router.use((req, res, next) => {
    const error = new Error("not found");
    return res.status(404).json({
      message: error.message,
    });
  });

  /** Error handling */
  router.use(errorHandler);

  /** Server */
  const httpServer = http.createServer(router);
  const PORT: number | string = process.env.PORT ? process.env.PORT : 5780;
  httpServer.listen(PORT, () => console.log(`The server is running on port ${PORT}`));   
}

main().catch((reason: any) => {
  console.log(reason)
  process.exit(1)
})