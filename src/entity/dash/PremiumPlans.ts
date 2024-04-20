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

  @Column({ type: "varchar" })
  name: string;

  @Column({ type: "enum", enum: PremiumPlanCategory })
  category: PremiumPlanCategory;

  @Column({ type: "boolean", default: false })
  oneTime: boolean;

  @Column({ type: "boolean", default: true })
  enabled: boolean;

  @Column({ type: "text", nullable: true })
  image: string | null;

  @Column({ type: "json", nullable: true })
  config: { maxGuilds: number | null } | null;

  @Column({ type: "varchar", nullable: true })
  description: string | null;

  @Column({ type: "boolean", default: true })
  visible: boolean;

  @Column({ type: "enum", enum: PremiumPlanPeriod })
  period: PremiumPlanPeriod;

  @Column({ type: "varchar", nullable: true })
  tebexPackageId: string | null;

  @Column({ type: "varchar", nullable: true })
  tebexStoreUrl: string | null;

  @Column({ type: "datetime" })
  createdAt: Date;

  @Column({ type: "datetime" })
  updatedAt: Date;
}
