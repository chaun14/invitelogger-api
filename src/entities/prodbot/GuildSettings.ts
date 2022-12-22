import { Entity, PrimaryGeneratedColumn, Column, PrimaryColumn } from "typeorm";

@Entity({ name: "guildSettings" })
export class GuildSettings {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  guild_id: string;

  @Column()
  bot_id: string;

  @Column({
    type: "json",
  })
  integrations: { dc?: { enabled: boolean } };
}
