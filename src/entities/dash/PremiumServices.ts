import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

export enum PremiumServiceType {
  GIFT = "gift",
  SUB = "subscription",
  BOOST = "boost",
}

export enum PremiumServiceStatus {
  PENDING = "pending",
  ACTIVE = "active",
  SUSPENDED = "suspended",
  CANCELED = "canceled",
}

@Entity("premium_services")
export class PremiumServices {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id: string;

  @Column({ type: "varchar", nullable: false })
  user_id!: string;

  @Column({
    type: "enum",
    enum: PremiumServiceStatus,
    nullable: false,
  })
  status: PremiumServiceStatus;

  @Column({ type: "varchar", nullable: false })
  plan_id!: string;

  @Column({ type: "varchar", nullable: true })
  subscriptionReference!: string | null;

  @Column({ type: "date", nullable: true })
  renewedAt!: string;

  @Column({ type: "date", nullable: true })
  suspendedAt!: string | null;

  @Column({ type: "date", nullable: true })
  nextDue!: string;

  @Column({
    type: "enum",
    enum: PremiumServiceType,
    nullable: false,
  })
  type: PremiumServiceType;

  @Column({
    type: "datetime",
  })
  createdAt: string;

  @Column({
    type: "datetime",
  })
  updatedAt: string;
}
