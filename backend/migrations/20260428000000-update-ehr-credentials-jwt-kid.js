'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.addColumn('ehr_credentials', 'jwt_kid', {
        type: Sequelize.STRING
      });
    } catch (err) {
      if (!err.message.includes('already exists')) throw err;
    }

    try {
      await queryInterface.addColumn('ehr_credentials', 'jwt_jku', {
        type: Sequelize.STRING
      });
    } catch (err) {
      if (!err.message.includes('already exists')) throw err;
    }

    try {
      await queryInterface.removeColumn('ehr_credentials', 'client_id');
    } catch (err) {
      if (!err.message.includes('does not exist')) throw err;
    }

    try {
      await queryInterface.removeColumn('ehr_credentials', 'private_key');
    } catch (err) {
      if (!err.message.includes('does not exist')) throw err;
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('ehr_credentials', 'client_id', {
      type: Sequelize.STRING
    });

    await queryInterface.addColumn('ehr_credentials', 'private_key', {
      type: Sequelize.TEXT
    });

    await queryInterface.removeColumn('ehr_credentials', 'jwt_jku');
    await queryInterface.removeColumn('ehr_credentials', 'jwt_kid');
  }
};
