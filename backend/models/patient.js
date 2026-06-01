'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Patient extends Model {
    static associate(models) {
      Patient.hasMany(models.PatientCondition, { foreignKey: 'patient_id', sourceKey: 'fhir_id' });
      Patient.hasMany(models.PatientObservation, { foreignKey: 'patient_id', sourceKey: 'fhir_id' });
      Patient.hasMany(models.PatientMedication, { foreignKey: 'patient_id', sourceKey: 'fhir_id' });
      Patient.hasMany(models.PatientDocumentReference, { foreignKey: 'patient_id', sourceKey: 'fhir_id' });
      Patient.hasMany(models.PatientDocumentReferenceContent, { foreignKey: 'patient_id', sourceKey: 'fhir_id' });
      Patient.hasMany(models.PatientDocumentRefrenceEntry, { foreignKey: 'patient_id', sourceKey: 'fhir_id' });
      Patient.hasMany(models.PatientDischargeSummary, { foreignKey: 'patient_id', sourceKey: 'fhir_id' });
    }
  }
  Patient.init({
    fhir_id: { type: DataTypes.STRING, unique: true },
    epic_patient_id: DataTypes.STRING,
    mrn: DataTypes.STRING,
    external_id: DataTypes.STRING,
    ceid: DataTypes.STRING,
    full_name: DataTypes.STRING,
    first_name: DataTypes.STRING,
    last_name: DataTypes.STRING,
    gender: DataTypes.STRING,
    birth_date: DataTypes.DATEONLY,
    deceased: DataTypes.BOOLEAN,
    active: DataTypes.BOOLEAN,
    legal_sex: DataTypes.STRING,
    sex_for_clinical_use: DataTypes.STRING,
    race: DataTypes.STRING,
    ethnicity: DataTypes.STRING,
    pronouns: DataTypes.STRING,
    phone_home: DataTypes.STRING,
    phone_work: DataTypes.STRING,
    address_line: DataTypes.STRING,
    address_city: DataTypes.STRING,
    address_state: DataTypes.STRING,
    address_postal: DataTypes.STRING,
    address_country: DataTypes.STRING,
    address_start: DataTypes.DATEONLY,
    emergency_contact_name: DataTypes.STRING,
    emergency_contact_phone: DataTypes.STRING,
    emergency_contact_relation: DataTypes.STRING,
    managing_organization: DataTypes.STRING,
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
    modelName: 'Patient',
    tableName: 'patients',
  });
  return Patient;
};
