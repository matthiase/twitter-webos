function MessageAssistant(data) {
  this.data = data;
}

MessageAssistant.prototype.setup = function() {
  try {
		// Set up the application menu.
		this.controller.setupWidget(Mojo.Menu.appMenu, Application.Menu.attributes, Application.Menu.model);
			
    // Populate the sender and status controls.
    this.controller.get('profileImage').style.background = "url(" + this.data.sender.profile_image_url + ") no-repeat";
    this.controller.get('sender').innerHTML = this.data.sender.name;    
    this.controller.get('createdAt').innerHTML = Formatters.datetimeFormatter(this.data.created_at, this.data);
    this.controller.get('text').innerHTML = this.data.text;
    
    // Start listening to events.
    this.replyHandler = this.reply.bindAsEventListener(this);
    this.controller.listen("messageHeader", Mojo.Event.tap, this.replyHandler);
    this.profileHandler = this.viewProfile.bindAsEventListener(this);
    this.controller.listen("sender", Mojo.Event.tap, this.profileHandler);    
  }
  catch (error) {
    Mojo.Log.logException(error, "MessageAssistant::setup");
  }
}


MessageAssistant.prototype.cleanup = function(event) {
  try {
    this.controller.stopListening("messageHeader", Mojo.Event.tap, this.replyHandler);
    this.controller.stopListening("sender", Mojo.Event.tap, this.profileHandler);
  }
  catch (error) {
    Mojo.Log.logException(error, "MessageAssistant::cleanup");
  }
}


MessageAssistant.prototype.activate = function(event) {

}


MessageAssistant.prototype.deactivate = function(event) {

}


MessageAssistant.prototype.viewProfile = function(event) {
	try {
    this.controller.stageController.pushScene("profile", this.data.sender);
	}
	catch(error) {
		Mojo.Log.logException(error, "MessageAssistant::viewProfile");
	}
}


MessageAssistant.prototype.reply = function(event) {
	try {	
    if(event.target.id != "sender") {
      this.controller.stageController.pushScene("new-message", this.data.sender.screen_name);
    }
	}
	catch(error) {
		Mojo.Log.logException(error, "MessageAssistant::reply");
	}
}
