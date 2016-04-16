// We first require our express package
var express = require('express');
var bodyParser = require('body-parser');
var myData = require('./data.js');
var expressEjsLayouts = require('express-ejs-layouts');
var Guid = require('Guid');
var bcrypt = require("bcrypt-nodejs");
var cookieParser = require('cookie-parser');
// This package exports the function to create an express instance:
var app = express();

// We can setup Jade now!
app.set('view engine', 'ejs');
app.set('view options', { layout:'layout.ejs' });
app.use(expressEjsLayouts);
// This is called 'adding middleware', or things that will help parse your request
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

// This middleware will activate for every request we make to 
// any path starting with /assets;
// it will check the 'static' folder for matching files 
app.use('/assets', express.static('static'));

// Setup your routes here!
//GET methods 
app.get("/", function (request, response) { 
    response.render("pages/index",{layout: false});
});
app.get("/dashboard", function (request, response) { 
    response.render("pages/dashboard",{ layout: true, choice: 'dashboard'});
  });
app.get("/forms", function (request, response) { 
    response.render("pages/forms",{ layout: true, choice: 'forms'});
});
app.get("/tables", function (request, response) { 
    response.render("pages/tables",{layout: true, choice: 'tables'});
});
app.get("/profile", function (request, response) { 
    response.render("pages/profile",{layout: true, choice: 'profile'});
});


//POST methods
app.post("/login", function (request, response) {    
   myData.getUser(request.body.username).then(function(user) {
        bcrypt.compare(request.body.pass, user.encryptedPassword, function (err, result) {
            if (result === true) {
                var expiresAt = new Date();
                expiresAt.setHours(expiresAt.getHours() + 1);
                var generatedSessionID = Guid.create().toString();
                response.cookie("_currentSessionId", generatedSessionID, { expires: expiresAt });
                myData.insertSessionID(user._id,generatedSessionID).then(function(updated){
                });
                response.render("pages/profile", { layout: true, choice: 'profile' });
            } else {
                response.render("pages/index", { pageTitle: "User Login and Profile system", _error: "Passwords do not match!" });
            }
        });

    }, function(errorMessage) {
        response.render("pages/index", { pageTitle: "User Login and Profile system", _error: errorMessage });
    });
});


app.use('/login', function(request, response, next){
    next();
});


app.use("/signup", function (request, response,next) { 
    var hash = bcrypt.hashSync(request.body.pass);

    myData.createUser(request.body.username, hash, Guid.create().toString()).then(function(inserted_user) {
        var expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1);
        var generatedSessionID = Guid.create().toString();
        response.cookie("_currentSessionId", generatedSessionID, { expires: expiresAt });

        myData.insertSessionID(inserted_user._id,generatedSessionID).then(function(updated){
        });
        response.render("pages/profile", { layout: true, choice: 'profile' });
    }, function(errorMessage) {
        response.render("pages/index", { pageTitle: "User Login and Profile system", _error: errorMessage });
    });
});


app.post('/signup', function(request, response){
    console.log("UserName : " + request.body.username);
    console.log("Password : " + request.body.pass);
    console.log("Checking : " + response.locals.dat);
});


app.use('/logout', function(request, response){
    console.log("now clearing the cookie");

    myData.clearSessionID(request.cookies._currentSessionId);
    var anHourAgo = new Date();
    anHourAgo.setHours(anHourAgo.getHours() -1);

    // invalidate, then clear so that lastAccessed no longer shows up on the
    // cookie object
    response.cookie("_currentSessionId", "", { expires: anHourAgo });
    response.clearCookie("_currentSessionId");

    response.render("pages/index", { layout:false });
});


app.post('/logout', function(request, response){
    console.log("In Logout : ");
});

// We can now navigate to localhost:3000
app.listen(3000, function () {
    console.log('Your server is now listening on port 3000! Navigate to http://localhost:3000 to access it');
});
