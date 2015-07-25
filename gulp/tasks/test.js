'use strict';

var gulp   = require('gulp');
var jsdom  = require('jsdom').jsdom;
var config = require('../config');

gulp.task('test', function() {

  global.document = jsdom('<!DOCTYPE html><html><body></body></html>');
  global.window = document.parentWindow;
  global.location = { href: '' };
  global.navigator = {};
  global.navigator.userAgent = 'jsdom';
  global.navigator.appVersion = '';

  return (require('gulp-jsx-coverage').createTask({
    src: [config.tests],

    istanbul: {
      coverageVariable: '__MY_TEST_COVERAGE__',
      exclude: /node_modules|__tests__|build|gulp|createAuthenticatedSuite|stubRouterContext|testHelpers/
    },

    transpile: {
      babel: {
        include: /\.jsx?$/,
        exclude: /node_modules/
      }
    },

    coverage: {
      reporters: ['text-summary', 'html'],
      directory: '__coverage__'
    },

    mocha: {
      reporter: 'spec'
    },

    babel: {
      sourceMap: 'inline'
    }
  }))();

});