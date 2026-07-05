import { Model, DataTypes, type Sequelize, type Optional } from "sequelize";

export interface HabitCompletionAttributes {
  id: string;
  habitId: string;
  userId: string;
  completionDate: string;
  completed: boolean;
  createdAt?: Date;
}

export interface HabitCompletionCreationAttributes extends Optional<
  HabitCompletionAttributes,
  "id" | "completed"
> {}

export class HabitCompletion
  extends Model<HabitCompletionAttributes, HabitCompletionCreationAttributes>
  implements HabitCompletionAttributes
{
  declare id: string;
  declare habitId: string;
  declare userId: string;
  declare completionDate: string;
  declare completed: boolean;
  declare readonly createdAt: Date;

  static initModel(sequelize: Sequelize): typeof HabitCompletion {
    HabitCompletion.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        habitId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: { model: "habits", key: "id" },
          onDelete: "CASCADE",
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: { model: "users", key: "id" },
          onDelete: "CASCADE",
        },
        completionDate: {
          type: DataTypes.DATEONLY,
          allowNull: false,
        },
        completed: {
          type: DataTypes.BOOLEAN,
          defaultValue: true,
          allowNull: false,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
      },
      {
        sequelize,
        tableName: "habit_completions",
        timestamps: true,
        updatedAt: false,
        underscored: true,
        indexes: [
          {
            unique: true,
            fields: ["habit_id", "completion_date"],
          },
        ],
      },
    );
    return HabitCompletion;
  }
}
