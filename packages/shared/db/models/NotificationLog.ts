import { Model, DataTypes, type Sequelize, type Optional } from "sequelize";
import type { NotificationChannel, NotificationType } from "../types";

export interface NotificationLogAttributes {
  id: string;
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  sentAt: Date;
}

export interface NotificationLogCreationAttributes
  extends Optional<NotificationLogAttributes, "id" | "sentAt"> {}

/**
 * Append-only record of non-transactional messages. Doubles as the frequency
 * cap for re-engagement: the sweep reads the most recent row per user to
 * decide whether enough time has passed and which rung was last sent.
 */
export class NotificationLog
  extends Model<NotificationLogAttributes, NotificationLogCreationAttributes>
  implements NotificationLogAttributes
{
  declare id: string;
  declare userId: string;
  declare type: NotificationType;
  declare channel: NotificationChannel;
  declare sentAt: Date;

  static initModel(sequelize: Sequelize): typeof NotificationLog {
    NotificationLog.init(
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
        type: { type: DataTypes.STRING(50), allowNull: false },
        channel: { type: DataTypes.STRING(20), allowNull: false },
        sentAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        tableName: "notification_logs",
        timestamps: false,
        underscored: true,
        indexes: [{ fields: ["user_id", "sent_at"] }],
      },
    );
    return NotificationLog;
  }
}
