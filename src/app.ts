import express, { Express, Request, Response } from "express";
import cors from "cors";

// Middleware
import httpLogger from "@middlewares/httpLogger.js";
import errorHandler from "@middlewares/errorHandler.js";

// Router
import v1Router from "@routes/v1/router.js";
import internalsRouter from "@routes/internals/router.js";

const app: Express = express(); // Creates Express

app.use(httpLogger); // Logs HTTP requests

app.use(express.urlencoded({ extended: false })); // Parses URL-encoded bodies
app.use(express.json()); // Parses JSON bodies

// Middleware to capture raw request body
app.use(
  express.raw({ verify: (req: Request, _res: Response, buf: Buffer) => (req.rawBody = buf) })
);

// Configures CORS policy
app.use(
  cors({
    origin: "*", // Allows all origins
    methods: ["GET", "POST"], // Allowed methods
    allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization"], // Allowed headers
  })
);

// Route setup
app.use("/", internalsRouter);
app.use("/v1", v1Router);

// Redirect to public API
app.get("/", (_req: Request, res: Response) => res.redirect("/v1"));

// Not Found handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: "Resource Not Found" });
});

// Global error handling
app.use(errorHandler);

export default app;
