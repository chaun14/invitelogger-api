/** source/server.ts */
import http from "http";
import express, { Express } from "express";
import morgan from "morgan";
import bodyParser from "body-parser";
import dotEnv from "dotenv";

// routes
import payments from "./routes/payments/tebex";
import votes from "./routes/votes/index";

dotEnv.config();
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

/** Error handling */
router.use((req, res, next) => {
  const error = new Error("not found");
  return res.status(404).json({
    message: error.message,
  });
});

/** Server */
const httpServer = http.createServer(router);
const PORT: number | string = process.env.PORT ? process.env.PORT : 5780;
httpServer.listen(PORT, () => console.log(`The server is running on port ${PORT}`));
