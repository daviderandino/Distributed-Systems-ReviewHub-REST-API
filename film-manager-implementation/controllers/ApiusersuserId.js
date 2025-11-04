'use strict';

var utils = require('../utils/writer.js');
const userService = require('../service/UsersService.js');

module.exports.getSingleUser = function getSingleUser (req, res, next) {
  userService.getUserById(req.params.userId)
    .then(function (response) {
      if(!response){
        utils.writeJson(res, response, 404);
     } else {
       utils.writeJson(res, response);
    }
    })
    .catch(function (response) {
      utils.writeJson(res, {errors: [{ 'param': 'Server', 'msg': response }],}, 500);
    });
};

