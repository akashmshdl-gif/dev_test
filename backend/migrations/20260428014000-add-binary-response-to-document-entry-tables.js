'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('patient_document_refrence_entries', 'binary_response', {
      type: Sequelize.BLOB
    });

    await queryInterface.addColumn('patient_discharge_summary', 'binary_response', {
      type: Sequelize.BLOB
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('patient_discharge_summary', 'binary_response');
    await queryInterface.removeColumn('patient_document_refrence_entries', 'binary_response');
  }
};
