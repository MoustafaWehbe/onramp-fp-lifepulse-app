"use strict";

/**
 * Carries the practical note the model writes alongside each suggestion, so
 * accepting one lands a habit that already has its `notes` filled in.
 *
 * Separate from `rationale`: the rationale argues why this habit suits this
 * user and is only ever read in the suggestion card, while the note is advice
 * for doing the habit itself and follows it onto the habit row permanently.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("ai_suggestions", "notes", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("ai_suggestions", "notes");
  },
};
