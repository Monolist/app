'use strict';

var path           = require('path');
var express        = require('express');
var morgan         = require('morgan');
var compression    = require('compression');
var methodOverride = require('method-override');
var bodyParser     = require('body-parser');
var favicon        = require('serve-favicon');
var app            = express();
var models         = require(path.join(__dirname, 'api/models'));
var api            = require(path.join(__dirname, 'api'));

/* ====================================================== */

app.use(morgan('dev'));     // Logs all requests to the console
app.use(compression());     // Compresses response data with gzip/deflate
app.use(methodOverride());  // Simulates DELETE and PUT
app.use(bodyParser.json()); // Parses req.body json from html POST
app.use(bodyParser.urlencoded({
    extended: true
}));                        // Parses urlencoded req.body, including extended syntax
app.set('json spaces', 0);  // Remove superfluous spaces from JSON responses

/* ====================================================== */

models.sequelize.drop().then(function() {
  // Connect to database and initialize models
  models.sequelize.sync();
});

/* ====================================================== */

// Add headers
app.use(function (req, res, next) {
    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');
    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);
    // Pass to next layer of middleware
    next();
});

/* ====================================================== */

// Serve favicon
app.use(favicon(__dirname + '/build/favicon.ico'));

// serve all asset files from necessary directories
// TODO: find a way to get rid of these wildcards?
app.use('*/js', express.static(__dirname + '/build/js'));
app.use('*/images', express.static(__dirname + '/build/images'));
app.use('*/css', express.static(__dirname + '/build/css'));
app.use('*/fonts', express.static(__dirname + '/build/fonts'));

// Mount the API
app.use('/api', api);

// Serve index.html for all main routes to leave routing up to react-router
app.all('/*', function(req, res) {
    res.sendFile('index.html', { root: 'build' });
});

/* ====================================================== */

// start the server
app.listen(process.env.PORT || 3000);