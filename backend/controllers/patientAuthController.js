const axios = require("axios");
const crypto = require("crypto");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const path = require("path");
const generatePKCE = require("../utils/pkce");

const PATIENT_LOGIN_STATE = "patient-login";
let codeVerifierStore = null;

function decodeJWT(token) {
  const payload = token.split(".")[1];
  const decoded = Buffer.from(payload, "base64").toString("utf8");
  return JSON.parse(decoded);
}

function getPatientRedirectUri() {
  return process.env.PATIENT_REDIRECT_URI || process.env.REDIRECT_URI;
}

function getPatientAuthorizeUrl() {
  return process.env.PATIENT_AUTHORIZE_URL || process.env.AUTHORIZE_URL;
}

function getPatientTokenUrl() {
  return process.env.PATIENT_TOKEN_URL || process.env.TOKEN_URL || process.env.EPIC_TOKEN_URL;
}

function getPatientFhirBase() {
  const configuredBase =
    process.env.PATIENT_FHIR_BASE_URL || process.env.FHIR_BASE || process.env.EPIC_FHIR_BASE_URL;

  if (!configuredBase) {
    return "";
  }

  const normalizedBase = configuredBase.replace(/\/+$/, "");
  if (/\/R4$/i.test(normalizedBase) || /\/STU3$/i.test(normalizedBase) || /\/DSTU2$/i.test(normalizedBase)) {
    return normalizedBase;
  }

  return `${normalizedBase}/R4`;
}

function getPatientJwtKid() {
  return process.env.PATIENT_JWT_KID || process.env.KID || process.env.EPIC_JWT_KID;
}

function getPatientJwtJku() {
  return process.env.PATIENT_JWT_JKU || "";
}

function getPatientJwtAlgorithm() {
  return process.env.PATIENT_JWT_ALG || "RS384";
}

function getPatientPrivateKeyPath() {
  const configuredPath = process.env.PATIENT_PRIVATE_KEY_PATH;
  const candidatePaths = [
    configuredPath,
    "./keys/patient/private.key",
    "./keys/patient/private.pem"
  ].filter(Boolean);

  for (const candidatePath of candidatePaths) {
    const resolvedPath = path.resolve(__dirname, "..", candidatePath);
    if (fs.existsSync(resolvedPath)) {
      return resolvedPath;
    }
  }

  return path.resolve(__dirname, "..", configuredPath || "./keys/patient/private.key");
}

function getPatientPrivateKey() {
  const resolvedPath = getPatientPrivateKeyPath();

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Patient private key file not found: ${resolvedPath}`);
  }

  return fs.readFileSync(resolvedPath, "utf8");
}

function generateClientAssertion() {
  const clientId = process.env.PATIENT_CLIENT_ID || process.env.CLIENT_ID;
  const tokenUrl = getPatientTokenUrl();
  const kid = getPatientJwtKid();
  const jku = getPatientJwtJku();
  const algorithm = getPatientJwtAlgorithm();

  if (!clientId || !tokenUrl || !kid) {
    throw new Error("Missing patient client ID, patient token URL, or patient JWT kid");
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
    getPatientPrivateKey(),
    {
      algorithm,
      header
    }
  );
}

const patientLogin = (req, res) => {
  try {
    const clientId = process.env.PATIENT_CLIENT_ID || process.env.CLIENT_ID;
    const redirectUri = getPatientRedirectUri();
    const authorizeUrl = getPatientAuthorizeUrl();
    const fhirBase = getPatientFhirBase();

    if (!clientId || !redirectUri || !authorizeUrl || !fhirBase) {
      throw new Error(
        "Missing patient client ID, patient redirect URI, patient authorize URL, or patient FHIR base URL configuration"
      );
    }

    const { codeVerifier, codeChallenge } = generatePKCE();
    codeVerifierStore = codeVerifier;

    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: "openid fhirUser patient/Patient.read launch/patient",
      aud: fhirBase,
      state: PATIENT_LOGIN_STATE,
      code_challenge: codeChallenge,
      code_challenge_method: "S256"
    });

    const url = `${authorizeUrl}?${params.toString()}`;

    console.log("Patient authorize URL:", url);

    return res.json({ url });
  } catch (error) {
    console.error("Patient login error:", error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

const patientCallback = async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ success: false, error: "Missing authorization code" });
  }

  if (!codeVerifierStore) {
    return res.status(400).json({
      success: false,
      error: "Missing or expired PKCE verifier for this patient login session"
    });
  }

  try {
    const clientId = process.env.PATIENT_CLIENT_ID || process.env.CLIENT_ID;
    const redirectUri = getPatientRedirectUri();
    const tokenUrl = getPatientTokenUrl();
    const fhirBase = getPatientFhirBase();
    const clientAssertion = generateClientAssertion();

    if (!clientId || !redirectUri || !tokenUrl || !fhirBase) {
      throw new Error(
        "Missing patient client ID, patient redirect URI, patient token URL, or patient FHIR base URL configuration"
      );
    }

    const params = new URLSearchParams();
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", redirectUri);
    params.append("code_verifier", codeVerifierStore);
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

    const accessToken = tokenRes.data.access_token;
    const patientId = tokenRes.data.patient;
    const decodedToken = decodeJWT(accessToken);

    let patientData = null;

    if (patientId) {
      const patientRes = await axios.get(`${fhirBase}/Patient/${patientId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      patientData = patientRes.data;
    }

    const sessionPayload = {
      authType: "patient",
      fhirBase,
      token: {
        access_token: accessToken,
        expires_in: tokenRes.data.expires_in,
        scope: tokenRes.data.scope,
        patient: patientId
      },
      decoded_token: decodedToken,
      patient: patientData
        ? {
          id: patientId,
          data: patientData
        }
        : { message: "No patient ID returned in token response" }
    };

    codeVerifierStore = null;

    if (!process.env.FRONTEND_APP_URL) {
      return res.status(500).json({
        success: false,
        error: "Missing FRONTEND_APP_URL configuration"
      });
    }

    const redirectUrl = new URL("/patient-dashboard", process.env.FRONTEND_APP_URL);
    redirectUrl.searchParams.set("token", accessToken);
    redirectUrl.searchParams.set("patientId", patientId || "");
    redirectUrl.searchParams.set("authType", "patient");
    redirectUrl.searchParams.set("data", JSON.stringify(sessionPayload));

    return res.redirect(redirectUrl.toString());
  } catch (err) {
    console.error("Patient callback error:", err.response?.data || err.message);
    return res.status(500).json({
      success: false,
      error: err.response?.data || err.message
    });
  } finally {
    codeVerifierStore = null;
  }
};

module.exports = { patientLogin, patientCallback };
