"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("habits", "days_of_week", {
      // Explicit weekdays (0=Sun..6=Sat, matches JS Date#getDay() and cron
      // day-of-week) this habit is scheduled/reminded on. Only meaningful for
      // "3x" / "5x" / "weekly" frequencies — "daily" and "weekdays" already
      // imply their days. Null means "unspecified": reminders fall back to
      // firing every day and relying on the already-checked-in suppression.
      type: Sequelize.ARRAY(Sequelize.INTEGER),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("habits", "days_of_week");
  },
};
