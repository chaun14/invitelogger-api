import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";

export enum PremiumServiceStatus {
  FAKE = "pending",
  LEAVE = "active",
  SELF = "suspended",
  UNKNOWN = "canceled",
}

@Entity()
export class Payments {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id: string;

  @Index()
  @Column({ type: "varchar" })
  payment_id!: string;

  @Column({ type: "float", precision: 2 })
  amount!: number;

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

  @Column({ type: "varchar" })
  discord_id: string;

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
