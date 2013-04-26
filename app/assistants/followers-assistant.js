function FollowersAssistant(profile) {
	this.profile = profile;
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
FollowersAssistant.prototype.setup = function() {
  try {
    // Set up the application menu.
    this.controller.setupWidget(Mojo.Menu.appMenu, Application.Menu.attributes, Application.Menu.model);
      
    // Set up the list widget.
    this.controller.setupWidget("followersList",
      this.listAttributes = {
        listTemplate: "shared/user-list-template",
        itemTemplate: "shared/user-row-template",
        formatters: { location: this.locationFormatter, statuses_count: this.statusesCountFormatter },
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
    this.controller.listen('followersList', Mojo.Event.listTap, this.listTapHandler);
    this.moreButtonHandler = this.loadMore.bindAsEventListener(this);
    this.controller.listen("moreButton", Mojo.Event.tap, this.moreButtonHandler);
  }
	catch (error) {
		Mojo.Log.logException(error, "FollowersAssistant::setup");
	}
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
FollowersAssistant.prototype.cleanup = function(event) {  
	try {
    this.controller.stopListening("followersList", Mojo.Event.listTap, this.listTapHandler);
    this.controller.stopListening("moreButton", Mojo.Event.tap, this.moreButtonHandler);
	}
	catch (error) {
		Mojo.Log.logException(error, "FollowersAssistant::cleanup");
	}
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
FollowersAssistant.prototype.activate = function(event) {
  try {
		if (this.listModel.items.length == 0) {
      var token = btoa(Application.currentUser.username + ":" + Application.currentUser.password); 
      var url = "http://twitter.com/statuses/followers.json"; 
      this.currentPage = 1;
      this.resource = new Twitter.Resource(url, {
        method: "get",
        cache: Twitter.Cache.session,
        parameters: { screen_name: this.profile.screen_name, page: 1 },
        requestHeaders: ["Authorization", "Basic " + token],
				onCreate: this.resourceCreatedCallback.bind(this),
        onSuccess: this.resourceRefreshCallback.bind(this),
        onFailure: this.resourceErrorCallback.bind(this)
      });	
		}
  }
  catch (error) {
    Mojo.Log.logException(error, "FollowersAssistant::activate");
  }
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
FollowersAssistant.prototype.resourceCreatedCallback = function() {
	this.controller.get('scrim').show();
  this.controller.get('spinner').mojo.start();
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
FollowersAssistant.prototype.resourceRefreshCallback = function(items) {
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
    Mojo.Log.error("FollowersAssistant::resourceRefreshCallback",  error);
	}	
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
FollowersAssistant.prototype.resourceErrorCallback = function(error) {
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
    Mojo.Log.logException(error, "FollowersAssistant::resourceErrorCallback");
	}	
}

/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
FollowersAssistant.prototype.onListTap = function(event) {
	try {
			this.controller.stageController.pushScene("profile", this.listModel.items[event.index]);
	}
	catch (error) {
    Mojo.Log.error("FollowersAssistant::onListTap", error);
	}
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
FollowersAssistant.prototype.locationFormatter = function(value, item) {
  return (value ? value : "Location: unknown");
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
FollowersAssistant.prototype.statusesCountFormatter = function(value, item) {
  var formattedValue;  
  try {
    var count = value || 0;
    formattedValue = (count == 1 ? "1 update" : count + " updates");
  }
  catch (error) {
    formattedValue = "0 updates";
  }  
  return formattedValue;
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
FollowersAssistant.prototype.loadMore = function(event) {
  try {
    this.controller.get("moreButton").mojo.activate();
    var token = btoa(Application.currentUser.username + ":" + Application.currentUser.password); 
    var url = "http://twitter.com/statuses/followers.json";  
    this.resource = new Twitter.Resource(url, {
      method: "get",
      cache: Twitter.Cache.none,
      parameters: { screen_name: this.profile.screen_name, page: ++this.currentPage },
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
    Mojo.Log.logException(error, "FollowersAssistant::loadMore");
  }
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
FollowersAssistant.prototype.loadMoreSuccess = function(items) {
	try {
    this.controller.get("moreButton").mojo.deactivate();
    if (items) {      
      items.shift(); // The first item is discarded, because it's always a duplicate.
      var offset = this.listModel.items.length;
      this.listModel.items = this.listModel.items.concat(items);
      this.controller.get("followersList").mojo.noticeAddedItems(offset, items);
    }
	}
	catch(error) {
    Mojo.Log.logException(error, "FollowersAssistant::loadMoreSuccess");
	}	
}
