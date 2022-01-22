import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

export enum PremiumServiceStatus {
  FAKE = "pending",
  LEAVE = "active",
  SELF = "suspended",
  UNKNOWN = "canceled",
}

export enum PremiumServiceType {
  FAKE = "pending",
  LEAVE = "active",
  SELF = "suspended",
  UNKNOWN = "canceled",
}

@Entity()
export class Premium_Services {
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

  @Column({
    type: "datetime",
  })
  createdAt: Date;

  @Column({
    type: "datetime",
  })
  updatedAt: Date;

  @Column({ type: "varchar", nullable: false })
  plan_id!: string;

  @Column({ type: "varchar", nullable: true })
  subscriptionReference!: string;

  @Column({ type: "date", nullable: true })
  activatedAt!: string;

  @Column({ type: "date", nullable: true })
  suspendedAt!: string;

  @Column({ type: "date", nullable: true })
  nextDue!: string;

  @Column({
    type: "enum",
    enum: PremiumServiceType,
    nullable: false,
  })
  type: PremiumServiceType;
}
