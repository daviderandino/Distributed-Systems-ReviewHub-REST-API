'use strict';
const serviceUtils = require('../utils/serviceUtils.js');
const db = require('../components/db');
const Review = require('../components/review');


/**
 * Retrieve the list of all the reviews that have been issued/completed for a public film
 * All the reviews that have been issued/completed for the public film with ID filmId are retrieved. A pagination mechanism is used to limit the size of messages. This operation does not require authentication. 
 *
 * filmId Long ID of the film whose reviews must be retrieved
 * pageNo Integer ID of the requested page (if absent, the first page is returned)' (optional)
 * returns Reviews
 **/
exports.getFilmReviews = function (pageNo, filmId) {
  return new Promise((resolve, reject) => {
    var sql = "SELECT r.filmId as fid, r.reviewerId as rid, completed, reviewDate, rating, review, c.total_rows FROM reviews r, (SELECT count(*) total_rows FROM reviews l WHERE l.filmId = ? ) c WHERE  r.filmId = ? ";
    var params = serviceUtils.getReviewPagination(pageNo, filmId);
    if (params.length != 2) sql = sql + " LIMIT ?,?";
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        let reviews = rows.map((row) => serviceUtils.createReview(row));
        resolve(reviews);
      }
    });
  });
}

/**
* Retrieve the number of reviews of the film with ID filmId
* 
* Input: 
* - filmId: the ID of the film whose reviews need to be retrieved
* Output:
* - total number of reviews of the film with ID filmId
* 
**/
exports.getFilmReviewsTotal = function (filmId) {
  return new Promise((resolve, reject) => {
    var sqlNumOfReviews = "SELECT count(*) total FROM reviews WHERE filmId = ? ";
    db.get(sqlNumOfReviews, [filmId], (err, size) => {
      if (err) {
        reject(err);
      } else {
        resolve(size.total);
      }
    });
  });
}


/**
 * Issue film review to some users
 * The film with ID filmId is assigned to one or more users for review and the corresponding reviews are created. The users are specified in the review representations in the request body. This operation can only be performed by the owner.
 *
 * body List the new film reviews, including the users to whom they are issued
 * filmId Long ID of the film
 * returns List
 **/
exports.issueFilmReview = function (invitations, owner) {
  return new Promise((resolve, reject) => {
    const sql1 = "SELECT owner, private FROM films WHERE id = ?";
    db.all(sql1, [invitations[0].filmId], (err, rows) => {
      if (err) {
        reject(err);
      }
      else if (rows.length === 0) {
        reject("NO_FILMS");
      }
      else if (owner != rows[0].owner) {
        reject("USER_NOT_OWNER");
      } else if (rows[0].private == 1) {
        reject("PRIVATE_FILM");
      }
      else {
        var sql2 = 'SELECT * FROM users';
        var invitedUsers = [];
        for (var i = 0; i < invitations.length; i++) {
          if (i == 0) sql2 += ' WHERE id = ?';
          else sql2 += ' OR id = ?'
          invitedUsers[i] = invitations[i].reviewerId;
        }
        db.all(sql2, invitedUsers, async function (err, rows) {
          if (err) {
            reject(err);
          }
          else if (rows.length !== invitations.length){
            reject("REVIEWER_ID_IS_NOT_USER");
          }
          else {
            const sql3 = 'INSERT INTO reviews(filmId, reviewerId, completed) VALUES(?,?,0)';
            var finalResult = [];
            for (var i = 0; i < invitations.length; i++) {
              var singleResult;
              try {
                singleResult = await issueSingleReview(sql3, invitations[i].filmId, invitations[i].reviewerId);
                finalResult[i] = singleResult;
              } catch (error) {
                if (error === "EXISTING_REVIEW") {
                  reject("EXISTING_REVIEW");
                  return;
                }
                reject('Error in the creation of the review data structure');
                break;
              }
            }

            if (finalResult.length !== 0) {
              resolve(finalResult);
            }
          }
        });
      }
    });
  });
}

const issueSingleReview = function (sql3, filmId, reviewerId) {
  return new Promise((resolve, reject) => {
    db.run(sql3, [filmId, reviewerId], function (err) {
      if (err) {
        if (err.code === "SQLITE_CONSTRAINT" && err.message.includes("UNIQUE constraint failed")) {

          reject("EXISTING_REVIEW");
        } else {
          reject(err);
        }
      } else {
        var createdReview = new Review(filmId, reviewerId, false);
        resolve(createdReview);
      }
    });
  })
}


/**
 * Delete a review invitation
 * The review of the film with ID filmId and issued to the user with ID reviewerId is deleted. This operation can only be performed by the owner, and only if the review has not yet been completed by the reviewer.
 *
 * filmId Long ID of the film whose review invitation must be deleted
 * reviewerId Long ID of the user to whom the review has been issued
 * no response value expected for this operation
 **/
exports.deleteSingleReview = function (filmId, reviewerId, owner) {
  return new Promise((resolve, reject) => {
    const sql1 = "SELECT f.owner, r.completed FROM films f, reviews r WHERE f.id = r.filmId AND f.id = ? AND r.reviewerId = ?";
    db.all(sql1, [filmId, reviewerId], (err, rows) => {
      if (err)
        reject(err);
      else if (rows.length === 0)
        reject("NO_REVIEWS");
      else if (owner != rows[0].owner) {
        reject("USER_NOT_OWNER");
      }
      else if (rows[0].completed == 1) {
        reject("ALREADY_COMPLETED");
      }
      else {
        const sql2 = 'DELETE FROM reviews WHERE filmId = ? AND reviewerId = ?';
        db.run(sql2, [filmId, reviewerId], (err) => {
          if (err)
            reject(err);
          else
            resolve(null);
        })
      }
    });
  });

}


/**
 * Retrieve a review that has been issued/completed for a film
 * The review of the film with ID filmID issued to the user with ID reviewerId is retrieved. This operation does not require authentication. 
 *
 * filmId Long ID of the film whose reviews must be retrieved
 * reviewerId Long ID of the user to whom the review has been issued
 * returns Review
 **/
exports.getSingleReview = function (filmId, reviewerId) {
  return new Promise((resolve, reject) => {
    const sql = "SELECT filmId as fid, reviewerId as rid, completed, reviewDate, rating, review FROM reviews WHERE filmId = ? AND reviewerId = ?";
    db.all(sql, [filmId, reviewerId], (err, rows) => {
      if (err)
        reject(err);
      else if (rows.length === 0)
        reject("NO_REVIEWS");
      else {
        var review = serviceUtils.createReview(rows[0]);
        resolve(review);
      }
    });
  });
}



/**
 * Complete a review
 * The review of the film with ID filmId and issued to the user with ID reviewerId is completed. This operation only allows setting the \"completed\" property to the \"true\" value, and changing the values of the \"reviewDate\", \"rating\", and \"review\" properties. This operation can be performed only by the invited reviewer.
 *
 * body Review The updated Review object (optional)
 * filmId Long ID of the film whose review must be completed
 * reviewerId Long ID of the user to whom the review has been issued
 * no response value expected for this operation
 **/
exports.updateSingleReview = function (review, filmId, reviewerId) {
  return new Promise((resolve, reject) => {

    const sql1 = "SELECT * FROM reviews WHERE filmId = ? AND reviewerId = ?";
    db.all(sql1, [filmId, reviewerId], (err, rows) => {
      if (err)
        reject(err);
      else if (rows.length === 0)
        reject("NO_REVIEWS");
      else if (reviewerId != rows[0].reviewerId) {
        reject("USER_NOT_REVIEWER");
      }
      else {
        var sql2 = 'UPDATE reviews SET completed = ?';
        var parameters = [review.completed];
        if (review.reviewDate != undefined) {
          sql2 = sql2.concat(', reviewDate = ?');
          parameters.push(review.reviewDate);
        }
        if (review.rating != undefined) {
          sql2 = sql2.concat(', rating = ?');
          parameters.push(review.rating);
        }
        if (review.review != undefined) {
          sql2 = sql2.concat(', review = ?');
          parameters.push(review.review);
        }
        sql2 = sql2.concat(' WHERE filmId = ? AND reviewerId = ?');
        parameters.push(filmId);
        parameters.push(reviewerId);

        db.run(sql2, parameters, function (err) {
          if (err) {
            reject(err);
          } else {
            resolve(null);
          }
        })
      }
    });
  });
}

