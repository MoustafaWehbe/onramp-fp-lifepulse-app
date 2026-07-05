"use strict";

const { randomUUID } = require("crypto");

const GOALS = [
  { slug: "focus-clarity", label: "Focus & Clarity" },
  { slug: "physical-vitality", label: "Physical Vitality" },
  { slug: "career-growth", label: "Career Growth" },
  { slug: "better-sleep", label: "Better Sleep" },
  { slug: "stress-reduction", label: "Stress Reduction" },
  { slug: "creative-mastery", label: "Creative Mastery" },
  { slug: "stronger-relationships", label: "Stronger Relationships" },
  { slug: "learning", label: "Learning" },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert(
      "goals",
      GOALS.map((goal) => ({
        id: randomUUID(),
        slug: goal.slug,
        label: goal.label,
      })),
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("goals", {
      slug: GOALS.map((goal) => goal.slug),
    });
  },
};
