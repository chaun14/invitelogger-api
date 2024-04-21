import { NextFunction, Request, Response } from "express";

import GuildSettings from "@entity/bot/GuildSettings.js";
import Joins, { InvalidatedReason } from "@entity/bot/Joins.js";

import config from "@config";
import { prodDataSource } from "@config/orm";

type DcBody = {
  guild_id: string;
  member_id: string;
};

export const handleDoubleCounter = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { body }: { body?: DcBody } = req;

    if (!body || !body?.guild_id || !body?.member_id) {
      res.status(400).json({ message: "Missing parameter" });
      return;
    }

    const guildSettings = await prodDataSource.manager.findOne(GuildSettings, {
      where: { guildId: body.guild_id, botId: config.botId },
    });
    if (!guildSettings || !guildSettings.integrations?.dc?.enabled) {
      res
        .status(guildSettings ? 403 : 404)
        .json({ message: guildSettings ? "Integration not enabled" : "Unknown guild" });
      return;
    }

    const fakeVerification = await prodDataSource.manager.findOne(Joins, {
      where: {
        botId: config.botId,
        guildId: req.body.guild_id,
        memberId: req.body.member_id,
        invalidated: InvalidatedReason.NEW_FAKE,
      },
      order: { createdAt: "DESC" },
    });

    if (!fakeVerification) {
      res.status(403).send({
        message: "No fake verification needed for this user",
      });
      return;
    }

    const fakeReasonKeys = await restoreFakeData(fakeVerification.fakeCode);
    for (const failedCheck of fakeReasonKeys) {
      if (failedCheck == "REQUIREDCVERIF") {
        const newFakeCode = await removeFakeReason(fakeVerification.fakeCode, FakeTypes.REQUIRE_DC_VERIF);
        fakeVerification.fakeCode = newFakeCode;
        fakeVerification.invalidated = newFakeCode == 0 ? null : InvalidatedReason.NEW_FAKE;
        await prodDataSource.manager.save(fakeVerification);
      }
    }

    res.status(200).json({ message: "Success" });
  } catch (error) {
    next(error);
  }
};

async function restoreFakeData(code: number) {
  const fakeReasonKeys: string[] = [];

  for (const item of fakeTypesList) {
    const fakeCode = FakeCodes[item.id];
    if (code && fakeCode) {
      fakeReasonKeys.push(FakeTypes[item.id]);
    }
  }

  return fakeReasonKeys;
}

async function removeFakeReason(currentFakeCode: number, fakeType: number) {
  const fakeTypeData = fakeTypesList.find((fake) => fake.id === fakeType);
  if (!fakeTypeData) {
    throw new Error("Invalid fake type");
  }

  return currentFakeCode ^ fakeTypeData.code;
}

enum FakeTypes {
  YOUNG = 1,
  SELF = 2,
  NO_PFP = 3,
  ALREADY_JOINED = 4,
  REQUIRE_ROLE = 5,
  REQUIRE_DC_VERIF = 6,
}

enum FakeCodes {
  YOUNG = 1,
  SELF = 2,
  NO_PFP = 4,
  ALREADY_JOINED = 8,
  REQUIRE_ROLE = 16,
  REQUIRE_DC_VERIF = 32,
}

const fakeTypesList = [
  {
    id: FakeTypes.YOUNG,
    data: { threshold: 7 },
    premium: false,
    code: FakeCodes.YOUNG,
  },
  {
    id: FakeTypes.SELF,
    data: undefined,
    premium: false,
    code: FakeCodes.SELF,
  },
  {
    id: FakeTypes.NO_PFP,
    data: undefined,
    premium: false,
    code: FakeCodes.NO_PFP,
  },
  {
    id: FakeTypes.ALREADY_JOINED,
    data: undefined,
    premium: true,
    code: FakeCodes.ALREADY_JOINED,
  },
  {
    id: FakeTypes.REQUIRE_ROLE,
    data: { roleID: "" },
    premium: true,
    code: FakeCodes.REQUIRE_ROLE,
  },
  {
    id: FakeTypes.REQUIRE_DC_VERIF,
    data: undefined,
    premium: false,
    code: FakeCodes.REQUIRE_DC_VERIF,
  },
];
