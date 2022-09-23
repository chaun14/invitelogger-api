import { CustomInvites } from "../../entities/bot/CustomInvites";
import { InvalidatedReason, Joins } from "../../entities/bot/Joins";
import { Request, Response, NextFunction } from "express";
import { getConnection } from "typeorm";

/**
 * Returns the invites details for one user in one guild
 * @param req
 * @param res
 * @param next
 * @returns 200 and invites details, 403 if forbidden
 */
const handleInvitesUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.tokenAuth) {
      // missing parameter(s)
      if (!req.body || !req.body.guild_id || !req.body.bot_id || !req.body.inviter_id) {
        res.status(400).json({
          message: "Missing parameter",
        });
        return;
      }
      // forbidden query
      if (req.body.guild_id !== req.tokenAuth.guild_id || req.body.bot_id !== req.tokenAuth.bot_id) {
        res.status(403).json({
          message: "Access forbidden",
        });
        return;
      }
      // querying database for invite data
      const joins = await getConnection("bot").manager.find(Joins, {
        where: {
          guild_id: req.body.guild_id,
          bot_id: req.body.bot_id,
          inviter_id: req.body.inviter_id,
          cleared: false,
        },
      });
      const bonus = await getConnection("bot").manager.find(CustomInvites, {
        where: {
          guild_id: req.body.guild_id,
          bot_id: req.body.bot_id,
          member_id: req.body.inviter_id,
          cleared: false,
        },
      });

      // init invites data object
      let userInvitesData = { total: 0, leaves: 0, fake: 0, bonus: 0, real: 0 };

      // assign all joins to the user in the right category
      for (let invite of joins) {
        userInvitesData.total++;

        if (invite.invalidated == null || invite.invalidated == InvalidatedReason.FAKE) {
          userInvitesData.real++;
        } else if (invite.invalidated == InvalidatedReason.YOUNG || invite.invalidated == InvalidatedReason.NEWFAKE) {
          userInvitesData.fake++;
        } else if (invite.invalidated == InvalidatedReason.SELF) {
          userInvitesData.fake++;
        } else if (invite.invalidated == InvalidatedReason.LEAVE) {
          userInvitesData.leaves++;
        }
      }

      // bonus invites system
      let bonusCount = 0;

      bonus.forEach((userBonus) => {
        bonusCount += Number.parseInt(userBonus.amount);
      });

      // calculate final data
      userInvitesData.total += bonusCount;
      userInvitesData.real += bonusCount;
      userInvitesData.bonus = bonusCount;

      res.json(userInvitesData);
      return;
    }
    // should never happen, because of tokenAuth middleware
    res.status(500).end();
  } catch (err) {
    next(err);
  }
};

export default { handleInvitesUser };
