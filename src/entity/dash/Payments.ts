import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";

@Entity()
class Payments {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id: string;

  @Index()
  @Column({ name: "payment_id", type: "varchar" })
  paymentId: string;

  @Column({ type: "float", precision: 2 })
  amount: number;

  @Column({ type: "datetime" })
  date: Date;

  @Column({ type: "varchar" })
  status: string;

  @Column({ type: "varchar" })
  currency: string;

  @Column({ type: "varchar", nullable: true })
  mail: string | null;

  @Column({ type: "varchar" })
  username: string;

  @Column({ name: "discord_id", type: "varchar" })
  discordId: string;

  @Column({ type: "varchar", nullable: true })
  subscriptionReference: string | null;

  @Column({ type: "json" })
  packages: string[];

  @Column({ type: "datetime", nullable: true })
  refundedAt: Date | null;

  @Column({ type: "datetime" })
  createdAt: Date;

  @Column({ type: "datetime" })
  updatedAt: Date;
}

export default Payments;
