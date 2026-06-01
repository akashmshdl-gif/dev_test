'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.removeColumn('patient_document_refrence_entries', 'content');
    await queryInterface.renameColumn(
      'patient_document_refrence_entries',
      'binary_response',
      'content'
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.renameColumn(
      'patient_document_refrence_entries',
      'content',
      'binary_response'
    );
    await queryInterface.addColumn('patient_document_refrence_entries', 'content', {
      type: Sequelize.TEXT
    });
  }
};
