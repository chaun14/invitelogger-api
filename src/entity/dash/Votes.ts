import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

export enum Platform {
  TOPGG = "topgg",
  VCODES = "vcodes",
  DLIST = "dlist",
  WUMPUS = "wumpus.store",
  FINDMEABOTSPACE = "findmeabotspace",
}

@Entity()
class Votes {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id: number;

  @Column({ name: "bot_id", type: "varchar" })
  botId: string;

  @Column({ name: "user_id", type: "varchar" })
  userId: string;

  @Column({ type: "enum", default: Platform.TOPGG, enum: Platform })
  platform: string;

  @Column({ type: "boolean", default: false })
  weekend: boolean;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" })
  updatedAt: Date;
}

export default Votes;
