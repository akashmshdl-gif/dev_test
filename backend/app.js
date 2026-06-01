const express = require("express");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");
const loggerMiddleware = require("./middleware/loggerMiddleware");
const authMiddleware = require("./middleware/authMiddleware");
const authRoutes = require("./routes/authRoutes");
const providerAuthRoutes = require("./routes/providerAuthRoutes");
const patientAuthRoutes = require("./routes/patientAuthRoutes");
const routes = require("./routes/epicPatientRoutes");
const jwksRoutes = require("./routes/jwksRoutes");
const smartLaunchRoutes = require("./routes/smartLaunchRoutes");
const cdsRoutes = require("./routes/cdsRoutes");
const errorHandler = require('./middleware/errorHandler');

const app = express();
const staticPublicPath = path.resolve(__dirname, "public");
const defaultFrontendDistPath = path.resolve(__dirname, "../frontend/dist");
const configuredFrontendDistPath = process.env.FRONTEND_DIST_PATH
  ? path.resolve(__dirname, process.env.FRONTEND_DIST_PATH)
  : defaultFrontendDistPath;

// Epic Hyperdrive/Hyperspace embeds the app in an iframe, so frame policy
// is configured explicitly instead of using Helmet's SAMEORIGIN default.
app.use(helmet({ contentSecurityPolicy: false, frameguard: false }));

app.use((req, res, next) => {
  const frameAncestors = process.env.EPIC_FRAME_ANCESTORS;

  if (frameAncestors) {
    res.setHeader("Content-Security-Policy", `frame-ancestors ${frameAncestors}`);
  }

  next();
});

// Allow CORS for all origins temporarily for testing
app.use(cors({
  origin: '*', // Allow all origins for testing (restrict later)
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use("/public", express.static(staticPublicPath));

// Use the logger middleware
app.use(loggerMiddleware);

app.use('/api/auth', authRoutes);
app.use('/api/auth', providerAuthRoutes);
app.use('/api/auth', patientAuthRoutes);
app.use('/api/auth', smartLaunchRoutes);

// Public JWKS routes (mounted at root)
app.use('/', jwksRoutes);

// Secure all other API routes under /api
app.use('/api', authMiddleware);

app.use('/api', routes);

// Public CDS Services route
app.use('/cds-hooks/cds-service', cdsRoutes);
app.use('/cds-services', cdsRoutes);

// Serve Swagger UI securely
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCssUrl: "/public/swagger-custom.css",
  customJs: "/public/swagger-custom.js"
}));

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true });
});

// Serve static frontend files
app.use(express.static(configuredFrontendDistPath));

// Catch-all route for SPA (must be before error handler, but after all API routes)
app.get('*', (req, res, next) => {
  // If the request is for an API or other specific backend route, let it fall through
  if (req.originalUrl.startsWith('/api') || 
      req.originalUrl.startsWith('/cds-hooks/cds-service') || 
      req.originalUrl.startsWith('/cds-services') ||
      req.originalUrl.includes('/.well-known/jwks.json') ||
      req.originalUrl.startsWith('/api-docs') ||
      req.originalUrl.startsWith('/health')) {
    return next();
  }
  res.sendFile(path.join(configuredFrontendDistPath, 'index.html'));
});

// Global Error Handler
app.use(errorHandler);

module.exports = app;
