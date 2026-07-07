import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity()
class Applications {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id: string;

  @Column({ name: "owner_id", type: "varchar" })
  ownerId: string;

  @Column({ type: "varchar" })
  token: string;

  @Column({ name: "bot_id", type: "varchar" })
  botId: string;

  @Column({ name: "guild_id", type: "varchar" })
  guildId: string;
}

export default Applications;
