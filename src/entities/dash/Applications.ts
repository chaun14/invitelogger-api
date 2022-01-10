import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity()
export class Applications {
    @PrimaryGeneratedColumn({type: 'bigint'})
    id: string;

    @Column()
    owner_id: string;

    @Column()
    token: string;

    @Column()
    bot_id: string;

    @Column()
    guild_id: string;
}