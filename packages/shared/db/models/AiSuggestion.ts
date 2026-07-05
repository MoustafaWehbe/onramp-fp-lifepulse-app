import { Model, DataTypes, type Sequelize, type Optional } from "sequelize";
import type {
  AiSuggestionStatus,
  HabitDifficulty,
  HabitFrequency,
} from "../types";

export interface AiSuggestionAttributes {
  id: string;
  userId: string;
  areaId: string;
  suggestedName: string;
  rationale?: string;
  frequency: HabitFrequency;
  durationMinutes?: number;
  difficulty?: HabitDifficulty;
  status: AiSuggestionStatus;
  acceptedHabitId?: string;
  model?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AiSuggestionCreationAttributes extends Optional<
  AiSuggestionAttributes,
  | "id"
  | "rationale"
  | "durationMinutes"
  | "difficulty"
  | "status"
  | "acceptedHabitId"
  | "model"
> {}

export class AiSuggestion
  extends Model<AiSuggestionAttributes, AiSuggestionCreationAttributes>
  implements AiSuggestionAttributes
{
  declare id: string;
  declare userId: string;
  declare areaId: string;
  declare suggestedName: string;
  declare rationale: string | undefined;
  declare frequency: HabitFrequency;
  declare durationMinutes: number | undefined;
  declare difficulty: HabitDifficulty | undefined;
  declare status: AiSuggestionStatus;
  declare acceptedHabitId: string | undefined;
  declare model: string | undefined;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof AiSuggestion {
    AiSuggestion.init(
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
        suggestedName: { type: DataTypes.STRING(255), allowNull: false },
        rationale: { type: DataTypes.TEXT, allowNull: true },
        frequency: {
          type: DataTypes.ENUM("daily", "weekdays", "3x", "5x", "weekly"),
          allowNull: false,
        },
        durationMinutes: { type: DataTypes.INTEGER, allowNull: true },
        difficulty: {
          type: DataTypes.ENUM("easy", "medium", "hard"),
          allowNull: true,
        },
        status: {
          type: DataTypes.ENUM("pending", "accepted", "dismissed"),
          defaultValue: "pending",
          allowNull: false,
        },
        acceptedHabitId: {
          type: DataTypes.UUID,
          allowNull: true,
          references: { model: "habits", key: "id" },
          onDelete: "SET NULL",
        },
        model: { type: DataTypes.STRING(100), allowNull: true },
      },
      {
        sequelize,
        tableName: "ai_suggestions",
        timestamps: true,
        underscored: true,
      },
    );
    return AiSuggestion;
  }
}
