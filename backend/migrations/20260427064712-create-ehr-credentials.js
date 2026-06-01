'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ehr_credentials', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      org_id: { type: Sequelize.STRING },
      provider_name: { type: Sequelize.STRING(100) },

      // Common Identification
      client_id: { type: Sequelize.STRING },
      private_key: { type: Sequelize.TEXT },

      // Sandbox Environment
      sandbox_client_id: { type: Sequelize.STRING },
      sandbox_private_key: { type: Sequelize.TEXT },
      sandbox_fhir_base_url_r4: { type: Sequelize.STRING },
      sandbox_fhir_base_url_stu3: { type: Sequelize.STRING },
      sandbox_fhir_base_url_dstu2: { type: Sequelize.STRING },
      sandbox_token_url: { type: Sequelize.STRING },

      // Production Environment
      production_client_id: { type: Sequelize.STRING },
      production_private_key: { type: Sequelize.TEXT },
      production_fhir_base_url_r4: { type: Sequelize.STRING },
      production_fhir_base_url_stu3: { type: Sequelize.STRING },
      production_fhir_base_url_dstu2: { type: Sequelize.STRING },
      production_token_url: { type: Sequelize.STRING },

      isActive: { type: Sequelize.BOOLEAN, defaultValue: true, allowNull: false },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ehr_credentials');
  }
};
