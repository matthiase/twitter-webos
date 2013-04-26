function StatusAssistant(data) {
  this.data = data;
  this.profileLinks = [];
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
StatusAssistant.prototype.setup = function() {
  try {
    // Set up the application menu.
    this.controller.setupWidget(Mojo.Menu.appMenu, Application.Menu.attributes, Application.Menu.model);	
    
    // Populate the user and status controls.
    this.controller.get('userName').innerHTML = this.data.user.name || "";
    this.controller.get('screenName').innerHTML = "@" + this.data.user.screen_name;
    this.controller.get('profileImage').style.background = "url(" + this.data.user.profile_image_url + ") no-repeat";
    var text = Formatters.urlFormatter(this.data.text);
    this.profileLinks = text.match(/(@[0-9a-zA-Z]*)/g);
    this.controller.get('text').innerHTML = text.replace(/(@[0-9a-zA-Z]*)/g, "<a id=\"$1\" href=\"#\">$1</a>");    
    this.controller.get('createdAt').innerHTML = Formatters.datetimeFormatter(this.data.created_at, this.data);
    this.controller.get('source').innerHTML = this.data.source;

    // Don't display these items if the user is looking at their own status.
    if (this.data.user.screen_name != Application.currentUser.username) {
      // Set up the command menu.
      var actionContact = { icon: 'conversation', submenu: 'contactSubmenu'};
      this.commandMenuModel = {
        visible: (this.data.user.screen_name != Application.currentUser.username),
        items: [
          { disabled: true },
          { disabled: true },
          { items: [actionContact] }       
        ]
      };
      this.controller.setupWidget(Mojo.Menu.commandMenu, undefined, this.commandMenuModel);
      // and the submenu
      this.controller.setupWidget('contactSubmenu', undefined, { 
        items: [ 
          {label: "Reply", command: "actionReply"},
          {label: "Retweet", command: "actionRetweet"},
          {label: "Direct Message", command: "actionDirectMessage"}] 
        }
      );
    }

    // Start listening to events.
    this.profileHandler = this.viewProfile.bind(this, this.data.user.screen_name);
    this.controller.listen("screenName", Mojo.Event.tap, this.profileHandler); 
    // Set up the event handlers for any profile links that may have been mentioned in the text.    
    if (this.profileLinks) {
			this.profileDelegateMap = { };
      for (var linkIndex = 0; linkIndex < this.profileLinks.length; ++linkIndex) {
        var linkId = this.profileLinks[linkIndex];
				this.profileDelegateMap[linkId] = this.viewProfile.bind(this, linkId.slice(1));
        this.controller.listen(linkId, Mojo.Event.tap, this.profileDelegateMap[linkId]);
      }
    }
  }
  catch (error) {
		Mojo.Log.logException(error, "StatusAssistant::setup");
  }
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
StatusAssistant.prototype.cleanup = function() {
  try {    
    this.controller.stopListening("screenName", Mojo.Event.tap, this.profileHandler);
    if (this.profileLinks) {
      var linkId;
      for (var linkIndex = 0; linkIndex < (this.profileLinks.length || 0); ++linkIndex) {
        linkId = this.profileLinks[linkIndex];
        this.controller.stopListening(linkId, Mojo.Event.tap, this.profileDelegateMap[linkId]);
      }
    }
  }
  catch (error) {
		Mojo.Log.logException(error, "StatusAssistant::cleanup");
  }  
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
StatusAssistant.prototype.viewProfile = function(screenName) {
  this.controller.stageController.pushScene("profile", {screen_name: screenName}) ;
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
StatusAssistant.prototype.handleCommand = function(event) {
  try {    
    if (event.type == Mojo.Event.command) {
      switch (event.command) {
				case "actionReply":
          this.controller.stageController.pushScene("tweet", "@" + this.data.user.screen_name + " ");
					break;
				case "actionRetweet":
          this.controller.stageController.pushScene("tweet", "RT @" + this.data.user.screen_name + " " + this.data.text);
					break;
				case "actionDirectMessage":
          this.controller.stageController.pushScene("new-message", this.data.user.screen_name);
					break;
      }
    }
  }
  catch(error) {
    Mojo.Log.logException(error, "StatusAssistant::handleCommand");
  }    
}
