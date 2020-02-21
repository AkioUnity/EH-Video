const mongoose = require('mongoose');
const Schema = mongoose.Schema;
require('./Messages');
const Message = mongoose.model('messages');

// Create Schema
const ConversationSchema = new Schema({
  participants: [{
      type: String,
      required: true
  }],
  last_message: {
    type: String,
    required: true
  },
  new_message_for: [{
    type: String,
    required: true
  }],
  date: {
    type: Date,
    default: Date.now
  }
});

mongoose.model('conversations', ConversationSchema);
