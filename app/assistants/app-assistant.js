Application = { };
// Settings are saved across application launches.
Application.Settings = { };
// The session is not saved across application launches.
Application.Session = { };
// Stores the attributes and model of the application menu.
Application.Menu = { };
// Available data caching options.
Application.Cache = { none: -1, session: 0, persistent: 1 };
// Set to null in order to disable advertising.
Application.advertisement = null;
Application.advertise = function(n) {	
	try {
    // A limit of zero means that advertising has been turned off at the service level.
    if (Application.advertisement.limit == 0)
      return;
    if (Application.advertisement && Application.currentUser) {
      Application.advertisement.counter += n;			
      if (Application.advertisement.counter >= Application.advertisement.limit) {
        if (Application.advertisement.item) {
          Application.currentUser.friendsTimeline.unshift(Application.advertisement.item);
        }
        Application.advertisement.next();
      }			
    }	
	}
	catch (error) {
		Mojo.Log.logException(error, "Application::advertise")
	}	
}

/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
Application.setWakeupRequest = function() { 
  try {
    var interval = Application.Settings.interval || "00:00:00";
    if(interval != "00:00:00") {
      this.wakeupRequest = 
        new Mojo.Service.Request("palm://com.palm.power/timeout", { 
          method: "set", 
          parameters: { 
              "key": "com.tinytwitter.app.update",
              "in": interval, 
              "wakeup": Application.Settings.wakeupDevice || false, 
              "uri": "palm://com.palm.applicationManager/open", 
              "params": { 
                  "id": "com.tinytwitter.app", 
                  "params": {"action": "update"} 
              } 
          }, 
          onSuccess:  function(response){ 
            Mojo.Log.info("Application::setWakeupRequest alarm set successfully", response.returnValue); 
            Application.wakeupTaskId = Object.toJSON(response.taskId); 
          }, 
          onFailure:  function(response){ 
              Mojo.Log.error("Application::setWakeupRequest alarm could not be set", response.returnValue, response.errorText); 
          } 
      });    
    }
  }
  catch (error) {
    Mojo.Log.logException(error, "Application::setWakeupRequest");
  }
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
Application.clearWakeupRequest = function() { 
  try {
    new Mojo.Service.Request('palm://com.palm.power/timeout', {
      method: "clear",
      parameters: { "key": "com.tinytwitter.app.update"},
      onSuccess:  function(response){ 
        Mojo.Log.info("Application::clearWakeupRequest alarm cleared successfully", response.returnValue); 
      }, 
      onFailure:  function(response){ 
          Mojo.Log.error("Application::clearWakeupRequest alarm could not be cleared", response.returnValue, response.errorText); 
      } 
    });
  }
  catch (error) {
    Mojo.Log.logException(error, "AppAssistant::clearWakeupRequest");
  }
}




/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
function AppAssistant(appController) {

}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
AppAssistant.prototype.setup = function() {
  // Clear the session cache by connecting to it with the "replace" parameter set to true.
  new Mojo.Depot({ name: "TinyTwitterSession", replace: true }, null, null);
  
	// Load the profile preferences from the cookie.
	var cookie = new Mojo.Model.Cookie("TinyTwitterPrefs");
 	Application.Settings = cookie.get() || { };	

	// Set up the application menu.	
	Application.Menu.attributes = { omitDefaultItems: true };
	Application.Menu.model = { 
		visible: true,
		items: [
			Mojo.Menu.editItem,
			{ label: 'My Profile', command: 'actionProfile'},			
			{ label: Mojo.Menu.prefsItem.label, command: Mojo.Menu.prefsItem.command },
			{ label: Mojo.Menu.helpItem.label, command: Mojo.Menu.helpItem.command }
		]
	};
}

/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
AppAssistant.prototype.cleanup = function(event) {
	var cookie = new Mojo.Model.Cookie("TinyTwitterPrefs");
	cookie.put(Application.Settings || { });	
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
AppAssistant.prototype.handleLaunch = function(params) {
	try {
		Mojo.Log.info("AppAssistant::handleLaunch");
	  var mainStageController = this.controller.getStageController('TinyTwitterMain');
	  var createStageCallback = function(stageController) {
	    stageController.pushScene('account');
			Mojo.Event.listen(stageController.document, Mojo.Event.stageActivate, function() {
				Application.isActive = true;
			});
			Mojo.Event.listen(stageController.document, Mojo.Event.stageDeactivate, function() {
				Application.isActive = false;
			});		
			// Mark the application as active.
			Application.isActive = true;   
			// Set up the advertising service.
			Application.advertisement = new Advertisement(20);
			// Set the initial wakeup request.
	    Application.setWakeupRequest();
	  };  

	  if(!params) {    
			Mojo.Log.info("Initial application launch");	
	    // If the stage already exists, bring it to the foreground.    
	    if (mainStageController) {
	      mainStageController.activate();
	    }
	    else {
	      // Otherwise, create a new stage.
	      this.controller.createStageWithCallback(
	        { name: 'TinyTwitterMain', lightweight:true },
	        createStageCallback.bind(this), 'card'
	      );      
	    }
	  }
	  else {
			Mojo.Log.info("Responding to a wakeup timeout");
	    switch(params.action) {    
				case 'update':
	        Mojo.Log.info("AppAssistant::handleLaunch called with update action.");
					if (Application.currentUser) {
						Application.currentUser.loadFriendsTimeline(
							this.updateSuccessHandler.bind(this), 
							this.updateErrorHandler.bind(this));
					}
					// Reset the wakeup request as long as the main stage is still open.
	        if (mainStageController) {
	          Application.setWakeupRequest();
	        }
	        else {
	          Application.clearWakeupRequest();
	        }
					break;
	      case 'notification':
	        Mojo.Log.info("AppAssistant::handleLaunch called with notification action.");
	        if (mainStageController) {
	          mainStageController.popScenesTo('timeline');
	          mainStageController.activate();        
	        }
	        else {
	          this.controller.createStageWithCallback(
	            { name: 'TinyTwitterMain', lightweight: true },
	            mainStageCreated.bind(this), 'card');              
	        }
	        break;
	    }
	  }	
	}	
	catch (error) {
		Mojo.Log.logException(error, "AppAssistant::handleLaunch");
	}
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
AppAssistant.prototype.updateSuccessHandler = function(items) {  
	try {  
		Mojo.Log.info("AppAssistant::updateSuccessHandler");
  	if (items && items.length > 0) { 
			Mojo.Log.info("Received", items.length, "items");
			Application.advertise(items.length);
		  if (Application.isActive) {
		    this.controller.sendToNotificationChain({type: "currentUserUpdated"});	
		  }
		  else {
        this.showNotification(items[0].user.name, items[0].text, items.length);
		  }	
 		}    
	}
	catch (error) {
	  Mojo.Log.logException(error, "AppAssistant::updateSuccessHandler");
	}
}

/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
AppAssistant.prototype.showNotification = function(title, message, count) {
  try {
    var category = "TinyTwitterNotification";
    this.controller.showBanner({messageText: message, soundClass: "alerts"}, {action: 'notification'}, category);

    var dashboardStageController = this.controller.getStageProxy("TinyTwitterDashboard");
    if (dashboardStageController) {
      dashboardStageController.delegateToSceneAssistant("showNotification", title, message, count);
    }
    else {
      var dashboardCallback = function(stageController) {
        stageController.pushScene("dashboard", title, message, count);
      };

      this.controller.createStageWithCallback({name: "TinyTwitterDashboard", lightweight: true}, 
        dashboardCallback, "dashboard");				
    }	
  }
  catch (error) {
    Mojo.Log.logException(error, "AppAssistant::updateSuccessHandler");  
  }
}



/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
AppAssistant.prototype.updateErrorHandler = function(error) {
	this.controller.showBanner({ messageText: error }, { }, 'TinyTwitterUpdate');	
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
AppAssistant.prototype.handleCommand = function(event) {
  var stageController = this.controller.getActiveStageController();
	var scene = stageController.activeScene();
	
	if (event.type == Mojo.Event.command) {
		switch(event.command) {
			case Mojo.Menu.prefsItem.command:
				stageController.pushScene("preferences");
				break;
			case Mojo.Menu.helpItem.command:
				stageController.pushScene('support');
				break;
			case 'actionProfile':
				stageController.pushScene('profile', Application.currentUser.profile);
				break;
		}
	}	
}