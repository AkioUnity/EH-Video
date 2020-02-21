var webchat = io('/webchat');

var recipient = null

$(document).ready(function(){

	var chat_user = $('#chat_user').val()
	var urlParams = new URLSearchParams(window.location.search);
	var new_conv = urlParams.get('new_conv');

	webchat.on('connect', function(socket){
		console.log('connected')

		if (chat_user) {
			webchat.emit('JoinPersonalRoom', chat_user)
		}
		
		if (new_conv) {
			console.log('emitting new conversation')
			webchat.emit('new_conversation', new_conv)			
		}

		webchat.on('RoomCreated', function(room){
		  console.log('Connected to Room:' + room);
		});
		webchat.on('RoomPersonalCreated', function(room){
		  console.log('Connected to Room:' + room);
		});
		webchat.on('newNotification', function(){
		  	console.log('New Notification Triggered');
			getNotifications()
			refreshConversations()
		});
		webchat.on('message', function(message){
		  appendSingleMsg(message)
		});
		webchat.on('new_conversation', function(personal_room){
		  console.log("new_conversation")
		  refreshConversations()
		});
		webchat.on('disconnect', function(){
		  console.log('we disconnected');
		});
	}); 

	bindConvs()

	$("#chatSubmit").keyup(function(event) {
	    if (event.keyCode === 13) {
	        sendMessage()
	    }
	});

	$("#chatSubmit").focus(function() {
        delMessageNotif()
	});

	$('#chatSubmitBtn').click(function(){
		sendMessage()
	}) 

	getNotifications()

	setInterval(function(){
		getNotifications()
	}, 1000*60)


})

function getNotifications(){
	$.get('/notifications', function(data){
		if (data.notifications && data.notifications.length > 0) {
			$('#notificationsHandle').text('Notifications (' + data.notifications.length + ')')
			var notificationsHtml = ''
			var notifications = data.notifications
			for (var i = 0; i < notifications.length; i++) {
				var notification = notifications[i]
				notificationsHtml += '<a href="/messages"><p style="font-size:12px">' + notification.message + '</p></a>'
			}
			$('#notifications').html(notificationsHtml)
		} else {
			$('#notificationsHandle').text('Notifications')
			$('#notifications').html('<p>No Notifications</p>')
		}
	})	
}

function delMessageNotif(){
	var conv_id = $("#chatSubmit").data('conv_id')
	$.get('/notifications/clear/conversation/' + conv_id, function(data){
		refreshConversations()							
		getNotifications()
	})
}

function sendMessage(){
	if (!recipient) {
		alert('error no recipient')
		return
	}
	var message = $('#chatSubmit').val()
	var payload = {recipient: recipient, message: message}
	$.post('/messages/send?format=json', payload, function(data){
		webchat.emit('message', data);
		webchat.emit('triggerNotification', data.recipient);
	})
	$('#chatSubmit').val('')
}

function createMessageView(messages){
	$("#messageContainer").empty()
	for (var i = 0; i < messages.length; i++) {
		var message = messages[i]
		var messageHTML = "<p class='message-date'>" + moment(message.date).format("MM DD hh:mm a") + "</p>"
		messageHTML += "<a href='/users/profile/" + message.sender + "'><p class='message-sender'>" + message.sender + "</p></a>"
		messageHTML += "<p class='message'>" + message.message + "</p>"
		$("#messageContainer").append(messageHTML)
	}
}

function appendSingleMsg(message){
	if (!$("#messageContainer")) return;
	var messageHTML = "<p class='message-date'>" + moment(message.date).format("MM DD hh:mm a") + "</p>"
	messageHTML += "<a href='/users/profile/" + message.sender + "'><p class='message-sender'>" + message.sender + "</p></a>"
	messageHTML += "<p class='message'>" + message.message + "</p>"
	$("#messageContainer").append(messageHTML)
	scrollBottom()
}

function refreshConversations(){
	if (!$("#conversationsContainer")) return;
	var myname = $('#username').val()
	$.get('/messages/conversations', function(data){
		var conversations = data.conversations
		if (conversations.length > 0) {
			$("#conversationsContainer").empty()			
		}
		for (var i = 0; i < conversations.length; i++) {
			var conversation = conversations[i]
			var target_name = conversation.participants[0] == myname ? conversation.participants[1] : conversation.participants[0] 
			var html = '<p class="conversationItem" data-name="' + target_name + 
						'" data-convid="' + conversation._id + '">' +
               			target_name + '</p>' + 
               			'<p>' + (conversation.last_message ? conversation.last_message.substring(0, 12) : '')  + '</p>' + 
               			'<hr>';
            if (conversation.new_message_for && conversation.new_message_for.includes(myname)) {
            	html = '<p class="conversationNewMessage">New Message</p>' + html 
            }
            $("#conversationsContainer").append(html)
		}
		bindConvs()
	})
}

function bindConvs(){
	$('.conversationItem').click(function(){
		var convData = $(this).data()
		$("#submitContainer").css("display","block")
		$("#chatSubmit").data('conv_id', convData.convid)
		$("#convName").text("Chatting With " + convData.name)
		$.get('/messages/conversation/' + convData.convid, function(data){
			recipient = convData.name
			createMessageView(data.messages)
			scrollBottom()
			webchat.emit('JoinRoom', convData.convid);
		})
	})
}

function scrollBottom(){
	msgContainer = document.getElementById('messageContainer')
	msgContainer.scrollTop = msgContainer.scrollHeight;
}