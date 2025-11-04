'use strict';
const db = require('../components/db.js');
const Film = require('../components/film.js');
const User = require('../components/user.js');
const Review = require('../components/review.js');
const bcrypt = require('bcrypt');


var constants = require('./constants.js');


/**
 * Service Utility functions
 */
exports.getFilmPagination = function (pageNo) {
    var pageNumber = parseInt(pageNo);
    if (isNaN(pageNumber)) pageNumber = 1;
    var size = parseInt(constants.ELEMENTS_IN_PAGE);
    var limits = [];
    if (pageNo == null) {
        pageNumber = 1;
    }
    limits.push(size * (pageNumber - 1));
    limits.push(size);
    console.log("PageNo: " + limits);

    return limits;
}

exports.createFilm = function (row) {
    var privateFilm = (row.private === 1) ? true : false;
    var favoriteFilm;
    if (row.favorite == null) favoriteFilm = undefined;
    else favoriteFilm = (row.favorite === 1) ? true : false;
    return new Film(row.fid, row.title, row.owner, privateFilm, row.watchDate, row.rating, favoriteFilm);
}

/**
 *  Review Utility functions
 */
exports.getReviewPagination = function (pageNo, filmId) {
    var pageNumber = parseInt(pageNo);
    if (isNaN(pageNumber)) pageNumber = 1;
    var size = parseInt(constants.ELEMENTS_IN_PAGE);
    var limits = [];
    limits.push(filmId);
    limits.push(filmId);
    if (pageNo == null) {
        pageNumber = 1;
    }
    limits.push(size * (pageNumber - 1));
    limits.push(size);
    return limits;
}


exports.createReview = function (row) {
    var completedReview = (row.completed === 1) ? true : false;
    return new Review(row.fid, row.rid, completedReview, row.reviewDate, row.rating, row.review);
}

/**
 * User Utility functions
 */

exports.createUser = function (row) {
    const id = row.id;
    const name = row.name;
    const email = row.email;
    const hash = row.hash;
    return new User(id, name, email, hash);
}

exports.checkPassword = function (user, password) {
    let hash = bcrypt.hashSync(password, 10);
    return bcrypt.compareSync(password, user.hash);
}

/**
 * Retrieve a user by her email
 * 
 * Input:
 * - email: email of the user
 * Output:
 * - the user having the specified email
 * 
 */
exports.getUserByEmail = function (email) {
    return new Promise((resolve, reject) => {
        const sql = "SELECT * FROM users WHERE email = ?";
        db.all(sql, [email], (err, rows) => {
            if (err) {
                reject(err);
            }
            else if (rows.length === 0) {
                resolve(undefined);
            }
            else {
                const user = exports.createUser(rows[0]);
                resolve(user);
            }
        });
    });
};
