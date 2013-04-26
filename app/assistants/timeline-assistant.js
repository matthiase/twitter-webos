function TimelineAssistant() {

}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
TimelineAssistant.prototype.setup = function() {
  try {
		// Set up the application menu.
		this.controller.setupWidget(Mojo.Menu.appMenu, Application.Menu.attributes, Application.Menu.model);	
	
    // Create the actions used by this scene.
    var actionRefresh = { icon: 'sync', command: 'actionRefresh' };
    var actionCompose = { icon: 'compose', command: 'actionCompose' };

    // Set up the command menu.
    this.commandMenuModel = {
      visible: true,
      items: [
        { items: [actionRefresh] },
        { disabled: true },
        { items: [actionCompose] }
        
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
          value: "timeline",
          disabled: false
        }
    );
    
    // Set up the timeline widget.
    this.controller.setupWidget("timeline",
      this.listAtrributes = {
        listTemplate: "shared/status-list-template",
        itemTemplate: "shared/status-row-template",
        formatters: { created_at: Formatters.datetimeFormatter },
        swipeToDelete: false,
        renderLimit: 200,
        reorderable: false
      },
      this.listModel = {items: Application.currentUser.friendsTimeline || [ ]}
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
    this.viewChangedHandler = this.onViewChanged.bindAsEventListener(this);
    this.controller.listen('viewSelector', Mojo.Event.propertyChange, this.viewChangedHandler); 
    this.listTapHandler = this.onListTap.bindAsEventListener(this);
    this.controller.listen('timeline', Mojo.Event.listTap, this.listTapHandler);  
    this.buttonMoreHandler = this.loadMore.bindAsEventListener(this);
    this.controller.listen("moreButton", Mojo.Event.tap, this.buttonMoreHandler);    
    this.activateWindowHandler = this.activateWindow.bindAsEventListener(this);
    Mojo.Event.listen(this.controller.document, Mojo.Event.stageActivate, this.activateWindowHandler);

      
  }
  catch(error) {
    Mojo.Log.error("TimelineAssistant::setup",  error);
  }
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
TimelineAssistant.prototype.cleanup = function(event) {
  try {
    this.controller.stopListening("viewSelector", Mojo.Event.propertyChange, this.viewChangedHandler);
    this.controller.stopListening("timeline", Mojo.Event.listTap, this.listTapHandler);
    this.controller.stopListening("moreButton", Mojo.Event.tap, this.buttonMoreHandler);
    Mojo.Event.stopListening(this.controller.document, Mojo.Event.stageActivate, this.activateWindowHandler);
  }
  catch (error) {
    Mojo.Log.logException(error, "TimelineAssistant::cleanup");
  }
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
TimelineAssistant.prototype.activate = function(event) {
  try {
		Mojo.Log.info("TimelineAssistant::activate");		
		if (this.listModel.items.length == 0) {
			this.refresh(true);
		}
		else {
			this.controller.modelChanged(this.listModel, this);
		}   
    // If there are list items, show the more button.
    if (this.listModel.items.length > 0) {
      this.controller.get("moreButton").show();
    }			    
  }
  catch (error) {
    Mojo.Log.error("TimelineAssistant::activate",  error);
  }
}


/////////////////////////////////////////////////////////////////////////////////////////
// 
/////////////////////////////////////////////////////////////////////////////////////////
TimelineAssistant.prototype.activateWindow = function(event) {
  try {
    if (Application.currentUser.friendsTimeline.length > 0) {
      this.listModel.items = Application.currentUser.friendsTimeline;
      this.controller.modelChanged(this.listModel, this);
      if (this.listModel.items.length > 0) {
        this.controller.get("moreButton").show();
      }
    }
  }
  catch (error) {
    Mojo.Log.logException(error, "TimelineAssistant::activateWindow");
  }
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
TimelineAssistant.prototype.refresh = function(showProgressMeter) {
	try {
		if (showProgressMeter || true) {
		  this.controller.get('scrim').show();
		  this.controller.get('spinner').mojo.start();			
		}
		Application.currentUser.loadFriendsTimeline(this.refreshSuccessHandler.bind(this), 
			this.refreshErrorHandler.bind(this));		
	}
	catch (error) {
		Mojo.Log.error("TimelineAssistant::refresh", error);
	}
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
TimelineAssistant.prototype.refreshSuccessHandler = function(items) {
  try {
    if (items && items.length > 0) {
      Application.advertise(items.length);	
      this.listModel.items = Application.currentUser.friendsTimeline;
      this.controller.modelChanged(this.listModel, this);
      this.controller.get("moreButton").show();		
    }  
  }
  catch (error) {
    Mojo.Log.logException(error, "TimelineAssistant::refreshSuccessHandler");
  }
  finally {
    this.controller.get('spinner').mojo.stop();
    this.controller.get('scrim').hide();  
    this.controller.get("timeline").mojo.revealItem(0);
  }
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
TimelineAssistant.prototype.refreshErrorHandler = function(error) {
  this.controller.get('spinner').mojo.stop();
	this.controller.get('scrim').hide();
	Mojo.Log.error("TimelineAssistant::refreshErrorHandler", error);	
  this.controller.showAlertDialog({
    title: $L("Invalid Server Response"),
    message: $L(error),
    choices: [{label:$L('Dismiss'), value:'dismiss', type:'secondary'}]
  });
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
TimelineAssistant.prototype.handleCommand = function(event) {
  try {    
    if (event.type == Mojo.Event.back) {
      // The back gesture returns to the account list. Clear the active profile.  
      Application.Settings.profile = ""; 
    }
    else if (event.type == Mojo.Event.command) {
      switch (event.command) {
        case 'actionCompose':      
          this.controller.stageController.pushScene("tweet");
          break;
        case 'actionRefresh':
					this.refresh(true);
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
TimelineAssistant.prototype.loadMore = function(event) {
  try {
    this.controller.get("moreButton").mojo.activate();
    var token = btoa(Application.currentUser.username + ":" + Application.currentUser.password); 
    var url = "http://twitter.com/statuses/friends_timeline.json";
    var parameters = { screen_name: Application.currentUser.username };
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
      }.bind(this)
    });
  }
  catch (error) {
    this.controller.get("moreButton").mojo.deactivate();
    Mojo.Log.logException(error, "TimelineAssistant::loadMore");
  }
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
TimelineAssistant.prototype.loadMoreSuccess = function(items) {
	try {
    this.controller.get("moreButton").mojo.deactivate();
    if (items) {      
      var offset = this.listModel.items.length;
      // If the user is pagenating, simply push the retrieved items onto the model.  The first item
      // is discarded.  It's always a duplicate, because the max_id parameter is used in an equal to
      // or less than less than fashion.
      items.shift();
      this.listModel.items = this.listModel.items.concat(items);
      this.controller.get("timeline").mojo.noticeAddedItems(offset, items);
    }
	}
	catch(error) {
		Mojo.Log.logException(error, "TimelineAssistant::loadMoreSuccess");
	}	
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
TimelineAssistant.prototype.onListTap = function(event) {
	try {
		var item = this.listModel.items[event.index];
		// If the item's id is null then we're dealing with an advertisement.  When the user
		// taps on an advertisement, don't show the status detail scene.  The item is one 
		// big hyperlink and the user will be taken to the specified url.
		if (item.id != null) {
			this.controller.stageController.pushScene("status", item);			
		}
	}
	catch (error) {
		Mojo.Log.logException(error, "TimelineAssistant::onListTap");
	}
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
TimelineAssistant.prototype.onViewChanged = function(event) {
  try {			
    // Push the selection scene.
    var selection = event.model.value;
    if (selection != "timeline") {
      this.controller.stageController.swapScene(selection);
    }
		// Reset the selector list's value.
		this.viewSelectorModel.value = "timeline";
		this.controller.modelChanged(this.viewSelectorModel, this);	       
  }
  catch(error) {
		Mojo.Log.logException(error, "TimelineAssistant::onViewChanged");
  }
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
TimelineAssistant.prototype.considerForNotification = function(params) {
	if (params && params.type == "currentUserUpdated") {
		this.listModel.items = Application.currentUser.friendsTimeline;
		this.controller.modelChanged(this.listModel, this);
    if (this.listModel.items.length > 0) {
      this.controller.get("moreButton").show();
    }
	}
}