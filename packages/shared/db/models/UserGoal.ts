import { Model, DataTypes, type Sequelize, type Optional } from "sequelize";

export interface UserGoalAttributes {
  id: string;
  userId: string;
  goalId: string;
  createdAt?: Date;
}

export interface UserGoalCreationAttributes extends Optional<
  UserGoalAttributes,
  "id"
> {}

export class UserGoal
  extends Model<UserGoalAttributes, UserGoalCreationAttributes>
  implements UserGoalAttributes
{
  declare id: string;
  declare userId: string;
  declare goalId: string;
  declare readonly createdAt: Date;

  static initModel(sequelize: Sequelize): typeof UserGoal {
    UserGoal.init(
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
        goalId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: { model: "goals", key: "id" },
          onDelete: "CASCADE",
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        tableName: "user_goals",
        timestamps: true,
        updatedAt: false,
        underscored: true,
        indexes: [
          {
            unique: true,
            fields: ["user_id", "goal_id"],
          },
        ],
      },
    );
    return UserGoal;
  }
}
