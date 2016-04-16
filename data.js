var MongoClient = require('mongodb').MongoClient,
 settings = require('./config.js'),
 Guid = require('Guid');

var fullMongoUrl = settings.mongoConfig.serverUrl + settings.mongoConfig.database;
var exports = module.exports = {};

MongoClient.connect(fullMongoUrl)
    .then(function(db) {
        var myCollection = db.collection("user_collection");
        
        // setup your exports!
        
        exports.getUser = function(_username){          
            return myCollection.find({ username: _username }).limit(1).toArray().then(function(user) {
                if (user.length === 0) return Promise.reject("Username : \'" +_username +"\' not found!");
                return user[0];
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

        exports.createUser = function(_username, pass_hash){        
            var user = {
                _id : Guid.create().toString(),
                username: _username,
                encryptedPassword: pass_hash,
                currentSessionId: '',
                user_status:'',
                last_visited:'',
                profile: {
                    firstName: '',
                    lastName: '',
                    emailId: '',
                    photo: '',
                    resume:'',
                    education:'',
                    skills:'',
                    experience:''
                }
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
        
    });
