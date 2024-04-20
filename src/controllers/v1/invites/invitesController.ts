import { NextFunction, Request, Response } from "express";

import { Joins, InvalidatedReason } from "@entity/bot/Joins.js";

import { botDataSource } from "@config/orm";
import { CustomInvites } from "@entity/bot/CustomInvites.js";

export const handleCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.authenticate) {
      res.status(500).send({ message: "Authentication error" });
      return;
    }

    const { authenticate, body } = req;

    if (!body || !body?.guild_id || !body?.bot_id || !body?.invite_code) {
      res.status(400).json({ message: "Missing parameter" });
      return;
    }

    if (body.guild_id !== authenticate.guildId || body.bot_id !== authenticate.botId) {
      res.status(403).send({ message: "Access forbidden" });
      return;
    }

    const joins = await botDataSource.manager.find(Joins, {
      where: { guildId: body.guild_id, botId: body.bot_id, code: body.invite_code },
    });

    res.status(200).send(
      joins.map((join: Joins) => {
        return {
          created_at: join.createdAt,
          updated_at: join.updatedAt,
          member_id: join.memberId,
          fake: join.invalidated !== null && join.invalidated !== InvalidatedReason.LEAVE,
          left: join.invalidated === InvalidatedReason.LEAVE,
          cleared: join.cleared,
        };
      })
    );
  } catch (error) {
    next(error);
  }
};

export const handleUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.authenticate) {
      res.status(500).send({ message: "Authentication error" });
      return;
    }

    const { authenticate, body } = req;

    if (!body || !body?.guild_id || !body?.bot_id || !body?.inviter_id) {
      res.status(400).json({ message: "Missing parameter" });
      return;
    }

    if (body.guild_id !== authenticate.guildId || body.bot_id !== authenticate.botId) {
      res.status(403).send({ message: "Access forbidden" });
      return;
    }

    const joins = await botDataSource.manager.find(Joins, {
      where: {
        guildId: body.guild_id,
        botId: body.bot_id,
        inviterId: body.inviter_id,
        cleared: false,
      },
    });
    const bonuses = await botDataSource.manager.find(CustomInvites, {
      where: {
        guildId: body.guild_id,
        botId: body.bot_id,
        memberId: body.inviter_id,
        cleared: false,
      },
    });

    let userInvitesData = joins.reduce(
      (data, invite) => {
        data.total++;
        if (!invite.invalidated || invite.invalidated === InvalidatedReason.FAKE) {
          data.real++;
        } else if (
          [InvalidatedReason.NEWFAKE, InvalidatedReason.YOUNG, InvalidatedReason.SELF].includes(invite.invalidated)
        ) {
          data.fake++;
        } else if (invite.invalidated === InvalidatedReason.LEAVE) {
          data.leaves++;
        }

        return data;
      },
      { total: 0, leaves: 0, bonus: 0, fake: 0, real: 0 }
    );

    const bonusCount = bonuses.reduce((sum, bonus) => sum + parseInt(bonus.amount, 10), 0);

    userInvitesData = {
      ...userInvitesData,
      bonus: bonusCount,
      total: userInvitesData.total + bonusCount,
      real: userInvitesData.real + bonusCount,
    };

    res.status(200).send({ ...userInvitesData });
  } catch (error) {
    next(error);
  }
};
