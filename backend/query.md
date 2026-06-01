-- Readable JSON text
SELECT id, fhir_id, convert_from(raw, 'UTF8') AS raw_json FROM patients;

-- Pretty-printed
SELECT id, jsonb_pretty(convert_from(raw, 'UTF8')::jsonb) AS raw_pretty FROM patients;

-- Extract specific fields
SELECT id, convert_from(raw, 'UTF8')::jsonb ->> 'gender' AS gender FROM patients;

-- Filter by JSON field
SELECT * FROM patients WHERE convert_from(raw, 'UTF8')::jsonb ->> 'gender' = 'male';
