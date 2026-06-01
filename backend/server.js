require("dotenv").config();
const http = require("http");
const fs = require("fs");
const app = require("./app");
const {
  validateJwksConfig,
  hasProviderJwksConfig,
  hasPatientJwksConfig,
} = require("./controllers/jwksController");

const port = Number(process.env.PORT || process.env.SERVER_PORT || 443);

// SSL configuration
// const sslOptions = {
//   cert: fs.readFileSync('C:/certs/appepic.thedevlogix.com-chain.pem'),
//   key: fs.readFileSync('C:/certs/appepic.thedevlogix.com-key.pem')
// };

async function startServer() {
  await validateJwksConfig();

   http.createServer(app).listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${port}`);
    console.log(`Swagger Docs available on http://localhost:${port}/api-docs`);
    console.log(`JWKS available on http://localhost:${port}/.well-known/jwks.json`);
    if (hasProviderJwksConfig()) {
       console.log(`Provider JWKS available on http://localhost:${port}/provider/.well-known/jwks.json`);
    }
    if (hasPatientJwksConfig()) {
       console.log(`Provider JWKS available on http://localhost:${port}/provider/.well-known/jwks.json`);
    }
  });
//  http.createServer(app).listen(port, '0.0.0.0', () => {
//     console.log(`Server running on http://ec2-44-210-43-215.compute-1.amazonaws.com:${port}`);
//     console.log(`Swagger Docs available on http://ec2-44-210-43-215.compute-1.amazonaws.com:${port}/api-docs`);
//   });

  

}

startServer();
