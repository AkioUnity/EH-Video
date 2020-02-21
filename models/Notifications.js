const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Create Schema
const NotificationSchema = new Schema({
  user_id:{
    type: String,
    required: true
  },
  message:{
    type: String,
    required: true
  },
  type:{
    type: String,
    required:true
  },
  data:{
    type: Object,
  },
  date: {
    type: Date,
    default: Date.now
  }
});

mongoose.model('notifications', NotificationSchema);