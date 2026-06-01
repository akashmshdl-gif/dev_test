'use strict';
const bcrypt = require('bcryptjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {

    // ── users ──────────────────────────────────────────────────────────
    await queryInterface.createTable('users', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      username: { type: Sequelize.STRING, unique: true },
      password: { type: Sequelize.STRING },
      isActive: { type: Sequelize.BOOLEAN, defaultValue: true, allowNull: false },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });

    // Seed admin user
    const hashedPassword = await bcrypt.hash('zBtx1bCq?*_608r64a4*', 10);
    await queryInterface.bulkInsert('users', [{
      username: 'admin',
      password: hashedPassword,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }]);

    // ── patients ───────────────────────────────────────────────────────
    await queryInterface.createTable('patients', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      fhir_id: { type: Sequelize.STRING, unique: true },
      epic_patient_id: { type: Sequelize.STRING },
      mrn: { type: Sequelize.STRING },
      external_id: { type: Sequelize.STRING },
      ceid: { type: Sequelize.STRING },
      full_name: { type: Sequelize.STRING },
      first_name: { type: Sequelize.STRING },
      last_name: { type: Sequelize.STRING },
      gender: { type: Sequelize.STRING },
      birth_date: { type: Sequelize.DATEONLY },
      deceased: { type: Sequelize.BOOLEAN },
      active: { type: Sequelize.BOOLEAN },
      legal_sex: { type: Sequelize.STRING },
      sex_for_clinical_use: { type: Sequelize.STRING },
      race: { type: Sequelize.STRING },
      ethnicity: { type: Sequelize.STRING },
      pronouns: { type: Sequelize.STRING },
      phone_home: { type: Sequelize.STRING },
      phone_work: { type: Sequelize.STRING },
      address_line: { type: Sequelize.STRING },
      address_city: { type: Sequelize.STRING },
      address_state: { type: Sequelize.STRING },
      address_postal: { type: Sequelize.STRING },
      address_country: { type: Sequelize.STRING },
      address_start: { type: Sequelize.DATEONLY },
      emergency_contact_name: { type: Sequelize.STRING },
      emergency_contact_phone: { type: Sequelize.STRING },
      emergency_contact_relation: { type: Sequelize.STRING },
      managing_organization: { type: Sequelize.STRING },
      raw: { type: Sequelize.JSONB },
      isActive: { type: Sequelize.BOOLEAN, defaultValue: true, allowNull: false },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });

    // ── patient_conditions ─────────────────────────────────────────────
    await queryInterface.createTable('patient_conditions', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      patient_id: { type: Sequelize.STRING, references: { model: 'patients', key: 'fhir_id' } },
      fhir_condition_id: { type: Sequelize.STRING, unique: true },
      clinical_status: { type: Sequelize.STRING },
      clinical_status_display: { type: Sequelize.STRING },
      verification_status: { type: Sequelize.STRING },
      category: { type: Sequelize.STRING },
      category_display: { type: Sequelize.STRING },
      condition_text: { type: Sequelize.STRING },
      icd10_code: { type: Sequelize.STRING },
      icd10_display: { type: Sequelize.STRING },
      icd9_code: { type: Sequelize.STRING },
      icd9_display: { type: Sequelize.STRING },
      snomed_code: { type: Sequelize.STRING },
      snomed_display: { type: Sequelize.STRING },
      subject_reference: { type: Sequelize.STRING },
      subject_display: { type: Sequelize.STRING },
      onset_date: { type: Sequelize.DATE },
      recorded_date: { type: Sequelize.DATE },
      note_author: { type: Sequelize.STRING },
      note_time: { type: Sequelize.DATE },
      note_text: { type: Sequelize.TEXT },
      raw: { type: Sequelize.JSONB },
      isActive: { type: Sequelize.BOOLEAN, defaultValue: true, allowNull: false },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });

    // ── patient_observations ───────────────────────────────────────────
    await queryInterface.createTable('patient_observations', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      patient_id: { type: Sequelize.STRING, references: { model: 'patients', key: 'fhir_id' } },
      fhir_observation_id: { type: Sequelize.STRING, unique: true },
      based_on_reference: { type: Sequelize.STRING },
      order_name: { type: Sequelize.STRING },
      status: { type: Sequelize.STRING },
      category: { type: Sequelize.STRING },
      loinc_code: { type: Sequelize.STRING },
      loinc_display: { type: Sequelize.STRING },
      local_code: { type: Sequelize.STRING },
      local_display: { type: Sequelize.STRING },
      test_name: { type: Sequelize.STRING },
      subject_reference: { type: Sequelize.STRING },
      subject_display: { type: Sequelize.STRING },
      encounter_reference: { type: Sequelize.STRING },
      encounter_id: { type: Sequelize.STRING },
      encounter_type: { type: Sequelize.STRING },
      effective_date_time: { type: Sequelize.DATE },
      issued_date_time: { type: Sequelize.DATE },
      value: { type: Sequelize.STRING },
      unit: { type: Sequelize.STRING },
      interpretation_code: { type: Sequelize.STRING },
      interpretation_display: { type: Sequelize.STRING },
      specimen_reference: { type: Sequelize.STRING },
      reference_range_low: { type: Sequelize.STRING },
      reference_range_low_unit: { type: Sequelize.STRING },
      reference_range_high: { type: Sequelize.STRING },
      reference_range_high_unit: { type: Sequelize.STRING },
      reference_range_text: { type: Sequelize.STRING },
      raw: { type: Sequelize.JSONB },
      isActive: { type: Sequelize.BOOLEAN, defaultValue: true, allowNull: false },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });

    // ── patient_medications ────────────────────────────────────────────
    await queryInterface.createTable('patient_medications', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      patient_id: { type: Sequelize.STRING },
      fhir_medication_request_id: { type: Sequelize.STRING, unique: true },
      status: { type: Sequelize.STRING },
      intent: { type: Sequelize.STRING },
      category: { type: Sequelize.STRING },
      medication_reference: { type: Sequelize.STRING },
      medication_display: { type: Sequelize.STRING },
      subject_reference: { type: Sequelize.STRING },
      subject_display: { type: Sequelize.STRING },
      encounter_reference: { type: Sequelize.STRING },
      authored_on: { type: Sequelize.DATE },
      requester_display: { type: Sequelize.STRING },
      reason_code_text: { type: Sequelize.STRING },
      dosage_instruction_text: { type: Sequelize.TEXT },
      raw: { type: Sequelize.JSONB },
      isActive: { type: Sequelize.BOOLEAN, defaultValue: true, allowNull: false },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });

    // ── patient_document_references ────────────────────────────────────
    await queryInterface.createTable('patient_document_references', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      patient_id: { type: Sequelize.STRING, unique: true },
      raw: { type: Sequelize.JSONB },
      isActive: { type: Sequelize.BOOLEAN, defaultValue: true, allowNull: false },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('patient_document_references');
    await queryInterface.dropTable('patient_medications');
    await queryInterface.dropTable('patient_observations');
    await queryInterface.dropTable('patient_conditions');
    await queryInterface.dropTable('patients');
    await queryInterface.dropTable('users');
  }
};
