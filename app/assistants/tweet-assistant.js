/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
function TweetAssistant(text) {
  this.initialValue = text || "";
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
TweetAssistant.prototype.setup = function() {
  try {
		// Set up the application menu.
		this.controller.setupWidget(Mojo.Menu.appMenu, Application.Menu.attributes, Application.Menu.model);
  
    // Create the actions used by this scene.
    this.actionSend = { icon: "send", command: "actionSend" };
    this.actionMore = { iconPath: "images/menu-icon-more.png", submenu: "moreSubmenu" };
    // Set up the command menu.
    this.commandMenuModel = {
      visible: true,
      items: [
        { items: [this.actionMore] },
        { disabled: true },
        { items: [this.actionSend] }        
      ]
    };
    this.controller.setupWidget(Mojo.Menu.commandMenu, undefined, this.commandMenuModel);
    // and the submenu
      this.controller.setupWidget('moreSubmenu', undefined, { 
        items: [ 
          {label: $L("Select All"), command: "actionSelectAll"},
          {label: $L("Clear Text"), command: "actionClear"},
          {label: $L("Shorten Url"), command: "actionShortenUrl"}
        ]}
      );
    
    // Set up the progress spinner.
    this.controller.setupWidget("spinner",
     this.spinnerAttributes = { spinnerSize: 'large' },
     this.spinnerModel = { spinning: false }
    );     
    
    // Set up the status textfield widget.
    this.controller.setupWidget('statusText',
      this.statusTextAttributes = {
        property: "value",
        hintText: $L("What are you doing?"),
        autoFocus: true,
        multiline: true,
        limitResize: false,
        enterSubmits: false,
        textReplacement: false,
        changeOnKeyPress: true	
      },
      this.statusTextModel = { value: this.initialValue });
      
    // Display the account's information
		var template = new Template($L({key: "header.tweet", value: "New Tweet <br /><span style='font-size:80%;'>from @#{username}</span>"}));		
    this.controller.get("headerText").innerHTML = template.evaluate({username: Application.currentUser.username});

    // Start listening to events.
    this.validationHandler = this.validate.bindAsEventListener(this);
    this.controller.listen('statusText', Mojo.Event.propertyChange, this.validationHandler);
  }
  catch (error) {
    Mojo.Log.logException(error, "TweetAssistant::setup");
  }
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
TweetAssistant.prototype.cleanup = function(event) {
  try {
    this.controller.stopListening("statusText", Mojo.Event.propertyChange, this.validationHandler);
    //this.controller.stopListening("okButton", Mojo.Event.tap, this.submitHandler);
  }
  catch (error) {
    Mojo.Log.logException(error, "TweetAssistant::cleanup");
  }
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
TweetAssistant.prototype.activate = function(event) {  
  try {  
    this.validate();
  }
  catch (error) {
    Mojo.Log.logException(error, "TweetAssistant::activate");
  }
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
TweetAssistant.prototype.deactivate = function(event) {

}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
TweetAssistant.prototype.handleCommand = function(event) {
  try {
    if (event.type == Mojo.Event.command) {
      switch (event.command) {
        case 'actionSend':      
          this.submit();
          break;
        case "actionSelectAll":
          if (this.statusTextModel.value) {
            var textfield = this.controller.get("statusText");
            textfield.mojo.setCursorPosition(0, this.statusTextModel.value.length);                   
          }        
          break;
        case "actionClear":
          if (this.statusTextModel.value) {
            this.statusTextModel.value = "";
            this.controller.modelChanged(this.statusTextModel, this);
            this.validate();
          }
          break;
        case 'actionShortenUrl':
          if (this.statusTextModel.value) {
            var textfield = this.controller.get("statusText");
            var cursor = textfield.mojo.getCursorPosition();          
            if (cursor.selectionStart !== cursor.selectionEnd) {
              var selectedText = this.statusTextModel.value.substring(cursor.selectionStart, cursor.selectionEnd);
            }            
          }
          // If the user has made a text selection, send it off the shortenUrl function.
          if (selectedText) {
            this.shortenUrl(selectedText);
          }
          else {
            this.controller.showAlertDialog({
              title: $L("Invalid Selection"),
              message: $L("Please highlight a url to shorten."),
              choices: [{label:$L('Dismiss'), value:'dismiss', type:'secondary'}]
            });
          }
          break;
      }
    }
  }
  catch(error) {
    Mojo.Log.error("TimelineAssistant::handleCommand",  error);
  }    
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
TweetAssistant.prototype.submit = function() {
  var text = this.statusTextModel.value;
  try {
		if (text.length > 0 && text.length < 140) {	
      var authToken = "Basic " +  btoa(Application.currentUser.username + ":" + Application.currentUser.password);
      new Ajax.Request("http://twitter.com/statuses/update.json", {
        method: 'post',
        parameters: {status: text, source: "tinytwitter"},
        requestHeaders: ["Authorization", authToken],
        onCreate: this.onTweetCreate.bind(this),
        onComplete: this.onTweetComplete.bind(this),
        onSuccess: this.onTweetSuccess.bind(this),
        onFailure: this.onTweetFailure.bind(this)
      });	
		}    
  }
  catch(error) {
		Mojo.Log.logException(error, "TweetAssistant::submit");
  }
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
TweetAssistant.prototype.onTweetCreate = function(transport) {
  this.controller.get('scrim').show();
  this.controller.get('spinner').mojo.start();
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
TweetAssistant.prototype.onTweetComplete = function(transport) {
  this.controller.get('spinner').mojo.stop();
  this.controller.get('scrim').hide(); 
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
TweetAssistant.prototype.onTweetSuccess = function(transport) {
  try {
    Application.currentUser.friendsTimeline.unshift(transport.responseJSON);
    Mojo.Controller.getAppController().sendToNotificationChain({type: "currentUserUpdated"});
    this.controller.stageController.popScene();
  }
  catch(error) {
    Mojo.Log.logException(error, "TweetAssistant::onTweetSuccess");
  }  
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
TweetAssistant.prototype.onTweetFailure = function(transport) {
  Mojo.Log.error(transport.responseText);
  this.controller.showAlertDialog({
    title: $L("Invalid Server Response"),
    message: $L(error),
    choices: [{label:$L('Dismiss'), value:'dismiss', type:'secondary'}]
  });
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
TweetAssistant.prototype.validate = function(event) {
	try {
    // Check the text constraints.
		var textValue = this.statusTextModel.value;
		var remainingCharacters = 140 - textValue.length;	
		this.controller.get('statusLabel').innerHTML = remainingCharacters;
    this.actionSend.disabled = (textValue.length == 0 || remainingCharacters < 0);
    // Update the view.
    this.controller.modelChanged(this.commandMenuModel, this);
	}
	catch (error) {
		Mojo.Log.logException(error, "TweetAssistant::validate");
	}
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
TweetAssistant.prototype.shortenUrl = function(url) {
  try {  
    var pattern = /^([https?:\/\/]*[0-9a-zA-Z][-\w]*[0-9a-zA-Z]\.+[a-zA-Z]{2,9}[:\d{1,4}]?[-\w\/#~:.?+=&%@~]*)$/;
    if (pattern.test(url)) {
      this.controller.get('scrim').show();
      this.controller.get('spinner').mojo.start();
      var shortener = new UrlShortener(Application.Settings.UrlShortener || {});
      shortener.shorten(url, 
        // Success callback
        function(shortenedUrl){
          this.controller.get('spinner').mojo.stop();
          this.controller.get('scrim').hide();
          Mojo.Log.info("Replacing", url, "with", shortenedUrl);
          var text = this.statusTextModel.value.replace(url, shortenedUrl);          
          this.statusTextModel.value = text;
          this.controller.modelChanged(this.statusTextModel, this);
        }.bind(this),
        // Failure callback
        function (error) {
          this.controller.get('spinner').mojo.stop();
          this.controller.get('scrim').hide(); 
          this.controller.showAlertDialog({
            title: $L("Failed To Shorten Url"),
            message: error,
            choices: [{label:$L('Dismiss'), value:'dismiss', type:'secondary'}]
          });        
        }.bind(this)
      );
    }
    else {
      this.controller.showAlertDialog({
        title: $L("Invalid Selection"),
        message: $L("The selection is not a valid url."),
        choices: [{label:$L('Dismiss'), value:'dismiss', type:'secondary'}]
      });    
    }
  }
  catch (error) {
    this.controller.get('spinner').mojo.stop();
    this.controller.get('scrim').hide();
    Mojo.Log.logException(error, "TweetAssistant::shortenUrl");
  }
}