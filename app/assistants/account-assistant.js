function AccountAssistant() {

}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
AccountAssistant.prototype.setup = function() {
  try {    
		// Set up the application menu.
		this.controller.setupWidget(Mojo.Menu.appMenu, Application.Menu.attributes, { 
			visible: true, 
			items: [
				Mojo.Menu.editItem,
				{ label: Mojo.Menu.prefsItem.label, command: Mojo.Menu.prefsItem.command },
				{ label: Mojo.Menu.helpItem.label, command: Mojo.Menu.helpItem.command }			
			]
		});
	
    // Set up the account list widget.
    this.controller.setupWidget("accountList",
      this.accountAttributes = {
        itemTemplate: "account/account-row-template",
        listTemplate: "account/account-list-template",
				addItemLabel: $L("Add An Account"),
        swipeToDelete: true,
        renderLimit: 10,
        reorderable: false
      },
      this.listModel = {items:[ ]});
      
    // Fire up the event listeners.
    this.listTapHandler = this.onListTap.bindAsEventListener(this);
    this.controller.listen('accountList', Mojo.Event.listTap, this.listTapHandler);
    this.listAddHandler = this.onListAdd.bindAsEventListener(this);
		this.controller.listen('accountList', Mojo.Event.listAdd, this.listAddHandler);
    this.listDeleteHandler = this.onListDelete.bindAsEventListener(this);
		this.controller.listen('accountList', Mojo.Event.listDelete, this.listDeleteHandler);		
  }
  catch (error) {
    Mojo.Log.logException(error, "AccountAssistant::setup");
  }
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
AccountAssistant.prototype.cleanup = function(event) {
  try {
    this.controller.stopListening("accountList", Mojo.Event.listTap, this.listTapHandler);
    this.controller.stopListening("accountList", Mojo.Event.listTap, this.listAddHandler);
    this.controller.stopListening("accountList", Mojo.Event.listTap, this.listDeleteHandler);
  }
  catch (error) {
    Mojo.Log.logException(error, "AccountAssistant::cleanup");  
  }
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
AccountAssistant.prototype.activate = function(event) {
  try {            
		if (this.listModel.items.length == 0) {
	    // The list control needs to be initialized. Create a reference to the depot.
	    depot = new Mojo.Depot({name: "TinyTwitter", version: 1, estimatedSize: 250000, replace: false},
	      this.onDepotOpened.bind(this), this.onDepotError.bind(this));						
		}
  }
  catch (error) {
    Mojo.Log.logException(error, "AccountAssistant::activate");
  }
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
AccountAssistant.prototype.deactivate = function(event) {

}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
AccountAssistant.prototype.onDepotOpened = function() {
  try {
    depot.simpleGet("accounts", this.onAccountsLoaded.bind(this), null);
  }
  catch (error) {
    Mojo.Log.logException(error, "AccountAssistant::onDepotOpened");
  }  
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
AccountAssistant.prototype.onDepotError = function() {
  var error = "Unable to open depot.";
  Mojo.Log.error("AccountAssistant::onDepotError\n",  error);
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
AccountAssistant.prototype.onAccountsLoaded = function(data) {	
	try {	
		this.listModel.items = data || [ ];
		this.controller.modelChanged(this.listModel);	
		
		var activeAccountIndex = -1;
		if (data != null && Object.toJSON(data) != "{ }") {			
			var activeProfile = Application.Settings.profile;      
			if (activeProfile && activeProfile.length > 0) {
				for (i = 0; i < data.length; ++i) {
					if (data[i]["username"] === activeProfile) {
						activeAccountIndex = i;
						break;
					}
				}
			}
			// If the activeProfile string matches one of the stored account names, automatically load the profile's
			// timeline.  Otherwise, display the account list and let the user add or select an account.
			if (activeAccountIndex > -1) {    
        var username = data[i].username;
        var password = data[i].password;
        Application.Settings.profile = username;
        Application.currentUser = new User(username, password);
        //Application.currentUser.loadProfile();
        this.controller.stageController.pushScene("timeline");
			}							
		}
	}
	catch (error) {
		Mojo.Log.logException(error, "AccountAssistant::onAccountsLoaded");
	}
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
AccountAssistant.prototype.handleCommand = function(event) {
	try {
	  if (event.type == Mojo.Event.command) {
	    switch (event.command) {
	      case 'actionAdd':
					this.onListAdd();
	        break;
	    }
	  }
	}
	catch (error) {
		Mojo.Log.logException(error, "AccountAssistant::handleCommand" );
	}
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
AccountAssistant.prototype.onListTap = function(event) {  
  try {
    Application.Settings.profile = event.item.username;	
		var previous = Application.currentUser ? Application.currentUser.username : "";
		if (previous != event.item.username) {
			Application.currentUser = new User(event.item.username, event.item.password);
		}
		this.controller.stageController.pushScene("timeline");	
  }
  catch (error) {
    Mojo.Log.logException(error, "AccountAssistant::onListTap");
    this.controller.showAlertDialog({
      title: $L("Application Error"),
      message: $L("Unable to load account"),
      choices: [{label:$L('Dismiss'), value:'dismiss', type:'secondary'}]
    });    
  }
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
AccountAssistant.prototype.onListAdd = function(event) {
	try {
    this.controller.showDialog({
      template: 'account/account-detail-dialog',
      assistant: new AcountDialogAssistant(this)});		
	}
	catch(error) {
		Mojo.Log.error("AccountAssistant::onListAdd", error);
	}
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
AccountAssistant.prototype.onListDelete = function(event) {
	try {
		this.listModel.items.splice(event.index, 1);
    depot.simpleAdd("accounts", this.listModel.items, 
      function() {Mojo.Log.info("Account deleted from depot.");},
      function(transaction, result) {Mojo.Log.error(result.message);}
		);
	}
	catch(error) {
		Mojo.Log.logException(error, "AccountAssistant::onListDelete");
    this.controller.showAlertDialog({
      title: $L("Application Error"),
      message: $L("Unable to delete account"),
      choices: [{label:$L('Dismiss'), value:'dismiss', type:'secondary'}]
    });    
	}
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
AccountAssistant.prototype.addAccount = function(user) {
  try {
		profile = {id: user.id, username: user.username, password: user.password};
		Application.currentUser = user;
		this.controller.stageController.pushScene("timeline");
		
    this.listModel.items.push(profile);
		this.listModel.items.sort(function(a,b){
			return (a - b);
		});
    this.controller.modelChanged(this.listModel, this);

    depot.simpleAdd("accounts", this.listModel.items, 
      function() {Mojo.Log.info("Account added to depot.");},
      function(transaction, result) {Mojo.Log.error(result.message);}
    );
  }
  catch (error) {
		Mojo.Log.logException(error, "AccountAssistant::addAccount");	
    this.controller.showAlertDialog({
      title: $L("Application Error"),
      message: $L("Unable to add account"),
      choices: [{label:$L('Dismiss'), value:'dismiss', type:'secondary'}]
    });     
  }
}