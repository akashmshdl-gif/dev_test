'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('patient_observation_imaging', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      patient_id: { type: Sequelize.STRING, references: { model: 'patients', key: 'fhir_id' } },
      fhir_observation_id: { type: Sequelize.STRING, unique: true },
      status: { type: Sequelize.STRING },
      category: { type: Sequelize.STRING },
      code: { type: Sequelize.STRING },
      code_display: { type: Sequelize.STRING },
      code_text: { type: Sequelize.STRING },
      subject_reference: { type: Sequelize.STRING },
      subject_display: { type: Sequelize.STRING },
      encounter_reference: { type: Sequelize.STRING },
      encounter_display: { type: Sequelize.STRING },
      effective_date_time: { type: Sequelize.DATE },
      issued_date_time: { type: Sequelize.DATE },
      value_string: { type: Sequelize.STRING },
      value_code: { type: Sequelize.STRING },
      value_display: { type: Sequelize.STRING },
      derived_from_reference: { type: Sequelize.STRING },
      derived_from_display: { type: Sequelize.STRING },
      based_on_reference: { type: Sequelize.STRING },
      based_on_display: { type: Sequelize.STRING },
      note_text: { type: Sequelize.TEXT },
      raw: { type: Sequelize.BLOB },
      isActive: { type: Sequelize.BOOLEAN, defaultValue: true, allowNull: false },
      createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('patient_observation_imaging');
  }
};
