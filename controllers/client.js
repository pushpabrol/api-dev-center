const secrets = require('../config/secrets'),
      request = require('request'),
      async   = require('async'),
      Client  = require('../models/client'),
      tools = require('auth0-extension-tools');

module.exports = {

  /**
   * Register Client with name, redirect_url and other information
   * @param  req
   * @param  res
   * @return Void
   */
  create: function(req, res) {

    var redirectUris = req.body.redirect_uris;
    var redirectUrisArray = (redirectUris.indexOf(",") > 0 ) ? req.body.redirect_uris.split(",") : [redirectUris];
    
    async.waterfall([
      function(cb) {
        const options = { 
          method: 'POST',
          url: `https://${process.env.AUTH0_DOMAIN}/oidc/register`,
          headers: { 'content-type': 'application/json' },
          body: 
          { client_name: req.body.client_name,
            redirect_uris: redirectUrisArray
          },
          json: true 
        };

        request(options, function (error, response, body) {
          
          if (error) { 
            console.log(error);
            cb(error);
          }
          else 
          {
          const clientDetails = {
            clientID : body.client_id,
            clientSecret: body.client_secret
          };

          cb(null, clientDetails);
        }
        });
      }
    ], function(err, result) {
      if(err) return res.status(500).json({ success: false, message: err.error });

      console.log(result);  
      var client        = new Client();
        client.client_name   = req.body.client_name;
        client.client_id     = result.clientID;
        client.client_secret = result.clientSecret
        client.redirect_uris = redirectUrisArray;
        client.createdBy     = req.user.sub;

        client.save( function(err, data){
          if(err) {
            if(err.name == 'MongoError') {
              return res.json({ Error: err.errmsg });
            }
          } else {
            console.log("Client Details ", data);
            return res.status(200).json({ success: true, message: "New Client Registered successfully" });
          }
        });
    });
  },

  /**
   * Fetch Clients Created by a particular uSER
   * @param   req
   * @param   res
   * @param   next
   * @return  Void
   */
  getClients: function(req, res){


    if(req.user === undefined) {
      Client.find({}, function(err, client) {
        if(err) {
          return res.status(404).json({error: err});
        }

        if(client.length === 0){
          return res.status(200).json({ success: false, message: 'No Clients created yet.' });
        }

        return res.status(200).json({success: true, client: client});
      });
      return;
    }

    var userId = req.user.sub;
    Client.find({createdBy: userId}, function (err, client) {
        if(err) {
          return res.status(404).json({ error: err });
        }

        if(client.length === 0){
          return res.json({ success: false, message: 'No Clients created yet.' });
        }

        return res.status(200).json({success: true, client: client});
    });
  },

  /**
   * Delete A Client
   * @param  req
   * @param  res
   * @param  next
   * @return Void
   */
  deleteClient: function(req, res, next) {
    var clientID   = req.params.client_id;

    async.waterfall([
      function(cb) {

        tools.managementApi.getClient({
          domain: process.env.AUTH0_DOMAIN,
          clientId: process.env.AUTH0_MANAGEMENT_API_CLIENT_ID,
          clientSecret: process.env.AUTH0_MANAGEMENT_API_CLIENT_SECRET
      })
          .then(function (client) {
              // Use the client...
              client.clients.delete({"client_id" : clientID }, function (err) {
                  if (err) {
                    return cb(new Error(err));
                  }
                  else return cb(null)
              });
          });
      }
    ], function(err) {

        console.log("Client ID", clientID);

        Client.remove({client_id: clientID}, function (err, client) {
          if(err) {
            return res.status(404).json({success: false, message: 'Client Details Not Found'});
          }
           
          console.log("Client ", client);
          return res.json({success: true, message: 'Delete Successful'});
        });
    });
  }
};