function StatusListAssistant(profile) {
  this.profile = profile || Application.currentUser.profile;
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
StatusListAssistant.prototype.setup = function() {  
  try {
    // Set up the application menu.
    this.controller.setupWidget(Mojo.Menu.appMenu, Application.Menu.attributes, Application.Menu.model);
      
    // Set up the status list widget.
    this.controller.setupWidget("statusList",
      this.listAttributes = {
        listTemplate: "shared/status-list-template",
        itemTemplate: "shared/status-row-template",
        formatters: { created_at: Formatters.datetimeFormatter },
        swipeToDelete: false,
        renderLimit: 200,
        reorderable: false
      },
      this.listModel = {items:[]}
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
  catch (error) {
    Mojo.Log.logException(error, "StatusListAssistant::setup");
  }
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
StatusListAssistant.prototype.cleanup = function(event) {
  try {
    this.controller.stopListening("statusList", Mojo.Event.listTap, this.listTapHandler);
    this.controller.stopListening("moreButton", Mojo.Event.tap, this.moreButtonHandler);
  }
  catch (error) {
    Mojo.Log.logException(error, "StatusListAssistant::cleanup");
  }
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
StatusListAssistant.prototype.activate = function(event) {
  try {
		if (this.listModel.items.length == 0) {
      Mojo.Log.info("StatusListAssistant::activate requesting user timeline for", this.profile.screen_name);
      var token = btoa(Application.currentUser.username + ":" + Application.currentUser.password); 
      var url = "http://twitter.com/statuses/user_timeline.json";  
      this.resource = new Twitter.Resource(url, {
        method: "get",
        cache: Twitter.Cache.session,
        parameters: { screen_name: this.profile.screen_name },
        requestHeaders: ["Authorization", "Basic " + token],
				onCreate: this.resourceCreatedCallback.bind(this),
        onSuccess: this.resourceRefreshCallback.bind(this),
        onFailure: this.resourceErrorCallback.bind(this)
      });
		}
  }
  catch (error) {
    this.controller.get('spinner').mojo.stop();
		this.controller.get('scrim').hide();  
    Mojo.Log.logException(error, "StatusListAssistant::activate");
  }
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
StatusListAssistant.prototype.resourceCreatedCallback = function() {
	this.controller.get('scrim').show();
  this.controller.get('spinner').mojo.start();
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
StatusListAssistant.prototype.resourceRefreshCallback = function(items) {
	try {  
    this.controller.get('spinner').mojo.stop();
		this.controller.get('scrim').hide();  
    if (items) {
      if (Object.toJSON(items) == {}) {
        Mojo.Log.info("StatusListAssistant::resourceRefreshCallback received empty response.");
      }
      else {
        this.listModel.items = items;
        this.controller.modelChanged(this.listModel, this);
        if (this.listModel.items.length > 0) {
          this.controller.get("moreButton").show();
        }
      }
    }
	}
	catch(error) {
    Mojo.Log.logException(error, "StatusListAssistant::resourceRefreshCallback");
	}	
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
StatusListAssistant.prototype.resourceErrorCallback = function(error) {
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
    Mojo.Log.logException(error, "StatusListAssistant::resourceErrorCallback");
	}	
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
StatusListAssistant.prototype.onListTap = function(event) {
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
StatusListAssistant.prototype.loadMore = function(event) {
  try {
    this.controller.get("moreButton").mojo.activate();
    var token = btoa(Application.currentUser.username + ":" + Application.currentUser.password); 
    var url = "http://twitter.com/statuses/user_timeline.json";
		var parameters = { screen_name: this.profile.screen_name };
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
      onSuccess: this.loadMoreCallback.bind(this),
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
    Mojo.Log.logException(error, "StatusListAssistant::loadMore");
  }
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
StatusListAssistant.prototype.loadMoreCallback = function(items) {
	try {
    this.controller.get("moreButton").mojo.deactivate();
    if (items) {      
      var offset = this.listModel.items.length;
      items.shift(); // The first item is discarded, becauce it's always a duplicate.
      this.listModel.items = this.listModel.items.concat(items);
      this.controller.get("statusList").mojo.noticeAddedItems(offset, items);
    }
	}
	catch(error) {
    Mojo.Log.logException(error, "StatusListAssistant::loadMoreCallback");
	}	
}