import tokenAuth from "../middlewares/tokenAuth";
import { Router } from "express";
import checkAuth from "./misc";
import invites from "./invites";

const v1: Router = Router();

// public api main page
v1.get("/", (req, res) => {
  res.send({
    message: "Welcome to inviteLogger api. Find our documentation here: https://developers.invitelogger.me",
  });
});

// authenticate requests
v1.use(tokenAuth);

// public router
v1.use("/", checkAuth);
v1.use("/invites/", invites);

export = v1;
