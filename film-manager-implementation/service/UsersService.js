'use strict';
const serviceUtils = require('../utils/serviceUtils.js');
const db = require('../components/db');
var passport = require('passport');

/**
 * Logs a user in
 * The user who wants to log in sends the user data to the authenticator which performs the operation. If the request for the login of a new user comes from an already authenticated user, the previous user is first logged out.
 *
 * body User The data of the user who wants to perform log in. The data structure must contain email and password.
 * no response value expected for this operation
 **/
exports.authenticateUser = function(req, res, next) {
  return new Promise((resolve, reject) => {
      passport.authenticate('local', (err, user, info) => {
        if (err) return reject(err);
        if (!user) return reject('NO_USER');
        req.login(user, (err) => {
          if (err) return reject(err);
          return resolve({ id: user.id, name: user.name, email: req.body.email });
        });
      })(req, res, next);
    });
}

/**
 * Logs the current user out
 * Invalidates the current user session. Removes the authentication cookie if present.
 *
 * no response value expected for this operation
 **/
exports.logoutUser = function(res, req) {
  return new Promise(function(resolve, reject) {
      const email = req.user.email;
      serviceUtils.getUserByEmail(email)
        .then((user) => {
          if (user === undefined) {
            reject("NO_USER");
          } else {
            req.logout(() => {
              resolve()
            });
          }
        })
  });
}


/**
 * Get information about the users
 * The available information (passwords excluded) about all the users is retrieved. This operation is available only to authenticated users.
 *
 * returns Users
 **/
exports.getUsers = function () {
  return new Promise((resolve, reject) => {
    const sql = "SELECT id, name, email FROM users";
    db.all(sql, [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        if (rows.length === 0)
          resolve(undefined);
        else {
          let users = rows.map((row) => serviceUtils.createUser(row));
          resolve(users);
        }
      }
    });
  });
}



/**
 * Get information about a user
 * The available information (password excluded) about the user specified by userId is retrieved. This operation requires authentication.
 *
 * userId Long ID of the user to get
 * returns User
 **/
exports.getUserById = function (id) {
  return new Promise((resolve, reject) => {
    const sql = "SELECT id, name, email FROM users WHERE id = ?"
    db.all(sql, [id], (err, rows) => {
      if (err)
        reject(err);
      else if (rows.length === 0)
        resolve(undefined);
      else {
        const user = serviceUtils.createUser(rows[0]);
        resolve(user);
      }
    });
  });
};

