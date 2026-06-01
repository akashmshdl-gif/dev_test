'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CdsRequest extends Model {
    static associate(models) {
      // define association here if needed
    }
  }
  CdsRequest.init({
    hook_name: DataTypes.STRING,
    request_body: DataTypes.JSONB
  }, {
    sequelize,
    modelName: 'CdsRequest',
    tableName: 'cds_requests',
  });
  return CdsRequest;
};
