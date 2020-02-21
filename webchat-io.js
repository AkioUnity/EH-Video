var sockets = {};

function bootstrapChatRooms(io){
  const webchat = io.of('/webchat');

  webchat.on('connection', function(chatSocket){
    
    sockets[chatSocket.id] = chatSocket
    console.log('someone connected');

    chatSocket.on('disconnect', function () {
        delete sockets[chatSocket.id];
    });

    chatSocket.on('JoinRoom', function (convid) {
      console.log('Joined', convid)
      if (chatSocket.EHRoom) {
        chatSocket.leave(chatSocket.EHRoom)
      }
      chatSocket.EHRoom = convid
      chatSocket.join(convid, () => {
        chatSocket.emit('RoomCreated', convid)
      })
    });

    chatSocket.on('JoinPersonalRoom', function (chat_user) {
      console.log('Joined Personal', chat_user)
      chatSocket.join(chat_user, () => {
        chatSocket.emit('RoomPersonalCreated', chat_user)
      })
    });

    chatSocket.on('message', (message) => {
      chatSocket.emit('message', message);
      chatSocket.in(chatSocket.EHRoom).emit('message', message);
    });

    chatSocket.on('triggerNotification', (receipient) => {
      console.log(receipient)
      chatSocket.in(receipient).emit('newNotification');
    });

    chatSocket.on('new_conversation', (personal_room) => {
      chatSocket.in(personal_room).emit('new_conversation', personal_room);
    });

  });

}

module.exports = bootstrapChatRooms