import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity({ name: "customInvites" })
export class CustomInvites {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id: number;

  @Column({ name: "guild_id", type: "varchar" })
  guildId: string;

  @Column({ name: "bot_id", type: "varchar" })
  botId: string;

  @Column({ name: "member_id", type: "varchar" })
  memberId: string;

  @Column({ name: "creator_id", type: "varchar" })
  creatorId: string;

  @Column({ type: "boolean" })
  cleared: boolean;

  @Column({ type: "datetime" })
  createdAt: Date;

  @Column({ type: "datetime" })
  updatedAt: Date;

  @Column({ type: "bigint" })
  amount: string;

  @Column({ type: "varchar" })
  reason: string;
}
