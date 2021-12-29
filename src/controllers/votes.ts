import { Request, Response, NextFunction } from "express";

const handleTopggVote = async (req: Request, res: Response, next: NextFunction) => {
  let authToken = req.get("authorization");
  if (!authToken) return res.status(400).json({ message: `You didn't provide an 'Authorization' header!` });
  if (authToken !== process.env.TOPGG_VOTE_WEBHOOK) return res.status(403).json({ message: `You didn't provide the correct authorization key!` });
  if (!req.body) return res.status(400).json({ message: `You didn't provide any data!` });

  console.log(`New vote top.gg by  ${req.body.user}`);
};

export default { handleTopggVote };
