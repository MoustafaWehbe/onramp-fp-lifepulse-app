-- Cleanup partial domain tables from a failed migration run.
-- Safe: does not touch users / sessions / refresh_tokens.

DROP TABLE IF EXISTS embeddings CASCADE;
DROP TABLE IF EXISTS ai_suggestions CASCADE;
DROP TABLE IF EXISTS habit_completions CASCADE;
DROP TABLE IF EXISTS habits CASCADE;
DROP TABLE IF EXISTS life_areas CASCADE;
DROP TABLE IF EXISTS user_goals CASCADE;
DROP TABLE IF EXISTS goals CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

DROP TYPE IF EXISTS enum_user_profiles_age_range;
DROP TYPE IF EXISTS enum_user_profiles_education_level;
DROP TYPE IF EXISTS enum_user_profiles_living_situation;
DROP TYPE IF EXISTS enum_user_profiles_energy_pattern;
DROP TYPE IF EXISTS enum_user_profiles_stress_baseline;
DROP TYPE IF EXISTS enum_user_profiles_workload_intensity;
DROP TYPE IF EXISTS enum_user_profiles_motivation_driver;
DROP TYPE IF EXISTS enum_habits_frequency;
DROP TYPE IF EXISTS enum_habits_difficulty;
DROP TYPE IF EXISTS enum_ai_suggestions_frequency;
DROP TYPE IF EXISTS enum_ai_suggestions_difficulty;
DROP TYPE IF EXISTS enum_ai_suggestions_status;
