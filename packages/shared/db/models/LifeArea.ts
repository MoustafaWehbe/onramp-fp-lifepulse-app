import { Model, DataTypes, type Sequelize, type Optional } from "sequelize";

export interface LifeAreaAttributes {
  id: string;
  userId: string;
  name: string;
  color: string;
  description?: string | null;
  sortOrder: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface LifeAreaCreationAttributes extends Optional<
  LifeAreaAttributes,
  "id" | "description" | "sortOrder"
> {}

export class LifeArea
  extends Model<LifeAreaAttributes, LifeAreaCreationAttributes>
  implements LifeAreaAttributes
{
  declare id: string;
  declare userId: string;
  declare name: string;
  declare color: string;
  declare description: string | null | undefined;
  declare sortOrder: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof LifeArea {
    LifeArea.init(
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
        name: { type: DataTypes.STRING(255), allowNull: false },
        color: { type: DataTypes.STRING(50), allowNull: false },
        description: { type: DataTypes.TEXT, allowNull: true },
        sortOrder: {
          type: DataTypes.INTEGER,
          defaultValue: 0,
          allowNull: false,
        },
      },
      {
        sequelize,
        tableName: "life_areas",
        timestamps: true,
        underscored: true,
      },
    );
    return LifeArea;
  }
}
