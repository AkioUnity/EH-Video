const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Create Schema
const MessageSchema = new Schema({
  recipient:{
    type: String,
    required: true
  },
  recipient_read:{
    type: Boolean,
    default: false
  },
  message:{
    type: String,
    required: true
  },
  sender:{
    type: String,
    required:true
  },
  conversation_id:{
    type: String,
    required:true
  },
  date: {
    type: Date,
    default: Date.now
  }
});

mongoose.model('messages', MessageSchema);