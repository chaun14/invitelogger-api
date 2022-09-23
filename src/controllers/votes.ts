import { Votes } from "../entities/dash/Votes";
import { Request, Response, NextFunction } from "express";
import { getConnection } from "typeorm";

const handleTopggVote = async (req: Request, res: Response, next: NextFunction) => {
  let authToken = req.get("authorization");
  if (!authToken) return res.status(400).json({ message: `You didn't provide an 'Authorization' header!` });
  if (authToken !== process.env.TOPGG_VOTE_WEBHOOK) return res.status(403).json({ message: `You didn't provide the correct authorization key!` });
  if (!req.body) return res.status(400).json({ message: `You didn't provide any data!` });

  res.status(200).json({ message: `Vote received!` });

  // console.log(req.body);

  if (req.body.type === "test") return console.log("Test vote received, not adding to database.", req.body);
  await getConnection("dash")
    .manager.insert(Votes, { user_id: req.body.user, bot_id: req.body.bot, weekend: req.body.isWeekend })
    .then((data) => console.log("New vote top.gg by " + req.body.user + " #" + data.identifiers[0].id))
    .catch((err) => console.error(err.message));
};

export default { handleTopggVote };
