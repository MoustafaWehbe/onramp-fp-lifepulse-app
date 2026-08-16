"use strict";

/**
 * Web Push was replaced by an in-app popup on /today plus the existing email
 * reminders, so the subscription store and its preference flag are dead weight.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.removeColumn("notification_preferences", "push_enabled");
    await queryInterface.dropTable("push_subscriptions");
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.createTable("push_subscriptions", {
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
      endpoint: { type: Sequelize.TEXT, allowNull: false, unique: true },
      p256dh: { type: Sequelize.STRING(255), allowNull: false },
      auth: { type: Sequelize.STRING(255), allowNull: false },
      user_agent: { type: Sequelize.TEXT, allowNull: true },
      last_used_at: { type: Sequelize.DATE, allowNull: true },
      failure_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });

    await queryInterface.addIndex("push_subscriptions", ["user_id"]);

    await queryInterface.addColumn("notification_preferences", "push_enabled", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });
  },
};
