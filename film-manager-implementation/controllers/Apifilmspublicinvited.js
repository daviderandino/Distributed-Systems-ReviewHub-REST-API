'use strict';

var utils = require('../utils/writer.js');
const filmService = require('../service/FilmsService.js');
const constants = require('../utils/constants.js');

module.exports.getInvitedFilms = function getInvitedFilms(req, res, next) {
  var numOfFilms = 0;
  var next = 0;

  filmService.getInvitedFilmsTotal(req.user.id)
    .then(function (response) {
      numOfFilms = response;
      if (numOfFilms == 0) {
        return utils.writeJson(res, {
          totalPages: 1,
          currentPage: 1,
          totalItems: 0,
          reviews: [],
        });
      }
      filmService.getInvitedFilms(req.user.id, req.query.pageNo)
        .then(function (response) {
          if (req.query.pageNo == null) var pageNo = 1;
          else var pageNo = req.query.pageNo;
          var totalPage = Math.ceil(numOfFilms / constants.ELEMENTS_IN_PAGE);
          next = Number(pageNo) + 1;
          if (pageNo > totalPage || pageNo < 1) {
            utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': "The page does not exist." }], }, 404);
          } else if (pageNo == totalPage) {
            utils.writeJson(res, {
              totalPages: totalPage,
              currentPage: pageNo,
              totalItems: numOfFilms,
              films: response
            });
          } else {
            utils.writeJson(res, {
              totalPages: totalPage,
              currentPage: pageNo,
              totalItems: numOfFilms,
              films: response,
              next: "/api/films/public/invited?pageNo=" + next
            });
          }
        })
        .catch(function (response) {
          utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': response }], }, 500);
        });
    })
    .catch(function (response) {
      utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': response }], }, 500);
    });



};