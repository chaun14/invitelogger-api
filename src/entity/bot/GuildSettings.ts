import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity({ name: "guildSettings" })
export class GuildSettings {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id: number;

  @Column({ name: "guild_id", type: "varchar" })
  guildId: string;

  @Column({ name: "bot_id", type: "varchar" })
  botId: string;

  @Column({ type: "json" })
  integrations: { dc?: { enabled: boolean } };
}
