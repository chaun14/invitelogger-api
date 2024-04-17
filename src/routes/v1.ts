import tokenAuth from "../middlewares/tokenAuth.js";
import { Router, Request, Response } from "express";
import checkAuth from "./misc/index.js";
import invites from "./invites/index.js";

const v1: Router = Router();

// public api main page
v1.get("/", (_req: Request, res: Response): void => {
  res.send({
    message:
      "Welcome to inviteLogger api. Find our documentation here: https://developers.invitelogger.me",
  });
});

// authenticate requests
v1.use(tokenAuth);

// public router
v1.use("/", checkAuth);
v1.use("/invites/", invites);

export default v1;
