import { Model, DataTypes, type Sequelize, type Optional } from "sequelize";

/**
 * A client's invitation to a coach, and the permission grant attached to it.
 *
 * The three share flags are the whole permission model. They belong to the
 * requester: only they can set them, and they're read at the moment the coach
 * acts, so withdrawing one takes effect immediately.
 *
 * `editHabits` implies `shareHabits` — the service refuses a grant to change
 * habits the coach cannot see.
 */
export interface CoachClientRequestAttributes {
  id: string;
  requesterId: string;
  coachId: string;
  status: "pending" | "accepted" | "declined";
  shareHabits: boolean;
  shareProfile: boolean;
  editHabits: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

type OptionalFields =
  | "id"
  | "status"
  | "shareHabits"
  | "shareProfile"
  | "editHabits";

export interface CoachClientRequestCreationAttributes extends Optional<CoachClientRequestAttributes, OptionalFields> {}

export class CoachClientRequest extends Model<CoachClientRequestAttributes, CoachClientRequestCreationAttributes> implements CoachClientRequestAttributes {
  declare id: string;
  declare requesterId: string;
  declare coachId: string;
  declare status: "pending" | "accepted" | "declined";
  declare shareHabits: boolean;
  declare shareProfile: boolean;
  declare editHabits: boolean;
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
        editHabits: {
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
