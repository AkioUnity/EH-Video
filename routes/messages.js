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
  let conversations = await Conversations.find({ participants: { $in: [req.user.name] } })
  let notifications = await Notifications.find({ user_id : req.user.name})
  res.render('messages/index', {conversations:conversations});
});

router.get('/conversations', ensureAuthenticated, async (req, res) => {
  let conversations = await Conversations.find({ participants: { $in: [req.user.name] } })
  res.json({conversations:conversations});
});

router.get('/test', ensureAuthenticated, async (req, res) => {
  let msgs = await Conversations.find({ })
  res.json({conversations:msgs});
});

router.get('/conversation/:id', ensureAuthenticated, async (req, res) => {
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
  var perPage = 50
  var page = Math.max(0, (req.query.page || 0))
  // Get messages
  messages = await Message.find({ conversation_id : req.params.id }).skip(perPage * page).limit(50).sort({'date': -1})
  res.json({messages:messages.reverse()})
});

router.post('/send', ensureAuthenticated, async (req, res) => {
  if (!req.body.recipient || !req.body.message) {
    req.flash('error_msg', 'Needs Message');
    res.redirect('back');
    return
  }
  console.log(req.body);
  const recipient = req.body.recipient
  const sender = req.user.name
  const message = req.body.message
  // Create conversation if one doesnt exists
  let MongoConv = await Conversations.findOne({  participants: { $all: [recipient, sender]} })
  if (!MongoConv) {
    console.log("save new message");
    MongoConv = await Conversations({ participants: [recipient, sender] })
    MongoConv = await MongoConv.save()
  }
  console.log(MongoConv);
  const messageMongo = {recipient: recipient, message: message, sender: sender, conversation_id: MongoConv._id}
  console.log(messageMongo);
  const savedMessage = await new Message(messageMongo).save()
  console.log("ok2");
  if (req.query.format === 'json') {
    res.json(savedMessage)
  } else {
    res.redirect('/messages?new_conv=' + recipient)
  }
  console.log("ok3");
  // Async update for notifications
  MongoConv.last_message = message
  MongoConv.new_message_for = [recipient]
  MongoConv.save()
  let notification = { type: 'message',
                        user_id: recipient,
                        message: "New Message From " + sender,
                        data: savedMessage }

  let msgNotification = await Notifications.findOne({ type: 'message',
                                                user_id: recipient,
                                                message: "New Message From " + sender })
  if (!msgNotification) {
    let newNotification = await new Notifications(notification).save()
  }
});

module.exports = router;
