// swagger.js
const swaggerJSDoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Ulalo Epic FHIR API",
      version: "1.0.0",
      description:
        "This API provides secure access to Epic FHIR services for retrieving and managing healthcare data. " +
        "Endpoints follow HL7 FHIR standards for interoperability, ensuring structured access to patient, encounter, and related resources.",
      contact: {
        name: "Ulalo API Support",
        email: "gdp@yopmail.com",
        url: "https://Ulalofhirepic.com",
      },
    },
    servers: [
      { url: "http://localhost:3002", description: "Local Development Server", },
      //{ url: "http://ec2-44-210-43-215.compute-1.amazonaws.com:3002", description: "Production Server", },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "Enter the JWT token obtained from /api/auth/login.",
        },
      },
      schemas: {
        // Schema for patient list response
        GetAllPatientListResponse: {
          type: "object",
          properties: {
            patientData: {
              type: "array",
              description: "List of patients retrieved from Epic FHIR.",
              items: {
                type: "object",
                properties: {
                  patientId: { type: "string", example: "P001" },
                  epicId: { type: "string", example: "E123" },
                  mrn: { type: "string", example: "MRN001" },
                  patientName: { type: "string", example: "John Doe" },
                  gender: { type: "string", example: "Male" },
                  birthDate: {
                    type: "string",
                    format: "date",
                    example: "1980-01-01",
                  },
                  phoneNumber: { type: "string", example: "1234567890" },
                  encounterData: {
                    type: "object",
                    properties: {
                      resourceType: { type: "string", example: "Encounter" },
                      type: { type: "string", example: "Checkup" },
                      total: { type: "integer", example: 1 },
                      link: {
                        type: "array",
                        items: { type: "object" },
                        description: "FHIR links related to the encounter.",
                      },
                      entry: {
                        type: "array",
                        items: { type: "object" },
                        description: "FHIR encounter entries.",
                      },
                      status: {
                        type: "object",
                        properties: {
                          code: { type: "integer", example: 100 },
                          message: { type: "string", example: "Success" },
                        },
                      },
                    },
                  },
                },
              },
            },
            total: { type: "integer", example: 1 },
            status: {
              type: "object",
              properties: {
                code: { type: "integer", example: 100 },
                message: { type: "string", example: "Success" },
              },
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./routes/*.js"], // Scan route files for Swagger annotations
};

const swaggerSpec = swaggerJSDoc(options);
module.exports = swaggerSpec;
