import { Model, DataTypes, type Sequelize, type Optional } from "sequelize";

/**
 * An entry in the thread between a coach and their client.
 *
 * `kind` distinguishes a note the coach wrote from a record of a change they
 * made to the client's habits. Both live in one thread on purpose: the client
 * reads a single history of what their coach said and did, rather than having
 * to notice an edited habit somewhere else in the app.
 */
export type CoachFeedbackKind = "note" | "habit_change";

export interface CoachFeedbackAttributes {
  id: string;
  coachRequestId: string;
  coachId: string;
  kind: CoachFeedbackKind;
  body: string;
  createdAt?: Date;
}

export interface CoachFeedbackCreationAttributes
  extends Optional<CoachFeedbackAttributes, "id" | "kind"> {}

export class CoachFeedback
  extends Model<CoachFeedbackAttributes, CoachFeedbackCreationAttributes>
  implements CoachFeedbackAttributes
{
  declare id: string;
  declare coachRequestId: string;
  declare coachId: string;
  declare kind: CoachFeedbackKind;
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
        kind: {
          type: DataTypes.ENUM("note", "habit_change"),
          allowNull: false,
          defaultValue: "note",
        },
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
