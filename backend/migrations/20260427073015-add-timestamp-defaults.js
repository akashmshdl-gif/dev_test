'use strict';

const TABLES = [
  'users',
  'patients',
  'patient_conditions',
  'patient_observations',
  'patient_medications',
  'patient_document_references',
  'patient_document_reference_content',
  'ehr_credentials'
];

module.exports = {
  async up(queryInterface) {
    for (const table of TABLES) {
      // Set createdAt to default CURRENT_TIMESTAMP on insert
      await queryInterface.sequelize.query(
        `ALTER TABLE "${table}" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;`
      );
      // Set updatedAt to default CURRENT_TIMESTAMP on insert
      await queryInterface.sequelize.query(
        `ALTER TABLE "${table}" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;`
      );

      // Create a trigger to auto-update updatedAt on every row update
      const triggerFn = `update_${table}_updated_at`;
      await queryInterface.sequelize.query(`
        CREATE OR REPLACE FUNCTION ${triggerFn}()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW."updatedAt" = CURRENT_TIMESTAMP;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);
      await queryInterface.sequelize.query(`
        DROP TRIGGER IF EXISTS trg_${table}_updated_at ON "${table}";
        CREATE TRIGGER trg_${table}_updated_at
        BEFORE UPDATE ON "${table}"
        FOR EACH ROW
        EXECUTE FUNCTION ${triggerFn}();
      `);
    }
  },

  async down(queryInterface) {
    for (const table of TABLES) {
      await queryInterface.sequelize.query(
        `ALTER TABLE "${table}" ALTER COLUMN "createdAt" DROP DEFAULT;`
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE "${table}" ALTER COLUMN "updatedAt" DROP DEFAULT;`
      );
      await queryInterface.sequelize.query(
        `DROP TRIGGER IF EXISTS trg_${table}_updated_at ON "${table}";`
      );
      await queryInterface.sequelize.query(
        `DROP FUNCTION IF EXISTS update_${table}_updated_at();`
      );
    }
  }
};
