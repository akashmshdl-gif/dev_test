'use strict';

async function addTimestampTrigger(queryInterface, table) {
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

async function removeTimestampTrigger(queryInterface, table) {
  await queryInterface.sequelize.query(
    `DROP TRIGGER IF EXISTS trg_${table}_updated_at ON "${table}";`
  );
  await queryInterface.sequelize.query(
    `DROP FUNCTION IF EXISTS update_${table}_updated_at();`
  );
}

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('patient_document_refrence_entries', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      patient_id: { type: Sequelize.STRING },
      resource_id: { type: Sequelize.STRING },
      type: { type: Sequelize.STRING },
      type_code: { type: Sequelize.STRING },
      date: { type: Sequelize.DATE },
      author: { type: Sequelize.STRING },
      practitioner_id: { type: Sequelize.STRING },
      content: { type: Sequelize.TEXT },
      binary_id: { type: Sequelize.STRING },
      raw: { type: Sequelize.BLOB },
      isActive: { type: Sequelize.BOOLEAN, defaultValue: true, allowNull: false },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex(
      'patient_document_refrence_entries',
      ['patient_id', 'resource_id'],
      { unique: true, name: 'patient_document_refrence_entries_patient_resource_unique' }
    );

    await queryInterface.createTable('patient_discharge_summary', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      patient_id: { type: Sequelize.STRING },
      binary_id: { type: Sequelize.STRING },
      raw: { type: Sequelize.BLOB },
      isActive: { type: Sequelize.BOOLEAN, defaultValue: true, allowNull: false },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex(
      'patient_discharge_summary',
      ['patient_id', 'binary_id'],
      { unique: true, name: 'patient_discharge_summary_patient_binary_unique' }
    );

    await addTimestampTrigger(queryInterface, 'patient_document_refrence_entries');
    await addTimestampTrigger(queryInterface, 'patient_discharge_summary');
  },

  async down(queryInterface) {
    await removeTimestampTrigger(queryInterface, 'patient_document_refrence_entries');
    await removeTimestampTrigger(queryInterface, 'patient_discharge_summary');

    await queryInterface.dropTable('patient_discharge_summary');
    await queryInterface.dropTable('patient_document_refrence_entries');
  }
};
