"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("habits", "reminder_enabled", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.addColumn("habits", "reminder_time", {
      // Local time-of-day the reminder should fire at, e.g. "07:30:00".
      // Interpreted using the `timezone` column below.
      type: Sequelize.TIME,
      allowNull: true,
    });

    await queryInterface.addColumn("habits", "timezone", {
      // IANA timezone name, e.g. "America/New_York". Required whenever
      // reminder_enabled is true so the scheduler fires at the right wall-clock time.
      type: Sequelize.STRING(64),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("habits", "timezone");
    await queryInterface.removeColumn("habits", "reminder_time");
    await queryInterface.removeColumn("habits", "reminder_enabled");
  },
};
