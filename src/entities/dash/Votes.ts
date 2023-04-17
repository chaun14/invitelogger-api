import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity()
export class Votes {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id: number;

  @Column()
  bot_id: string;

  @Column()
  user_id: string;

  @Column({ type: "enum", default: "topgg", enum: ["topgg", "vcodes", "dlist"] })
  platform: string;

  @Column({ type: "boolean", default: false })
  weekend: boolean;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" })
  updatedAt: Date;
}
