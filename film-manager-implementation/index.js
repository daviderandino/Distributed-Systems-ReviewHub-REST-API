'use strict';

var path = require('path');
var http = require('http');
var cors = require('cors');
var fs = require('fs');
var oas3Tools = require('oas3-tools');
var { Validator, ValidationError } = require('express-json-validator-middleware');
var serverPort = 3001;

/** Authentication-related imports **/
var passport = require('passport');
require('./passport-config');
var session = require('express-session');


const api = require('./controllers/Api.js');
const apiFilms = require('./controllers/Apifilms.js');
const apiFilmsPrivate = require('./controllers/Apifilmsprivate.js');
const apiFilmsPrivateFilmId = require('./controllers/ApifilmsprivatefilmId.js');
const apiFilmsPublic = require('./controllers/Apifilmspublic.js');
const apiFilmsPublicFilmId = require('./controllers/ApifilmspublicfilmId.js');
const apiFilmsPublicFilmIdReviews = require('./controllers/ApifilmspublicfilmIdreviews.js');
const apiFilmsPublicFilmIdReviewsReviewerId = require('./controllers/ApifilmspublicfilmIdreviewsreviewerId.js');
const apiFilmsPublicInvited = require('./controllers/Apifilmspublicinvited.js');
const apiFilmsPublicAssignments = require('./controllers/Apifilmspublicassignments.js');

const apiUsers = require('./controllers/Apiusers.js');
const apiUsersUserId = require('./controllers/ApiusersuserId.js');
const apiUsersAuthenticator = require('./controllers/Apiusersauthenticator.js');
const apiUsersAuthenticatorCurrent = require('./controllers/Apiusersauthenticatorcurrent.js');


/** Set up and enable Cross-Origin Resource Sharing (CORS) **/


var corsOptions = {
    origin: 'http://localhost:3000',
    credentials: true,
  };
  
  

/*** Defining authentication verification middleware ***/
  
const isLoggedIn = (req, res, next) => {
if(req.isAuthenticated()) {
        return next();
    }
    return res.status(401).json({error: 'Not authorized'});
}

/*** Defining JSON validator middleware ***/

var filmSchema = JSON.parse(fs.readFileSync(path.join('.', 'json_schemas', 'film_schema.json')).toString());
var userSchema = JSON.parse(fs.readFileSync(path.join('.', 'json_schemas', 'user_schema.json')).toString());
var reviewSchema = JSON.parse(fs.readFileSync(path.join('.', 'json_schemas', 'review_schema.json')).toString());
var validator = new Validator({ allErrors: true });
validator.ajv.addSchema([userSchema, filmSchema, reviewSchema]);
const addFormats = require('ajv-formats').default;
addFormats(validator.ajv);
var validate = validator.validate;


/*** Swagger configuration ***/

var options = {
    routing: {
        controllers: path.join(__dirname, './controllers')
    },
};

var expressAppConfig = oas3Tools.expressAppConfig(path.join(__dirname, 'api/openapi.yaml'), options);
var app = expressAppConfig.getApp();

// Creating the session

app.use(cors(corsOptions));
app.use(session({
    secret: "shhhhh... it's a secret!",
    resave: false,
    saveUninitialized: false,
  }));
  app.use(passport.authenticate('session'));


//Route methods

app.get('/api', api.getFilmManager);
app.get('/api/films/public', apiFilmsPublic.getPublicFilms);
app.post('/api/films', isLoggedIn, validate({ body: filmSchema }), apiFilms.createFilm);
app.get('/api/films/private/:filmId', isLoggedIn, apiFilmsPrivateFilmId.getSinglePrivateFilm);
app.put('/api/films/private/:filmId', isLoggedIn, validate({ body: filmSchema }), apiFilmsPrivateFilmId.updateSinglePrivateFilm);
app.delete('/api/films/private/:filmId', isLoggedIn, apiFilmsPrivateFilmId.deleteSinglePrivateFilm);
app.get('/api/films/public/invited', isLoggedIn, apiFilmsPublicInvited.getInvitedFilms);
app.get('/api/films/public/:filmId', apiFilmsPublicFilmId.getSinglePublicFilm);
app.put('/api/films/public/:filmId', isLoggedIn, validate({ body: filmSchema }), apiFilmsPublicFilmId.updateSinglePublicFilm);
app.delete('/api/films/public/:filmId', isLoggedIn, apiFilmsPublicFilmId.deleteSinglePublicFilm);
app.get('/api/films/public/:filmId/reviews', apiFilmsPublicFilmIdReviews.getFilmReviews);
app.post('/api/films/public/:filmId/reviews', isLoggedIn, apiFilmsPublicFilmIdReviews.issueFilmReview);
app.get('/api/films/public/:filmId/reviews/:reviewerId', apiFilmsPublicFilmIdReviewsReviewerId.getSingleReview);
app.put('/api/films/public/:filmId/reviews/:reviewerId', isLoggedIn, apiFilmsPublicFilmIdReviewsReviewerId.updateSingleReview);
app.delete('/api/films/public/:filmId/reviews/:reviewerId', isLoggedIn, apiFilmsPublicFilmIdReviewsReviewerId.deleteSingleReview);
app.get('/api/users', isLoggedIn, apiUsers.getUsers);
app.post('/api/users/authenticator', apiUsersAuthenticator.authenticateUser);
app.delete('/api/users/authenticator/current', isLoggedIn,  apiUsersAuthenticatorCurrent.logoutUser);
app.get('/api/users/:userId', isLoggedIn, apiUsersUserId.getSingleUser);
app.get('/api/films/private', isLoggedIn, apiFilmsPrivate.getPrivateFilms);

// Error handlers for validation and authentication errors

app.use(function(err, req, res, next) {
    if (err instanceof ValidationError) {
        res.status(400).send(err);
    } else next(err);
});

app.use(function(err, req, res, next) {
    if (err.name === 'UnauthorizedError') {
        var authErrorObj = { errors: [{ 'param': 'Server', 'msg': 'Authorization error' }] };
        res.status(401).json(authErrorObj);
    } else next(err);
});


// Initialize the Swagger middleware

http.createServer(app).listen(serverPort, function() {
    console.log('Your server is listening on port %d (http://localhost:%d)', serverPort, serverPort);
    console.log('Swagger-ui is available on http://localhost:%d/docs', serverPort);
});