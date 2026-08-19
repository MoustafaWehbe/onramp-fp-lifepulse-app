"use strict";

/**
 * Removes coach verification, which only ever meant "an admin approved this".
 * With the admin role gone there is no one to approve anything, and leaving
 * the columns behind would mean every new coach sat invisible in a "pending"
 * state forever.
 *
 * Coaches now appear in the directory as soon as they register, and their
 * credentials are presented to users as self-reported — which is what they
 * were in substance all along.
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.removeColumn("coach_profiles", "verification_status");
    await queryInterface.sequelize.query(
      `DROP TYPE IF EXISTS "enum_coach_profiles_verification_status";`,
    );
    await queryInterface.removeColumn("coach_credentials", "verified");
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn("coach_profiles", "verification_status", {
      type: Sequelize.ENUM("pending", "verified", "rejected"),
      allowNull: false,
      // Everything that survives to a rollback was live in the directory, so
      // "verified" is the state that keeps those coaches visible.
      defaultValue: "verified",
    });
    await queryInterface.addColumn("coach_credentials", "verified", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  },
};
