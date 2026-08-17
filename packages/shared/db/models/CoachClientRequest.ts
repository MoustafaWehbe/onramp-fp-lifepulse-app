import { Model, DataTypes, type Sequelize, type Optional } from "sequelize";

export interface CoachClientRequestAttributes {
  id: string;
  requesterId: string;
  coachId: string;
  status: "pending" | "accepted" | "declined";
  shareHabits: boolean;
  shareProfile: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

type OptionalFields = "id" | "status" | "shareHabits" | "shareProfile";

export interface CoachClientRequestCreationAttributes extends Optional<CoachClientRequestAttributes, OptionalFields> {}

export class CoachClientRequest extends Model<CoachClientRequestAttributes, CoachClientRequestCreationAttributes> implements CoachClientRequestAttributes {
  declare id: string;
  declare requesterId: string;
  declare coachId: string;
  declare status: "pending" | "accepted" | "declined";
  declare shareHabits: boolean;
  declare shareProfile: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof CoachClientRequest {
    CoachClientRequest.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        requesterId: { type: DataTypes.UUID, allowNull: false },
        coachId: { type: DataTypes.UUID, allowNull: false },
        status: {
          type: DataTypes.ENUM("pending", "accepted", "declined"),
          defaultValue: "pending",
          allowNull: false,
        },
        shareHabits: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
          allowNull: false,
        },
        shareProfile: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
          allowNull: false,
        },
      },
      {
        sequelize,
        tableName: "coach_client_requests",
        timestamps: true,
        underscored: true,
      },
    );
    return CoachClientRequest;
  }
}