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
  @Column({ type: "varchar", nullable: false })
  payment_id!: string;

  @Column({ type: "float", nullable: false, precision: 2 })
  amount!: number;

  @Column({ type: "datetime" })
  date: Date;

  @Column({ type: "varchar", nullable: false })
  status!: string;
  @Column({ type: "varchar", nullable: false })
  currency!: string;
  @Column({ type: "varchar", nullable: true })
  mail!: string | null;
  @Column({ type: "varchar", nullable: false })
  username!: string;
  @Column({ type: "varchar", nullable: false })
  discord_id!: string;

  @Column({ type: "varchar", nullable: true, default: true })
  subscriptionReference!: string | null;

  @Column({ type: "json", nullable: false })
  packages!: string[];

  @Column({
    type: "datetime",
    nullable: true,
    default: null,
  })
  refundedAt: Date;

  @Column({
    type: "datetime",
  })
  createdAt: Date;

  @Column({
    type: "datetime",
  })
  updatedAt: Date;
}
