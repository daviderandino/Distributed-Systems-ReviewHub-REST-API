'use strict';
const serviceUtils = require('../utils/serviceUtils.js');
const db = require('../components/db');
const Film = require('../components/film');


/**
 * Create a new film
 * A new film is created by the authenticated user (who becomes the owner).
 *
 * body Film Representation of the film to be created (with no id because it is assigned by the service)
 * returns Film
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
 * The private films of the logged-in user are retrieved. A pagination mechanism is used to limit the size of messages.
 *
 * pageNo Integer The id of the requested page (if absent, the first page is returned) (optional)
 * returns Films
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
 * 
 * Input: 
 * - owner: the userId
 * Output:
 * - total number of public films
 * 
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
 * The public films (i.e., the films that are visible for all the users of the service) are retrieved. This operation does not require authentication. A pagination mechanism is used to limit the size of messages.
 *
 * pageNo Integer The id of the requested page (if absent, the first page is returned) (optional)
 * returns Films
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
 * 
 * Input: 
 * - none
 * Output:
 * - total number of public films
 * 
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
 * The public films that the logged-in user has been invited to review are retrieved. A pagination mechanism is used to limit the size of messages.
 *
 * pageNo Integer The id of the requested page (if absent, the first page is returned) (optional)
 * returns Films
 **/
exports.getInvitedFilms = function (userId, pageNo) {
  return new Promise((resolve, reject) => {
    var sql = "SELECT f.id as fid, f.title, f.owner, f.private, f.watchDate, f.rating, f.favorite, c.total_rows FROM films f, reviews r, (SELECT count(*) total_rows FROM films f2, reviews r2 WHERE f2.private=0 AND f2.id = r2.filmId AND r2.reviewerId = ?) c WHERE  f.private = 0 AND f.id = r.filmId AND r.reviewerId = ?"
    var limits = serviceUtils.getFilmPagination(pageNo);
    if (limits.length != 0) sql = sql + " LIMIT ?,?";
    limits.unshift(userId);
    limits.unshift(userId);

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
 * Retrieve the number of public films for which the user has received a review invitation
 * 
 * Input: 
 * - none
 * Output:
 * - total number of public films for which the user has received a review invitation
 * 
 **/
exports.getInvitedFilmsTotal = function (reviewerId) {
    return new Promise((resolve, reject) => {
        var sqlNumOfFilms = "SELECT count(*) total FROM films f, reviews r WHERE  f.private = 0 AND f.id = r.filmId AND r.reviewerId = ? ";
        db.get(sqlNumOfFilms, [reviewerId], (err, size) => {
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
 *
 * Input: 
 * - filmId: the ID of the film that needs to be deleted
 * - owner: ID of the user who is deleting the film
 * Output:
 * - no response expected for this operation
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
 * The public film with ID filmId is retrieved. This operation does not require authentication.
 *
 * filmId Long ID of the film to retrieve
 * returns Film
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
 * The public film with ID filmId is updated. This operation does not allow changing its visibility. This operation can be performed only by the owner.
 *
 * body Film The updated film object that needs to replace the old object
 * filmId Long ID of the film to update
 * no response value expected for this operation
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
 * The private film with ID filmId is deleted. This operation can only be performed by the owner.
 *
 * filmId Long ID of the film to delete
 * no response value expected for this operation
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
 * The private film with ID filmId is retrieved. This operation can be performed on the film if the user who performs the operation is the film's owner.
 *
 * filmId Long ID of the film to retrieve
 * returns Film
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
 * The private film with ID filmId is updated. This operation does not allow changing its visibility. This operation can be performed only by the owner.
 *
 * body Film The updated film object that needs to replace the old object
 * filmId Long ID of the film to update
 * no response value expected for this operation
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

