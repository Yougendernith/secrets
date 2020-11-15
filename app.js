require("dotenv").config();
const bodyParser = require("body-parser");
const ejs = require("ejs");
const express = require("express")
const mongoose=require("mongoose");
const encrypt=require("mongoose-encryption")


mongoose.connect("mongodb://localhost:27017/UserDB",{useNewUrlParser:true,useUnifiedTopology:true})

const userSchema=new mongoose.Schema({
    email:String,
    password:String
});


//secret:secret--->we are provinding a secret
userSchema.plugin(encrypt,{secret:process.env.SECRET,encryptedFields:['password']})

const User=mongoose.model("User",userSchema)


const app = express();

app.use(express.static("public"))
app.set("view engine","ejs")
app.use(bodyParser.urlencoded({extended: true}));


app.route("/")
.get(function(req, res){
    res.render("home")
});

app.route("/register")
.get(function(req, res){
    res.render("register")
})
.post(function(req,res){

    //creating a newuser using the User model from userSchema
    const newuser=new User({
        email:req.body.username,
        password:req.body.password
    })
    newuser.save(function(err){
        if(err){
            console.log(err)
        }else{

            //after registering we are rendering the secrets page
            res.render("secrets")
        }
    })
});


app.route("/login")
.get(function(req, res){
    res.render("login")
})
.post(function(req, res){

    // storing the username and password of login
    const username=req.body.username
    const password = req.body.password

    // when we add username and password we see through our data base that whether the credentials are matching with the registered username and password
    User.findOne({email: username}, function(err,foundUser){
        if(err){
            console.log(err);
        }else{
            if(foundUser){
                if(foundUser.password===password){
                    res.render("secrets")
                }
            }
        }
    })
});




app.listen(3000,function(){
    console.log("server started at 3000")
})