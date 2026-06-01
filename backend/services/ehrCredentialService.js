const { EhrCredential } = require("../models");

async function getEpicCredentials(clientId) {
  const env = process.env.APP_ENV || "sandbox";

  if (!clientId) {
    throw new Error("clientId is required");
  }

  let whereCondition = {
    isActive: true
  };

  // Search based on environment
  if (env === "production") {
    whereCondition.production_client_id = clientId;
  } else {
    whereCondition.sandbox_client_id = clientId;
  }

  const config = await EhrCredential.findOne({
    where: whereCondition
  });

  if (!config) {
    throw new Error(`Epic credentials not found for clientId: ${clientId}`);
  }

  if (env === "production") {
    return {
      clientId: config.production_client_id,
      privateKey: config.production_private_key,
      tokenUrl: config.production_token_url,
      fhirBaseUrlR4: config.production_fhir_base_url_r4,
      fhirBaseUrlSTU3: config.production_fhir_base_url_stu3,
      fhirBaseUrlDSTU2: config.production_fhir_base_url_dstu2,
      providerName: config.provider_name,
      orgId: config.org_id,
      jwtKid: config.jwt_kid,
      jwtJku: config.jwt_jku
    };
  }

  return {
    clientId: config.sandbox_client_id,
    privateKey: config.sandbox_private_key,
    tokenUrl: config.sandbox_token_url,
    fhirBaseUrlR4: config.sandbox_fhir_base_url_r4,
    fhirBaseUrlSTU3: config.sandbox_fhir_base_url_stu3,
    fhirBaseUrlDSTU2: config.sandbox_fhir_base_url_dstu2,
    providerName: config.provider_name,
    orgId: config.org_id,
    jwtKid: config.jwt_kid,
    jwtJku: config.jwt_jku
  };
}

module.exports = {
  getEpicCredentials
};