import { Votes } from "../entities/dash/Votes";
import { Request, Response, NextFunction } from "express";
import { getConnection } from "typeorm";
import { verify } from "jsonwebtoken";

const handleTopggVote = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let authToken = req.get("authorization");
  if (!authToken)
    return res
      .status(400)
      .json({ message: `You didn't provide an 'Authorization' header!` });
  if (authToken !== process.env.TOPGG_VOTE_WEBHOOK)
    return res
      .status(403)
      .json({ message: `You didn't provide the correct authorization key!` });
  if (!req.body)
    return res.status(400).json({ message: `You didn't provide any data!` });

  res.status(200).json({ message: `Vote received!` });

  // console.log(req.body);

  if (req.body.type === "test")
    return console.log("Test vote received, not adding to database.", req.body);
  await getConnection("dash")
    .manager.insert(Votes, {
      user_id: req.body.user,
      bot_id: req.body.bot,
      weekend: req.body.isWeekend,
    })
    .then((data) =>
      console.log(
        "New vote top.gg by " + req.body.user + " #" + data.identifiers[0].id
      )
    )
    .catch((err) => console.error(err.message));
};

const handleVcodesVote = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let authToken = req.get("authorization");
  if (!authToken)
    return res
      .status(400)
      .json({ message: `You didn't provide an 'Authorization' header!` });
  if (authToken !== process.env.VCODES_VOTE_WEBHOOK)
    return res
      .status(403)
      .json({ message: `You didn't provide the correct authorization key!` });
  if (!req.body)
    return res.status(400).json({ message: `You didn't provide any data!` });

  res.status(200).json({ message: `Vote received thanks !` });
  let botID = req.params.bot_id;
  if (!botID) botID = "499595256270946326";

  if (req.body.trigger !== "vote") return;

  // console.log(req.body);

  if (req.body.test)
    return console.log(
      "Vcodes Test vote received, not adding to database.",
      req.body
    );
  await getConnection("dash")
    .manager.insert(Votes, {
      user_id: req.body.user.id,
      bot_id: botID,
      weekend: false,
      platform: "vcodes",
    })
    .then((data) =>
      console.log(
        "New vote vcodes.xyz by " +
          req.body.user.tag +
          " (" +
          req.body.user.id +
          ") "
      )
    )
    .catch((err) => console.error(err.message));
};

const handleDlistVote = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.log(req.body);

  if (!req.body)
    return res
      .status(400)
      .json({ message: `You didn't provide a body to decode !` });

  // validate the jwt again our secret
  try {
    interface DlistReq {
      bot_id: string;
      user_id: string;
      query: any;
      is_test: boolean;
    }

    const decoded: DlistReq = verify(
      req.body,
      process.env.DLIST_VOTE_WEBHOOK as string
    ) as DlistReq;

    if (decoded.is_test) {
      res.status(200).json({ message: `Test vote received thanks !` });
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
      .then((data) => console.log("New vote dlist.gg by " + decoded.user_id))
      .catch((err) => console.error(err.message));

    return res.status(200).json({ message: `Vote received thanks !` });
  } catch (err) {
    console.error(err);
    return res
      .status(403)
      .json({ message: `You didn't provide the correct authorization key!` });
  }
};

const handleWumpustoreVote = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let authToken = req.get("authorization");
  if (!authToken)
    return res
      .status(400)
      .json({ message: `You didn't provide an 'Authorization' header!` });
  if (authToken !== process.env.WUMPUSSTORE_VOTE_WEBHOOK)
    return res
      .status(403)
      .json({ message: `You didn't provide the correct authorization key!` });
  if (!req.body)
    return res.status(400).json({ message: `You didn't provide any data!` });

  interface WumpusStoreReq {
    webhookTest: boolean;
    userId: string;
    botId: string;
  }

  let body = req.body as WumpusStoreReq;

  if (body.webhookTest)
    return res.status(200).json({ message: `Test vote received thanks !` });

  if (body.botId !== "499595256270946326")
    return res
      .status(400)
      .json({ message: `You didn't provide the right bot vote!` });

  await getConnection("dash")
    .manager.insert(Votes, {
      user_id: body.userId,
      bot_id: body.botId,
      weekend: false,
      platform: "wumpus.store",
    })
    .then((data: any) => console.log("New vote wumpus.store by " + body.userId))
    .catch((err: any) => console.error(err.message));

  return res.status(200).json({ message: `Vote received thanks !` });
};

export default {
  handleTopggVote,
  handleVcodesVote,
  handleDlistVote,
  handleWumpustoreVote,
};
