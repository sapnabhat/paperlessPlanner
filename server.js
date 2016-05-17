// We first require our express package
var express = require('express');
var bodyParser = require('body-parser');
var myData = require('./data.js');
var expressEjsLayouts = require('express-ejs-layouts');
var Guid = require('Guid');
var bcrypt = require("bcrypt-nodejs");
var cookieParser = require('cookie-parser');
var path = require('path');
var nodemailer = require('nodemailer');
var schedule = require('node-schedule');
var util = require('util');
var xss = require('xss');

// This package exports the function to create an express instance:
var app = express();
var multer  =   require('multer');
var storage =   multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, './static/uploads/');
  },
  filename: function (req, file, callback) {
    callback(null, file.fieldname + '-' + Date.now()+'.jpg');
  }
});

var upload = multer({ storage : storage});
var router = express.Router();

// We can setup Jade now!
app.set('view engine', 'ejs');
app.set('view options', { layout:'layout.ejs' });
app.use(expressEjsLayouts);
app.use(cookieParser());

app.use("/signup",function(request, response, next){
    console.log("request.cookies.currentSessionId = "+request.cookies.currentSessionId);
    if(!request.cookies.currentSessionId){
        console.log("before creating session cookie ");
        var expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes()+30);
        var session = Guid.create().toString();
        response.cookie("currentSessionId", session, {expires: expiresAt});
        app.locals.userSession = session;
        console.log("inside value"+session);
    }
    next();
});
// This is called 'adding middleware', or things that will help parse your request
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

// This middleware will activate for every request we make to 
// any path starting with /assets;
// it will check the 'static' folder for matching files 
app.use('/assets', express.static('static'));
var middleware = {
    isAuthenticated: function(request, response, next) {
      if (!request.cookies.currentSessionId)
            return response.redirect('/');
        var expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes()+2);
        response.cookie("currentSessionId", request.cookies.currentSessionId, {expires: expiresAt});
        return next();
    },
    isProfileCompleted: function(request,response, next){
        myData.getUserFromSessionID(request.cookies.currentSessionId).then(function(user){
            app.locals.username = user.username;
            console.log(util.inspect(user.profile.emailId)); 
            console.log(typeof(user.profile.emailId));
            if (user.profile.emailId == null )
            {   
                response.redirect("/profile");
            }
            else
            {
                next();
            }
        }, function(errorMessage){
            response.redirect('/');
       });
       // return response.redirect("/profile");
    }
}


var rule = new schedule.RecurrenceRule();
rule.dayOfWeek = [0, new schedule.Range(1, 6)];
rule.hour = 01;
rule.minute =47;
//rule.minute = new schedule.Range(0, 59, 2);

schedule.scheduleJob(rule, function(){

    var transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: 'paperless.cs546@gmail.com', // Your email id
            pass: 'paperlessstevens' // Your password
        }
    });

    myData.getTodaysMailingList().then(function(applicationList) {

       applicationList.forEach(function (application) {
            myData.getUser(application.creator).then(function(userDetails) {

                var mailOptions = {
                    from: 'paperless.cs546@gmail.com', // sender address
                    to: userDetails.profile.emailId, // list of receivers
                    subject: 'Reminder', // Subject line
                    text: "Hello "+application.creator+", Kindly follow up with "+application.company+"!" //, // plaintext body
                    // html: '<b>Hello world ✔</b>' // You can choose to send an HTML body instead
                };
                transporter.sendMail(mailOptions, function(error, info){
                    if(error){
                        console.log(error);
                    }else{
                        console.log('Message sent: ' + info.response);
                    };
                });

            }, function(errorMessage) {
                console.log("errorMessage user"+errorMessage)
            });
       });

    }, function(errorMessage) {
        console.log("errorMessage for mailer"+errorMessage)
    });

});
//GET methods 
app.get("/", function (request, response) { 
    if(request.cookies.currentSessionId != undefined)
    {
         myData.getUserFromSessionID(request.cookies.currentSessionId).then(function(user){
            app.locals.username = user.username;
            console.log("index name"+user.username);
            console.log("cookie index"+request.cookies.currentSessionId);
            response.redirect("/dashboard");
        }, function(errorMessage){
            response.render("pages/index",{layout: false});
        });
    }
    else
    {
         response.render("pages/index",{layout: false});
    }
   
    
});

app.get("/admin", [middleware.isAuthenticated,middleware.isProfileCompleted], function (request, response) { 
    myData.getUser(app.locals.username).then(function(user) {
        if(user.admin != "yes")
        {
            response.redirect("/dashboard");
        }
        else
        {
            myData.getAllUser().then(function(userList) {
                app.locals.userList = userList;
                console.log(util.inspect(userList));
                response.render("pages/admin", { layout: true, choice: 'admin' });
            }, function(errorMessage) {
                response.render("pages/index", { layout: false, pageTitle: "User Login and Profile system", _error: errorMessage });
            });
        }
        
    });
});
app.get("/dashboard",[middleware.isAuthenticated,middleware.isProfileCompleted], function (request, response) { 
        myData.getApplications(app.locals.username).then(function(applicationList) {
        app.locals.applicationList = applicationList;
        response.render("pages/dashboard",{ layout: true, choice: 'dashboard'});
    });
  });
//pooja Added
app.get("/forms", [middleware.isAuthenticated,middleware.isProfileCompleted], function (request, response) { 

        response.render("pages/forms",{ layout: true, choice: 'forms'});
        
}); 
//shristi
app.get("/tables", [middleware.isAuthenticated,middleware.isProfileCompleted],function (request, response) { 

        console.log(app.locals.username);
        myData.getApplications(app.locals.username).then(function(applicationList) {
        app.locals.applicationList = applicationList;
        response.render("pages/tables",{layout: true, choice: 'tables'});
        }, function(errorMessage) {
            console.log("errorMessage"+errorMessage)
            response.status(500).json({ error: errorMessage });
        });

});
app.get("/profile", middleware.isAuthenticated, function (request, response) { 
    
        myData.getUser(app.locals.username).then(function(userDetails) {
            console.log("email"+userDetails.profile.emailId);
            if(userDetails.profile.emailId == null)
            {
                app.locals.userDetails = undefined;
                response.render("pages/profile",{layout: true, choice: 'profile'});
            }
            else
            {
                var fullName = userDetails.profile.fullName;
                console.log("fullName: "+fullName);
                var emailId = userDetails.profile.emailId;
                var collegeName = userDetails.profile.collegeName;
                var degree = userDetails.profile.degree;
                var skills = userDetails.profile.skills;
                console.log("skills"+skills);
                var jobTitle = userDetails.profile.jobTitle;
                var companyName = userDetails.profile.companyName;
                console.log("companyName: "+companyName);
                var experienceYears = userDetails.profile.experienceYears;
                console.log("experienceYears"+experienceYears);
                app.locals.userDetails = userDetails;
                response.render("pages/profile",{layout: true, choice: 'profile'});
            }
            
        }, function(errorMessage) {
            console.log("errorMessage"+errorMessage)
            response.render("pages/profile",{layout: true, choice: 'profile'});
        });

});

//Pooja Added
app.post("/forms", function (request, response){

        var username = app.locals.username;
        var currentSessionId = app.locals.userSession;
        var company = xss(request.body.company);
        var contact = xss(request.body.contact);
        var email = xss(request.body.email);
        var appliedOn = request.body.appliedOn;
        console.log("applied on"+appliedOn);
        var status = request.body.status;
        var site = xss(request.body.site);
        var skills = xss(request.body.skills); 
        var note = xss(request.body.note);
        var reminder = request.body.reminder;
        console.log("reminder"+reminder);
        var followOn = request.body.followOn;

        myData.insertForm_forUser(username,company,contact,email,appliedOn,status,site,skills,note,followOn,reminder).then(function(user) {
            //response.json(user);
            response.redirect("/forms");
        }, function(errorMessage) {
            response.status(500).json({ error: errorMessage });
        });
    
});

app.post("/form/update", function (request, response){

        var username = app.locals.username;
        var currentSessionId = app.locals.userSession;
        var id = request.body.id;
        var company = xss(request.body.company);
        var contact = xss(request.body.contact);
        var email = xss(request.body.email);
        var appliedOn = request.body.appliedOn;
        console.log("applied on"+appliedOn);
        var status = request.body.status;
        var site = xss(request.body.site);
        var skills = xss(request.body.skills); 
        var note = xss(request.body.note);
        var reminder = xss(request.body.reminder);
        console.log("reminder"+reminder);
        var followOn = request.body.followOn;

        myData.updateForm_forUser(id,company,contact,email,appliedOn,status,site,skills,note,followOn,reminder).then(function(id) {
            //response.json(user);
            response.json({ id: id, company:company, appliedOn:appliedOn, status:status, followOn:followOn });
        }, function(errorMessage) {
            response.status(500).json({ error: errorMessage });
        });
    
});

app.post("/user/status-update", function (request, response){

        var id = request.body.id;
        var status = request.body.status;
        myData.updateUserStatus(id,status).then(function(user) {

            response.json({message:"success"});
            
        }, function(errorMessage) {
            response.status(500).json({ error: errorMessage });
        });
    
});

app.post("/profile", function (request, response){

    var username = app.locals.username;
    var fullName = request.body.fullName;
    console.log("name: "+fullName);
    var email = request.body.email;
    var collegeName = request.body.collegeName;
    console.log("emailId: "+email);
    var degree = request.body.degree;
    var skills = request.body.skills; 
    var jobTitle = request.body.jobTitle;
    var companyName = request.body.companyName;
    console.log("companyName: "+companyName);
    var experienceYears = request.body.experienceYears;

    myData.updateUserProfile(username,fullName,email,collegeName,degree,skills,jobTitle,companyName,experienceYears).then(function(profile) {
        console.log(profile);
        response.redirect("/dashboard");
    }, function(errorMessage) {
        console.log("errorMessage");
        response.redirect("/profile");
    });
});

//POST methods
app.post("/login", function (request, response) {    
   myData.getUser(request.body.username).then(function(user) {
        if(user.userStatus == 1)
        {
            console.log("Blocked user");
            response.render("pages/index", {layout: false, pageTitle: "User Login and Profile system", _error: "Error! You have been Blocked!" });
        }
        else
        {
            bcrypt.compare(request.body.pass, user.encryptedPassword, function (err, result) {
                if (result === true) {
                    console.log("Passwords matches the hash, user id = "+user._id);
                    console.log("login user session"+user.currentSessionId);
                    var expiresAt = new Date();
                    expiresAt.setMinutes(expiresAt.getMinutes()+10);
                    response.cookie("currentSessionId", user.currentSessionId, {expires: expiresAt});
                    app.locals.username = request.body.username;
                    app.locals.userSession = user.currentSessionId;
                    app.locals.accountCreation= user.accountCreation;
                    app.locals.admin = user.admin;
                    console.log("login user session"+user.currentSessionId);
                    response.redirect("/dashboard");
                } else {
                    response.render("pages/index", {layout: false, pageTitle: "User Login and Profile system", _error: "Passwords do not match!" });
                }
            });
        }

    }, function(errorMessage) {
        response.render("pages/index", { layout: false, pageTitle: "User Login and Profile system", _error: errorMessage });
    });
});


app.post("/signup", function (request, response,next) { 
    var hash = bcrypt.hashSync(request.body.pass);
    var usrnm = request.body.username;
    myData.userExists(usrnm).then(function(){
        console.log("signup"+app.locals.userSession);
        var userStatus = 0;
        var accountCreation = new Date();
        myData.createUser(usrnm, hash, userStatus, accountCreation).then(function(user){
            console.log("New User="+user.username);
            myData.insertSessionID(user._id,app.locals.userSession).then(function(updated){
            });
            app.locals.username = request.body.username;
            app.locals.accountCreation= accountCreation;
            app.locals.admin = user.admin;
            response.redirect("/profile");
        }, function(errorMessage){
            response.render("pages/index",{ layout: false, pageTitle: "User Login and Profile system", _error: errorMessage });
        });

        //else render error on home page
    }, function(errorMessage){
         response.render("pages/index", { pageTitle: "User Login and Profile system", _error: errorMessage, layout: false });
    });
});

app.all("/logout", function(request, response){

        console.log("now clearing the cookie");
        
        var expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() -50);
        response.cookie("currentSessionId", "", { expires: expiresAt });
        response.clearCookie("currentSessionId");
        app.locals.username = undefined;
        app.locals.userSession = undefined;
        app.locals.userDetails = undefined;
        app.locals.accountCreation= undefined;
        //shristi
        app.locals.admin = undefined;
        app.locals.applicationList = undefined;
        console.log("Cookies cleared, redirecting to Home");
        response.redirect("/");
    
});


app.post('/photo', upload.single('userPhoto'), function (request, response) {
    response.json({message:request.file.filename});
    path = "assets/uploads/"+request.file.filename;
    myData.updateUserPhotoPath(app.locals.username,path).then(function(user) {
        console.log(user);
    }, function(errorMessage) {
        console.log("errorMessage");
    });
});

app.get("/test", function (request, response) { 

  console.log("name "+app.locals.username);
  console.log(request.cookies.currentSessionId);
      
});

// We can now navigate to localhost:3000
app.listen(3000, function () {
    console.log('Your server is now listening on port 3000! Navigate to http://localhost:3000 to access it');
});
