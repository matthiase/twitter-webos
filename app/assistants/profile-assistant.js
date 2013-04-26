function ProfileAssistant(object) {
  this.profile = object || { };
  if (!this.profile.screen_name) {
    // If no screen name was provided, use the user's own profile.
    this.profile.screen_name = Application.currentUser.username;
  }
  this.relationship = null;
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
ProfileAssistant.prototype.setup = function() {
  try {
    // Set up the application menu.
    this.controller.setupWidget(Mojo.Menu.appMenu, Application.Menu.attributes, Application.Menu.model);

    this.controller.get('userName').innerHTML = "";
    this.controller.get('profileImage').style.background = "none";
    this.controller.get('location').innerHTML = "";
    this.controller.get('description').innerHTML = "";      

    this.controller.setupWidget("profileList", {
        itemTemplate: "profile/action-row-template",
        listTemplate: "profile/action-list-template",
        swipeToDelete: false,
        reorderable: false 
      },
      this.actionListModel = { 
        items: [
          { label: $L("Followers"), command: "actionFollowers" },
          { label: $L("Following"), command: "actionFollowing" },
          { label: $L("Tweets") , command: "actionTweets" },
          { label: $L("Favorites") , command: "actionFavorites"}
        ]
      }
     );

    // Set up the main spinner.
    this.controller.setupWidget("spinner", { spinnerSize: 'large' }, this.spinnerModel = { spinning: false } );     
    
    // Set up the inline following and blocking progress spinners.
    this.controller.setupWidget("followingSpinner", { }, this.followingSpinnerModel = { spinning: false } );
    this.controller.setupWidget("blockingSpinner", { }, this.blockingSpinnerModel = { spinning: false } );         
    
		// Don't display these items if the user is looking at their own profile.
    var screen_name = this.profile.screen_name || Application.currentUser.username;
    if (screen_name != Application.currentUser.username) {
	    // Set up the command menu.
	    var actionContact = { icon: 'conversation', submenu: 'contactSubmenu'};
	    this.commandMenuModel = {
	      visible: (screen_name != Application.currentUser.username),
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
	        {label: $L("Public Reply"), command: "actionPublicMessage"}, 
	        {label: $L("Direct Message"), command: "actionDirectMessage"}] 
	      }
	    );	
	
			// Set up the following toggle widget.
			// The user.following property has been deprecated.  That's alright though,
			// I'm checking the value of the friendships/show response once the request
			// completes.  See loadRelationshipSuccess.
			this.controller.setupWidget('followingToggle', 
				{ trueLabel: $L("Yes"), falseLabel: $L("No") }, 
		    this.followingModel = {
		      value: this.profile.following || false
		    }
		  );
	
			// Set up the blocking toggle widget.
			this.controller.setupWidget('blockingToggle', 
				{ trueLabel: $L("Yes"), falseLabel: $L("No") }, 
		    this.blockingModel = {
		      value: false
		    }
		  );	
			this.controller.get('profileActions').show();
    }
		else {
			this.controller.get('profileActions').hide();	
		}
    
    // Start listening to events.
    this.listTapHandler = this.onListTap.bindAsEventListener(this);
    this.controller.listen("profileList", Mojo.Event.listTap, this.listTapHandler);
    if (screen_name != Application.currentUser.username) {
      this.followingChangedHandler = this.followingValueChanged.bind(this);
      this.controller.listen('followingToggle', Mojo.Event.propertyChange, this.followingChangedHandler);
      this.blockingChangedHandler = this.blockingValueChanged.bind(this);
      this.controller.listen('blockingToggle', Mojo.Event.propertyChange, this.blockingChangedHandler);    
    }    
  }
  catch (error) {
    Mojo.Log.error("ProfileAssistant::setup", error);  
  }
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
ProfileAssistant.prototype.cleanup = function(event) {
  try {
    this.controller.stopListening("profileList", Mojo.Event.listTap, this.listTapHandler);
    if (this.followingChangedHandler) {
      this.controller.stopListening("followingToggle", Mojo.Event.propertyChange, this.followingChangedHandler);
    }
    if (this.blockingChangedHandler) {
      this.controller.stopListening("blockingToggle", Mojo.Event.propertyChange, this.blockingChangedHandler);
    }
  }
  catch (error) {
    Mojo.Log.logException(error, "ProfileAssistant::cleanup");
  }
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
ProfileAssistant.prototype.activate = function(event) {
  try {       
    if (this.profile.id) {    
      if (this.profile.screen_name !== Application.currentUser.username) {
        if (!this.relationship) {
          this.loadRelationship();
        }   
        else {
          this.show();
        }
      }    
      else {    
        this.show();
      }
    }
    else {
      // Profile data needs to be loaded.
      var token = btoa(Application.currentUser.username + ":" + Application.currentUser.password); 
      var url = "http://twitter.com/users/show.json";  
      this.resource = new Twitter.Resource(url, {
        method: "get",
        cache: Twitter.Cache.session,
        parameters: { screen_name: this.profile.screen_name },
        requestHeaders: ["Authorization", "Basic " + token],
				onCreate: this.resourceCreatedCallback.bind(this),
        onSuccess: this.resourceSuccessCallback.bind(this),
        onFailure: this.resourceErrorCallback.bind(this)
      });
    }
    
  }
  catch (error) {
    this.controller.get('spinner').mojo.stop();
    this.controller.get('scrim').hide();
    Mojo.Log.error("ProfileAssistant::activate", error);
  }
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
ProfileAssistant.prototype.resourceCreatedCallback = function() {
	this.controller.get('scrim').show();
  this.controller.get('spinner').mojo.start();
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
ProfileAssistant.prototype.resourceSuccessCallback = function(data) {
  try {
    this.profile = data;
    if (this.profile.screen_name === Application.currentUser.username) {
      this.controller.get('spinner').mojo.stop();
      this.controller.get('scrim').hide();    
      this.show();
    }
    else {
      if (!this.relationship) {
        this.loadRelationship();
      }
    }
  }
  catch (error) {
    Mojo.Log.logException(error, "ProfileAssistant::resourceSuccessCallback");
  }
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
ProfileAssistant.prototype.resourceErrorCallback = function(error) { 
  this.controller.get('spinner').mojo.stop();
  this.controller.get('scrim').hide();
  Mojo.Log.error("ProfileAssistant::resourceErrorCallback", error);	
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
ProfileAssistant.prototype.loadRelationship = function() {
  try {
    this.controller.get('scrim').show();
    this.controller.get('spinner').mojo.start();  
    var authToken = btoa(Application.currentUser.username + ":" + Application.currentUser.password);
    new Ajax.Request("http://twitter.com/friendships/show.json", {
      method: 'get',
			requestHeaders: ["Authorization", "Basic " + authToken],
      parameters: {target_screen_name: this.profile.screen_name},
      onSuccess: this.loadRelationshipSuccess.bind(this),
      onFailure: this.loadRelationshipError.bind(this)
    });
  }
  catch (error) {
    Mojo.Log.logException(error, "ProfileAssistant::loadRelationship");
  }
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
ProfileAssistant.prototype.loadRelationshipSuccess = function(response) {
  try {
    this.controller.get('spinner').mojo.stop();
    this.controller.get('scrim').hide();  
    var data = response.responseJSON;
    if (data && Object.toJSON(data) != {}) {
      this.relationship = data.relationship;
			this.followingModel.value = this.relationship.source.following;
			this.controller.modelChanged(this.followingModel, this);
			this.blockingModel.value = this.relationship.source.blocking;
			this.controller.modelChanged(this.blockingModel, this);
      this.show();
    }
  }
  catch (error) {
    Mojo.Log.logException(error, "ProfileAssistant::loadRelationshipSuccess");
  }
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
ProfileAssistant.prototype.loadRelationshipError = function(response) { 
  this.controller.get('spinner').mojo.stop();
  this.controller.get('scrim').hide();   
  var template = new Template("Status = #{status}");
  Mojo.Log.error("ProfileAssistant::loadRelationshipError", "Request failed:", template.evaluate(response));	
}



/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
ProfileAssistant.prototype.show = function() {
  try {
    this.controller.get('userName').innerHTML = this.profile.name || "";
    this.controller.get('profileImage').style.background = "url(" + this.profile.profile_image_url + ") no-repeat";
    this.controller.get('location').innerHTML = this.profile.location;
    this.controller.get('description').innerHTML = this.profile.description;  
    

    this.actionListModel.items = [
	  	{ 
				label: new Template($L({key: "following.count", value: "Following:  ( #{count} )"})).evaluate({count: this.profile.friends_count}),
				command: "actionFollowing" 
			},
      { 
				label: new Template($L({key: "followers.count", value: "Followers:  ( #{count} )"})).evaluate({count: this.profile.followers_count}),
				command: "actionFollowers" 
			},
      { 
				label: new Template($L({key: "tweet.count", value: "Following:  ( #{count} )"})).evaluate({count: this.profile.statuses_count}),
				command: "actionTweets" 
			},
      { 
				label: new Template($L({key: "favorites.count", value: "Favorites:  ( #{count} )"})).evaluate({count: this.profile.favourites_count}),	
				command: "actionFavorites"
			}
    ];
    this.controller.modelChanged(this.actionListModel, this);
    
  }
  catch (error) {
    Mojo.Log.logException(error, "ProfileAssistant::show");
  }
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
ProfileAssistant.prototype.onListTap = function(event) {
	try {	   
    switch(event.item.command) {
      case "actionTweets":
        this.controller.stageController.pushScene("status-list", this.profile);
        break; 
      case "actionFavorites":
        this.controller.stageController.pushScene("favorites", this.profile);
        break;      
      case "actionFollowers":
        this.controller.stageController.pushScene("followers", this.profile);
        break;
      case "actionFollowing":
        this.controller.stageController.pushScene("friends", this.profile);
        break;        
    }
	}
	catch (error) {
		Mojo.Log.logException(error, "ProfileAssistant::onListTap");
	}
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
ProfileAssistant.prototype.handleCommand = function(event) {
  try {    
    if (event.type == Mojo.Event.command) {
      switch (event.command) {
        case "actionPublicMessage":
          this.controller.stageController.pushScene("tweet", "@" + this.profile.screen_name + " ");
          break;
        case "actionDirectMessage":
          this.controller.stageController.pushScene("new-message", this.profile.screen_name);
          break;
      }
    }
  }
  catch(error) {
    Mojo.Log.logException(error, "ProfileAssistant::handleCommand");
  }    
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
ProfileAssistant.prototype.followingValueChanged = function(event) {
  try {
		if (event.model.value) {
      this.followingSpinnerModel.spinning = true;
      this.controller.modelChanged(this.followingSpinnerModel, this);
	    Application.currentUser.follow(this.profile.screen_name, 
	      this.followSuccessHandler.bind(this), this.followErrorHandler.bind(this));			
		}
		else {
	    this.controller.showAlertDialog({
        onChoose: this.stopFollowingDialogCallback.bind(this),
        title: $L("Stop Following User"),
        message: $L("Are you sure you want to stop following @" + this.profile.screen_name + "?"),
        choices:[
         {label:$L("Continue"), value:"yes", type:'affirmative'},  
         {label:$L("Cancel"), value:"no", type:'dismiss'}    
        ]
	    });			
		}
  }
  catch (error) {
    this.followingSpinnerModel.spinning = false;
    this.controller.modelChanged(this.followingSpinnerModel, this);
    Mojo.Log.logException(error, "ProfileAssistant::followingValueChanged");
  }	
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
ProfileAssistant.prototype.stopFollowingDialogCallback = function(value) {
	try {
		if (value == "yes") {
      this.followingSpinnerModel.spinning = true;
      this.controller.modelChanged(this.followingSpinnerModel, this);
      Application.currentUser.stopFollowing(this.profile.screen_name, 
        this.stopFollowingSuccessHandler.bind(this), this.stopFollowingErrorHandler.bind(this));							
		}		
    else {
      this.followingModel.value = this.relationship.source.following;
      this.controller.modelChanged(this.followingModel, this); 
    }
	}
	catch (error) { 
    this.followingSpinnerModel.spinning = false;
    this.controller.modelChanged(this.followingSpinnerModel, this);
		Mojo.Log.logException(error, "ProfileAssistant::stopFollowingDialogCallback");
	}
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
ProfileAssistant.prototype.followSuccessHandler = function(response) {
	try {
    this.followingSpinnerModel.spinning = false;
    this.controller.modelChanged(this.followingSpinnerModel, this);  
		this.relationship.source.following = true;
	}
 	catch (error) {
		Mojo.Log.logException(error, "ProfileAssistant::followSuccessHandler");
	}
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
ProfileAssistant.prototype.followErrorHandler = function(response) {
	try {
    this.followingSpinnerModel.spinning = false;
    this.controller.modelChanged(this.followingSpinnerModel, this);  
    var template = new Template("Status = #{status}");
    Mojo.Log.error("User:followErrorHandler", "Request failed: " + template.evaluate(response));
		this.followingModel.value = this.relationship.source.following;
		this.controller.modelChanged(this.followingModel, this);
	}
 	catch (error) {
		Mojo.Log.logException(error, "ProfileAssistant::followErrorHandler");
	}
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
ProfileAssistant.prototype.stopFollowingSuccessHandler = function(response) {
	try {
    this.followingSpinnerModel.spinning = false;
    this.controller.modelChanged(this.followingSpinnerModel, this);  
		this.relationship.source.following = false;
	}
 	catch (error) {
		Mojo.Log.logException(error, "ProfileAssistant::stopFollowingSuccessHandler");
	}
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
ProfileAssistant.prototype.stopFollowingErrorHandler = function(response) {
	try {
    this.followingSpinnerModel.spinning = false;
    this.controller.modelChanged(this.followingSpinnerModel, this);  
    var template = new Template("Status = #{status}");
    Mojo.Log.error("User:stopFollowingErrorHandler", "Request failed: " + template.evaluate(response));
		this.followingModel.value = this.relationship.source.following;
		this.controller.modelChanged(this.followingModel, this);
	}
 	catch (error) {
		Mojo.Log.logException(error, "ProfileAssistant::stopFollowingErrorHandler");
	}
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
ProfileAssistant.prototype.blockingValueChanged = function(event) {
  try {
		if (event.model.value) {
	    this.controller.showAlertDialog({
        onChoose: this.blockDialogCallback.bind(this),
        title: $L("Block User"),
        message: $L("Are you sure you want to block @" + this.profile.screen_name + "?"),
        choices:[
         {label:$L("Continue"), value:"yes", type:'affirmative'},  
         {label:$L("Cancel"), value:"no", type:'dismiss'}    
        ]
	    });
		}
		else {
      this.blockingSpinnerModel.spinning = true;
      this.controller.modelChanged(this.blockingSpinnerModel, this);
      Application.currentUser.unblock(this.profile.screen_name, 
        this.unblockSuccessHandler.bind(this), this.unblockErrorHandler.bind(this) );
		}
  }
  catch (error) {
    this.blockingSpinnerModel.spinning = false;
    this.controller.modelChanged(this.blockingSpinnerModel, this);  
    Mojo.Log.logException(error, "ProfileAssistant::blockingValueChanged");
  }	
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
ProfileAssistant.prototype.blockDialogCallback = function(value) {
	try {
		if (value == "yes") {
      this.blockingSpinnerModel.spinning = true;
      this.controller.modelChanged(this.blockingSpinnerModel, this);
      Application.currentUser.block(this.profile.screen_name, 
        this.blockSuccessHandler.bind(this), this.blockErrorHandler.bind(this) );							
		}		
    else {
      this.blockingModel.value = this.relationship.source.blocking;
      this.controller.modelChanged(this.blockingModel, this);
    }
	}
	catch (error) {    
    this.blockingSpinnerModel.spinning = false;
    this.controller.modelChanged(this.blockingSpinnerModel, this);
		Mojo.Log.logException(error, "ProfileAssistant::blockDialogCallback");
	}
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
ProfileAssistant.prototype.blockSuccessHandler = function(response) { 
	try {
    this.blockingSpinnerModel.spinning = false;
    this.controller.modelChanged(this.blockingSpinnerModel, this);
		this.relationship.source.blocking = true;
	}
 	catch (error) {
		Mojo.Log.logException(error, "ProfileAssistant::blockSuccessHandler");
	}
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
ProfileAssistant.prototype.blockErrorHandler = function(response) { 
	try {
    this.blockingSpinnerModel.spinning = false;
    this.controller.modelChanged(this.blockingSpinnerModel, this);
    var template = new Template("Status = #{status}");
    Mojo.Log.error("User:blockErrorHandler", "Request failed: " + template.evaluate(response));
		this.blockingModel.value = this.relationship.source.blocking;
		this.controller.modelChanged(this.blockingModel, this);
	}
 	catch (error) {
		Mojo.Log.logException(error, "ProfileAssistant::blockErrorHandler");
	}
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
ProfileAssistant.prototype.unblockSuccessHandler = function(response) { 
	try {
    this.blockingSpinnerModel.spinning = false;
    this.controller.modelChanged(this.blockingSpinnerModel, this);  
		this.relationship.source.blocking = false;
	}
 	catch (error) {
		Mojo.Log.logException(error, "ProfileAssistant::unblockSuccessHandler");
	}
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
ProfileAssistant.prototype.unblockErrorHandler = function(response) { 
	try {  
    this.blockingSpinnerModel.spinning = false;
    this.controller.modelChanged(this.blockingSpinnerModel, this);
    var template = new Template("Status = #{status}");
    Mojo.Log.error("User:unblockErrorHandler", "Request failed: " + template.evaluate(response));
		this.blockingModel.value = this.relationship.source.blocking;
		this.controller.modelChanged(this.blockingModel, this);
	}
 	catch (error) {
		Mojo.Log.logException(error, "ProfileAssistant::unblockErrorHandler");
	}
}
