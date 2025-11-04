'use strict';

var utils = require('../utils/writer.js');
const userService = require('../service/UsersService.js');

module.exports.getUsers = function getUsers (req, res, next) {
  userService.getUsers()
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};
