import { Model, DataTypes, type Sequelize, type Optional } from "sequelize";

export interface NotificationPreferenceAttributes {
  id: string;
  userId: string;
  emailRemindersEnabled: boolean;
  reengagementEnabled: boolean;
  /**
   * Random opaque token embedded in email footers so users can opt out without
   * logging in. Rotating it invalidates every previously sent link.
   */
  unsubscribeToken: string;
  /** "HH:mm" local time; notifications inside the window are suppressed. */
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
  /** IANA timezone the quiet-hours window is expressed in. */
  timezone?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface NotificationPreferenceCreationAttributes
  extends Optional<
    NotificationPreferenceAttributes,
    | "id"
    | "emailRemindersEnabled"
    | "reengagementEnabled"
    | "unsubscribeToken"
    | "quietHoursStart"
    | "quietHoursEnd"
    | "timezone"
  > {}

export class NotificationPreference
  extends Model<
    NotificationPreferenceAttributes,
    NotificationPreferenceCreationAttributes
  >
  implements NotificationPreferenceAttributes
{
  declare id: string;
  declare userId: string;
  declare emailRemindersEnabled: boolean;
  declare reengagementEnabled: boolean;
  declare unsubscribeToken: string;
  declare quietHoursStart: string | null | undefined;
  declare quietHoursEnd: string | null | undefined;
  declare timezone: string | null | undefined;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof NotificationPreference {
    NotificationPreference.init(
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
        emailRemindersEnabled: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        reengagementEnabled: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        unsubscribeToken: {
          type: DataTypes.STRING(64),
          allowNull: false,
          unique: true,
          defaultValue: DataTypes.UUIDV4,
        },
        quietHoursStart: { type: DataTypes.STRING(5), allowNull: true },
        quietHoursEnd: { type: DataTypes.STRING(5), allowNull: true },
        timezone: { type: DataTypes.STRING(64), allowNull: true },
      },
      {
        sequelize,
        tableName: "notification_preferences",
        timestamps: true,
        underscored: true,
      },
    );
    return NotificationPreference;
  }
}
