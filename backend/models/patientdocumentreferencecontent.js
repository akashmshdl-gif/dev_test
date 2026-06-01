'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PatientDocumentReferenceContent extends Model {
    static associate(models) {
      PatientDocumentReferenceContent.belongsTo(models.Patient, { foreignKey: 'patient_id', targetKey: 'fhir_id' });
    }
  }
  PatientDocumentReferenceContent.init({
    patient_id: DataTypes.STRING,
    document_reference_id: DataTypes.STRING,
    binary_id: DataTypes.STRING,
    content_type: DataTypes.STRING,
    raw: DataTypes.BLOB,
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
  }, {
    sequelize,
    modelName: 'PatientDocumentReferenceContent',
    tableName: 'patient_document_reference_content'
  });
  return PatientDocumentReferenceContent;
};
