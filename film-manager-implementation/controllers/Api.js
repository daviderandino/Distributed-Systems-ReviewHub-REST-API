'use strict';

var utils = require('../utils/writer.js');
var Api = require('../service/ApiService');

module.exports.getFilmManager = function getFilmManager (req, res, next) {
  Api.getFilmManager()
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};
