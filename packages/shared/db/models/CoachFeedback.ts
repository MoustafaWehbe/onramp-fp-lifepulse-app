import { Model, DataTypes, type Sequelize, type Optional } from "sequelize";

export interface CoachFeedbackAttributes {
  id: string;
  coachRequestId: string;
  coachId: string;
  body: string;
  createdAt?: Date;
}

export interface CoachFeedbackCreationAttributes
  extends Optional<CoachFeedbackAttributes, "id"> {}

export class CoachFeedback
  extends Model<CoachFeedbackAttributes, CoachFeedbackCreationAttributes>
  implements CoachFeedbackAttributes
{
  declare id: string;
  declare coachRequestId: string;
  declare coachId: string;
  declare body: string;
  declare readonly createdAt: Date;

  static initModel(sequelize: Sequelize): typeof CoachFeedback {
    CoachFeedback.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        coachRequestId: { type: DataTypes.UUID, allowNull: false },
        coachId: { type: DataTypes.UUID, allowNull: false },
        body: { type: DataTypes.TEXT, allowNull: false },
      },
      {
        sequelize,
        tableName: "coach_feedback",
        timestamps: true,
        updatedAt: false,
        underscored: true,
      },
    );
    return CoachFeedback;
  }
}