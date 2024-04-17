import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

export enum PremiumPlanCategory {
  GOLD = "gold",
  GOLD_BOOST = "goldBoost",
  PBI = "pbi",
}

export enum PremiumPlanPeriod {
  MONTHLY = "monthly",
  YEARLY = "yearly",
}

@Entity("premium_plans")
export class PremiumPlans {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id: string;

  @Column({ type: "varchar", nullable: false })
  name!: string;

  @Column({
    type: "enum",
    enum: PremiumPlanCategory,
    nullable: false,
  })
  category: PremiumPlanCategory;

  @Column({ type: "bool", default: false })
  oneTime: boolean;

  @Column({ type: "bool", default: true })
  enabled: boolean;

  @Column({ type: "text", nullable: true })
  image!: string;

  @Column({ type: "json", nullable: true })
  config!: { maxGuilds?: number };

  @Column({ type: "varchar", nullable: true })
  description!: string;

  @Column({ type: "bool", default: true })
  visible: boolean;

  @Column({
    type: "enum",
    enum: PremiumPlanPeriod,
    nullable: false,
  })
  period: PremiumPlanPeriod;

  @Column({ type: "varchar", nullable: true, default: null })
  tebexPackageId!: string;

  @Column({ type: "varchar", nullable: true, default: null })
  tebexStoreUrl!: string;

  @Column({
    type: "datetime",
  })
  createdAt: Date;

  @Column({
    type: "datetime",
  })
  updatedAt: Date;
}
