var MongoClient = require('mongodb').MongoClient,
settings = require('./config.js'),
Guid = require('Guid');

var fullMongoUrl = settings.mongoConfig.serverUrl + settings.mongoConfig.database;
var exports = module.exports = {};

MongoClient.connect(fullMongoUrl)
.then(function(db) {
    var myCollection = db.collection("user_collection");
    var myApplicationCollection = db.collection("application_collection");
    
    // setup your exports!
    
    exports.getUser = function(_username){          
        return myCollection.find({ username: _username }).limit(1).toArray().then(function(user) {
            if (user.length === 0) return Promise.reject("Username : \'" +_username +"\' not found!");
            return user[0];
        });
    };

    exports.getAllUser = function(){          
        return myCollection.find().toArray().then(function(userList) {
            if (userList.length === 0) return Promise.reject("Userlist not found");
            return userList;
        });
    };
    exports.getUserFromID = function(id){            
        return myCollection.find({ _id: id }).limit(1).toArray().then(function(user) {
            if (user.length === 0) return Promise.reject("No user found");
            return user[0];
        });
    };

    exports.getUserFromSessionID = function(sessionID){            
        return myCollection.find({ currentSessionId: sessionID }).limit(1).toArray().then(function(user) {
            if (user.length === 0) return Promise.reject("No user found");
            return user[0];
        });
    };

    exports.updateUserProfile = function(_username, _fullName,_emailId,_collegeName,_degree,_skills,_jobTitle,_companyName,_experienceYears){            
        return myCollection.updateOne({ username: _username }, { $set: { "profile.fullName": _fullName, "profile.emailId":_emailId,
         "profile.collegeName": _collegeName,"profile.degree":_degree, "profile.skills":_skills, "profile.jobTitle":_jobTitle,
          "profile.companyName":_companyName,"profile.experienceYears":_experienceYears} }).then(function(user) {
            return user;
        });
    };

    exports.updateUserPhotoPath = function(_username, _photoPath){            
    return myCollection.updateOne({ username: _username }, { $set: { "profile.photo": _photoPath} }).then(function(user) {
        return user;
        });
    };
    exports.updateUserAsAdmin = function(_username){            
    return myCollection.updateOne({ username: _username }, { $set: { "admin": "yes"} }).then(function(user) {
        return user;
        });
    };
    exports.updateUserStatus = function(id,_status){            
    return myCollection.updateOne({ _id: id }, { $set: { userStatus: _status} }).then(function(user) {
        return user;
        });
    };
    exports.createUser = function(_username, _passhash, _userStatus,_accountCreation){        
        var user = {
            _id : Guid.create().toString(),
            username: _username,
            encryptedPassword: _passhash,
            currentSessionId:  null,
            userStatus: _userStatus,
            accountCreation: _accountCreation,
            admin: 'no',
            profile: {
                fullName: null,
                emailId:  null,
                photo:  null,
                collegeName: null,
                degree: null,
                skills: null,
                jobTitle: null,
                companyName: null,
                experienceYears: null
            },
        };

        return myCollection.find({ username: _username }).limit(1).toArray().then(function(user_found) {
            if (user_found.length !== 0) 
            return Promise.reject("Username : \'" +_username +"\' already exists! Try a different username!");
            
            return myCollection.insertOne(user).then(function (newUser) {
                return newUser.insertedId;
            }).then(function(user_id){
                return exports.getUserFromID(user_id)
            });
        });

    };
    exports.userExists = function(uname){
            console.log("in userExists");
            if(!uname) return Promise.reject("Missing Uname");
            
            return myCollection.find({'username': uname}).limit(1).toArray().then(function(userList){
                console.log("userlist length"+userList.length)
                if(userList.length != 0)
                  return Promise.reject("Username already taken.");
             
                return userList;
            });
    };
    exports.updateUser = function(_sessionID, _profile){            
        return myCollection.updateOne({ currentSessionId: _sessionID }, { $set: { "profile": _profile } }).then(function() {
            return exports.getUserFromSessionID(_sessionID);
        });
    };

    exports.insertSessionID = function(_userID, sessionID){            
        return myCollection.updateOne({ _id: _userID }, { $set: { "currentSessionId": sessionID } }).then(function() {
            return exports.getUserFromID(_userID);
        });
    };

    exports.clearSessionID = function(sessionID){           
        return myCollection.updateOne({ currentSessionId: sessionID }, { $set: { "currentSessionId": "" } });
    };
    //Shristi
    exports.getApplication = function(id) {
        if (id === undefined) return Promise.reject("You must provide an ID");

        return myApplicationCollection.find({ _id: id }).limit(1).toArray().then(function(listOfApplications) {
            if (listOfApplications.length === 0) throw "Could not find application with id of " + id;
            return listOfApplications[0];
        });
    };
    exports.insertForm_forUser = function(_username,_company,_contact,_email,_appliedOn,_status,_site,_skillsRequired,_note,_followUpOn,_remind)
    {   var newApplication =    {
                                    _id: Guid.create().toString(),
                                    "creator":_username,
                                    "company":_company,
                                    "contact":_contact,
                                    "email":_email,
                                    "appliedOn":_appliedOn,
                                    "status":_status,
                                    "site":_site,
                                    "skillsRequired":_skillsRequired,
                                    "note":_note,
                                    "followUpOn":_followUpOn,
                                    "remind":_remind
                                }
        return myApplicationCollection.insertOne(newApplication).then(function (newApplication) {
                return newApplication.insertedId;
        });
    };

    exports.updateForm_forUser = function(id,_company,_contact,_email,_appliedOn,_status,_site,_skillsRequired,_note,_followUpOn,_remind)
    {  
        return myApplicationCollection.updateOne({ _id: id }, { $set: { "company": _company, "contact":_contact, "email":_email, "appliedOn":_appliedOn , "status":_status, "site":_site, "skillsRequired":_skillsRequired,"note":_note, "followUpOn":_followUpOn, "remind":_remind}}).then(function () {
                return id;
        });
    };

    exports.getUserByCredentials = function(username, password){
        console.log("in getUserByCredentials, username="+username+" ,password="+password);
        if(!username) return Promise.reject("You must provide an Username");
        if(!password) return Promise.reject("You must provide an password");

        return myCollection.find({"username": username}).limit(1).toArray().then(function(listOfUsers){
            console.log("listOfUsers.length= "+listOfUsers.length);
            if(listOfUsers.length === 0) {
                console.log("could not find user with the username of "+Username);
                return Promise.reject('could not find user with the username of '+username);
            }

            return listOfUsers[0];
        });
    };
        //Shristi
    exports.getApplications = function(username) {
        if (username === undefined)
        {   
            console.log("error")
            return Promise.reject("You must provide an Username");
        } 

        return  myApplicationCollection.find({ "creator" : username }).toArray().then(function(applicationList) {
            console.log('application'+applicationList.length);
            return applicationList;
        });
    }

    exports.getTodaysMailingList = function() {
        var today = new Date();
        today = today.toISOString().substring(0, 10);
        console.log("today"+today);
        return  myApplicationCollection.find({ $and: [{ "followUpOn": today }, { "remind": "1" }] }).toArray().then(function(applicationList) {
            console.log('application'+applicationList.length);
            return applicationList;
        });
    }

    
});
