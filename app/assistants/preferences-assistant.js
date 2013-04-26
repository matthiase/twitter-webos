function PreferencesAssistant() {

}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
PreferencesAssistant.prototype.setup = function() {
	// Set up the application menu.
	this.controller.setupWidget(Mojo.Menu.appMenu, Application.Menu.attributes, Application.Menu.model);
		
	// Set up the interval selection list
	this.controller.setupWidget("intervalSelector", {
		label: "Interval",
		choices: [
			{ label: "Never", value: "00:00:00" },
			{ label: "5 minutes", value: "00:05:00" },
			{ label: "15 minutes", value: "00:15:00" },
			{ label: "1 hour", value: "01:00:00"},
			{ label: "3 hours", value: "03:00:00"}
		]},
		this.intervalModel = {
			value: Application.Settings.interval || "00:00:00"
		}
	);
  
  // Set up the wakeup device toggle button.
  this.controller.setupWidget("wakeupDeviceToggle", 
    this.wakeupAttributes = {
      trueLabel: "Yes",
      falseLabel: "No"
    }, 
    this.wakeupModel = {
      value: Application.Settings.wakeupDevice || false
    }
  );
  
	// Set up the interval selection list
	this.controller.setupWidget("expiresAfterSelector", {
		label: "Expires After",
		choices: [
			{ label: "3 minutes", value: 180000 },
			{ label: "5 minutes", value: 300000 },
			{ label: "15 minutes", value: 900000 }
		]},
		this.expiresAfterModel = {
			value: Application.Settings.cacheExpiresAfter || 300000
		}
	);
  
  // Set up clear cache button
  this.controller.setupWidget("clearCacheButton", { }, { buttonLabel: "Clear" });
  
  // Start listening for events.
  this.intervalChangedHandler = this.intervalChanged.bind(this);
  this.controller.listen('intervalSelector', Mojo.Event.propertyChange, this.intervalChangedHandler);
  this.wakeupChangedHandler = this.wakeupChanged.bind(this);
  this.controller.listen('wakeupDeviceToggle', Mojo.Event.propertyChange, this.wakeupChangedHandler);
  this.expiresAfterChangedHandler = this.expiresAfterChanged.bind(this);
  this.controller.listen('expiresAfterSelector', Mojo.Event.propertyChange, this.expiresAfterChangedHandler);  
  this.clearButtonHandler = this.clearCache.bindAsEventListener(this);
  this.controller.listen('clearCacheButton', Mojo.Event.tap, this.clearButtonHandler);
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
PreferencesAssistant.prototype.cleanup = function(event) {
  try {
    this.controller.stopListening("intervalSelector", Mojo.Event.propertyChange, this.intervalChangedHandler);
    this.controller.stopListening("wakeupDeviceToggle", Mojo.Event.propertyChange, this.wakeupChangedHandler);
    this.controller.stopListening("expiresAfterSelector", Mojo.Event.propertyChange, this.expiresAfterChangedHandler);
    this.controller.stopListening("clearCacheButton", Mojo.Event.tap, this.clearButtonHandler);
  }
  catch (error) {
    Mojo.Log.logException(error, "PreferencesAssistant::cleanup");
  }
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
PreferencesAssistant.prototype.activate = function(event) {

}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
PreferencesAssistant.prototype.deactivate = function(event) {

}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
PreferencesAssistant.prototype.intervalChanged = function(event) {
  try {
    var interval = this.intervalModel.value || "00:00:00";
    Application.Settings.interval = interval;
    if (interval == "00:00:00") {
      Application.clearWakeupRequest();
    }
    else {
      Application.setWakeupRequest();
    }
  }
  catch (error) {
    Mojo.Log.logException(error, "PreferencesAssistant::intervalChanged");
  }
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
PreferencesAssistant.prototype.wakeupChanged = function(event) {
  try {
    Application.Settings.wakeupDevice = this.wakeupModel.value || false;
  }
  catch (error) {
    Mojo.Log.logException(error, "PreferencesAssistant::wakeupChanged");
  }
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
PreferencesAssistant.prototype.expiresAfterChanged = function(event) {
  try {
    var expiresAfter = this.expiresAfterModel.value || 300000;
    Application.Settings.cacheExpiresAfter = expiresAfter;
  }
  catch (error) {
    Mojo.Log.logException(error, "PreferencesAssistant::expiresAfterChanged");
  }
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
PreferencesAssistant.prototype.clearCache = function(event) {
  try {
    this.controller.showAlertDialog({
      onChoose: this.clearCacheConfirmation.bind(this),
      title: $L("Clear Cache"),
      message: $L("Are you sure you want to clear all cached session data?"),
      choices:[
       {label:$L("Continue"), value:"yes", type:'affirmative'},  
       {label:$L("Cancel"), value:"no", type:'dismiss'}    
      ]
    });	
  }
  catch (error) {
    Mojo.Log.logException(error, "PreferencesAssistant::clearCache");
  }
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
PreferencesAssistant.prototype.clearCacheConfirmation = function(value) {
  try {
    if (value == "yes") {
      // Clear the session cache by connecting to it with the "replace" parameter set to true.
      new Mojo.Depot({ name: "TinyTwitterSession", replace: true }, null, null); 
    }
  }
  catch (error) {
    Mojo.Log.logException(error, "PreferencesAssistant::clearCacheConfirmation");
  }
}

