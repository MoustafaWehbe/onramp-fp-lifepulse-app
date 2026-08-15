"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("notification_logs", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
      },
      // e.g. "reengagement_7d". Kept as a plain string rather than an enum so
      // new notification types don't require a migration.
      type: { type: Sequelize.STRING(50), allowNull: false },
      channel: { type: Sequelize.STRING(20), allowNull: false },
      sent_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });

    // The sweep's hot path is "most recent notification for this user".
    await queryInterface.addIndex("notification_logs", ["user_id", "sent_at"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("notification_logs");
  },
};
