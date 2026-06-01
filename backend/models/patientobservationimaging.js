'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class PatientObservationImaging extends Model {
    static associate(models) {
      PatientObservationImaging.belongsTo(models.Patient, { foreignKey: 'patient_id', targetKey: 'fhir_id' });
    }
  }
  PatientObservationImaging.init({
    patient_id: DataTypes.STRING,
    fhir_observation_id: { type: DataTypes.STRING, unique: true },
    status: DataTypes.STRING,
    category: DataTypes.STRING,
    code: DataTypes.STRING,
    code_display: DataTypes.STRING,
    code_text: DataTypes.STRING,
    subject_reference: DataTypes.STRING,
    subject_display: DataTypes.STRING,
    encounter_reference: DataTypes.STRING,
    encounter_display: DataTypes.STRING,
    effective_date_time: DataTypes.DATE,
    issued_date_time: DataTypes.DATE,
    value_string: DataTypes.STRING,
    value_code: DataTypes.STRING,
    value_display: DataTypes.STRING,
    derived_from_reference: DataTypes.STRING,
    derived_from_display: DataTypes.STRING,
    based_on_reference: DataTypes.STRING,
    based_on_display: DataTypes.STRING,
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
    modelName: 'PatientObservationImaging',
    tableName: 'patient_observation_imaging',
  });
  return PatientObservationImaging;
};
