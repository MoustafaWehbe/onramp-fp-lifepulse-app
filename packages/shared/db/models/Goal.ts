import { Model, DataTypes, type Sequelize, type Optional } from "sequelize";

export interface GoalAttributes {
  id: string;
  slug: string;
  label: string;
}

export interface GoalCreationAttributes extends Optional<
  GoalAttributes,
  "id"
> {}

export class Goal
  extends Model<GoalAttributes, GoalCreationAttributes>
  implements GoalAttributes
{
  declare id: string;
  declare slug: string;
  declare label: string;

  static initModel(sequelize: Sequelize): typeof Goal {
    Goal.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        slug: {
          type: DataTypes.STRING(100),
          allowNull: false,
          unique: true,
        },
        label: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
      },
      {
        sequelize,
        tableName: "goals",
        timestamps: false,
        underscored: true,
      },
    );
    return Goal;
  }
}
