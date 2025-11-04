// Set up local strategy to verify, search in the DB a user with a matching password, 
// and retrieve its information by userDao.getUser (i.e., id, username, name).
const serviceUtils = require('./utils/serviceUtils.js');
var passport = require('passport');
var LocalStrategy = require('passport-local');
/*** Passport ***/
  
passport.serializeUser(function (user, cb) { 
    cb(null, user);
});
  
passport.deserializeUser(function (user, cb) { 
    return cb(null, user); 
});
  

passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
}, async function verify(username, password, done) {
    serviceUtils.getUserByEmail(username)
        .then((user) => {
            if (user === undefined) {
                return done(null, false, { message: 'Unauthorized access.' });
            } else {
                if (!serviceUtils.checkPassword(user, password)) {
                    return done(null, false, { message: 'Unauthorized access.' });
                } else {
                    return done(null, user);
                }
            }
        }).catch(err => done(err));
}));


