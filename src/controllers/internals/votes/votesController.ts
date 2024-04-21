import { Request, Response } from "express";
import { verify } from "jsonwebtoken";

import Votes, { Platform } from "@entity/dash/Votes.js";

import config from "@config";
import { dashDataSource } from "@config/orm";

type TopggBody = {
  user: string;
  bot: string;
  isWeekend: boolean;
};

type VcodeBody = {
  user: {
    id: string;
  };
  trigger: string;
};

type WumpusBody = {
  userId: string;
  botId: string;
};

type DlistBody = {
  bot_id: string;
  user_id: string;
};

export const handleTopGG = async (req: Request, res: Response) => {
  const { body }: { body?: TopggBody } = req;

  if (!body || !body?.user || !body?.bot || !body?.isWeekend) {
    res.status(400).json({ message: "Missing parameter" });
    return;
  }

  if (config.botId !== body.bot) {
    res.status(403).send({ message: "Invalid bot id" });
    return;
  }

  res.status(200).send({ message: "Vote received" });

  await dashDataSource.manager.insert(Votes, {
    userId: body.user,
    botId: config.botId,
    weekend: body.isWeekend,
    platform: Platform.TOPGG,
  });
};

export const handleVCode = async (req: Request, res: Response) => {
  const { body }: { body?: VcodeBody } = req;

  if (!body || !body?.user?.id || !body?.trigger) {
    res.status(400).json({ message: "Missing parameter" });
    return;
  }

  if (body.trigger !== "vote") {
    res.status(400).json({ message: "Invalid trigger" });
    return;
  }

  const { params }: { params: { bot_id?: string } } = req;

  if (params && params?.bot_id) {
    if (config.botId !== params?.bot_id) {
      res.status(403).send({ message: "Invalid bot id" });
      return;
    }
  }

  res.status(200).send({ message: "Vote received" });

  await dashDataSource.manager.insert(Votes, {
    userId: body.user.id,
    botId: config.botId,
    weekend: false,
    platform: Platform.VCODES,
  });
};

export const handleWumpus = async (req: Request, res: Response) => {
  const { body }: { body?: WumpusBody } = req;

  if (!body || !body?.botId || !body?.userId) {
    res.status(400).json({ message: "Missing parameter" });
    return;
  }

  if (config.botId !== body.botId) {
    res.status(403).send({ message: "Invalid bot id" });
    return;
  }

  res.status(200).send({ message: "Vote received" });

  await dashDataSource.manager.insert(Votes, {
    userId: body.userId,
    botId: config.botId,
    weekend: false,
    platform: Platform.WUMPUS,
  });
};

export const handleDLIst = async (req: Request, res: Response) => {
  const { body } = req;

  if (!body) {
    res.status(400).json({ message: "Missing parameter" });
    return;
  }

  const dlistBody = verify(body, config.voteWebhooks.dlist!) as DlistBody;

  if (!dlistBody || !dlistBody?.bot_id || !dlistBody?.user_id) {
    res.status(403).json({ message: "Invalid Authorization" });
    return;
  }

  if (config.botId !== dlistBody.bot_id) {
    res.status(403).send({ message: "Invalid bot id" });
    return;
  }

  res.status(200).send({ message: "Vote received" });

  await dashDataSource.manager.insert(Votes, {
    userId: dlistBody.user_id,
    botId: config.botId,
    weekend: false,
    platform: Platform.DLIST,
  });
};
