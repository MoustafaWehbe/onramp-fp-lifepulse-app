import { Model, DataTypes, type Sequelize, type Optional } from "sequelize";
import type { HabitDifficulty, HabitFrequency } from "../types";

export interface HabitAttributes {
  id: string;
  userId: string;
  areaId: string;
  name: string;
  frequency: HabitFrequency;
  durationMinutes?: number;
  difficulty?: HabitDifficulty;
  notes?: string;
  /** 24-hour "HH:mm:ss" local time (interpreted in `timezone`) to send a reminder. */
  reminderTime?: string;
  /** Whether a reminder should be scheduled for this habit. Requires reminderTime + timezone. */
  reminderEnabled: boolean;
  /** IANA timezone (e.g. "America/New_York") the reminderTime is expressed in. */
  timezone?: string;
  archivedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface HabitCreationAttributes extends Optional<
  HabitAttributes,
  | "id"
  | "durationMinutes"
  | "difficulty"
  | "notes"
  | "reminderTime"
  | "reminderEnabled"
  | "timezone"
  | "archivedAt"
> {}

export class Habit
  extends Model<HabitAttributes, HabitCreationAttributes>
  implements HabitAttributes
{
  declare id: string;
  declare userId: string;
  declare areaId: string;
  declare name: string;
  declare frequency: HabitFrequency;
  declare durationMinutes: number | undefined;
  declare difficulty: HabitDifficulty | undefined;
  declare notes: string | undefined;
  declare reminderTime: string | undefined;
  declare reminderEnabled: boolean;
  declare timezone: string | undefined;
  declare archivedAt: Date | null | undefined;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof Habit {
    Habit.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: { model: "users", key: "id" },
          onDelete: "CASCADE",
        },
        areaId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: { model: "life_areas", key: "id" },
          onDelete: "CASCADE",
        },
        name: { type: DataTypes.STRING(255), allowNull: false },
        frequency: {
          type: DataTypes.ENUM("daily", "weekdays", "3x", "5x", "weekly"),
          allowNull: false,
        },
        durationMinutes: { type: DataTypes.INTEGER, allowNull: true },
        difficulty: {
          type: DataTypes.ENUM("easy", "medium", "hard"),
          allowNull: true,
        },
        notes: { type: DataTypes.TEXT, allowNull: true },
        reminderTime: { type: DataTypes.TIME, allowNull: true },
        reminderEnabled: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
          allowNull: false,
        },
        timezone: { type: DataTypes.STRING(64), allowNull: true },
        archivedAt: { type: DataTypes.DATE, allowNull: true },
      },
      {
        sequelize,
        tableName: "habits",
        timestamps: true,
        underscored: true,
      },
    );
    return Habit;
  }
}
