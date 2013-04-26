function FavoritesAssistant(profile) {
  this.profile = profile;
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
FavoritesAssistant.prototype.setup = function() {  
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

		// Set the header title
		this.controller.get('headerText').innerHTML = this.profile.screen_name + "'s Favorites";

	  // Set up the "more" button.
	  this.controller.setupWidget("moreButton",
	    { type: Mojo.Widget.activityButton },
	    { buttonLabel: "More...", disabled: false }
	  );
	  this.controller.get("moreButton").hide();
    
    // Start listening for events.
    this.listTapHandler = this.onListTap.bindAsEventListener(this);
	  this.controller.listen('statusList', Mojo.Event.listTap, this.listTapHandler);
    this.moreButtonHandler = this.loadMore.bindAsEventListener(this);
	  this.controller.listen("moreButton", Mojo.Event.tap, this.moreButtonHandler);    
    
	}
	catch (error) {
		Mojo.Log.logException(error, "FavoritesAssistant::setup");
	}
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
FavoritesAssistant.prototype.cleanup = function(event) {  
	try {
    this.controller.stopListening("statusList", Mojo.Event.listTap, this.listTapHandler);
    this.controller.stopListening("moreButton", Mojo.Event.tap, this.moreButtonHandler);
	}
	catch (error) {
		Mojo.Log.logException(error, "FavoritesAssistant::cleanup");
	}
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
FavoritesAssistant.prototype.activate = function(event) {
  try {
		if (this.listModel.items.length == 0) {
      var token = btoa(Application.currentUser.username + ":" + Application.currentUser.password); 
      var url = "http://twitter.com/favorites.json"; 
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
    Mojo.Log.logException(error, "FavoritesAssistant::activate");
  }
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
FavoritesAssistant.prototype.resourceCreatedCallback = function() {
	this.controller.get('scrim').show();
  this.controller.get('spinner').mojo.start();
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
FavoritesAssistant.prototype.resourceRefreshCallback = function(items) {
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
    Mojo.Log.logException(error, "FavoritesAssistant::resourceRefreshCallback");
	}	
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
FavoritesAssistant.prototype.resourceErrorCallback = function(error) {
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
	catch (error) {
    Mojo.Log.logException(error, "FavoritesAssistant::resourceErrorCallback");
	}	
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
FavoritesAssistant.prototype.onListTap = function(event) {
	try {
			this.controller.stageController.pushScene("status", this.listModel.items[event.index]);
	}
	catch (error) {
    Mojo.Log.logException(error, "FavoritesAssistant::onListTap");

	}
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
FavoritesAssistant.prototype.loadMore = function(event) {
  try {
    this.controller.get("moreButton").mojo.activate();
    var token = btoa(Application.currentUser.username + ":" + Application.currentUser.password); 
    var url = "http://twitter.com/favorites.json";  
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
    Mojo.Log.logException(error, "FavoritesAssistant::loadMore");
  }
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
FavoritesAssistant.prototype.loadMoreSuccess = function(items) {
	try {
    this.controller.get("moreButton").mojo.deactivate();
    if (items) {      
      var offset = this.listModel.items.length;
      this.listModel.items = this.listModel.items.concat(items);
      this.controller.get("statusList").mojo.noticeAddedItems(offset, items);
    }
	}
	catch(error) {
    Mojo.Log.logException(error, "FavoritesAssistant::loadMoreSuccess");
	}	
}