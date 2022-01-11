import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity({ name: 'customInvites'})
export class CustomInvites {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  guild_id: string;

  @Column()
  bot_id: string;

  @Column()
  member_id: string;

  @Column()
  creator_id: string;

  @Column({ type: 'bool' })
  cleared: boolean

  @Column({ type: 'datetime' })
  createdAt: Date

  @Column({ type: 'datetime' })
  updatedAt: Date

  @Column({ type: 'bigint' })
  amount: string

  @Column()
  reason: string
}