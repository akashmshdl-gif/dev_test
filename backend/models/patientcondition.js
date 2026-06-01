'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class PatientCondition extends Model {
    static associate(models) {
      PatientCondition.belongsTo(models.Patient, { foreignKey: 'patient_id', targetKey: 'fhir_id' });
    }
  }
  PatientCondition.init({
    patient_id: DataTypes.STRING,
    fhir_condition_id: { type: DataTypes.STRING, unique: true },
    clinical_status: DataTypes.STRING,
    clinical_status_display: DataTypes.STRING,
    verification_status: DataTypes.STRING,
    category: DataTypes.STRING,
    category_display: DataTypes.STRING,
    condition_text: DataTypes.STRING,
    icd10_code: DataTypes.STRING,
    icd10_display: DataTypes.STRING,
    icd9_code: DataTypes.STRING,
    icd9_display: DataTypes.STRING,
    snomed_code: DataTypes.STRING,
    snomed_display: DataTypes.STRING,
    subject_reference: DataTypes.STRING,
    subject_display: DataTypes.STRING,
    onset_date: DataTypes.DATE,
    recorded_date: DataTypes.DATE,
    note_author: DataTypes.STRING,
    note_time: DataTypes.DATE,
    note_text: DataTypes.TEXT,
    raw: {
      type: DataTypes.BLOB,
      get() {
        const buf = this.getDataValue('raw');
        if (!buf) return null;
        try { return JSON.parse(buf.toString('utf-8')); } catch { return buf; }
      },
      set(val) {
        if (val === null || val === undefined) { this.setDataValue('raw', null); return; }
        this.setDataValue('raw', Buffer.from(JSON.stringify(val), 'utf-8'));
      }
    },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
  }, {
    sequelize,
    modelName: 'PatientCondition',
    tableName: 'patient_conditions',
  });
  return PatientCondition;
};