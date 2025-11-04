'use strict';

var utils = require('../utils/writer.js');
const filmService = require('../service/FilmsService.js');

module.exports.createFilm = function createFilm(req, res, next) {
  var film = req.body;
  var owner = req.user.id;
  filmService.createFilm(film, owner)
    .then(function (response) {
      utils.writeJson(res, response, 201);
    })
    .catch(function (response) {
      utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': response }], }, 500);
    });
};