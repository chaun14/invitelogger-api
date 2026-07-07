import { Router } from "express";

import {
  handleTopGG,
  handleDLIst,
  handleFindMeABotSpace,
  handleVCode,
  handleWumpus,
} from "@controllers/internals/votes/votesController.js";

const votesRouter = Router();

votesRouter.post("/topgg", handleTopGG);
votesRouter.post("/vcodes", handleVCode);
votesRouter.post("/dlist", handleDLIst);
votesRouter.post("/wumpus", handleWumpus);
votesRouter.post("/findmeabotspace", handleFindMeABotSpace);

export default votesRouter;
