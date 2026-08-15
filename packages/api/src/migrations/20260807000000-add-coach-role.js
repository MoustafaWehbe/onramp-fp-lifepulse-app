"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {

    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_users_role" ADD VALUE IF NOT EXISTS 'coach';`,
    );

    await queryInterface.createTable("coach_client_requests", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      requester_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
      },
      coach_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
      },
      status: {
        type: Sequelize.ENUM("pending", "accepted", "declined"),
        defaultValue: "pending",
        allowNull: false,
      },
      share_habits: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      share_profile: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addConstraint("coach_client_requests", {
      fields: ["requester_id", "coach_id"],
      type: "unique",
      name: "unique_requester_coach",
    });

    await queryInterface.createTable("coach_feedback", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      coach_request_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "coach_client_requests", key: "id" },
        onDelete: "CASCADE",
      },
      coach_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
      },
      body: { type: Sequelize.TEXT, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("coach_feedback");
    await queryInterface.dropTable("coach_client_requests");

  },
};