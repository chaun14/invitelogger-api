import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

export type VerificationIntegration = {
  enabled: true;
  scopes: string[];
  grantedAt: string;
};

@Entity({ name: "guildSettings" })
class GuildSettings {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id: number;

  @Column({ name: "guild_id", type: "varchar" })
  guildId: string;

  @Column({ name: "bot_id", type: "varchar" })
  botId: string;

  @Column({ type: "json" })
  integrations: { verification?: VerificationIntegration } | null;
}

export default GuildSettings;
