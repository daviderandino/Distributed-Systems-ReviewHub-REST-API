'use strict';

var utils = require('../utils/writer.js');
const userService = require('../service/UsersService.js');

module.exports.logoutUser = function logoutUser (req, res, next) {
  userService.logoutUser(res, req)
    .then(function (response) {
        utils.writeJson(res, response, 204);
    })
    .catch(function (err) {
      if(err === 'NO_USER') {
        utils.writeJson(res, { message: 'Unauthorized access.' }, 401);
      }
      else {
          utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': err }], }, 500);
      }
    });
};
