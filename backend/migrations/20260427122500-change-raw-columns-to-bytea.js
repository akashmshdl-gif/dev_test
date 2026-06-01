'use strict';

const TABLES = [
  'patients',
  'patient_conditions',
  'patient_observations',
  'patient_medications',
  'patient_document_references',
  'patient_document_reference_content'
];

module.exports = {
  async up(queryInterface, Sequelize) {
    for (const table of TABLES) {
      // 1. Add a temporary BYTEA column
      await queryInterface.addColumn(table, 'raw_bytea', {
        type: Sequelize.BLOB,
        allowNull: true
      });

      // 2. Migrate existing JSONB data → BYTEA (store as UTF-8 JSON bytes)
      await queryInterface.sequelize.query(
        `UPDATE "${table}" SET "raw_bytea" = decode(replace("raw"::text, '\\', '\\\\'), 'escape') WHERE "raw" IS NOT NULL;`
      );

      // 3. Drop old JSONB column
      await queryInterface.removeColumn(table, 'raw');

      // 4. Rename raw_bytea → raw
      await queryInterface.renameColumn(table, 'raw_bytea', 'raw');
    }
  },

  async down(queryInterface, Sequelize) {
    for (const table of TABLES) {
      // 1. Add a temporary JSONB column
      await queryInterface.addColumn(table, 'raw_jsonb', {
        type: Sequelize.JSONB,
        allowNull: true
      });

      // 2. Convert BYTEA back to JSONB
      await queryInterface.sequelize.query(
        `UPDATE "${table}" SET "raw_jsonb" = convert_from("raw", 'UTF8')::jsonb WHERE "raw" IS NOT NULL;`
      );

      // 3. Drop old BYTEA column
      await queryInterface.removeColumn(table, 'raw');

      // 4. Rename raw_jsonb → raw
      await queryInterface.renameColumn(table, 'raw_jsonb', 'raw');
    }
  }
};
