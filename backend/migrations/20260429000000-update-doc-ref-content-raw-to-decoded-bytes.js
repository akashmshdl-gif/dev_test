'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE "patient_document_reference_content"
      ADD COLUMN IF NOT EXISTS "raw_decoded" bytea;
    `);

    await queryInterface.sequelize.query(`
      UPDATE "patient_document_reference_content"
      SET "raw_decoded" = CASE
        WHEN "raw" IS NULL THEN NULL
        WHEN get_byte("raw", 0) = 123
          THEN decode(convert_from("raw", 'UTF8')::jsonb ->> 'content', 'base64')
        WHEN "decoded_content" IS NOT NULL
          THEN convert_to("decoded_content", 'UTF8')
        ELSE "raw"
      END;
    `);

    await queryInterface.removeColumn('patient_document_reference_content', 'raw');
    await queryInterface.renameColumn('patient_document_reference_content', 'raw_decoded', 'raw');
    await queryInterface.sequelize.query(`
      ALTER TABLE "patient_document_reference_content"
      DROP COLUMN IF EXISTS "decoded_content";
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('patient_document_reference_content', 'raw_json', {
      type: Sequelize.BLOB,
      allowNull: true
    });

    await queryInterface.addColumn('patient_document_reference_content', 'decoded_content', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    await queryInterface.sequelize.query(`
      UPDATE "patient_document_reference_content"
      SET
        "decoded_content" = CASE
          WHEN "raw" IS NOT NULL THEN convert_from("raw", 'UTF8')
          ELSE NULL
        END,
        "raw_json" = CASE
          WHEN "raw" IS NOT NULL THEN convert_to(
            json_build_object(
              'resourceType', 'Binary',
              'id', "binary_id",
              'contentType', "content_type",
              'content', encode("raw", 'base64')
            )::text,
            'UTF8'
          )
          ELSE NULL
        END;
    `);

    await queryInterface.removeColumn('patient_document_reference_content', 'raw');
    await queryInterface.renameColumn('patient_document_reference_content', 'raw_json', 'raw');
  }
};
