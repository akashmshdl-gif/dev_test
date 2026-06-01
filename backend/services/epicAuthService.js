require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });


const jwt = require("jsonwebtoken");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const { getEpicCredentials } = require('./ehrCredentialService');

// 🔹 Helper functions OUTSIDE class



function normalizeUrl(url) {
  return String(url || "").trim().replace(/\/+$/, "");
}

class EpicAuthService {
  constructor(clientId) {
    this.lookupClientId = clientId; // used for DB search
    this.clientId = null;
    this.tokenURL = null;
    this.privateKey = null;
    this.fhirBaseUrlR4 = null;
    this.fhirBaseUrlSTU3 = null;
    this.fhirBaseUrlDSTU2 = null;
    this.orgId = null;
    this.jwtKid = null;
    this.jwtJku = null;
  }

  async initializeConfig() {
    if (this.clientId) return; // already initialized
    const config = await getEpicCredentials(this.lookupClientId);
    this.clientId = config.clientId;
    this.tokenURL = config.tokenUrl;
    this.privateKey = config.privateKey;
    this.fhirBaseUrlR4 = config.fhirBaseUrlR4;
    this.fhirBaseUrlSTU3 = config.fhirBaseUrlSTU3;
    this.fhirBaseUrlDSTU2 = config.fhirBaseUrlDSTU2;
    this.orgId = config.orgId;
    this.jwtKid = config.jwtKid;
    this.jwtJku = config.jwtJku;

    if (!this.clientId || !this.tokenURL || !this.privateKey) {
      throw new Error("Invalid Epic credential configuration");
    }
  }

  /**
   * Generate JWT Token
   */
  async generateJWTToken() {
    await this.initializeConfig();
    const clientId = this.clientId?.trim();
    const tokenUrl = this.tokenURL;
    const privateKey = this.privateKey;
    const kid = this.jwtKid?.trim();
    const jku = this.jwtJku?.trim();

    if (!clientId) throw new Error("EPIC_CLIENT_ID is required");

    const now = Math.floor(Date.now() / 1000);

    const header = { typ: "JWT" };
    if (kid) header.kid = kid;
    if (jku) header.jku = jku;

    return jwt.sign(
      {
        iss: clientId,
        sub: clientId,
        aud: tokenUrl,
        jti: uuidv4(),
        iat: now,
        nbf: now,
        exp: now + 300
      },
      privateKey,
      {
        algorithm: "RS256", // ✅ safer than RS384
        header
      }
    );
  }

  /**
   * Call Epic Token API
   */
  async authorizeUser(jwtToken) {
    try {
      const params = new URLSearchParams();
      params.append("grant_type", "client_credentials");
      params.append(
        "client_assertion_type",
        "urn:ietf:params:oauth:client-assertion-type:jwt-bearer"
      );
      params.append("client_assertion", jwtToken);

      console.log("🔹 Request Body:", params.toString());

      const response = await axios.post(this.tokenURL, params.toString(), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json"
        }
      });

      return {
        status: response.status,
        data: response.data
      };

    } catch (error) {
      console.error("❌ Error:", error.response?.data || error.message);

      return {
        status: error.response?.status || 500,
        message: error.response?.data || error.message
      };
    }
  }

  /**
   * Main method
   */
  async getAuthToken() {
    await this.initializeConfig();

    console.log("🔹 Generating new Epic token");
    const jwtToken = await this.generateJWTToken();
    return this.authorizeUser(jwtToken);
  }

  /**
   * OAuth2 client credentials using client id + secret (no JWT assertion).
   * @param {{ api_key: string, api_secret: string, token_url: string }} authentication
   * @returns {Promise<Record<string, any> & { access_token: string }>}
   */
  async getAuthTokenWithDetails(authentication) {
    const api_key = authentication?.api_key?.trim();
    const api_secret = authentication?.api_secret?.trim();
    const token_url = normalizeUrl(authentication?.token_url);

    if (!api_key || !api_secret || !token_url) {
      throw new Error("api_key, api_secret, and token_url are required for getAuthTokenWithDetails");
    }

    const params = new URLSearchParams();
    params.append("grant_type", "client_credentials");
    params.append("client_id", api_key);
    params.append("client_secret", api_secret);

    const response = await axios.post(
      token_url,
      params.toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json"
        }
      }
    );

    if (!response.data?.access_token) {
      const err = new Error("Token response did not include access_token");
      err.cause = response.data;
      throw err;
    }

    return { ...response.data, access_token: response.data.access_token };
  }
}

module.exports = EpicAuthService;

