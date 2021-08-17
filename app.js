require('dotenv').config();

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
// const md5 = require("md5");
// const bcrypt = require("bcrypt");
// const saltRounds = 10;
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: "Our Little Secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://sailesh_nama:Sailesh333@cluster0.3qgfd.mongodb.net/userDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: "744811234849-g2msakhc9ttugtuiprbi1hqhctf3oal4.apps.googleusercontent.com",
    clientSecret: "qMdM1gtDrapHg6s8lLhCx8cC",
    callbackURL: "http://murmuring-atoll-60876.herokuapp.com/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.route("/")
  .get(function(req, res) {
    res.render("home");
  });

app.route("/auth/google")
 .get(
   passport.authenticate('google', { scope: ['profile'] })
 );

 app.route("/auth/google/secrets")
   .get(passport.authenticate('google', { failureRedirect: '/login' }),
   function(req, res) {
     // Successful authentication, redirect home.
     res.redirect('/secrets');
   });

app.route("/login")
  .get(function(req, res) {
    res.render("login");
  })
  .post(function(req, res) {
    // const username = req.body.username;
    // const password = req.body.password;
    //
    // User.findOne({
    //   email: username
    // }, function(err, founduser) {
    //   if (err) {
    //     console.log(err);
    //   } else {
    //     if (founduser) {
    //       bcrypt.compare(password, founduser.password, function(err, result) {
    //         if (result === true) {
    //           res.render("secrets");
    //         } else {
    //           console.log(result);
    //           res.send("Wrong Password");
    //         }
    //       });
    //     }
    //   }
    // });

    const user = new User({
      username: req.body.username,
      password: req.body.password
    });

    req.login(user, function(err){
      if(err){
        console.log(err);
      }else{
        passport.authenticate("local")(req, res, function(){
          res.redirect("/secrets");
        });
      }
    });

  });

app.route("/register")
  .get(function(req, res) {
    res.render("register");
  })
  .post(function(req, res) {

    // bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
    //   const newUser = new User({
    //     email: req.body.username,
    //     password: hash
    //   });
    //
    //   newUser.save(function(err) {
    //     if (!err) {
    //       res.render("secrets");
    //     } else {
    //       console.log(err);
    //     }
    //   });
    // });

    User.register({username: req.body.username}, req.body.password, function(err, user){
      if(err){
        console.log(err);
        res.redirect("/register");
      }
      else{
        passport.authenticate("local")(req, res, function(){
          res.redirect("/secrets");
        });
      }
    });

  });

app.route("/secrets")
  .get(function(req, res){
    User.find({"secret": {$ne: null}}, function(err, foundusers){
      if(err){
        console.log(err);
      }else{
        if(foundusers){
          res.render("secrets", {usersWithSecrets: foundusers});
        }
      }
    });
  });

app.route("/submit")
  .get(function(req, res){
    if(req.isAuthenticated()){
      res.render("submit");
    }
    else{
      res.redirect("/login")
    }
  })
  .post(function(req, res){
    const submittedsecret = req.body.secret;
    User.findById(req.user.id, function(err, founduser){
      if(err){
        console.log(err);
      }else{
        if(founduser){
          founduser.secret = submittedsecret;
          founduser.save(function(){
            res.redirect("/secrets");
          });
        }
      }
    });
  });

app.route("/logout")
 .get(function(req, res){
   req.logout();
   res.redirect("/");
 });

 app.listen(process.env.PORT || 3000, function(){
   console.log("Express server listening on port %d in %s mode", this.address().port, app.settings.env);
 });
