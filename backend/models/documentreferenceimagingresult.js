'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DocumentReferenceImagingResult extends Model {
    static associate(models) {
      DocumentReferenceImagingResult.belongsTo(models.Patient, {
        foreignKey: 'patient_id',
        targetKey: 'fhir_id'
      });
    }
  }

  DocumentReferenceImagingResult.init({
    patient_id: DataTypes.STRING,
    resource_id: { type: DataTypes.STRING, comment: 'DocumentReference FHIR id' },
    binary_id: { type: DataTypes.STRING, comment: 'Binary resource id' },
    status: DataTypes.STRING,
    doc_status: DataTypes.STRING,
    type_text: DataTypes.STRING,
    category_code: DataTypes.STRING,
    category_display: DataTypes.STRING,
    subject_reference: DataTypes.STRING,
    subject_display: DataTypes.STRING,
    date: DataTypes.DATE,
    author: DataTypes.STRING,
    author_reference: DataTypes.STRING,
    description: DataTypes.TEXT,
    content_type: DataTypes.STRING,
    encounter_reference: DataTypes.STRING,
    encounter_display: DataTypes.STRING,
    practice_setting_code: DataTypes.STRING,
    practice_setting_display: DataTypes.STRING,
    period_start: DataTypes.DATE,
    period_end: DataTypes.DATE,
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
    binary_raw: {
      type: DataTypes.BLOB,
      get() {
        const buf = this.getDataValue('binary_raw');
        if (!buf) return null;
        try { return JSON.parse(buf.toString('utf-8')); } catch { return buf; }
      },
      set(val) {
        if (val === null || val === undefined) { this.setDataValue('binary_raw', null); return; }
        this.setDataValue('binary_raw', Buffer.from(JSON.stringify(val), 'utf-8'));
      }
    },
    binary_content: {
      type: DataTypes.BLOB,
      comment: 'Binary content (application/pdf) stored as bytea'
    },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
  }, {
    sequelize,
    modelName: 'DocumentReferenceImagingResult',
    tableName: 'documentReference_imaging_result'
  });

  return DocumentReferenceImagingResult;
};
