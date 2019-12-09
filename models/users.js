const mongoose=require("mongoose");
let Schema=mongoose.Schema;

var userSchema=new Schema({
id:Number,
firstName:String,
lastName:String,
email:String
})

module.exports=mongoose.model("users",userSchema);
