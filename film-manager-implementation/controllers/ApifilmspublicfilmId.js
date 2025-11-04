'use strict';

var utils = require('../utils/writer.js');
const filmService = require('../service/FilmsService.js');

module.exports.deleteSinglePublicFilm = function deleteSinglePublicFilm(req, res, next) {
  filmService.deleteSinglePublicFilm(req.params.filmId, req.user.id)
    .then(function (response) {
      utils.writeJson(res, response, 204);
    })
    .catch(function (response) {
      if (response == "USER_NOT_OWNER") {
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The user is not the owner of the film' }], }, 403);
      }
      else if (response == "NO_FILMS" || response == "NO_PUBLIC_FILM") {
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The film does not exist.' }], }, 404);
      }
      else {
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': response }], }, 500);
      }
    });
};


module.exports.getSinglePublicFilm = function getSinglePublicFilm(req, res, next) {
  filmService.getSinglePublicFilm(req.params.filmId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      if (response == "NO_FILMS" || response == "NO_PUBLIC_FILM") {
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The film does not exist.' }], }, 404);
      }
      else {
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': response }], }, 500);
      }
    });
};

module.exports.updateSinglePublicFilm = function updateSinglePublicFilm(req, res, next) {
  if(req.body.private == true){
    utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'Cannot change visibility'}], }, 409);
  }
  filmService.updateSinglePublicFilm(req.body, req.params.filmId, req.user.id)
    .then(function (response) {
      utils.writeJson(res, response, 204);
    })
    .catch(function (response) {
      if (response == "USER_NOT_OWNER") {
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The user is not the owner of the film' }], }, 403);
      }
      else if (response == "NO_FILMS" || response == "NO_PUBLIC_FILM") {
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The film does not exist.' }], }, 404);
      }
      else if (response == "") {
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The film does not exist.' }], }, 409);
      }
      else {
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': response }], }, 500);
      }
    });
};