import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

export enum JoinType {
  USER = "user",
  VANITY = "vanity",
  BOT = "bot"
}

export enum InvalidatedReason {
  FAKE = "fake",
  LEAVE = "leave",
  SELF = "self",
  UNKNOWN = "unknow",
  YOUNG = "young"
}

@Entity()
export class Joins {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  guild_id: string;

  @Column({
    type: 'enum',
    enum: JoinType,
    nullable: true
  })
  type: JoinType;

  @Column()
  bot_id: string;

  @Column({
    nullable: true
  })
  code: string;

  @Column()
  member_id: string;

  @Column({
    nullable: true
  })
  inviter_id: string;

  @Column({type: "bool"})
  cleared: boolean;

  @Column({
    type: 'enum',
    enum: InvalidatedReason,
    nullable: true
  })
  invalidated: InvalidatedReason

  @Column({
    type: 'datetime'
  })
  createdAt: Date

  @Column({
    type: 'datetime'
  })
  updatedAt: Date
}