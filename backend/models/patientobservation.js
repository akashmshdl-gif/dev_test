'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class PatientObservation extends Model {
    static associate(models) {
      PatientObservation.belongsTo(models.Patient, { foreignKey: 'patient_id', targetKey: 'fhir_id' });
    }
  }
  PatientObservation.init({
    patient_id: DataTypes.STRING,
    fhir_observation_id: { type: DataTypes.STRING, unique: true },
    based_on_reference: DataTypes.STRING,
    order_name: DataTypes.STRING,
    status: DataTypes.STRING,
    category: DataTypes.STRING,
    loinc_code: DataTypes.STRING,
    loinc_display: DataTypes.STRING,
    local_code: DataTypes.STRING,
    local_display: DataTypes.STRING,
    test_name: DataTypes.STRING,
    subject_reference: DataTypes.STRING,
    subject_display: DataTypes.STRING,
    encounter_reference: DataTypes.STRING,
    encounter_id: DataTypes.STRING,
    encounter_type: DataTypes.STRING,
    effective_date_time: DataTypes.DATE,
    issued_date_time: DataTypes.DATE,
    value: DataTypes.STRING,
    unit: DataTypes.STRING,
    interpretation_code: DataTypes.STRING,
    interpretation_display: DataTypes.STRING,
    specimen_reference: DataTypes.STRING,
    reference_range_low: DataTypes.STRING,
    reference_range_low_unit: DataTypes.STRING,
    reference_range_high: DataTypes.STRING,
    reference_range_high_unit: DataTypes.STRING,
    reference_range_text: DataTypes.STRING,
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
    modelName: 'PatientObservation',
    tableName: 'patient_observations',
  });
  return PatientObservation;
};