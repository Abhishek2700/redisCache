const express=require("express");
const exphbs=require("express-handlebars")
const bodyParser=require("body-parser");
const path=require("path");
const methodOverride=require("method-override");
const redis=require("redis");
const mongoose=require("mongoose");
const user=require("./models/users");

var dbUrl="mongodb://localhost:27017/redisUsers";





mongoose.connect(dbUrl,{useNewUrlParser:true,}).then(()=>{
    console.log("server connected to the mongoose db");
}).catch((err)=>{
    console.log("error in connecting to the mongoose database, error is ",err);
})

// creating a redis client
let client=redis.createClient();

client.on("connect",()=>{
    console.log("REDIS CLIENT CONNECTED .....");
})

// initialising the port
const port=8000;

// setting up express
const app=express();

// using middlewares
app.engine("handlebars",exphbs({defaultLayout:"main"}));
app.set("view engine","handlebars");

// body parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));

// method override
app.use(methodOverride("_method"));

// cache middlewares
var cache =async function(req,res,next){
    var id=req.body.id;

    client.hgetall(id,(err,data)=>{
        if(err){
       res.render("searchusers",{error:err})
        }
        if(data!==null){
            // console.log("user data from the database is ",data);
            // console.log("type of this data is ",typeof data);
        //    let jsonData=JSON.parse(data);
        //    console.log("JSON data is ",jsonData);
        //    console.log("TYPEE OF THIS JSON DATA IS ".jsonData);
        
        console.log("this request is from the cache middleware for user Id ",id);
          res.render("details",{user:data});
        }
        else{
            // res.render("searchusers",{error:"USER DOESNOT EXIST"});
            next();
        }
    })
}


// ROUTES

// home route
app.get("/",(req,res,next)=>{
    res.render("searchusers");
})

// add users
app.get("/users/add",(req,res,next)=>{
    res.render("adduser");
})

// processing the input to the add user form

app.post("/users/add",(req,res,next)=>{
    let id=req.body.id;
    let firstName=req.body.firstName;
    let lastName=req.body.lastName;
    let email=req.body.email;

    let newUser=new user({
        firstName:firstName,
        id:id,
        lastName:lastName,
        email:email
    })
    
    newUser.save().then((user)=>{

console.log("user added to the database , user is ",user);
        res.render("adduser",{message:"User added successfully"})
    }).catch((err)=>{
        console.log("error while saving entry in the database, error is ",err);
        res.render("adduser",{error:err})
    })
})

// deleting users
app.delete("/user/delete/:id",(req,res,next)=>{
    // client.del(req.params.id);
    let id=req.params.id;
    user.findOne({id:id}).then((delUser)=>{
        // console.log("the user to be deleted is ",delUser)
        delUser.remove();

  // removing this user from the cache 
  client.send_command("hdel",[id,"firstName","lastName","email","id"],(err,result)=>{
    if(err){
        console.log("could not delete old user cache from redis , error is",err);
        }else{
            res.redirect("/");
        }
})


      
    }).catch((err)=>{
      console.log("error while deleting users from the database, error is ,",err);
    })
})

// list all users
app.get("/users/listusers",(req,res,next)=>{
// getting all the users from the mongodb database

user.find().then((users)=>{
    if(users.length==0 || users===null){
        res.render("listusers",{error:"NO USERS EXIST YET"});
        
    }else{
        console.log("list users are ,",users);
        res.render("listusers",{users:users});

    }
}).catch((err)=>{
    res.render("listusers",{error:err});
})

})

// helper functions
var  getSearchResponse=async function(req,res,next){
    let userId=req.body.id;

    // using the mongodb database
    user.findOne({id:userId}).then((foundUser)=>{
        if(foundUser){
         // saving data for caching in redis server
         client.hmset([foundUser.id,"firstName",foundUser.firstName,"lastName",foundUser.lastName,"email",foundUser.email,"id",foundUser.id],(err,result)=>{
           // making the key expire after sometime
           client.expire(foundUser.id,60);
            if(err){
               console.log("error in using hmset to store user cache (search user), error is ",err);
            }else{

                console.log("successfully stored a user in redis (search user), the result is ",result);
            }
        });
        console.log("This response is from the database and not from cache");
            res.render("details",{user:foundUser})
        }else{
            // res.render("searchusers",{error:"User doesnot exist"})
            res.redirect(`/users/details/${foundUser.id}`);
        }
       
    }).catch((err)=>{
        res.render("searchusers",{error:"User not found"})
    })
}



// search users
app.post("/users/search",cache,getSearchResponse)

// show user details

// app.get("/users/details/:id",cache2,getSearchResponse2)


let updateUserResponse=(req,res,next)=>{
    let userId=req.params.id;
    

      let toUpdateUser={};
        user.findOne({id:userId}).then(async (givenUser)=>{

            // saving the user in the redis database for caching
            client.hmset([givenUser.id,"firstName",givenUser.firstName,"lastName",givenUser.lastName,"email",givenUser.email,"id",givenUser.id],(err,result)=>{
                // making the key expire after sometime
                client.expire(givenUser.id,60);



                 if(err){
                    console.log("error in using hmset to store user cache (update user), error is ",err);
                 }else{
     
                     console.log("successfully stored a user in redis (update user), the result is ",result);
                 }
             });  
            res.render("updateUsers",{user:givenUser});
        }).catch((err)=>{
            console.log("error while getting user details to be updated from the database, error is ",err);
        })
    
    }

    // update cache function

    let updateCache=(req,res,next)=>{
        var id=req.params.id;

        client.hgetall(id,(err,data)=>{
            if(err){
           res.render("updateUsers",{error:err})
            }
            if(data!==null){
            console.log("this request is from the cache middleware for updation for  user Id ",id);
              res.render("updateUsers",{user:data});
            }
            else{
                next();
            }
        })
    }

// gettiing the update users form
app.get("/user/update/:id",updateCache,updateUserResponse);

// processing the update user form
app.put("/user/update/:id",(req,res,next)=>{
    let userId=req.params.id;
    user.findOne({id:userId}).then((user)=>{

        // updating the old user
        user.firstName=req.body.firstName;
        user.lastName=req.body.lastName;
        user.id=req.body.id;
        user.email=req.body.email;



        // saving the updated user
        user.save().then(async (updatedUser)=>{
            console.log("user saved ,updated user is ,",updatedUser);

            // removing this user from the cache 
             client.send_command("hdel",[userId,"firstName","lastName","email","id"],(err,result)=>{
                if(err){
                    console.log("could not delete old user cache from redis , error is",err);
                    }else{
                        res.render("details",{user:updatedUser});
                    }
            })

           
        }).catch((err)=>{
            console.log("error while updating the user balances..", err);
        })


    })
})



app.listen(port,()=>{
    console.log("SERVER STARTED LISTENING ON PORT ...",port);
})