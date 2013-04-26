/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
function NewMessageAssistant(recipient) {
  this.recipient = recipient || ""; 
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
NewMessageAssistant.prototype.setup = function() {
  try {  
		// Set up the application menu.
		this.controller.setupWidget(Mojo.Menu.appMenu, Application.Menu.attributes, Application.Menu.model);  
  
    // Create the actions used by this scene.
    this.actionSend = { icon: 'send', command: 'actionSend', disabled: true };

    // Set up the command menu.
    this.commandMenuModel = {
      visible: true,
      items: [
        { disabled: true },
        { disabled: true },
        { items: [this.actionSend] }        
      ]
    };
    this.controller.setupWidget(Mojo.Menu.commandMenu, undefined, this.commandMenuModel);
    
    // Set up the recipient textfield widget.
    this.controller.setupWidget('recipientText',
      this.recipientTextAttributes = {
        property: "value",
        hintText: $L("Recipient"),
        autoFocus: (this.recipient.length == 0),
        multiline: false,
        limitResize: true,
        enterSubmits: false,
        textReplacement: false,
        changeOnKeyPress: false
      },
      this.recipientTextModel = { value: this.recipient });
    
    // Set up the message textfield widget.
    this.controller.setupWidget('messageText',
      this.messageTextAttributes = {
        property: "value",
        hintText: $L("Message Text"),
        autoFocus: (this.recipient.length > 0),
        multiline: true,
        limitResize: false,
        enterSubmits: false,
        textReplacement: false,
        changeOnKeyPress: true
      },
      this.messageTextModel = { value: "" });

    // Start listening to events.
    this.validationHandler = this.validate.bindAsEventListener(this);
    this.controller.listen('recipientText', Mojo.Event.propertyChange, this.validationHandler);  
    this.controller.listen('messageText', Mojo.Event.propertyChange, this.validationHandler);
  }
  catch (error) {
    Mojo.Log.logException(error, "NewMessageAssistant::setup");
  }
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
NewMessageAssistant.prototype.cleanup = function(event) {
  try {
    this.controller.stopListening("recipientText", Mojo.Event.propertyChange, this.validationHandler);
    this.controller.stopListening("messageText", Mojo.Event.propertyChange, this.validationHandler);
  }
  catch (error) {
    Mojo.Log.logException(error, "NewMessageAssistant::cleanup");
  }
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
NewMessageAssistant.prototype.handleCommand = function(event) {
  try {    
    if (event.type == Mojo.Event.command) {
      switch (event.command) {
        case 'actionSend':      
          this.submit();
        break;
      }
    }
  }
  catch(error) {
    Mojo.Log.error("NewMessageAssistant::handleCommand",  error);
  }    
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
NewMessageAssistant.prototype.submit = function() {
  var recipient = this.recipientTextModel.value;
  var text = this.messageTextModel.value;
  try {
		if (text.length > 0 && text.length < 140) {	
      var authToken = "Basic " +  btoa(Application.currentUser.username + ":" + Application.currentUser.password);
      new Ajax.Request("http://twitter.com/direct_messages/new.json", {
        method: 'post',
        parameters: {screen_name: recipient, text: text, source: "tinytwitter"},
        requestHeaders: ["Authorization", authToken],
        onCreate: this.onMessageCreate.bind(this),
        onComplete: this.onMessageComplete.bind(this),
        onSuccess: this.onMessageSuccess.bind(this),
        onFailure: this.onMessageFailure.bind(this)
      });	
		}    
  }
  catch(error) {
		Mojo.Log.logException(error, "NewMessageAssistant::submit");
  }
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
NewMessageAssistant.prototype.onMessageCreate = function(transport) {
  this.controller.get('scrim').show();
  this.controller.get('spinner').mojo.start();  
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
NewMessageAssistant.prototype.onMessageComplete = function(transport) {
  this.controller.get('spinner').mojo.stop();
  this.controller.get('scrim').hide(); 
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
NewMessageAssistant.prototype.onMessageSuccess = function(transport) {
  try {
    Application.currentUser.sentMessages.unshift(transport.responseJSON);
    Mojo.Controller.getAppController().sendToNotificationChain({type: "sentMessagesUpdated"});
    this.controller.stageController.popScene();
  }
  catch(error) {
    Mojo.Log.logException(error, "NewMessageAssistant::onMessageSuccess");
  }  
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
NewMessageAssistant.prototype.onMessageFailure = function(transport) {
  var error = transport.responseText;
  Mojo.Log.error(error);
  this.controller.showAlertDialog({
    title: $L("Invalid Server Response"),
    message: $L(error),
    choices: [{label:$L('Dismiss'), value:'dismiss', type:'secondary'}]
  });
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
NewMessageAssistant.prototype.validate = function(event) {
	try { 
    var recipientValue = this.recipientTextModel.value;
		var textValue = this.messageTextModel.value;
		var remainingCharacters = 140 - textValue.length;	
		this.controller.get('messageLabel').innerHTML = remainingCharacters;
    this.actionSend.disabled = (textValue.length == 0 || remainingCharacters < 0);
    this.controller.modelChanged(this.commandMenuModel, this);
	}
	catch (error) {
		Mojo.Log.logException(error, "NewMessageAssistant::validate");
	}
}