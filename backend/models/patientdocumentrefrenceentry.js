'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PatientDocumentRefrenceEntry extends Model {
    static associate(models) {
      PatientDocumentRefrenceEntry.belongsTo(models.Patient, {
        foreignKey: 'patient_id',
        targetKey: 'fhir_id'
      });
    }
  }
  PatientDocumentRefrenceEntry.init({
    patient_id: DataTypes.STRING,
    resource_id: DataTypes.STRING,
    type: DataTypes.STRING,
    type_code: DataTypes.STRING,
    date: DataTypes.DATE,
    author: DataTypes.STRING,
    practitioner_id: DataTypes.STRING,
    binary_id: DataTypes.STRING,
    content: DataTypes.BLOB,
    raw: {
      type: DataTypes.BLOB,
      get() {
        const buf = this.getDataValue('raw');
        if (!buf) return null;
        try { return JSON.parse(buf.toString('utf-8')); } catch { return buf; }
      },
      set(val) {
        if (val === null || val === undefined) {
          this.setDataValue('raw', null);
          return;
        }
        this.setDataValue('raw', Buffer.from(JSON.stringify(val), 'utf-8'));
      }
    },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
  }, {
    sequelize,
    modelName: 'PatientDocumentRefrenceEntry',
    tableName: 'patient_document_refrence_entries'
  });
  return PatientDocumentRefrenceEntry;
};
