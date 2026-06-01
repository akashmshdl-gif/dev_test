const axios = require("axios");
const crypto = require("crypto");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const path = require("path");
const generatePKCE = require("../utils/pkce");

let authRequestStore = null;

function decodeJWT(token) {
  const payload = token.split(".")[1];
  const decoded = Buffer.from(payload, "base64").toString("utf8");
  return JSON.parse(decoded);
}

function getProviderRedirectUri() {
  return process.env.PROVIDER_REDIRECT_URI;
}

function getProviderFhirBase() {
  const configuredBase = process.env.EPIC_FHIR_BASE_URL || "";
  const normalizedBase = configuredBase.replace(/\/+$/, "");

  if (!normalizedBase) {
    return "";
  }

  return /\/R4$/i.test(normalizedBase) ? normalizedBase : `${normalizedBase}/R4`;
}

function getBackendLookupClientId() {
  return [
    process.env.EPIC_CLIENT_ID,
    process.env.SMART_LAUNCH_CLIENT_ID,
    process.env.PROVIDER_CLIENT_ID
  ]
    .map((value) => String(value || "").trim())
    .find(Boolean) || null;
}

function getProviderPrivateKeyPath() {
  const candidatePaths = [
    process.env.PROVIDER_PRIVATE_KEY_PATH,
    "./keys/provider/private.pem",
    process.env.EPIC_PRIVATE_KEY_PATH
  ].filter(Boolean);

  for (const candidatePath of candidatePaths) {
    const resolvedPath = path.resolve(__dirname, "..", candidatePath);
    if (fs.existsSync(resolvedPath)) {
      return resolvedPath;
    }
  }

  return path.resolve(__dirname, "..", "./keys/provider/private.pem");
}

function getProviderPrivateKey() {
  const resolvedPath = getProviderPrivateKeyPath();

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Provider private key file not found: ${resolvedPath}`);
  }

  return fs.readFileSync(resolvedPath, "utf8");
}

function generateProviderClientAssertion() {
  const clientId = process.env.PROVIDER_CLIENT_ID;
  const tokenUrl = process.env.EPIC_TOKEN_URL;
  const kid = process.env.PROVIDER_JWT_KID || process.env.EPIC_JWT_KID;
  const jku = process.env.PROVIDER_JWT_JKU || process.env.EPIC_JWT_JKU;
  const algorithm = process.env.PROVIDER_JWT_ALG || process.env.JWT_ALG || "RS384";

  if (!clientId || !tokenUrl || !kid) {
    throw new Error("Missing provider client ID, token URL, or JWT kid");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { typ: "JWT", kid };

  if (jku) {
    header.jku = jku;
  }

  return jwt.sign(
    {
      iss: clientId,
      sub: clientId,
      aud: tokenUrl,
      jti: crypto.randomUUID(),
      iat: now,
      exp: now + 300
    },
    getProviderPrivateKey(),
    {
      algorithm,
      header
    }
  );
}

const providerLogin = (req, res) => {
  try {
    const { codeVerifier, codeChallenge } = generatePKCE();
    const state = crypto.randomUUID();
    authRequestStore = { codeVerifier, state };

    const CLIENT_ID = process.env.PROVIDER_CLIENT_ID;
    const REDIRECT_URI = getProviderRedirectUri();
    const AUTHORIZE_URL = process.env.AUTHORIZE_URL;
    const FHIR_BASE = getProviderFhirBase();

    if (!CLIENT_ID || !REDIRECT_URI || !AUTHORIZE_URL || !FHIR_BASE) {
      throw new Error("Missing provider OAuth configuration");
    }

    const params = new URLSearchParams({
      response_type: "code",
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      scope:
        "launch launch/patient openid fhirUser offline_access user/Patient.read user/Practitioner.read user/Condition.read user/Observation.read user/MedicationRequest.read user/DocumentReference.read user/Binary.read",
      aud: FHIR_BASE,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256"
    });

    const url = `${AUTHORIZE_URL}?${params.toString()}`;

    console.log("Authorize URL:", url);

    return res.json({ url });
  } catch (error) {
    console.error("❌ Provider login error:", error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const providerCallback = async (req, res) => {
  const { code, state } = req.query;

  if (!code) {
    return res.status(400).json({ success: false, error: "Missing authorization code" });
  }

  if (!authRequestStore || !authRequestStore.codeVerifier) {
    return res.status(400).json({
      success: false,
      error: "Missing or expired PKCE verifier for this provider login session"
    });
  }

  if (!state || state !== authRequestStore.state) {
    authRequestStore = null;
    return res.status(400).json({
      success: false,
      error: "Invalid OAuth state for this provider login session"
    });
  }

  try {
    const clientId = process.env.PROVIDER_CLIENT_ID;
    const redirectUri = getProviderRedirectUri();
    const tokenUrl = process.env.EPIC_TOKEN_URL;
    const fhirBase = getProviderFhirBase();
    const clientAssertion = generateProviderClientAssertion();

    if (!clientId || !redirectUri || !tokenUrl || !fhirBase) {
      throw new Error("Missing provider token exchange configuration");
    }

    const params = new URLSearchParams();
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", redirectUri);
    params.append("code_verifier", authRequestStore.codeVerifier);
    params.append(
      "client_assertion_type",
      "urn:ietf:params:oauth:client-assertion-type:jwt-bearer"
    );
    params.append("client_assertion", clientAssertion);
    params.append("client_id", clientId);

    const tokenRes = await axios.post(tokenUrl, params, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json"
      }
    });
    const patientId = tokenRes.data.patient;
    const accessToken = tokenRes.data.access_token;

    const decodedToken = decodeJWT(accessToken);

    const practitionerId = decodedToken.sub;

    const practitionerRes = await axios.get(
      `${fhirBase}/Practitioner/${practitionerId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    const sessionPayload = {
      authType: "provider",
      fhirBase,
      clinicId: getBackendLookupClientId(),
      patientId: patientId || null,
      practitionerId,
      token: {
        access_token: accessToken,
        expires_in: tokenRes.data.expires_in,
        scope: tokenRes.data.scope,
        patient: patientId || null
      },

      decoded_token: decodedToken,

      practitioner: {
        id: practitionerId,
        data: practitionerRes.data
      },
      patient: patientId
        ? { id: patientId, message: "Patient resource not prefetched during provider login" }
        : { message: "No patient ID returned in token response" }
    };

    authRequestStore = null;

    if (!process.env.FRONTEND_APP_URL) {
      return res.status(500).json({
        success: false,
        error: "Missing FRONTEND_APP_URL configuration"
      });
    }

    const redirectUrl = new URL("/provider-dashboard", process.env.FRONTEND_APP_URL);
    redirectUrl.searchParams.set("token", accessToken);
    redirectUrl.searchParams.set("patientId", patientId || "");
    redirectUrl.searchParams.set("practitionerId", practitionerId);
    redirectUrl.searchParams.set("authType", "provider");
    redirectUrl.searchParams.set("data", JSON.stringify(sessionPayload));

    return res.redirect(redirectUrl.toString());

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({
      success: false,
      error: err.response?.data || err.message
    });
  } finally {
    authRequestStore = null;
  }
};

module.exports = { providerLogin, providerCallback };
