import { Model, DataTypes, type Sequelize, type Optional } from "sequelize";

export interface EmbeddingAttributes {
  id: string;
  entityType: string;
  entityId: string;
  content: string;
  embedding: number[];
  createdAt?: Date;
}

export interface EmbeddingCreationAttributes extends Optional<
  EmbeddingAttributes,
  "id"
> {}

export class Embedding
  extends Model<EmbeddingAttributes, EmbeddingCreationAttributes>
  implements EmbeddingAttributes
{
  declare id: string;
  declare entityType: string;
  declare entityId: string;
  declare content: string;
  declare embedding: number[];
  declare readonly createdAt: Date;

  static initModel(sequelize: Sequelize): typeof Embedding {
    Embedding.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        entityType: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        entityId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        content: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        embedding: {
          type: DataTypes.ARRAY(DataTypes.REAL),
          allowNull: false,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
      },
      {
        sequelize,
        tableName: "embeddings",
        timestamps: true,
        updatedAt: false,
        underscored: true,
        indexes: [
          {
            fields: ["entity_type", "entity_id"],
          },
        ],
      },
    );
    return Embedding;
  }
}
