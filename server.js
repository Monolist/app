'use strict';

var express        = require('express');
var morgan         = require('morgan');
var compression    = require('compression');
var methodOverride = require('method-override');
var bodyParser     = require('body-parser');
var busboy         = require('connect-busboy');
var cookieParser   = require('cookie-parser');
var session        = require('express-session');
var favicon        = require('serve-favicon');
var passport       = require('passport');
var server         = express();
var models         = require('./api/models');
var config         = require('./config');
var populateDb     = require('./populateDb');
var SequelizeStore = require('connect-session-sequelize')(session.Store);
var api            = require('./api');

/* ====================================================== */

server.use(morgan('dev'));     // Logs all requests to the console
server.use(compression());     // Compresses response data with gzip/deflate
server.use(methodOverride());  // Simulates DELETE and PUT
server.use(bodyParser.json()); // Parses req.body json from html POST
server.use(bodyParser.urlencoded({ extended: true })); // Parses urlencoded req.body, including extended syntax
server.use(busboy());          // Parse multipart/form-data
server.use(cookieParser());
server.set('json spaces', 0);  // Remove superfluous spaces from JSON responses
server.use(session({
  secret: config.secret,
  cookie: {
    maxAge: 1000*60*30 // only 30 minutes until user logs in
  },
  store: new SequelizeStore({ db: models.sequelize }),
  resave: false,
  saveUninitialized: false
}));
server.use(passport.initialize());
server.use(passport.session());

/* ====================================================== */

// Connect to database and initialize models
if ( process.env.NODE_ENV === 'production' ) {
  models.sequelize.sync();
} else {
  models.sequelize.sync({ force: true }).done(function() {
    populateDb(models, require('./api/mailer'));
  });
}

/* ====================================================== */

// Add headers
server.use(function (req, res, next) {
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

// Force all request to use https instad of http
server.use(function (req, res, next) {
  if ( req.headers['x-forwarded-proto'] !== 'https' && process.env.NODE_ENV === 'production' ) {
    res.redirect('https://' + req.get('host') + req.url);
  } else {
    next();
  }
});

/* ====================================================== */

// Serve favicon
server.use(favicon(__dirname + '/build/favicon.ico'));

/* ====================================================== */

// serve all asset files from necessary directories
// TODO: find a way to get rid of these wildcards?
server.use('*/js', express.static(__dirname + '/build/js'));
server.use('*/images', express.static(__dirname + '/build/images'));
server.use('*/css', express.static(__dirname + '/build/css'));
server.use('*/fonts', express.static(__dirname + '/build/fonts'));

/* ====================================================== */

// Mount the API
server.use('/api/v1', api);

/* ====================================================== */

// Serve index.html for all main routes to leave routing up to react-router
server.all('/*', function(req, res) {
    res.sendFile('index.html', { root: 'build' });
});

/* ====================================================== */

// start the server
server.listen(process.env.PORT || 3000);