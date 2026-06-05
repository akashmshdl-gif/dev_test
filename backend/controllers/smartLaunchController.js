const axios = require("axios");
const crypto = require("crypto");
const generatePKCE = require("../utils/pkce");

/**
 * In-memory session store keyed by OAuth2 `state`.
 * Each entry stores: { iss, tokenUrl, codeVerifier, launch, createdAt }
 *
 * NOTE: This is fine for single-instance dev/test.
 * For production, use a shared persistent store such as a database.
 */
const launchSessions = new Map();

// Clean up sessions older than 10 minutes (runs every 5 minutes)
setInterval(() => {
  const TEN_MINUTES = 10 * 60 * 1000;
  const now = Date.now();

  for (const [state, session] of launchSessions) {
    if (now - session.createdAt > TEN_MINUTES) {
      launchSessions.delete(state);
    }
  }
}, 5 * 60 * 1000);

/**
 * Discover SMART configuration from the FHIR server.
 * Tries .well-known/smart-configuration first, then falls back to /metadata.
 */
async function discoverSmartEndpoints(iss) {
  const normalizedIss = iss.replace(/\/+$/, "");

  // Try .well-known/smart-configuration first (preferred)
  try {
    const wellKnownUrl = `${normalizedIss}/.well-known/smart-configuration`;
    console.log("🔍 Trying SMART well-known:", wellKnownUrl);

    const response = await axios.get(wellKnownUrl, {
      headers: { Accept: "application/json" },
      timeout: 10000,
    });

    if (response.data.authorization_endpoint && response.data.token_endpoint) {
      console.log("✅ Found SMART configuration via .well-known");
      return {
        authorizationEndpoint: response.data.authorization_endpoint,
        tokenEndpoint: response.data.token_endpoint,
      };
    }
  } catch (err) {
    console.log("⚠️ .well-known/smart-configuration not available, trying /metadata...");
  }

  // Fallback: /metadata (FHIR CapabilityStatement)
  try {
    const metadataUrl = `${normalizedIss}/metadata`;
    console.log("🔍 Trying FHIR metadata:", metadataUrl);

    const response = await axios.get(metadataUrl, {
      headers: { Accept: "application/fhir+json" },
      timeout: 10000,
    });

    const rest = response.data?.rest;
    if (Array.isArray(rest) && rest.length > 0) {
      const security = rest[0]?.security;
      const oauthExtension = security?.extension?.find(
        (ext) =>
          ext.url ===
          "http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris"
      );

      if (oauthExtension && Array.isArray(oauthExtension.extension)) {
        const authorizationEndpoint = oauthExtension.extension.find(
          (e) => e.url === "authorize"
        )?.valueUri;
        const tokenEndpoint = oauthExtension.extension.find(
          (e) => e.url === "token"
        )?.valueUri;

        if (authorizationEndpoint && tokenEndpoint) {
          console.log("✅ Found SMART configuration via /metadata");
          return { authorizationEndpoint, tokenEndpoint };
        }
      }
    }
  } catch (err) {
    console.error("❌ /metadata discovery failed:", err.message);
  }

  throw new Error(
    `Unable to discover SMART authorization endpoints from ISS: ${iss}`
  );
}

function decodeJWT(token) {
  const payload = token.split(".")[1];
  const decoded = Buffer.from(payload, "base64").toString("utf8");
  return JSON.parse(decoded);
}

function parseSmartAppContext(appContext) {
  if (typeof appContext !== "string" || !appContext.trim()) {
    return null;
  }

  try {
    return JSON.parse(appContext);
  } catch {
    return appContext;
  }
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

/**
 * POST /api/auth/smart-launch
 *
 * Body: { iss: string, launch: string }
 *
 * Discovers auth endpoints from the ISS, generates PKCE, and returns
 * an authorization URL that includes the `launch` parameter.
 */
const smartLaunch = async (req, res) => {
  try {
    const { iss, launch } = req.body;

    if (!iss || !launch) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameters: iss and launch",
      });
    }

    console.log("🚀 SMART EHR Launch initiated");
    console.log("   ISS:", iss);
    console.log("   Launch:", launch);

    // Discover authorization and token endpoints
    const { authorizationEndpoint, tokenEndpoint } =
      await discoverSmartEndpoints(iss);

    console.log("   Auth endpoint:", authorizationEndpoint);
    console.log("   Token endpoint:", tokenEndpoint);

    // Generate PKCE pair
    const { codeVerifier, codeChallenge } = generatePKCE();

    // Generate a random state parameter
    const state = crypto.randomUUID();

    // Determine client ID:
    // Use SMART_LAUNCH_CLIENT_ID if set, otherwise fall back to
    // PROVIDER_CLIENT_ID for Epic sandbox.
    const clientId =
      process.env.SMART_LAUNCH_CLIENT_ID ||
      process.env.PROVIDER_CLIENT_ID ||
      process.env.EPIC_CLIENT_ID;
    const clientSecret =
      // process.env.SMART_LAUNCH_CLIENT_SECRET ||
      process.env.PROVIDER_CLIENT_SECRET ||
      process.env.EPIC_CLIENT_SECRET;
    const clientSecretSource = process.env.PROVIDER_CLIENT_SECRET
        ? "PROVIDER_CLIENT_SECRET"
        : process.env.EPIC_CLIENT_SECRET
          ? "EPIC_CLIENT_SECRET"
          : "none";

    if (!clientId) {
      throw new Error("No client ID configured for SMART launch");
    }

    const redirectUri =
      process.env.SMART_LAUNCH_REDIRECT_URI ||
      `http://localhost:${process.env.SERVER_PORT || 3002}/api/auth/smart-callback`;

    // Store session for callback
    launchSessions.set(state, {
      iss,
      tokenUrl: tokenEndpoint,
      codeVerifier,
      launch,
      clientId,
      clientSecret,
      clientSecretSource,
      redirectUri,
      createdAt: Date.now(),
    });

    // Build authorization URL
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      launch: launch,
      scope:
        "openid fhirUser launch user/Patient.read user/Practitioner.read user/Condition.read user/Observation.read user/MedicationRequest.read user/DocumentReference.read user/Binary.read",
      state: state,
      aud: iss,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    const authorizeUrl = `${authorizationEndpoint}?${params.toString()}`;

    console.log("🔗 Authorization URL:", authorizeUrl);

    return res.json({
      success: true,
      url: authorizeUrl,
      state: state,
    });
  } catch (error) {
    console.error("❌ SMART launch error:", error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * GET /api/auth/smart-callback?code=...&state=...
 *
 * Exchanges the authorization code for tokens using the discovered
 * token endpoint, fetches patient data, and redirects to the frontend.
 */
const smartCallback = async (req, res) => {
  const { code, state, error, error_description } = req.query;

  // Handle error responses from the authorization server
  if (error) {
    console.error("❌ Auth server returned error:", error, error_description);

    // Clean up session if we have state
    if (state) {
      launchSessions.delete(state);
    }

    // Redirect to frontend with error info
    const frontendUrl =
      process.env.FRONTEND_APP_URL || "http://localhost:5173";
    const redirectUrl = new URL("/", frontendUrl);
    redirectUrl.searchParams.set("smartError", error_description || error);

    return res.redirect(redirectUrl.toString());
  }

  if (!code || !state) {
    return res.status(400).json({
      success: false,
      error: "Missing authorization code or state",
    });
  }

  // Look up the session
  const session = launchSessions.get(state);
  if (!session) {
    return res.status(400).json({
      success: false,
      error:
        "Invalid or expired state parameter. Please re-launch from the EHR.",
    });
  }

  try {
    const { iss, tokenUrl, codeVerifier, clientId, clientSecret, clientSecretSource, redirectUri } =
      session;

    console.log("🔄 SMART callback — exchanging code for token");
    console.log("   Token URL:", tokenUrl);
    console.log("   Client ID:", clientId);
    console.log("   Client secret source:", clientSecretSource);

    // Build token exchange request
    const params = new URLSearchParams();
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", redirectUri);
    params.append("code_verifier", codeVerifier);

    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    };

    if (clientSecret) {
      const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
      headers.Authorization = `Basic ${basicAuth}`;
    } else {
      params.append("client_id", clientId);
    }

    const tokenRes = await axios.post(tokenUrl, params, {
      headers,
    });

    const accessToken = tokenRes.data.access_token;
    const patientId = tokenRes.data.patient;
    const appContext =
      typeof tokenRes.data.appContext === "string"
        ? tokenRes.data.appContext
        : null;

    console.log("✅ Token received");
    console.log("   Patient ID:", patientId || "(none)");

    let decodedToken = null;
    try {
      decodedToken = decodeJWT(accessToken);
    } catch {
      console.log("⚠️ Could not decode access token as JWT (opaque token)");
    }

    // Fetch patient resource if we have a patient ID
    let patientData = null;
    if (patientId) {
      try {
        const normalizedIss = iss.replace(/\/+$/, "");
        const patientRes = await axios.get(
          `${normalizedIss}/Patient/${patientId}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/fhir+json",
            },
          }
        );
        patientData = patientRes.data;
      } catch (err) {
        console.error(
          "⚠️ Failed to fetch patient resource:",
          err.response?.data || err.message
        );
      }
    }

    const launchContextData = parseSmartAppContext(appContext);
    const practitionerId =
      typeof decodedToken?.sub === "string" && decodedToken.sub
        ? decodedToken.sub
        : typeof tokenRes.data.fhirUser === "string"
          ? tokenRes.data.fhirUser.replace(/^Practitioner\//, "")
          : null;
    const authType = "provider";

    // Build session payload
    const sessionPayload = {
      authType,
      fhirBase: iss,
      clinicId: getBackendLookupClientId(),
      launchType: "ehr",
      instanceKey: state,
      patientId: patientId || null,
      practitionerId,
      token: {
        access_token: accessToken,
        expires_in: tokenRes.data.expires_in,
        scope: tokenRes.data.scope,
        patient: patientId || null,
      },
      launchContext: {
        state,
        launch: session.launch,
        appContext,
        appContextData: launchContextData,
      },
      decoded_token: decodedToken,
      practitioner: practitionerId
        ? { id: practitionerId, message: "Practitioner resource not loaded for SMART launch" }
        : { message: "No practitioner ID returned in token response" },
      patient: patientData
        ? { id: patientId, data: patientData }
        : patientId
          ? { id: patientId, message: "Could not fetch patient resource" }
          : { message: "No patient ID returned in token response" },
    };

    // Clean up
    launchSessions.delete(state);

    // Redirect to frontend dashboard
    const frontendUrl =
      process.env.FRONTEND_APP_URL || "http://localhost:5173";
    const dashboardPath = "/provider-dashboard";

    const redirectUrl = new URL(dashboardPath, frontendUrl);
    redirectUrl.searchParams.set("token", accessToken);
    redirectUrl.searchParams.set("authType", authType);
    redirectUrl.searchParams.set("instanceKey", state);

    if (patientId) {
      redirectUrl.searchParams.set("patientId", patientId);
    }

    redirectUrl.searchParams.set("data", JSON.stringify(sessionPayload));

    console.log("🔀 Redirecting to frontend:", redirectUrl.toString().substring(0, 100) + "...");

    return res.redirect(redirectUrl.toString());
  } catch (err) {
    // Clean up even on error
    launchSessions.delete(state);

    console.error(
      "❌ SMART callback error:",
      err.response?.data || err.message
    );
    return res.status(500).json({
      success: false,
      error: err.response?.data || err.message,
    });
  }
};

module.exports = { smartLaunch, smartCallback };
