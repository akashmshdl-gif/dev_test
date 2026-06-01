'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Drop the test table if it exists
    try {
      await queryInterface.dropTable('tests');
    } catch (e) {
      // ignore if doesn't exist
    }

    // Create the patient_document_reference_content table
    await queryInterface.createTable('patient_document_reference_content', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      patient_id: { type: Sequelize.STRING },
      document_reference_id: { type: Sequelize.STRING },
      binary_id: { type: Sequelize.STRING },
      content_type: { type: Sequelize.STRING },
      raw: { type: Sequelize.JSONB },
      isActive: { type: Sequelize.BOOLEAN, defaultValue: true, allowNull: false },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('patient_document_reference_content');
  }
};
