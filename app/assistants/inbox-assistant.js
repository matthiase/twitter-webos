function InboxAssistant() {

}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
InboxAssistant.prototype.setup = function() {
	try {
		// Set up the application menu.
		this.controller.setupWidget(Mojo.Menu.appMenu, Application.Menu.attributes, Application.Menu.model);
				
	  // Create the actions used by this scene.
	  this.actionRefresh = { icon: 'sync', command: 'actionRefresh' };
	  this.actionCompose = { icon: 'compose', command: 'actionCompose' };
		this.actionInbox = { label: $L("Inbox"), command: 'actionInbox' };
		this.actionSent = { label: $L("Sent"), command: 'actionSent' };

	  // Set up the command menu.    
	  this.commandMenuModel = {
	    visible: true,
	    items: [
	      { items: [this.actionRefresh] },
	      { items: [this.actionInbox, this.actionSent], toggleCmd: 'actionInbox' },
	      { items: [this.actionCompose] }
	    ]
	  };
	  this.controller.setupWidget(Mojo.Menu.commandMenu, undefined, this.commandMenuModel);
	
		// Set up the view selector list.	
		this.controller.setupWidget("viewSelector", 
		    this.viewSelectorAttributes = {
	        label: Application.currentUser.username,
	        choices: [
		        {label: $L("Timeline"), value: "timeline"},
		        {label: $L("Mentions"), value: "mention"},
		        {label: $L("Messages"), value: "inbox"}
           ]
				},
		    this.viewSelectorModel = {
		      value: "inbox",
		      disabled: false
		    }
		);  

	  // Set up the inbox widget.
	  this.controller.setupWidget("inboxWidget",
	    this.inboxAttributes = {
	      itemTemplate: "inbox/received-row-template",
	      listTemplate: "inbox/received-template",
	      formatters: { created_at: Formatters.datetimeFormatter },
	      swipeToDelete: false,
	      renderLimit: 20,
	      reorderable: false
	    },
	    this.receivedMessagesModel = { items: Application.currentUser.receivedMessages || [] }
    );
      
	  // Set up the sent widget.
	  this.controller.setupWidget("sentWidget",
	    this.sentAttributes = {
	      itemTemplate: "inbox/sent-row-template",
	      listTemplate: "inbox/sent-template",
	      formatters: { created_at: Formatters.datetimeFormatter },
	      swipeToDelete: false,
	      renderLimit: 20,
	      reorderable: false
	    },
	    this.sentMessagesModel = {items: Application.currentUser.sentMessages }
    );      

	 	// Set up the progress spinner.
	  this.controller.setupWidget("spinner",
	  this.spinnerAttributes = { spinnerSize: 'large' },
	  this.spinnerModel = { spinning: false });
    
    this.isInitialized = (this.receivedMessagesModel.items.length +
      this.sentMessagesModel.items.length > 0);
      
    // Start listening to events.
    this.viewChangedHandler = this.onViewChanged.bindAsEventListener(this);
	  this.controller.listen('viewSelector', Mojo.Event.propertyChange, this.viewChangedHandler);
    this.inboxTapHandler = this.onInboxTap.bindAsEventListener(this);
	  this.controller.listen('inboxWidget', Mojo.Event.listTap, this.inboxTapHandler);	
        
	}
	catch (error) {
    Mojo.Log.logException(error, "InboxAssistant::setup");
	}
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
InboxAssistant.prototype.cleanup = function(event) {
  try {
    this.controller.stopListening("viewSelector", Mojo.Event.propertyChange, this.viewChangedHandler);
    this.controller.stopListening("inboxWidget", Mojo.Event.listTap, this.inboxTapHandler);
  }
  catch (error) {
    Mojo.Log.logException(error, "InboxAssistant::cleanup");
  }
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
InboxAssistant.prototype.activate = function(event) {
  try {	
    // If the list model is empty, request received messages from the API.  Once the
    // model has been initialized, the user has to manually refresh.
    if (this.isInitialized == false) {
      this.refresh(true);
      this.isInitialized = true;
    }
  }
  catch(error) {
    Mojo.Log.logException(error, "InboxAssistant::activate");
  }
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
InboxAssistant.prototype.deactivate = function(event) {

}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
InboxAssistant.prototype.refresh = function(showProgressMeter) {
	try {
		if (showProgressMeter || true) {
		  this.controller.get('scrim').show();
		  this.controller.get('spinner').mojo.start();		
		}    
		Application.currentUser.loadReceivedMessages(this.receivedMessagesSuccessHandler.bind(this), 
			this.refreshErrorHandler.bind(this));		
	}
	catch (error) {
    this.controller.get('spinner').mojo.stop();
    this.controller.get('scrim').hide();   
		Mojo.Log.logException(error, "InboxAssistant::refreshReceivedMessages");
	}
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
InboxAssistant.prototype.receivedMessagesSuccessHandler = function(items) {
  try {
    this.controller.get('spinner').mojo.stop();
    this.controller.get('scrim').hide();   
    // Update the received items' list model.
    if (items && items.length > 0) {
      this.receivedMessagesModel.items = Application.currentUser.receivedMessages;
      this.controller.modelChanged(this.receivedMessagesModel, this);
    }    
    // Scroll to the first item in the list.
    if (this.controller.get("inboxContainer").visible && this.receivedMessagesModel.items.length > 0) {
      this.controller.get("inboxWidget").mojo.revealItem(0);
    }
  }
  catch (error) {  
    this.controller.get('spinner').mojo.stop();
    this.controller.get('scrim').hide();   
    Mojo.Log.logException(error, "InboxAssistant::receivedMessagesSuccessHandler");
  }
  finally {
    // Continue loading sent messages in the background.
 		Application.currentUser.loadSentMessages(this.sentMessagesSuccessHandler.bind(this), 
			this.refreshErrorHandler.bind(this));   
  }
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
InboxAssistant.prototype.sentMessagesSuccessHandler = function(items) {
  try {
    // Update the sent items' list model.
    if (items && items.length > 0) {
      this.sentMessagesModel.items = Application.currentUser.sentMessages;
      this.controller.modelChanged(this.sentMessagesModel, this);
    }      
  }
  catch (error) {
    Mojo.Log.logException(error, "InboxAssistant::sentMessagesSuccessHandler");
  }
  finally {
    this.actionSent.disabled = false;
    this.controller.modelChanged(this.commandMenuModel, this);    
  }
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
InboxAssistant.prototype.refreshErrorHandler = function(error) {
  this.controller.get('spinner').mojo.stop();
	this.controller.get('scrim').hide();
  this.actionSent.disabled = false;
  this.controller.modelChanged(this.commandMenuModel, this);  
	Mojo.Log.error("InboxAssistant::refreshErrorHandler", error);	
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
InboxAssistant.prototype.handleCommand = function(event) {
  try {    
		if (event.type == Mojo.Event.command) {	
      switch (event.command) {
				case 'actionInbox':
          this.actionRefresh.disabled = false;
          this.controller.modelChanged(this.commandMenuModel, this);
					this.controller.get('sentContainer').hide();
          this.controller.get('inboxContainer').show();
					break;
				case 'actionSent':     
          this.actionRefresh.disabled = true;
          this.controller.modelChanged(this.commandMenuModel, this);        
          this.controller.get('inboxContainer').hide();				
					this.controller.get('sentContainer').show();        
					break;
        case 'actionCompose':
          this.controller.stageController.pushScene("new-message");
          break;
      case 'actionRefresh':    
        this.refresh(true);
        break;
      }
    }
  }
  catch (error) {
    Mojo.Log.logException(error, "InboxAssistant::handleCommand");
  }    
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
InboxAssistant.prototype.onInboxTap = function(event) {
	try {
    this.controller.stageController.pushScene("message", this.receivedMessagesModel.items[event.index]);
	}
	catch (error) {
    Mojo.Log.logException(error, "InboxAssistant::onInboxTap");
	}
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
InboxAssistant.prototype.onViewChanged = function(event) {
  try {
    var selection = event.model.value;
    if (selection != "inbox") {
      this.controller.stageController.swapScene(selection);
    }
  }
  catch(error) {
    Mojo.Log.logException(error, "InboxAssistant::onViewChanged");
  }
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
InboxAssistant.prototype.considerForNotification = function(params) {
	if (params && params.type == "sentMessagesUpdated") {
		this.sentMessagesModel.items = Application.currentUser.sentMessages;
		this.controller.modelChanged(this.sentMessagesModel, this);
	}
}



