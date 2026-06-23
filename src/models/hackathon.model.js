import mongoose, {Schema} from 'mongoose';

const hackathonSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        maxlength: 1000
    },
    organizer: String,
    mode: { 
        type: String, enum: ['Online', 'Offline', 'Hybrid'], default: 'Online'
    },
    location: String,
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    registrationDeadline: Date,
    themes: [{ type: String, trim: true }], // e.g. ['AI/ML', 'FinTech', 'Open Innovation']
    minTeamSize: { type: Number, default: 1 },
    maxTeamSize: { type: Number, default: 4 },
    externalLink: String, // Devpost / Unstop / official registration page
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['Upcoming', 'Ongoing', 'Completed'],
      default: 'Upcoming',
    },
}, { timestamps: true })

// Speeds up "show upcoming hackathons sorted by date" queries
hackathonSchema.index({ startDate: 1, status: 1 });
 
export const Hackathon = mongoose.model('Hackathon', hackathonSchema);