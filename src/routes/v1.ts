import { Router } from "express";
import dummy from "./dummy";
import invites from "./invites";

const v1: Router = Router();

v1.use("/", dummy);
v1.use("/invites/", invites);

export = v1;
