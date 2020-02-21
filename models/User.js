const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Create Schema
const UserSchema = new Schema({
  name:{
    type: String,
    required: true
  },
  email:{
    type: String,
    required: true
  },
  password:{
    type: String,
    required: true
  },
  requested_reset:{
    type: Boolean,
    default: false,
  },
  date: {
    type: Date,
    default: Date.now
  },
  age:{
    type: Number,
    required: false
  },
  height:{
    type: String,
    required: false
  },
  weight:{
    type: String,
    required: false
  },
  zipcode:{
    type: String,
    required: false
  },
  city:{
    type: String,
    required: false
  },
  race:{
    type: String,
    required: false
  },
  hairColor:{
    type: String,
    required: false
  },
  eyeColor:{
    type: String,
    required: false
  },
  hivStatus:{
    type: String,
    required: false
  },
  orientation:{
    type: String,
    required: false
  },
  bodyHair:{
    type: String,
    required: false
  },
  bodyType:{
    type: String,
    required: false
  },
  faceHair:{
    type: String,
    required: false
  },
  myLook:{
    type: String,
    required: false
  },
  relationshipStatus:{
    type: String,
    required: false
  },
  lookingTo:{
    type: String,
    required: false
  },
  hasImage:{
    type: Boolean,
    required: false
  }
});

mongoose.model('users', UserSchema);