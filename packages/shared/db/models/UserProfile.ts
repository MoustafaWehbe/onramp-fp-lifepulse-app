import { Model, DataTypes, type Sequelize, type Optional } from "sequelize";
import type {
  AgeRange,
  EducationLevel,
  EnergyPattern,
  LivingSituation,
  MotivationDriver,
  StressBaseline,
  WorkloadIntensity,
} from "../types";

export interface UserProfileAttributes {
  id: string;
  userId: string;
  ageRange?: AgeRange;
  profession?: string;
  industry?: string;
  educationLevel?: EducationLevel;
  livingSituation?: LivingSituation;
  lifestyleTypes?: string[];
  stressSources?: string[];
  dailyFreeTime?: number;
  energyPattern?: EnergyPattern;
  stressBaseline?: StressBaseline;
  workloadIntensity?: WorkloadIntensity;
  motivationDriver?: MotivationDriver;
  failureResponse?: string;
  topValues?: string[];
  identityStatements?: string[];
  badHabits?: string[];
  stressLevel?: number;
  sleepHours?: number;
  onboarded: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserProfileCreationAttributes extends Optional<
  UserProfileAttributes,
  | "id"
  | "ageRange"
  | "profession"
  | "industry"
  | "educationLevel"
  | "livingSituation"
  | "lifestyleTypes"
  | "stressSources"
  | "dailyFreeTime"
  | "energyPattern"
  | "stressBaseline"
  | "workloadIntensity"
  | "motivationDriver"
  | "failureResponse"
  | "topValues"
  | "identityStatements"
  | "badHabits"
  | "stressLevel"
  | "sleepHours"
  | "onboarded"
> {}

export class UserProfile
  extends Model<UserProfileAttributes, UserProfileCreationAttributes>
  implements UserProfileAttributes
{
  declare id: string;
  declare userId: string;
  declare ageRange: AgeRange | undefined;
  declare profession: string | undefined;
  declare industry: string | undefined;
  declare educationLevel: EducationLevel | undefined;
  declare livingSituation: LivingSituation | undefined;
  declare lifestyleTypes: string[] | undefined;
  declare stressSources: string[] | undefined;
  declare dailyFreeTime: number | undefined;
  declare energyPattern: EnergyPattern | undefined;
  declare stressBaseline: StressBaseline | undefined;
  declare workloadIntensity: WorkloadIntensity | undefined;
  declare motivationDriver: MotivationDriver | undefined;
  declare failureResponse: string | undefined;
  declare topValues: string[] | undefined;
  declare identityStatements: string[] | undefined;
  declare badHabits: string[] | undefined;
  declare stressLevel: number | undefined;
  declare sleepHours: number | undefined;
  declare onboarded: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof UserProfile {
    UserProfile.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
          unique: true,
          references: { model: "users", key: "id" },
          onDelete: "CASCADE",
        },
        ageRange: {
          type: DataTypes.ENUM("18-24", "25-34", "35-44", "45-54", "55+"),
          allowNull: true,
        },
        profession: { type: DataTypes.STRING(255), allowNull: true },
        industry: { type: DataTypes.STRING(255), allowNull: true },
        educationLevel: {
          type: DataTypes.ENUM(
            "high_school",
            "associate",
            "bachelor",
            "master",
            "doctorate",
            "other",
          ),
          allowNull: true,
        },
        livingSituation: {
          type: DataTypes.ENUM("apartment", "house", "dormitory", "other"),
          allowNull: true,
        },
        lifestyleTypes: { type: DataTypes.JSONB, allowNull: true },
        stressSources: { type: DataTypes.JSONB, allowNull: true },
        dailyFreeTime: { type: DataTypes.INTEGER, allowNull: true },
        energyPattern: {
          type: DataTypes.ENUM("morning", "afternoon", "evening"),
          allowNull: true,
        },
        stressBaseline: {
          type: DataTypes.ENUM("low", "medium", "high"),
          allowNull: true,
        },
        workloadIntensity: {
          type: DataTypes.ENUM("low", "medium", "high"),
          allowNull: true,
        },
        motivationDriver: {
          type: DataTypes.ENUM(
            "achievement",
            "health",
            "family",
            "financial_freedom",
            "other",
          ),
          allowNull: true,
        },
        failureResponse: { type: DataTypes.TEXT, allowNull: true },
        topValues: { type: DataTypes.JSONB, allowNull: true },
        identityStatements: { type: DataTypes.JSONB, allowNull: true },
        badHabits: { type: DataTypes.JSONB, allowNull: true },
        stressLevel: { type: DataTypes.SMALLINT, allowNull: true },
        sleepHours: { type: DataTypes.DECIMAL(4, 2), allowNull: true },
        onboarded: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
          allowNull: false,
        },
      },
      {
        sequelize,
        tableName: "user_profiles",
        timestamps: true,
        underscored: true,
      },
    );
    return UserProfile;
  }
}
