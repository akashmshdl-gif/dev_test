'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class PatientMedication extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      PatientMedication.belongsTo(models.Patient, { foreignKey: 'patient_id', targetKey: 'fhir_id' });
    }
  }
  PatientMedication.init({
    patient_id: DataTypes.STRING,
    fhir_medication_request_id: { type: DataTypes.STRING, unique: true },
    status: DataTypes.STRING,
    intent: DataTypes.STRING,
    category: DataTypes.STRING,
    medication_reference: DataTypes.STRING,
    medication_display: DataTypes.STRING,
    subject_reference: DataTypes.STRING,
    subject_display: DataTypes.STRING,
    encounter_reference: DataTypes.STRING,
    authored_on: DataTypes.DATE,
    requester_display: DataTypes.STRING,
    reason_code_text: DataTypes.STRING,
    dosage_instruction_text: DataTypes.TEXT,
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
    modelName: 'PatientMedication',
    tableName: 'patient_medications',
  });
  return PatientMedication;
};