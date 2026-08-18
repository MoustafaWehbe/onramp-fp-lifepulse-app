"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("coach_profiles", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
        primaryKey: true,
      },

      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: "users",
          key: "id",
        },
        onDelete: "CASCADE",
      },

      coaching_title: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },

      bio: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      specialties: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },

      years_experience: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      verification_status: {
        type: Sequelize.ENUM(
          "pending",
          "verified",
          "rejected"
        ),
        allowNull: false,
        defaultValue: "pending",
      },

      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },

      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("coach_profiles");

    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_coach_profiles_verification_status";'
    );
  },
};