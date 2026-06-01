'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'documentReference_imaging_result'
            AND column_name = 'binary_content_base64'
        ) AND NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'documentReference_imaging_result'
            AND column_name = 'binary_content'
        ) THEN
          ALTER TABLE "documentReference_imaging_result"
          RENAME COLUMN "binary_content_base64" TO "binary_content";
        END IF;

        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'documentReference_imaging_result'
            AND column_name = 'binary_content'
            AND udt_name <> 'bytea'
        ) THEN
          ALTER TABLE "documentReference_imaging_result"
          ALTER COLUMN "binary_content" TYPE BYTEA
          USING CASE
            WHEN "binary_content" IS NOT NULL THEN decode("binary_content", 'base64')
            ELSE NULL
          END;
        END IF;
      END $$;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'documentReference_imaging_result'
            AND column_name = 'binary_content'
            AND udt_name = 'bytea'
        ) THEN
          ALTER TABLE "documentReference_imaging_result"
          ALTER COLUMN "binary_content" TYPE TEXT
          USING encode("binary_content", 'base64');
        END IF;

        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'documentReference_imaging_result'
            AND column_name = 'binary_content'
        ) AND NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'documentReference_imaging_result'
            AND column_name = 'binary_content_base64'
        ) THEN
          ALTER TABLE "documentReference_imaging_result"
          RENAME COLUMN "binary_content" TO "binary_content_base64";
        END IF;
      END $$;
    `);
  }
};
