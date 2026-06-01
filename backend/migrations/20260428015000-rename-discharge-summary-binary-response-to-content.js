'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.renameColumn(
      'patient_discharge_summary',
      'binary_response',
      'content'
    );
  },

  async down(queryInterface) {
    await queryInterface.renameColumn(
      'patient_discharge_summary',
      'content',
      'binary_response'
    );
  }
};
