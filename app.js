require("dotenv").config();
const bodyParser = require("body-parser");
const ejs = require("ejs");
const express = require("express")
const mongoose=require("mongoose");
const session=require("express-session");
const passport =require("passport")
const passportLocalMongoose = require("passport-local-mongoose")
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const findOrCreate=require("mongoose-findorcreate");
const md5=require("md5"); //md5(message-digest algorithm)--->this is the secure way to encrypt our password using the hash function.
// const encrypt=require("mongoose-encryption")

// const bcrypt = require("bcrypt");
// const saltRounds=10

const app = express();

app.use(session({
    secret:"my secret.",
    resave:false,
    saveUninitialized:false
}));


app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/UserDB",{useNewUrlParser:true,useUnifiedTopology:true})
mongoose.set('useCreateIndex', true);

const userSchema=new mongoose.Schema({
    email:String,
    password:String,
    googleId:String,
    facebookId:String,
    secret:String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);


//secret:secret--->we are provinding a secret
// userSchema.plugin(encrypt,{secret:process.env.SECRET,encryptedFields:['password']})

const User=mongoose.model("User",userSchema)

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
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
      console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets",
  },
  function(accessToken, refreshToken, profile, cb) {
      console.log(profile);
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.use(express.static("public"))
app.set("view engine","ejs")
app.use(bodyParser.urlencoded({extended: true}));


app.route("/")
.get(function(req, res){
    res.render("home")
});

app.get("/auth/google",
        passport.authenticate("google", { scope: ["profile"] })

);


  app.get("/auth/google/secrets", 
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect secrets.
    res.redirect("/secrets");
  });



  app.get('/auth/facebook', 
  passport.authenticate('facebook',{scope:['profile']}));


  app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });




app.route("/secrets")
.get(function(req, res){
    User.find({"secret": {$ne:null}}, function(err,foundUsers){
        if(err){
            console.log(err);
        }else{
            if(foundUsers){
                res.render("secrets",{usersWithSecrets: foundUsers});
            }
        }
    })
});

app.route("/register")
.get(function(req, res){
    res.render("register")
})
.post(function(req,res){
    User.register({username: req.body.username},req.body.password,function(err,user){
        if(err){
            console.log(err);
            res.redirect("/register");
        }else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets");
            })
        }
    })

//     bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
        

//          //creating a newuser using the User model from userSchema
//         const newuser=new User({
//             email:req.body.username,
//             // password:md5(req.body.password) // we have to store the password in the parenthesis of md5

//             password:hash //using the hash as the password
//         })
//         newuser.save(function(err){
//             if(err){
//                 console.log(err)
//             }else{
    
//                 //after registering we are rendering the secrets page
//                 res.render("secrets")
//             }
//         })

//     });




});


app.get("/submit",function(req,res){
    if(req.isAuthenticated()){
        res.render("submit")
    }else{
        res.redirect("/login");
    }
});



app.post("/submit",function(req,res){
    const secretSubmitted = req.body.secret
    User.findById(req.user.id,function(err,foundUser){
        if(err){
            console.log(err);
        }else{
            if(foundUser){
                foundUser.secret = secretSubmitted;
                foundUser.save(function(){
                    res.redirect("/secrets")
                });
            }
        }
    });
});



app.route("/login")
.get(function(req, res){
    res.render("login")
})
.post(function(req, res){
    const user=new User({
        username: req.body.username,
        password: req.body.password
    })
    req.login(user,function(err){
        if(err){
            console.log(err)
            res.redirect("/login")
        }else{
            passport.authenticate("local")(req, res,function(){
                res.render("secrets");
            })
        }
    })

//     // storing the username and password of login
//     const username=req.body.username
//     const password = req.body.password



//     // when we add username and password we see through our data base that whether the credentials are matching with the registered username and password
//     User.findOne({email: username}, function(err,foundUser){
//         if(err){
//             console.log(err);
//         }else{
//             if(foundUser){

// // comparing the password that we typed in and the password that was used during registration
//                 bcrypt.compare(password, foundUser.password, function(err, result) {
//                     if(result===true){
//                         res.render("secrets")
//                     }
//                 });
//                 }
//         }
//     })
});


app.get('/logout', function(req, res){
    req.logout(function(err,user){
        if(err){
            console.log(err);
        }else{;
        }
    });
//         // if(err){
//         //     console.log(err);
//         //     res.redirect("/secrets")
//         // }else{
//         //     loggedOut.logout();
//         // }
//     // });
    res.redirect("/");
  });



app.listen(3000,function(){
    console.log("server started at 3000")
})