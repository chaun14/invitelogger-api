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

  @Column({ name: "user_id", type: "varchar" })
  userId: string;

  @Column({ type: "enum", enum: PremiumServiceStatus })
  status: PremiumServiceStatus;

  @Column({ name: "plan_id", type: "varchar" })
  planId: string;

  @Column({ type: "varchar", nullable: true })
  subscriptionReference!: string | null;

  @Column({ type: "datetime", nullable: true })
  subEndedAt: string | null;

  @Column({ type: "date", nullable: true })
  renewedAt: string | null;

  @Column({ type: "date", nullable: true })
  suspendedAt: string | null;

  @Column({ type: "date", nullable: true })
  nextDue: string | null;

  @Column({ type: "enum", enum: PremiumServiceType })
  type: PremiumServiceType;

  @Column({ type: "datetime" })
  createdAt: string;

  @Column({ type: "datetime" })
  updatedAt: string;
}
