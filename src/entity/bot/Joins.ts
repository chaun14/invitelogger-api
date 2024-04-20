import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

export enum JoinType {
  USER = "user",
  VANITY = "vanity",
  BOT = "bot",
}

export enum InvalidatedReason {
  FAKE = "fake",
  LEAVE = "leave",
  SELF = "self",
  UNKNOWN = "unknow",
  YOUNG = "young",
  NEWFAKE = "newfake",
}

@Entity()
export class Joins {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id: number;

  @Column({ name: "guild_id", type: "varchar" })
  guildId: string;

  @Column({ type: "enum", enum: JoinType, nullable: true })
  type: JoinType | null;

  @Column({ name: "bot_id", type: "varchar" })
  botId: string;

  @Column({ nullable: true })
  code: string | null;

  @Column({ name: "member_id", type: "varchar" })
  memberId: string;

  @Column({ name: "inviter_id", type: "varchar", nullable: true })
  inviterId: string | null;

  @Column({ type: "boolean" })
  cleared: boolean;

  @Column({ type: "enum", enum: InvalidatedReason, nullable: true })
  invalidated: InvalidatedReason | null;

  @Column({ type: "int" })
  fakeCode: number;

  @Column({ type: "datetime" })
  createdAt: Date;

  @Column({ type: "datetime" })
  updatedAt: Date;
}
