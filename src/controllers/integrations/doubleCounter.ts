import { GuildSettings } from "../../entities/bot/GuildSettings";
import { InvalidatedReason, Joins } from "../../entities/bot/Joins";
import { Request, Response, NextFunction } from "express";
import { getConnection } from "typeorm";

/**
 * checkauth request handler to test token authentication
 * @param req
 * @param res
 * @param next
 * @returns Empty response with status code 200 if authenticated,
 */
const handleFakeVerification = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // first check if the integration is enabled on the guild
    if (!req.body.guild_id || !req.body.member_id) {
      res.status(400).json({
        message: "Missing parameter",
      });
      return;
    }

    // check if the integration is enabled on the guild
    const guildSettings = await getConnection("bot").manager.findOne(
      GuildSettings,
      { where: { guild_id: req.body.guild_id, bot_id: process.env.BOT_ID } }
    );
    if (!guildSettings) {
      res.status(404).json({
        message: "Unknown guild",
      });
      return;
    }
    if (
      !guildSettings ||
      !guildSettings.integrations ||
      !guildSettings.integrations.dc ||
      !guildSettings.integrations.dc.enabled
    ) {
      res.status(403).json({
        message: "Integration not enabled",
      });
      return;
    }

    // check if we have someone needing a fake verification
    const fakeVerification = await getConnection("bot").manager.findOne(Joins, {
      where: {
        bot_id: process.env.BOT_ID,
        guild_id: req.body.guild_id,
        member_id: req.body.member_id,
        invalidated: InvalidatedReason.NEWFAKE,
      },
      order: { createdAt: "DESC" },
    });
    if (!fakeVerification) {
      res.status(404).json({
        message: "No fake verification needed for this user",
      });
      return;
    }
    let fakeReasonKeys = await restoreFakeData(fakeVerification.fakeCode);
    console.log(fakeReasonKeys);
    for (let failedCheck of fakeReasonKeys) {
      if (failedCheck == "REQUIREDCVERIF") {
        // we calculate the new fakeCode
        let newFakeCode = await removeFakeReason(
          fakeVerification.fakeCode,
          fakeTypes.REQUIREDCVERIF
        );
        fakeVerification.fakeCode = newFakeCode;
        fakeVerification.invalidated =
          newFakeCode == 0 ? null : InvalidatedReason.NEWFAKE;
        await getConnection("bot").manager.save(fakeVerification);
      }
    }

    return res.status(200).json({
      message: "Success",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

async function restoreFakeData(code: number): Promise<string[]> {
  let fakeReasonKeys = [];
  for (let item of fakeTypesList) {
    console.log({ item });
    let fakeKey = fakeTypes[item.id] as string;
    console.log({ fakeKey });
    if (fakeKey) {
      let fakeCode = fakeCodes[fakeKey as any];

      console.log({ code, fakeCode, result: code & parseInt(fakeCode) });

      // now time to check if the invite is really fake because of this
      if (code & parseInt(fakeCode)) {
        fakeReasonKeys.push(fakeKey);
      }
    }
  }

  return fakeReasonKeys;
}

export async function removeFakeReason(
  currentFakeCode: number,
  fakeType: number
) {
  let fakeTypeData = fakeTypesList.find((fake) => fake.id == fakeType);
  if (!fakeTypeData) throw new Error("Invalid fake type");

  currentFakeCode = currentFakeCode ^ fakeTypeData.code;

  return currentFakeCode;
}

export enum fakeTypes {
  YOUNG = 1,
  SELF = 2,
  NOPFP = 3,
  ALREADYJOINED = 4,
  REQUIREROLE = 5,
  REQUIREDCVERIF = 6,
}

export enum fakeCodes {
  YOUNG = 1,
  SELF = 2,
  NOPFP = 4,
  ALREADYJOINED = 8,
  REQUIREROLE = 16,
  REQUIREDCVERIF = 32,
}

export const fakeTypesList = [
  {
    id: fakeTypes.YOUNG,
    data: { threshold: 7 },
    premium: false,
    code: fakeCodes.YOUNG,
  },
  {
    id: fakeTypes.SELF,
    data: undefined,
    premium: false,
    code: fakeCodes.SELF,
  },
  {
    id: fakeTypes.NOPFP,
    data: undefined,
    premium: false,
    code: fakeCodes.NOPFP,
  },
  {
    id: fakeTypes.ALREADYJOINED,
    data: undefined,
    premium: true,
    code: fakeCodes.ALREADYJOINED,
  },
  {
    id: fakeTypes.REQUIREROLE,
    data: { roleID: "" },
    premium: true,
    code: fakeCodes.REQUIREROLE,
  },
  {
    id: fakeTypes.REQUIREDCVERIF,
    data: undefined,
    premium: false,
    code: fakeCodes.REQUIREDCVERIF,
  },
];

export { handleFakeVerification };
