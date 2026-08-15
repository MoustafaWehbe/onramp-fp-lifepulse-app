import type { Sequelize } from "sequelize";
import { User } from "./User";
import { Session } from "./Session";
import { RefreshToken } from "./RefreshToken";
import { UserProfile } from "./UserProfile";
import { Goal } from "./Goal";
import { UserGoal } from "./UserGoal";
import { LifeArea } from "./LifeArea";
import { Habit } from "./Habit";
import { HabitCompletion } from "./HabitCompletion";
import { AiSuggestion } from "./AiSuggestion";
import { Embedding } from "./Embedding";
import { NotificationPreference } from "./NotificationPreference";
import { NotificationLog } from "./NotificationLog";

export {
  User,
  Session,
  RefreshToken,
  UserProfile,
  Goal,
  UserGoal,
  LifeArea,
  Habit,
  HabitCompletion,
  AiSuggestion,
  Embedding,
  NotificationPreference,
  NotificationLog,
};

export function initModels(sequelize: Sequelize): void {
  User.initModel(sequelize);
  Session.initModel(sequelize);
  RefreshToken.initModel(sequelize);
  UserProfile.initModel(sequelize);
  Goal.initModel(sequelize);
  UserGoal.initModel(sequelize);
  LifeArea.initModel(sequelize);
  Habit.initModel(sequelize);
  HabitCompletion.initModel(sequelize);
  AiSuggestion.initModel(sequelize);
  Embedding.initModel(sequelize);
  NotificationPreference.initModel(sequelize);
  NotificationLog.initModel(sequelize);

  // Auth associations
  User.hasMany(Session, { foreignKey: "userId", as: "sessions" });
  Session.belongsTo(User, { foreignKey: "userId", as: "user" });

  User.hasMany(RefreshToken, { foreignKey: "userId", as: "refreshTokens" });
  RefreshToken.belongsTo(User, { foreignKey: "userId", as: "user" });

  Session.hasMany(RefreshToken, {
    foreignKey: "sessionId",
    as: "refreshTokens",
  });
  RefreshToken.belongsTo(Session, { foreignKey: "sessionId", as: "session" });

  // Profile & goals
  User.hasOne(UserProfile, { foreignKey: "userId", as: "profile" });
  UserProfile.belongsTo(User, { foreignKey: "userId", as: "user" });

  User.belongsToMany(Goal, {
    through: UserGoal,
    foreignKey: "userId",
    otherKey: "goalId",
    as: "goals",
  });
  Goal.belongsToMany(User, {
    through: UserGoal,
    foreignKey: "goalId",
    otherKey: "userId",
    as: "users",
  });
  User.hasMany(UserGoal, { foreignKey: "userId", as: "userGoals" });
  UserGoal.belongsTo(User, { foreignKey: "userId", as: "user" });
  Goal.hasMany(UserGoal, { foreignKey: "goalId", as: "userGoals" });
  UserGoal.belongsTo(Goal, { foreignKey: "goalId", as: "goal" });

  // Life areas & habits
  User.hasMany(LifeArea, { foreignKey: "userId", as: "lifeAreas" });
  LifeArea.belongsTo(User, { foreignKey: "userId", as: "user" });

  LifeArea.hasMany(Habit, { foreignKey: "areaId", as: "habits" });
  Habit.belongsTo(LifeArea, { foreignKey: "areaId", as: "lifeArea" });
  User.hasMany(Habit, { foreignKey: "userId", as: "habits" });
  Habit.belongsTo(User, { foreignKey: "userId", as: "user" });

  // Habit completions
  Habit.hasMany(HabitCompletion, {
    foreignKey: "habitId",
    as: "completions",
  });
  HabitCompletion.belongsTo(Habit, { foreignKey: "habitId", as: "habit" });
  User.hasMany(HabitCompletion, {
    foreignKey: "userId",
    as: "habitCompletions",
  });
  HabitCompletion.belongsTo(User, { foreignKey: "userId", as: "user" });

  // AI suggestions
  User.hasMany(AiSuggestion, { foreignKey: "userId", as: "aiSuggestions" });
  AiSuggestion.belongsTo(User, { foreignKey: "userId", as: "user" });
  LifeArea.hasMany(AiSuggestion, {
    foreignKey: "areaId",
    as: "aiSuggestions",
  });
  AiSuggestion.belongsTo(LifeArea, { foreignKey: "areaId", as: "lifeArea" });
  AiSuggestion.belongsTo(Habit, {
    foreignKey: "acceptedHabitId",
    as: "acceptedHabit",
  });
  Habit.hasMany(AiSuggestion, {
    foreignKey: "acceptedHabitId",
    as: "acceptedFromSuggestions",
  });

  // Notifications
  User.hasOne(NotificationPreference, {
    foreignKey: "userId",
    as: "notificationPreference",
  });
  NotificationPreference.belongsTo(User, { foreignKey: "userId", as: "user" });

  User.hasMany(NotificationLog, { foreignKey: "userId", as: "notificationLogs" });
  NotificationLog.belongsTo(User, { foreignKey: "userId", as: "user" });
}
