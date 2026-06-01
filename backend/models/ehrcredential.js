'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class EhrCredential extends Model {
    static associate(models) {
      // define association here
    }
  }
  EhrCredential.init({
    org_id: DataTypes.STRING,
    provider_name: DataTypes.STRING(100),

    // Common Identification
    jwt_kid: DataTypes.STRING,
    jwt_jku: DataTypes.STRING,

    // Sandbox Environment
    sandbox_client_id: DataTypes.STRING,
    sandbox_private_key: DataTypes.TEXT,
    sandbox_fhir_base_url_r4: DataTypes.STRING,
    sandbox_fhir_base_url_stu3: DataTypes.STRING,
    sandbox_fhir_base_url_dstu2: DataTypes.STRING,
    sandbox_token_url: DataTypes.STRING,

    // Production Environment
    production_client_id: DataTypes.STRING,
    production_private_key: DataTypes.TEXT,
    production_fhir_base_url_r4: DataTypes.STRING,
    production_fhir_base_url_stu3: DataTypes.STRING,
    production_fhir_base_url_dstu2: DataTypes.STRING,
    production_token_url: DataTypes.STRING,

    isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
  }, {
    sequelize,
    modelName: 'EhrCredential',
    tableName: 'ehr_credentials'
  });
  return EhrCredential;
};
