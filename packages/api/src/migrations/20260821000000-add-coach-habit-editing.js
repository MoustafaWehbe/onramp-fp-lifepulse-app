"use strict";

/**
 * Lets a client grant their coach permission to adjust their habits, on top of
 * the existing view-only grants.
 *
 * `edit_habits` is a third grant rather than an extension of `share_habits`
 * because seeing a plan and rewriting it are different levels of trust — a
 * client should be able to give the first without the second. The application
 * enforces that editing implies viewing; the column can't express that alone.
 *
 * `coach_feedback.kind` separates a note the coach typed from a record of a
 * change they made. Habit edits are written into the same thread so the client
 * always finds out what changed and when, instead of discovering a rewritten
 * habit on their Today screen with no explanation.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("coach_client_requests", "edit_habits", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.addColumn("coach_feedback", "kind", {
      type: Sequelize.ENUM("note", "habit_change"),
      allowNull: false,
      defaultValue: "note",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("coach_client_requests", "edit_habits");
    await queryInterface.removeColumn("coach_feedback", "kind");
    await queryInterface.sequelize.query(
      `DROP TYPE IF EXISTS "enum_coach_feedback_kind";`,
    );
  },
};
