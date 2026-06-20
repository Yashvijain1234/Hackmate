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
        required: true
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

}, {timestamps: true})

userSchema.pre("save", async function(next){
    if(!this.isModified("password")) return next()
    this.password = await bcrypt.hash(this.password, 10)
    next();
})

userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password)
}
userSchema.methods.generateAccessToken = function(){
    jwt.sign({
        _id: this._id,
        email: this.email,
        username: this.username,
        fullname: this.fullname
    },
    process.env.ACCESS_TOKEN_SECRET,
    {expiresIn: process.env.ACCESS_TOKEN_EXPIRY})
}
userSchema.methods.generateRefreshToken = function(){
    jwt.sign({
        _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {expiresIn: process.env.REFRESH_TOKEN_EXPIRY})
}


userSchema.index({ skills: 1 });

export const User = mongoose.model("User", userSchema);