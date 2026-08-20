"use strict";

/**
 * Drops the "admin" role. The product has exactly two kinds of account —
 * people who track their own habits, and coaches they invite — so a
 * privileged third role bought nothing and had to be defended forever.
 *
 * Any existing admin is demoted to "user" rather than deleted: the row may own
 * areas, habits and check-ins, and losing those silently would be worse than
 * losing a permission nobody uses any more.
 *
 * Postgres has no DROP VALUE for enums, so the type is rebuilt.
 */
module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      await sequelize.query(
        `UPDATE "users" SET "role" = 'user' WHERE "role" = 'admin';`,
        { transaction },
      );

      await sequelize.query(
        `CREATE TYPE "enum_users_role_new" AS ENUM ('user', 'coach');`,
        { transaction },
      );

      // The column default references the old type, so it has to come off
      // before the cast and go back on after.
      await sequelize.query(
        `ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;`,
        { transaction },
      );
      await sequelize.query(
        `ALTER TABLE "users"
           ALTER COLUMN "role" TYPE "enum_users_role_new"
           USING ("role"::text::"enum_users_role_new");`,
        { transaction },
      );
      await sequelize.query(
        `ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'user';`,
        { transaction },
      );

      await sequelize.query(`DROP TYPE "enum_users_role";`, { transaction });
      await sequelize.query(
        `ALTER TYPE "enum_users_role_new" RENAME TO "enum_users_role";`,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    // Restores the value in the enum only. Which accounts used to be admins is
    // not recoverable — that information is gone by design.
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_users_role" ADD VALUE IF NOT EXISTS 'admin';`,
    );
  },
};
