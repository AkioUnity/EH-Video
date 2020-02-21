const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const {ensureAuthenticated} = require('../helpers/auth');

require('../models/User');
require('../models/Messages');
require('../models/Conversations');
require('../models/Notifications');
const User = mongoose.model('users');
const Message = mongoose.model('messages');
const Conversations = mongoose.model('conversations');
const Notifications = mongoose.model('notifications');

router.get('/', ensureAuthenticated, async (req, res) => {
  let notifications = await Notifications.find({ user_id : req.user.name})
  res.json({notifications: notifications});
});

router.get('/clear/conversation/:id', ensureAuthenticated, async (req, res) => {
  // Update read receipts
  let conversation = await Conversations.findOne({ _id : req.params.id } )
  if (conversation.new_message_for.includes(req.user.name)) {
    conversation.new_message_for = []
    await conversation.save()    
  }
  // Find other converstaion sender
  var otherParticipant = null
  for (var i = 0; i < conversation.participants.length; i++) {
    if(conversation.participants[i] != req.user.name){
      otherParticipant = conversation.participants[i] 
    }
  }
  // Delete any nacent alerts 
  var findPayload = { user_id: req.user.name, type: 'message', message: 'New Message From ' + otherParticipant }
  var alert = await Notifications.find(findPayload).remove()

  res.json({status: 'success'})
});


module.exports = router;