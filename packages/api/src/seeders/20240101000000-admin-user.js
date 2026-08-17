"use strict";

const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const ADMIN_ID = "00000000-0000-0000-0000-000000000001";

/**
 * A seeder that plants a fixed, publicly known password is a backdoor the
 * moment it runs anywhere real. The password is random unless ADMIN_PASSWORD is
 * set explicitly, and it is printed once so a local developer can still use it.
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const email = process.env.ADMIN_EMAIL || "admin@example.com";
    const provided = process.env.ADMIN_PASSWORD;

    if (!provided && process.env.NODE_ENV === "production") {
      throw new Error(
        "Refusing to seed an admin user in production without ADMIN_PASSWORD set.",
      );
    }

    const password = provided || crypto.randomBytes(18).toString("base64url");
    const passwordHash = await bcrypt.hash(password, 12);

    await queryInterface.bulkInsert("users", [
      {
        id: ADMIN_ID,
        email,
        password_hash: passwordHash,
        name: "Admin User",
        role: "admin",
        email_verified: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);

    if (!provided) {
      console.info(
        `\nSeeded admin user ${email} with generated password: ${password}\n` +
          "This is shown once. Change it after first login.\n",
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("users", { id: ADMIN_ID });
  },
};
