import {
  Model,
  DataTypes,
  type Sequelize,
  type Optional,
  type NonAttribute,
} from "sequelize";

import type { User } from "./User";
import type { CoachCredential } from "./CoachCredential";

/**
 * A coach's public directory listing, created when they register with the
 * "coach" role.
 *
 * There is no verification state here on purpose: verification only ever meant
 * "an admin looked at it", and the admin role is gone. Credentials are shown
 * to users as self-reported, which is what they always actually were.
 */
export interface CoachProfileAttributes {
  id: string;
  userId: string;
  displayName?: string;
  coachingTitle?: string;
  bio?: string;
  specialties: string[];
  yearsExperience?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CoachProfileCreationAttributes
  extends Optional<
    CoachProfileAttributes,
    | "id"
    | "displayName"
    | "coachingTitle"
    | "bio"
    | "specialties"
    | "yearsExperience"
  > {}

export class CoachProfile
  extends Model<CoachProfileAttributes, CoachProfileCreationAttributes>
  implements CoachProfileAttributes
{
  declare id: string;
  declare userId: string;
  declare displayName: string | undefined;
  declare coachingTitle: string | undefined;
  declare bio: string | undefined;
  declare specialties: string[];
  declare yearsExperience: number | undefined;

  declare user?: NonAttribute<User>;
  declare credentials?: NonAttribute<CoachCredential[]>;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof CoachProfile {
    CoachProfile.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },

        userId: {
          type: DataTypes.UUID,
          allowNull: false,
          unique: true,
          references: {
            model: "users",
            key: "id",
          },
          onDelete: "CASCADE",
        },

        displayName: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },

        coachingTitle: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },

        bio: {
          type: DataTypes.TEXT,
          allowNull: true,
        },

        specialties: {
          type: DataTypes.JSONB,
          allowNull: false,
          defaultValue: [],
        },

        yearsExperience: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: "coach_profiles",
        timestamps: true,
        underscored: true,
      },
    );

    return CoachProfile;
  }
}
