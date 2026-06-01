'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.addColumn('patient_document_reference_content', 'decoded_content', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    } catch (err) {
      if (!err.message.includes('already exists')) {
        throw err;
      }
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('patient_document_reference_content', 'decoded_content');
  }
};
