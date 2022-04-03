import { CustomInvites } from "../../entities/bot/CustomInvites";
import { InvalidatedReason, Joins } from "../../entities/bot/Joins";
import { Request, Response, NextFunction } from "express";
import { getConnection } from "typeorm";

/**
 * Returns all the joins for a specific invite code
 * @param req 
 * @param res 
 * @param next 
 * @returns 200 and invites details, 403 if forbidden
 */
const handleInvitesCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.tokenAuth) {
      // missing parameter(s)
      if (!req.body
        || !req.body.guild_id
        || !req.body.bot_id
        || !req.body.invite_code
      ) {
        res.status(400).json({
          message: 'Missing parameter'
        });
        return
      }
      // forbidden query
      if (req.body.guild_id !== req.tokenAuth.guild_id
        || req.body.bot_id !== req.tokenAuth.bot_id
      ) {
        res.status(403).json({
          message: "Access forbidden"
        });
        return
      }
      // querying database for invite data
      const joins = await getConnection('bot').manager.find(Joins, {
        where: {
          guild_id: req.body.guild_id,
          bot_id: req.body.bot_id,
          code: req.body.invite_code,
        }
      });

      res.json(joins.map(join => ({
        created_at: join.createdAt,
        updated_at: join.updatedAt,
        member_id: join.member_id,
        invalidated: join.invalidated !== null,
        cleared: join.cleared
      })));
      return
    }
    // should never happen, because of tokenAuth middleware
    res.status(500).end();
  } catch (err) {
    next(err)
  }
};

export default { handleInvitesCode };
