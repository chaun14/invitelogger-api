import { NextFunction, Request, Response } from "express";

import GuildSettings from "@entity/bot/GuildSettings.js";
import Joins, { InvalidatedReason } from "@entity/bot/Joins.js";

import config from "@config";
import { prodbotDataSource } from "@config/orm";

type VerificationGgBody = {
  event: "member.verified" | "connection.revoked";
  guild_id: string;
  member_id?: string | null;
  timestamp?: string;
  data?: { method?: "checks" | "bypass" | "no_checks" | "forced" };
};

const VERIFGG_FAKE_CODE = 32;

export const handleVerificationGg = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { body }: { body?: VerificationGgBody } = req;

    if (!body?.event || !body.guild_id || (body.event === "member.verified" && !body.member_id)) {
      res.status(400).json({ message: "Missing parameter" });
      return;
    }

    if (body.event !== "member.verified" && body.event !== "connection.revoked") {
      res.status(400).json({ message: "Unknown event" });
      return;
    }

    const guildSettings = await prodbotDataSource.manager.findOne(GuildSettings, {
      where: { guildId: body.guild_id, botId: config.botId },
    });
    if (!guildSettings) {
      res.status(404).json({ message: "Unknown guild" });
      return;
    }

    if (body.event === "connection.revoked") {
      if (guildSettings.integrations?.verification?.enabled) {
        delete guildSettings.integrations.verification;
        await prodbotDataSource.manager.save(guildSettings);
      }

      res.status(200).json({ message: "Connection revoked" });
      return;
    }

    if (!guildSettings.integrations?.verification?.enabled) {
      res.status(403).json({ message: "Integration not enabled" });
      return;
    }

    const fakeVerification = await prodbotDataSource.manager.findOne(Joins, {
      where: {
        botId: config.botId,
        guildId: body.guild_id,
        memberId: body.member_id,
        invalidated: InvalidatedReason.NEW_FAKE,
      },
      order: { createdAt: "DESC" },
    });

    if (!fakeVerification || !(fakeVerification.fakeCode & VERIFGG_FAKE_CODE)) {
      res.status(403).json({ message: "No fake verification needed for this user" });
      return;
    }

    const newFakeCode = fakeVerification.fakeCode & ~VERIFGG_FAKE_CODE;
    fakeVerification.fakeCode = newFakeCode;
    fakeVerification.invalidated = newFakeCode === 0 ? null : InvalidatedReason.NEW_FAKE;
    await prodbotDataSource.manager.save(fakeVerification);

    res.status(200).json({ message: "Success" });
  } catch (error) {
    next(error);
  }
};
