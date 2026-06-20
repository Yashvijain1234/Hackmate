const mongoose = require('mongoose');
 
const joinRequestSchema = new mongoose.Schema(
  {
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
 
    // 'user'  -> the user requested to join the team
    // 'team'  -> the team leader invited the user
    initiatedBy: { type: String, enum: ['user', 'team'], required: true },
 
    message: { type: String, maxlength: 300 }, // e.g. "I know React + Node, free this weekend"
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'cancelled'],
      default: 'pending',
    },
 
    respondedAt: Date,
  },
  { timestamps: true }
);
 
// Prevents duplicate pending requests between the same user & team
joinRequestSchema.index({ team: 1, user: 1 }, { unique: true });
 
module.exports = mongoose.model('JoinRequest', joinRequestSchema);