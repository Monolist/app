'use strict';

var fs        = require('fs');
var path      = require('path');
var _         = require('lodash');
var Sequelize = require('sequelize');
var config    = require(__dirname + '/../../config');
var db        = {};
var dbConfig  = process.env.NODE_ENV === 'production' ? config.database.production : config.database.local;
var sequelize = new Sequelize(dbConfig.string, {
  dialect: 'postgres',
  native: true
});

fs
  .readdirSync(__dirname)
  .filter(function(file) {
    return (file.indexOf('.') !== 0) && (file !== 'index.js');
  })
  .forEach(function(file) {
    var model = sequelize['import'](path.join(__dirname, file));
    db[model.name] = model;
  });

_.forEach(Object.keys(db), function(modelName) {
  if ("associate" in db[modelName]) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;