import { Votes } from "../entity/dash/Votes.js";
import { Request, Response } from "express";
import { getConnection } from "typeorm";
import jsonwebtoken from "jsonwebtoken";

const handleTopggVote = async (req: Request, res: Response): Promise<void> => {
  const authToken = req.get("authorization");
  if (!authToken) {
    res.status(400).json({ message: "You didn't provide an 'Authorization' header!" });
    return;
  }

  if (authToken !== process.env.TOPGG_VOTE_WEBHOOK) {
    res.status(403).json({ message: "You didn't provide the correct authorization key!" });
    return;
  }

  if (!req.body) {
    res.status(400).json({ message: "You didn't provide any data!" });
    return;
  }

  res.status(200).json({ message: "Vote received!" });

  // console.log(req.body);

  if (req.body.type === "test") {
    console.log("Test vote received, not adding to database.", req.body);
    return;
  }

  await getConnection("dash")
    .manager.insert(Votes, {
      user_id: req.body.user,
      bot_id: req.body.bot,
      weekend: req.body.isWeekend,
    })
    .then((data) =>
      console.log("New vote top.gg by " + req.body.user + " #" + data.identifiers[0].id)
    )
    .catch((err) => console.error(err.message));
};

const handleVcodesVote = async (req: Request, res: Response): Promise<void> => {
  const authToken = req.get("authorization");
  if (!authToken) {
    res.status(400).json({ message: "You didn't provide an 'Authorization' header!" });
    return;
  }
  if (authToken !== process.env.VCODES_VOTE_WEBHOOK) {
    res.status(403).json({ message: "You didn't provide the correct authorization key!" });
    return;
  }
  if (!req.body) {
    res.status(400).json({ message: "You didn't provide any data!" });
    return;
  }

  res.status(200).json({ message: "Vote received thanks !" });
  let botID = req.params.bot_id;
  if (!botID) botID = "499595256270946326";

  if (req.body.trigger !== "vote") return;

  // console.log(req.body);

  if (req.body.test) {
    console.log("Vcodes Test vote received, not adding to database.", req.body);
    return;
  }
  await getConnection("dash")
    .manager.insert(Votes, {
      user_id: req.body.user.id,
      bot_id: botID,
      weekend: false,
      platform: "vcodes",
    })
    .then(() =>
      console.log("New vote vcodes.xyz by " + req.body.user.tag + " (" + req.body.user.id + ") ")
    )
    .catch((err) => console.error(err.message));
};

const handleDlistVote = async (req: Request, res: Response): Promise<void> => {
  console.log(req.body);

  if (!req.body) {
    res.status(400).json({ message: "You didn't provide a body to decode !" });
    return;
  }

  // validate the jwt again our secret
  try {
    interface DlistReq {
      bot_id: string;
      user_id: string;
      query: any;
      is_test: boolean;
    }

    const decoded: DlistReq = jsonwebtoken.verify(
      req.body,
      process.env.DLIST_VOTE_WEBHOOK as string
    ) as DlistReq;

    if (decoded.is_test) {
      res.status(200).json({ message: "Test vote received thanks !" });
      console.log("Dlist Test vote received, not adding to database.", decoded);
      return;
    }

    await getConnection("dash")
      .manager.insert(Votes, {
        user_id: decoded.user_id,
        bot_id: decoded.bot_id,
        weekend: false,
        platform: "dlist",
      })
      .then(() => console.log("New vote dlist.gg by " + decoded.user_id))
      .catch((err) => console.error(err.message));

    res.status(200).json({ message: "Vote received thanks !" });
    return;
  } catch (err) {
    console.error(err);
    res.status(403).json({ message: "You didn't provide the correct authorization key!" });
  }
};

const handleWumpustoreVote = async (req: Request, res: Response): Promise<void> => {
  const authToken = req.get("authorization");
  if (!authToken) {
    res.status(400).json({ message: "You didn't provide an 'Authorization' header!" });
    return;
  }
  if (authToken !== process.env.WUMPUSSTORE_VOTE_WEBHOOK) {
    res.status(403).json({ message: "You didn't provide the correct authorization key!" });
    return;
  }
  if (!req.body) {
    res.status(400).json({ message: "You didn't provide any data!" });
    return;
  }

  interface WumpusStoreReq {
    webhookTest: boolean;
    userId: string;
    botId: string;
  }

  const body = req.body as WumpusStoreReq;

  if (body.webhookTest) {
    res.status(200).json({ message: "Test vote received thanks !" });
    return;
  }

  if (body.botId !== "499595256270946326") {
    res.status(400).json({ message: "You didn't provide the right bot vote!" });
    return;
  }

  await getConnection("dash")
    .manager.insert(Votes, {
      user_id: body.userId,
      bot_id: body.botId,
      weekend: false,
      platform: "wumpus.store",
    })
    .then(() => console.log("New vote wumpus.store by " + body.userId))
    .catch((err: any) => console.error(err.message));

  res.status(200).json({ message: "Vote received thanks !" });
};

export default {
  handleTopggVote,
  handleVcodesVote,
  handleDlistVote,
  handleWumpustoreVote,
};
