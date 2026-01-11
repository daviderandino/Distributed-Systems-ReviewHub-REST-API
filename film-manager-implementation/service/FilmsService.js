'use strict';
const serviceUtils = require('../utils/serviceUtils.js');
const db = require('../components/db');
const Film = require('../components/film');


/**
 * Create a new film
 **/
exports.createFilm = function (film, owner) {
  return new Promise((resolve, reject) => {

    const sql = 'INSERT INTO films(title, owner, private, watchDate, rating, favorite) VALUES(?,?,?,?,?,?)';
    db.run(sql, [film.title, owner, film.private, film.watchDate, film.rating, film.favorite], function (err) {
      if (err) {
        reject(err);
      } else {
        var createdFilm = new Film(this.lastID, film.title, owner, film.private, film.watchDate, film.rating, film.favorite);
        resolve(createdFilm);
      }
    });
  });
}


/**
 * Retrieve the private films of the logged-in user
 **/
exports.getPrivateFilms = function (userId, pageNo) {
  return new Promise((resolve, reject) => {

    var sql = "SELECT f.id as fid, f.title, f.owner, f.private, f.watchDate, f.rating, f.favorite, c.total_rows FROM films f, (SELECT count(*) total_rows FROM films l WHERE l.private=1 AND owner = ?) c WHERE  f.private = 1 AND owner = ?"
    var limits = serviceUtils.getFilmPagination(pageNo);
    if (limits.length != 0) sql = sql + " LIMIT ?,?";
    var parameters = [userId, userId];
    parameters = parameters.concat(limits);
    db.all(sql, parameters, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        let films = rows.map((row) => serviceUtils.createFilm(row));
        resolve(films);
      }
    });
  });
}

/**
 * Retrieve the number of private films of an user with ID userId
 **/
exports.getPrivateFilmsTotal = function (userId) {
    return new Promise((resolve, reject) => {
        var sqlNumOfFilms = "SELECT count(*) total FROM films f WHERE private = 1 AND owner = ? ";
        db.get(sqlNumOfFilms, [userId], (err, size) => {
            if (err) {
                reject(err);
            } else {
                resolve(size.total);
            }
        });
    });
}


/**
 * Retrieve the public films
 **/
exports.getPublicFilms = function (pageNo) {
  return new Promise((resolve, reject) => {

    var sql = "SELECT f.id as fid, f.title, f.owner, f.private, c.total_rows FROM films f, (SELECT count(*) total_rows FROM films l WHERE l.private=0) c WHERE  f.private = 0 "
    var limits = serviceUtils.getFilmPagination(pageNo);
    if (limits.length != 0) sql = sql + " LIMIT ?,?";

    db.all(sql, limits, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        let films = rows.map((row) => serviceUtils.createFilm(row));
        resolve(films);
      }
    });
  });
}

/**
 * Retrieve the number of public films 
 **/
exports.getPublicFilmsTotal = function () {
    return new Promise((resolve, reject) => {
        var sqlNumOfFilms = "SELECT count(*) total FROM films f WHERE private = 0 ";
        db.get(sqlNumOfFilms, [], (err, size) => {
            if (err) {
                reject(err);
            } else {
                resolve(size.total);
            }
        });
    });
}



/**
 * Retrieve the public films that the logged-in user has been invited to review
 **/
exports.getInvitedFilms = function (userId, pageNo, filterStatus) {
  return new Promise((resolve, reject) => {
    
    var baseLogic = `(r.invitationStatus = 'accepted' OR (r.invitationStatus = 'pending' AND (r.expirationDate IS NULL OR r.expirationDate > datetime('now'))))`;
    var baseLogicCount = `(r2.invitationStatus = 'accepted' OR (r2.invitationStatus = 'pending' AND (r2.expirationDate IS NULL OR r2.expirationDate > datetime('now'))))`;

    var sql = `
        SELECT f.id as fid, f.title, f.owner, f.private, f.watchDate, f.rating, f.favorite, c.total_rows 
        FROM films f, reviews r, 
        (SELECT count(*) total_rows 
         FROM films f2, reviews r2 
         WHERE f2.id = r2.filmId AND r2.reviewerId = ? 
         AND ${baseLogicCount}
         `;


    var countParams = [userId];
    if (filterStatus) {
        sql += " AND r2.invitationStatus = ? ";
        countParams.push(filterStatus);
    }
    
    sql += `) c 
        WHERE f.id = r.filmId AND r.reviewerId = ? 
        AND ${baseLogic}
    `;

    var params = countParams.concat([userId]);
    if (filterStatus) {
        sql += " AND r.invitationStatus = ? ";
        params.push(filterStatus);
    }

    var limits = serviceUtils.getFilmPagination(pageNo);
    if (limits.length != 0) {
        sql = sql + " LIMIT ?,?";
        params = params.concat(limits);
    }

    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        let films = rows.map((row) => serviceUtils.createFilm(row));
        resolve(films);
      }
    });
  });
}

/**
 * Retrieve the number of public films for which the user has received a review invitation
 **/
exports.getInvitedFilmsTotal = function (reviewerId, filterStatus) {
    return new Promise((resolve, reject) => {
        var sqlNumOfFilms = "SELECT count(*) total FROM films f, reviews r WHERE f.id = r.filmId AND r.reviewerId = ? AND (r.invitationStatus = 'accepted' OR (r.invitationStatus = 'pending' AND (r.expirationDate IS NULL OR r.expirationDate > datetime('now'))))";
        
        var params = [reviewerId];
        
        if (filterStatus) {
            sqlNumOfFilms += " AND r.invitationStatus = ? ";
            params.push(filterStatus);
        }

        db.get(sqlNumOfFilms, params, (err, size) => {
            if (err) {
                reject(err);
            } else {
                resolve(size.total);
            }
        });
    });
}


/**
 * Delete a public film having filmId as ID
 **/
 exports.deleteSinglePublicFilm = function(filmId, owner) {
  return new Promise((resolve, reject) => {
      const sql1 = "SELECT owner FROM films f WHERE f.id = ?";
      db.all(sql1, [filmId], (err, rows) => {
          if (err)
              reject(err);
          else if (rows.length === 0)
              reject("NO_FILMS");
          else if(rows[0].private == 1)
            reject("NO_PUBLIC_FILM");
          else if(owner != rows[0].owner) {
              reject("USER_NOT_OWNER");
          }
          else {
              const sql2 = 'DELETE FROM reviews WHERE filmId = ?';
              db.run(sql2, [filmId], (err) => {
                  if (err)
                      reject(err);
                  else {
                      const sql3 = 'DELETE FROM films WHERE id = ?';
                      db.run(sql3, [filmId], (err) => {
                          if (err)
                              reject(err);
                          else
                              resolve(null);
                      })
                  }
              })
          }
      });
  });
}



/**
 * Retrieve a public film
 **/
exports.getSinglePublicFilm = function (filmId) {
  return new Promise((resolve, reject) => {
    const sql = "SELECT id as fid, title, owner, private FROM films WHERE id = ?";
    db.all(sql, [filmId], (err, rows) => {
      if (err)
        reject(err);
      else if (rows.length === 0)
        reject("NO_FILMS");
      else if (rows[0].private == 1)
        reject("NO_PUBLIC_FILM");
      else {
        var film = serviceUtils.createFilm(rows[0]);
        resolve(film);
      }
    });
  });
}



/**
 * Update a public film
 **/
exports.updateSinglePublicFilm = function (film, filmId, owner) {
  return new Promise((resolve, reject) => {

    const sql1 = "SELECT owner, private FROM films f WHERE f.id = ?";
    db.all(sql1, [filmId], (err, rows) => {
      if (err)
        reject(err);
      else if (rows.length === 0)
        reject("NO_FILMS");
      else if (rows[0].private == 1)
        reject("NO_PUBLIC_FILM");
      else if (owner != rows[0].owner) {
        reject("USER_NOT_OWNER");
      }
      else {
        var sql3 = 'UPDATE films SET title = ?';
        var parameters = [film.title];
        //sql3 = sql3.concat(', private = ?');
        //parameters.push(film.private);
        sql3 = sql3.concat(' WHERE id = ?');
        parameters.push(filmId);

        db.run(sql3, parameters, function (err) {
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
 * Delete a private film
 **/
exports.deleteSinglePrivateFilm = function (filmId, owner) {
  return new Promise((resolve, reject) => {
    const sql1 = "SELECT owner FROM films f WHERE f.id = ? AND f.private = 1";
    db.all(sql1, [filmId], (err, rows) => {
      if (err)
        reject(err);
      else if (rows.length === 0)
        reject("NO_FILMS");
      else if (owner != rows[0].owner) {
        reject("USER_NOT_OWNER");
      }
      else {
        const sql3 = 'DELETE FROM films WHERE id = ?';
        db.run(sql3, [filmId], (err) => {
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
 * Retrieve a private film
 **/
exports.getSinglePrivateFilm = function (filmId, owner) {
  return new Promise((resolve, reject) => {
    const sql1 = "SELECT id as fid, title, owner, private, watchDate, rating, favorite FROM films WHERE id = ?";
    db.all(sql1, [filmId], (err, rows) => {
      if (err)
        reject(err);
      else if (rows.length === 0)
        reject("NO_FILMS");
      else if (rows[0].private == 0)
        reject("NO_PRIVATE_FILM");
      else if (rows[0].owner == owner) {
        var film = serviceUtils.createFilm(rows[0]);
        resolve(film);
      }
      else
        reject("USER_NOT_OWNER");
    });
  });
}



/**
 * Update a private film
 **/
exports.updateSinglePrivateFilm = function (film, filmId, owner) {
  return new Promise((resolve, reject) => {

    const sql1 = "SELECT owner, private FROM films f WHERE f.id = ?";
    db.all(sql1, [filmId], (err, rows) => {
      if (err)
        reject(err);
      else if (rows.length === 0)
        reject("NO_FILMS" );
      else if (rows[0].private == 0)
        reject("NO_PRIVATE_FILM" )
      else if (owner != rows[0].owner) {
        reject("USER_NOT_OWNER" );
      }
      else {

        var sql3 = 'UPDATE films SET title = ?';
        var parameters = [film.title];
        //sql3 = sql3.concat(', private = ?');
        //parameters.push(film.private);
        if (film.watchDate != undefined) {
          sql3 = sql3.concat(', watchDate = ?');
          parameters.push(film.watchDate);
        }
        if (film.rating != undefined) {
          sql3 = sql3.concat(', rating = ?');
          parameters.push(film.rating);
        }
        if (film.favorite != undefined) {
          sql3 = sql3.concat(', favorite = ?');
          parameters.push(film.favorite);
        }
        sql3 = sql3.concat(' WHERE id = ?');
        parameters.push(filmId);

        db.run(sql3, parameters, function (err) {
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

exports.assignReviewBalanced = function () {
    return new Promise((resolve, reject) => {
        const sqlCheck = "SELECT ..."; 
        reject("Not implemented yet"); 
    });
}