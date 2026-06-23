import mongoose, {Schema} from 'mongoose';
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new Schema({
    userName: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        index: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: [true, "Password is required"],
    },
    avatar:{
        type: String,
        default: "https://res.cloudinary.com/demo/image/upload/v1/samples/people/boy-snow-hoodie.jpg"
    },
    bio: {
        type: String,
        maxlength: 300
    },
    skills: [{
        type: String,
        trim: true
    }],
    preferredRoles:[{
        type: String,
        enum: ['Frontend', 'Backend', 'Full Stack', 'ML/AI', 'UI/UX Designer', 'Mobile', 'DevOps', 'Other'],
    }],
    experienceLevel: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced'],
      default: 'Beginner',
    },
    githubUrl: String,
    linkedinUrl: String,
    portfolioUrl: String,
    collegeOrOrg: String,
    teams: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Team' 
    }],
    refreshToken: {
        type: String
    },

}, {timestamps: true})

userSchema.pre("save", async function(){
    if(!this.isModified("password")) return
    this.password = await bcrypt.hash(this.password, 10)
})

userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password)
}
userSchema.methods.generateAccessToken = function(){
    return jwt.sign({
        _id: this._id,
        email: this.email,
        userName: this.userName
    },
    process.env.ACCESS_TOKEN_SECRET,
    {expiresIn: process.env.ACCESS_TOKEN_EXPIRY})
}
userSchema.methods.generateRefreshToken = function(){
    return jwt.sign({
        _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {expiresIn: process.env.REFRESH_TOKEN_EXPIRY})
}


userSchema.index({ skills: 1 });

export const User = mongoose.model("User", userSchema);