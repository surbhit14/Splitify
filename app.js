
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const findOrCreate = require('mongoose-findorcreate');
const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(session({
  secret: "<your secret>",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect('<your mongodb link>', {useNewUrlParser: true, useUnifiedTopology: true});
  
const groupSchema = new mongoose.Schema({
    name:{
        type: String,
        require:true,
    },
    desc:{
        type: String,
        require:true,
    },
    members:{
    type:Array,
    default:[],
    }
  });

const Group= new mongoose.model("group",groupSchema); 
  
const userSchema = new mongoose.Schema({
    username:String,
    email:String,
    password:String,
    groups:[groupSchema]
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


app.get("/", function(req, res){
  res.render("home");
});

app.get("/login", function(req, res){
  res.render("login");
});


app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});

app.get("/register", function(req, res){
  res.render("register");
});

app.post("/register",function(req, res){
   User.register({username:req.body.username,email:req.body.email},req.body.password, function(err,user){
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function(){
          res.json("registered");
        res.redirect("/group");
      });
    }
  });

});

app.post("/login", function(req, res){

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if (err) {
      console.log(err);
      res.redirect("/login");
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/group");
      });
    }
  });

});

app.get("/group",async function (req,res){
  if(req.isAuthenticated()){
    var groups=req.user.groups;
    res.render("group",{"groups":groups})
  }

  else{
   res.render("register")
  }
})

app.post("/group",async function(req,res)
{
    const grp=new Group({
        name:req.body.groupname,
        desc:req.body.desc,
        members:[
            req.user.username,
        ]
    })
    grp.save();
    req.user.groups.push(grp);
    req.user.save();
    res.redirect("group");
}
)

app.get("/group/:name",async function (req,res)
{
  if(req.isAuthenticated()){
    var group=await Group.findOne({name:req.params.name});
    res.render("sepgroup",{"group":group})
  }

  else{
   res.render("register")
  }
})

app.post("/group/:name/addmember",async function (req,res){
    var group=await Group.findOne({name:req.params.name});
    group.members.push(req.body.username1);
    group.save();
    var user=await User.findOne({username:req.body.username1});
    user.groups.push(group);
    user.save();
    //res.render("sepgroup",{"group":group})
    var x="/group/"+req.params.name;
    res.redirect(x)
})

app.post("/group/:name/split",async function (req,res){
  var group=await Group.findOne({name:req.params.name});
  var user=req.body.username2;
  var amount=req.body.amount;
  var n=group.members.length;
  var disamt=amount/n;
  var arr=[];
  for(var i=0;i<n;i++)
  { 
    if(group.members[i]!=user){
      arr[i]=group.members[i];
    }
  }
  res.render("billsplit",{"group":group,"nom":user,"arr":arr,"amt":disamt})
})

app.listen(3000, function() {
    console.log("Server started on port 3000.");
  });