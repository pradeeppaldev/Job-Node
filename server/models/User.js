import mongoose from "mongoose";

const userSchema = new mongoose.Schema({ 
    _id:{
        type:String,
        required:true,
    },
    name:{
        type:String,
        required:true,
    },
    email:{
        type:String,
        required:true,
        unique:true,
    },
    resume:{
        type:String
    },
    image:{
        type:String,
        required:true,
    },
    phoneNumber:{
        type:String,
        default:''
    },
    whatsappOptIn:{
        type:Boolean,
        default:false
    },
    skills:[{
        type:String
    }],
    preferredLocations:[{
        type:String
    }],
    preferredCategories:[{
        type:String
    }],
    preferredLevels:[{
        type:String
    }]
})

const User = mongoose.model('User', userSchema)

export default User;