const jwt = require('express-jwt'),
      Client = require('./controllers/client');

const jwtAuthz = require('express-jwt-authz');
const jwksRsa = require('jwks-rsa');      

const issuer = 'https://' + process.env.AUTH0_DOMAIN + '/';
const jwksUri = `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json` ; 
const checkJwt = jwt({
  // Dynamically provide a signing key
  // based on the kid in the header and 
  // the signing keys provided by the JWKS endpoint.
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: jwksUri
  }),

  // Validate the audience and the issuer.
  audience: process.env.AUDIENCE,
  issuer: issuer,
  algorithms: ['RS256']
});

module.exports = function(app) {

  app.get('/api', function(req, res) {
    res.json("Welcome to the Developer Centre Api");
  });

  app.get('/api/clients',checkJwt, Client.getClients); 
 
  app.delete('/api/clients/:client_id',checkJwt,  Client.deleteClient);

  app.post('/api/clients', checkJwt, Client.create);
};