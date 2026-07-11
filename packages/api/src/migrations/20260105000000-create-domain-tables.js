"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("user_profiles", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
      },
      age_range: {
        type: Sequelize.ENUM("18-24", "25-34", "35-44", "45-54", "55+"),
        allowNull: true,
      },
      profession: { type: Sequelize.STRING(255), allowNull: true },
      industry: { type: Sequelize.STRING(255), allowNull: true },
      education_level: {
        type: Sequelize.ENUM(
          "high_school",
          "associate",
          "bachelor",
          "master",
          "doctorate",
          "other",
        ),
        allowNull: true,
      },
      living_situation: {
        type: Sequelize.ENUM("apartment", "house", "dormitory", "other"),
        allowNull: true,
      },
      lifestyle_types: { type: Sequelize.JSONB, allowNull: true },
      stress_sources: { type: Sequelize.JSONB, allowNull: true },
      daily_free_time: { type: Sequelize.INTEGER, allowNull: true },
      energy_pattern: {
        type: Sequelize.ENUM("morning", "afternoon", "evening"),
        allowNull: true,
      },
      stress_baseline: {
        type: Sequelize.ENUM("low", "medium", "high"),
        allowNull: true,
      },
      workload_intensity: {
        type: Sequelize.ENUM("low", "medium", "high"),
        allowNull: true,
      },
      motivation_driver: {
        type: Sequelize.ENUM(
          "achievement",
          "health",
          "family",
          "financial_freedom",
          "other",
        ),
        allowNull: true,
      },
      failure_response: { type: Sequelize.TEXT, allowNull: true },
      top_values: { type: Sequelize.JSONB, allowNull: true },
      identity_statements: { type: Sequelize.JSONB, allowNull: true },
      bad_habits: { type: Sequelize.JSONB, allowNull: true },
      stress_level: { type: Sequelize.SMALLINT, allowNull: true },
      sleep_hours: { type: Sequelize.DECIMAL(4, 2), allowNull: true },
      onboarded: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable("goals", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
        primaryKey: true,
      },
      slug: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
      },
      label: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
    });

    await queryInterface.createTable("user_goals", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
      },
      goal_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "goals", key: "id" },
        onDelete: "CASCADE",
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex("user_goals", ["user_id", "goal_id"], {
      unique: true,
      name: "user_goals_user_id_goal_id_unique",
    });

    await queryInterface.createTable("life_areas", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
      },
      name: { type: Sequelize.STRING(255), allowNull: false },
      color: { type: Sequelize.STRING(50), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      sort_order: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable("habits", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
      },
      area_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "life_areas", key: "id" },
        onDelete: "CASCADE",
      },
      name: { type: Sequelize.STRING(255), allowNull: false },
      frequency: {
        type: Sequelize.ENUM("daily", "weekdays", "3x", "5x", "weekly"),
        allowNull: false,
      },
      duration_minutes: { type: Sequelize.INTEGER, allowNull: true },
      difficulty: {
        type: Sequelize.ENUM("easy", "medium", "hard"),
        allowNull: true,
      },
      notes: { type: Sequelize.TEXT, allowNull: true },
      archived_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable("habit_completions", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
        primaryKey: true,
      },
      habit_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "habits", key: "id" },
        onDelete: "CASCADE",
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
      },
      completion_date: { type: Sequelize.DATEONLY, allowNull: false },
      completed: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex(
      "habit_completions",
      ["habit_id", "completion_date"],
      {
        unique: true,
        name: "habit_completions_habit_id_completion_date_unique",
      },
    );

    await queryInterface.createTable("ai_suggestions", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
      },
      area_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "life_areas", key: "id" },
        onDelete: "CASCADE",
      },
      suggested_name: { type: Sequelize.STRING(255), allowNull: false },
      rationale: { type: Sequelize.TEXT, allowNull: true },
      frequency: {
        type: Sequelize.ENUM("daily", "weekdays", "3x", "5x", "weekly"),
        allowNull: false,
      },
      duration_minutes: { type: Sequelize.INTEGER, allowNull: true },
      difficulty: {
        type: Sequelize.ENUM("easy", "medium", "hard"),
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM("pending", "accepted", "dismissed"),
        defaultValue: "pending",
        allowNull: false,
      },
      accepted_habit_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "habits", key: "id" },
        onDelete: "SET NULL",
      },
      model: { type: Sequelize.STRING(100), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable("embeddings", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
        primaryKey: true,
      },
      entity_type: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      entity_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      embedding: {
        type: Sequelize.ARRAY(Sequelize.REAL),
        allowNull: false,
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex("embeddings", ["entity_type", "entity_id"], {
      name: "embeddings_entity_type_entity_id_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("embeddings");
    await queryInterface.dropTable("ai_suggestions");
    await queryInterface.dropTable("habit_completions");
    await queryInterface.dropTable("habits");
    await queryInterface.dropTable("life_areas");
    await queryInterface.dropTable("user_goals");
    await queryInterface.dropTable("goals");
    await queryInterface.dropTable("user_profiles");

    await queryInterface.sequelize.query(
      "DROP TYPE IF EXISTS enum_user_profiles_age_range;",
    );
    await queryInterface.sequelize.query(
      "DROP TYPE IF EXISTS enum_user_profiles_education_level;",
    );
    await queryInterface.sequelize.query(
      "DROP TYPE IF EXISTS enum_user_profiles_living_situation;",
    );
    await queryInterface.sequelize.query(
      "DROP TYPE IF EXISTS enum_user_profiles_energy_pattern;",
    );
    await queryInterface.sequelize.query(
      "DROP TYPE IF EXISTS enum_user_profiles_stress_baseline;",
    );
    await queryInterface.sequelize.query(
      "DROP TYPE IF EXISTS enum_user_profiles_workload_intensity;",
    );
    await queryInterface.sequelize.query(
      "DROP TYPE IF EXISTS enum_user_profiles_motivation_driver;",
    );
    await queryInterface.sequelize.query(
      "DROP TYPE IF EXISTS enum_habits_frequency;",
    );
    await queryInterface.sequelize.query(
      "DROP TYPE IF EXISTS enum_habits_difficulty;",
    );
    await queryInterface.sequelize.query(
      "DROP TYPE IF EXISTS enum_ai_suggestions_frequency;",
    );
    await queryInterface.sequelize.query(
      "DROP TYPE IF EXISTS enum_ai_suggestions_difficulty;",
    );
    await queryInterface.sequelize.query(
      "DROP TYPE IF EXISTS enum_ai_suggestions_status;",
    );
  },
};
