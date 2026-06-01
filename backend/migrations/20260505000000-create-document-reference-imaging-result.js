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
    await queryInterface.createTable('documentReference_imaging_result', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      patient_id: { type: Sequelize.STRING },
      resource_id: { type: Sequelize.STRING, comment: 'DocumentReference FHIR id' },
      binary_id: { type: Sequelize.STRING, comment: 'Binary resource id extracted from content.attachment.url' },
      status: { type: Sequelize.STRING },
      doc_status: { type: Sequelize.STRING },
      type_text: { type: Sequelize.STRING, comment: 'DocumentReference.type.text' },
      category_code: { type: Sequelize.STRING },
      category_display: { type: Sequelize.STRING },
      subject_reference: { type: Sequelize.STRING },
      subject_display: { type: Sequelize.STRING },
      date: { type: Sequelize.DATE },
      author: { type: Sequelize.STRING },
      author_reference: { type: Sequelize.STRING },
      description: { type: Sequelize.TEXT },
      content_type: { type: Sequelize.STRING, comment: 'MIME type e.g. application/pdf' },
      encounter_reference: { type: Sequelize.STRING },
      encounter_display: { type: Sequelize.STRING },
      practice_setting_code: { type: Sequelize.STRING },
      practice_setting_display: { type: Sequelize.STRING },
      period_start: { type: Sequelize.DATE },
      period_end: { type: Sequelize.DATE },
      raw: { type: Sequelize.BLOB, comment: 'Full FHIR DocumentReference resource JSON' },
      binary_raw: { type: Sequelize.BLOB, comment: 'Raw Binary FHIR resource JSON' },
      binary_content_base64: { type: Sequelize.TEXT, comment: 'Binary content as base64 (application/pdf)' },
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
      'documentReference_imaging_result',
      ['patient_id', 'resource_id'],
      { unique: true, name: 'docref_imaging_result_patient_resource_unique' }
    );

    await addTimestampTrigger(queryInterface, 'documentReference_imaging_result');
  },

  async down(queryInterface) {
    await removeTimestampTrigger(queryInterface, 'documentReference_imaging_result');
    await queryInterface.dropTable('documentReference_imaging_result');
  }
};
