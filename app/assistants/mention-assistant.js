function MentionAssistant() {

}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
MentionAssistant.prototype.setup = function() {
	// Set up the application menu.
	this.controller.setupWidget(Mojo.Menu.appMenu, Application.Menu.attributes, Application.Menu.model);
	
	// Set up the view selector.	
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
	      value: "mention",
	      disabled: false
	    }
	);  
	this.controller.listen('viewSelector', Mojo.Event.propertyChange, this.onViewChanged.bindAsEventListener(this));
  
  // Set up the list widget.
  this.controller.setupWidget("statusList",
    this.listAttributes = {
      listTemplate: "shared/status-list-template",
      itemTemplate: "shared/status-row-template",
      formatters: { created_at: Formatters.datetimeFormatter },
      swipeToDelete: false,
      renderLimit: 200,
      reorderable: false
    },
    this.listModel = {items: []}
  );  
  
  // Set up the progress spinner.
  this.controller.setupWidget("spinner",
   this.spinnerAttributes = { spinnerSize: 'large' },
   this.spinnerModel = { spinning: false }
  );  

  // Set up the "more" button.
  this.controller.setupWidget("moreButton",
    { type: Mojo.Widget.activityButton },
    { buttonLabel: "More...", disabled: false }
  );  
  this.controller.get("moreButton").hide(); 
  
  // Start listening to events.
  this.listTapHandler = this.onListTap.bindAsEventListener(this);
  this.controller.listen('statusList', Mojo.Event.listTap, this.listTapHandler);
  this.moreButtonHandler = this.loadMore.bindAsEventListener(this);
  this.controller.listen("moreButton", Mojo.Event.tap, this.moreButtonHandler);
  
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
MentionAssistant.prototype.cleanup = function(event) {  
	try {
    this.controller.stopListening("statusList", Mojo.Event.listTap, this.listTapHandler);
    this.controller.stopListening("moreButton", Mojo.Event.tap, this.moreButtonHandler);
	}
	catch (error) {
		Mojo.Log.logException(error, "MentionAssistant::cleanup");
	}
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
MentionAssistant.prototype.activate = function(event) {
  try {
		if (this.listModel.items.length == 0) {
      var token = btoa(Application.currentUser.username + ":" + Application.currentUser.password); 
      var url = "http://twitter.com/statuses/mentions.json"; 
      this.resource = new Twitter.Resource(url, {
        method: "get",
        cache: Twitter.Cache.session,
        requestHeaders: ["Authorization", "Basic " + token],
				onCreate: this.resourceCreatedCallback.bind(this),
        onSuccess: this.resourceRefreshCallback.bind(this),
        onFailure: this.resourceErrorCallback.bind(this)
      });				
		}
  }
  catch (error) {
    Mojo.Log.logException(error, "MentionAssistant::activate");
  }
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
MentionAssistant.prototype.resourceCreatedCallback = function() {
	this.controller.get('scrim').show();
  this.controller.get('spinner').mojo.start();
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
MentionAssistant.prototype.resourceRefreshCallback = function(items) {
	try {  
    this.controller.get('spinner').mojo.stop();
		this.controller.get('scrim').hide();  
    if (items) {
      this.listModel.items = items;
      this.controller.modelChanged(this.listModel, this);
      if (this.listModel.items.length > 0) {
        this.controller.get("moreButton").show();
      }
    }
	}
	catch(error) {
    Mojo.Log.logException(error, "MentionAssistant::resourceRefreshCallback");
	}	
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
MentionAssistant.prototype.resourceErrorCallback = function(error) {
	try {  
    this.controller.get('spinner').mojo.stop();
		this.controller.get('scrim').hide();  
    Mojo.Log.error(error);
		this.controller.showAlertDialog({
			title: $L("Invalid Server Response"),
			message: $L(error),
			choices: [{label:$L('Dismiss'), value:'dismiss', type:'secondary'}]
		});
	}
	catch(error) {
    Mojo.Log.logException(error, "MentionAssistant::resourceErrorCallback");
	}	
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
MentionAssistant.prototype.onViewChanged = function(event) {
  try {
    var selection = event.model.value;
    if (selection != "mention") {
      this.controller.stageController.swapScene(selection);
    }
  }
  catch (error) {
		Mojo.Log.logException(error, "MentionAssistant::onViewChanged");
  }
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
MentionAssistant.prototype.onListTap = function(event) {
	try {
			this.controller.stageController.pushScene("status", this.listModel.items[event.index]);
	}
	catch (error) {
    Mojo.Log.logException(error, "MentionAssistant::onListTap");
	}
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
MentionAssistant.prototype.loadMore = function(event) {
  try {
    this.controller.get("moreButton").mojo.activate();
    var token = btoa(Application.currentUser.username + ":" + Application.currentUser.password); 
    var url = "http://twitter.com/statuses/mentions.json";
    var parameters = { };
    
		// Get the last item in the list model and use it to set the max_id parameter (which
		// limits the results to items with ids equal to or less than the max_id).  The first
		// item will be a duplicate so we fetch 21 items and discard the first one.
		var index = this.listModel.items.length - 1;
		if (index > -1) {
    	parameters.max_id = this.listModel.items[index].id;
			parameters.count = 21;
		} 

    this.resource = new Twitter.Resource(url, {
      method: "get",
      cache: Twitter.Cache.none,
      parameters: parameters,
      requestHeaders: ["Authorization", "Basic " + token],
      onSuccess: this.loadMoreSuccess.bind(this),
      onFailure: function(error) {
        Mojo.Log.error(error);
        this.controller.get("moreButton").mojo.deactivate(); 
        this.controller.showAlertDialog({
          title: $L("Invalid Server Response"),
          message: $L(error),
          choices: [{label:$L('Dismiss'), value:'dismiss', type:'secondary'}]
        });
      }.bind()
    });      
    
  }
  catch (error) {
    this.controller.get("moreButton").mojo.deactivate();
    Mojo.Log.logException(error, "MentionAssistant::loadMore");
  }
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
MentionAssistant.prototype.loadMoreSuccess = function(items) {
	try {
    this.controller.get("moreButton").mojo.deactivate();
    if (items) {      
      var offset = this.listModel.items.length;
      // If the user is pagenating, simply push the retrieved items onto the model.  The first item
      // is discarded.  It's always a duplicate, because the max_id parameter is used in an equal to
      // or less than less than fashion.
      items.shift();
      this.listModel.items = this.listModel.items.concat(items);
      this.controller.get("statusList").mojo.noticeAddedItems(offset, items);
    }
	}
	catch(error) {
    Mojo.Log.logException(error, "MentionAssistant::loadMoreSuccess");
	}	
}