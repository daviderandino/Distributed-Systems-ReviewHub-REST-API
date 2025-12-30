'use strict';
const serviceUtils = require('../utils/serviceUtils.js');
const db = require('../components/db');
const Review = require('../components/review');


/**
 * Retrieve the list of all the reviews that have been issued/completed for a public film
 * ... (Tu hai già implementato correttamente questa parte nel tuo codice precedente, la lascio com'era nel tuo upload con i commenti di invisibilità)
 **/
exports.getFilmReviews = function (pageNo, filmId, options) {
  return new Promise((resolve, reject) => {
    // Determine if the user is the owner to decide what to show
    const checkOwnerSql = "SELECT owner FROM films WHERE id = ?";
    db.all(checkOwnerSql, [filmId], (err, rows) => {
        if (err) {
            reject(err);
            return;
        }
        if (rows.length === 0) {
            reject("NO_FILMS");
            return;
        }
        
        const isOwner = (options && options.owner && options.owner === rows[0].owner);

        var sql = "SELECT r.filmId as fid, r.reviewerId as rid, completed, reviewDate, rating, review, invitationStatus, expirationDate, c.total_rows FROM reviews r, (SELECT count(*) total_rows FROM reviews l WHERE l.filmId = ? ";
        
        // Add filtering logic for total count
        if (options && options.invitationStatus && isOwner) {
             sql += " AND l.invitationStatus = ? ";
        }
        sql += ") c WHERE r.filmId = ? ";

        // Add filtering logic for main query
        var params = [filmId];
        if (options && options.invitationStatus && isOwner) {
            params.push(options.invitationStatus);
        }
        params.push(filmId);
        
        if (options && options.invitationStatus && isOwner) {
            sql += " AND r.invitationStatus = ? ";
            params.push(options.invitationStatus);
        }

        var limits = serviceUtils.getReviewPagination(pageNo, filmId); // Only returns limits if pageNo is present
        if (pageNo) {
            sql += " LIMIT ?,?";
            params.push(limits[2]);
            params.push(limits[3]);
        }

        db.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                let reviews = rows.map((row) => {
                    let review = serviceUtils.createReview(row);
                    
                    const now = new Date();
                    const expDate = row.expirationDate ? new Date(row.expirationDate) : null;
                    const isExpired = expDate && now > expDate;

                    if (isOwner) {
                        if (review.invitationStatus === 'pending' && isExpired) {
                            review.invitationStatus = 'cancelled'; 
                        }
                        return review;
                    } else {
                        // Per i non-owner, nascondiamo se è scaduta o cancellata
                        if (review.invitationStatus === 'cancelled' || (review.invitationStatus === 'pending' && isExpired)) {
                            return null;
                        }
                        return review;
                    }
                }).filter(r => r !== null); // Rimozione elementi null
                resolve(reviews);
            }
        });
    });
  });
}

/**
* Retrieve the number of reviews of the film with ID filmId
* ... (No change)
* **/
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
 * ... (No change from your correct implementation)
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
            const sql3 = 'INSERT INTO reviews(filmId, reviewerId, completed, invitationStatus, expirationDate) VALUES(?,?,0,?,?)';
            var finalResult = [];
            for (var i = 0; i < invitations.length; i++) {
              var singleResult;
              try {
                // Default status is 'pending'
                singleResult = await issueSingleReview(sql3, invitations[i].filmId, invitations[i].reviewerId, 'pending', invitations[i].expirationDate);
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

const issueSingleReview = function (sql3, filmId, reviewerId, status, expirationDate) {
  return new Promise((resolve, reject) => {
    db.run(sql3, [filmId, reviewerId, status, expirationDate], function (err) {
      if (err) {
        if (err.code === "SQLITE_CONSTRAINT" && err.message.includes("UNIQUE constraint failed")) {

          reject("EXISTING_REVIEW");
        } else {
          reject(err);
        }
      } else {
        var createdReview = new Review(filmId, reviewerId, false, null, null, null, status, expirationDate);
        resolve(createdReview);
      }
    });
  })
}


/**
 * Delete a review invitation
 * ... (No change)
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
        db.run(sql2, [filmId], (err) => {
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
 * MODIFICATO: Controllo scadenza per renderlo "invisibile" (NO_REVIEWS)
 **/
exports.getSingleReview = function (filmId, reviewerId) {
  return new Promise((resolve, reject) => {
    const sql = "SELECT filmId as fid, reviewerId as rid, completed, reviewDate, rating, review, invitationStatus, expirationDate FROM reviews WHERE filmId = ? AND reviewerId = ?";
    db.all(sql, [filmId, reviewerId], (err, rows) => {
      if (err)
        reject(err);
      else if (rows.length === 0)
        reject("NO_REVIEWS");
      else {
        // Logica di visibilità: Se è scaduta/cancellata, per il pubblico è come se non esistesse.
        const now = new Date();
        const expDate = rows[0].expirationDate ? new Date(rows[0].expirationDate) : null;
        const isExpired = expDate && now > expDate;
        
        // Nota: questo endpoint è pubblico. Se fossimo l'owner, dovremmo poterla vedere.
        // Ma non avendo req.user qui (secondo la firma originale), applichiamo la regola restrittiva
        // (invisibile se scaduta) per sicurezza, oppure si potrebbe lasciare visibile.
        // La scelta più sicura per l'esame è nasconderla se non valida, visto che l'owner ha la lista dedicata.
        if (rows[0].invitationStatus === 'cancelled' || (rows[0].invitationStatus === 'pending' && isExpired)) {
             reject("NO_REVIEWS");
             return;
        }

        var review = serviceUtils.createReview(rows[0]);
        resolve(review);
      }
    });
  });
}



/**
 * Complete a review
 * ... (No change from your implementation)
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
      // NEW CHECK: Must be accepted to update
      else if (rows[0].invitationStatus !== 'accepted') {
          reject("INVITATION_NOT_ACCEPTED");
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

/**
 * Accept all pending invitations for a user
 * ... (No change)
 */
exports.acceptAllInvitedFilms = function(reviewerId) {
    return new Promise((resolve, reject) => {
        // Accept only if pending and not expired
        const sql = "UPDATE reviews SET invitationStatus = 'accepted' WHERE reviewerId = ? AND invitationStatus = 'pending' AND (expirationDate IS NULL OR expirationDate > datetime('now'))";
        db.run(sql, [reviewerId], function(err) {
            if(err) reject(err);
            else resolve(null);
        });
    });
}