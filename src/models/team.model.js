import mongoose, {Schema} from 'mongoose';

const teamMemberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, default: 'Member' }, // e.g. 'Leader', 'Backend Dev', 'Designer'
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const teamSchema = new mongoose.Schema(
  {
    name: { 
        type: String, 
        required: true, 
        trim: true 
    },
    hackathon: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Hackathon', 
        required: true 
    },
    leader: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
 
    members: [
        teamMemberSchema
    ],
    maxSize: { 
        type: Number, 
        default: 4 
    },
 
    description: { 
        type: String, 
        maxlength: 500 
    }, // idea / pitch summary
    requiredRoles: [{ 
        type: String 
    }], // roles still needed, e.g. ['Backend Dev', 'Designer']
    requiredSkills: [{ 
        type: String 
    }], // skills still needed, e.g. ['Figma', 'Node.js']
 
    isOpen: { 
        type: Boolean, 
        default: true 
    }, // whether team is accepting new members
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

teamSchema.virtual('currentSize').get(function () {
  return this.members.length;
});

teamSchema.index({ hackathon: 1, isOpen: 1 });
 
export const Team = mongoose.model('Team', teamSchema);
 

