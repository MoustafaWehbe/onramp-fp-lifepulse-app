"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("coach_profiles", "display_name", {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("coach_profiles", "display_name");
  },
};