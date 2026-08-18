import {
  Model,
  DataTypes,
  type Sequelize,
  type Optional,
  type NonAttribute,
} from "sequelize";

import type { CoachProfile } from "./CoachProfile";

export interface CoachCredentialAttributes {
  id: string;
  coachProfileId: string;
  name: string;
  issuer?: string;
  verified: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CoachCredentialCreationAttributes
  extends Optional<
    CoachCredentialAttributes,
    "id" | "issuer" | "verified"
  > {}

export class CoachCredential
  extends Model<
    CoachCredentialAttributes,
    CoachCredentialCreationAttributes
  >
  implements CoachCredentialAttributes
{
  declare id: string;
  declare coachProfileId: string;
  declare name: string;
  declare issuer: string | undefined;
  declare verified: boolean;

  declare coachProfile?: NonAttribute<CoachProfile>;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(
    sequelize: Sequelize,
  ): typeof CoachCredential {
    CoachCredential.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },

        coachProfileId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: "coach_profiles",
            key: "id",
          },
          onDelete: "CASCADE",
        },

        name: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },

        issuer: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },

        verified: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
      },
      {
        sequelize,
        tableName: "coach_credentials",
        timestamps: true,
        underscored: true,
      },
    );

    return CoachCredential;
  }
}