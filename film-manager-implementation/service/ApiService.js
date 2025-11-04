'use strict';

const FilmManager = require("../components/FilmManager");


/**
 * Retrieve the Film Manager
 * The Film Manager resource, representing the entry point of the REST interface, with ID filmId is retrieved. This operation does not require authentication.
 *
 * returns FilmManager
 **/
exports.getFilmManager = function() {   
   return new Promise((resolve, reject) => {resolve(new FilmManager())})
}

