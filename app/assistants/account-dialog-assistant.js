/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
function AcountDialogAssistant(sceneAssistant) {
	this.sceneAssistant = sceneAssistant;
  this.controller = sceneAssistant.controller;
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
AcountDialogAssistant.prototype.setup = function(widget) {
  try {
    this.widget = widget;
    // Set up the username textfield widget.
    this.controller.setupWidget('usernameText',
      this.usernameAttributes = {
        property: "value",
        hintText: $L("Username"),
        autoFocus: true,
        enterSubmits: false,      
        textReplacement: false,
        changeOnKeyPress: true
      },
      this.usernameModel = { value: "" });
      
    // Set up the password textfield widget.
    this.controller.setupWidget('passwordText',
      this.passwordAttributes = {
        property: "value",
        hintText: $L("Password"),
        enterSubmits: false,
        textReplacement: false,
        changeOnKeyPress: true
      },
      this.passwordModel = { value: "" });
      
    // Set up ok button.
    this.controller.setupWidget('okButton',
      this.attributes = { },
      okButtonModel = {
        buttonLabel: $L("Login"),
        disabled: true
      });
      
    // Start listening for events.
    this.validationHandler = this.validate.bindAsEventListener(this);
    this.controller.listen('usernameText', Mojo.Event.propertyChange, this.validationHandler);    
    this.controller.listen('passwordText', Mojo.Event.propertyChange, this.validationHandler);
    this.submitHandler = this.submit.bindAsEventListener(this);
    this.controller.listen('okButton', Mojo.Event.tap, this.submitHandler);
  }
  catch (error) {
    Mojo.Log.logException(error, "AccountDialogAssistant::setup");
  }
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
AcountDialogAssistant.prototype.cleanup = function(event) {
  try {
    this.controller.stopListening("usernameText", Mojo.Event.propertyChange, this.validationHandler);
    this.controller.stopListening("passwordText", Mojo.Event.propertyChange, this.validationHandler);
    this.controller.stopListening("okButton", Mojo.Event.tap, this.submitHandler);
  }
  catch (error) {
    Mojo.Log.logException(error, "AcountDialogAssistant::cleanup");  
  }
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
AcountDialogAssistant.prototype.activate = function(event) {

}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
AcountDialogAssistant.prototype.deactivate = function(event) {

}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
AcountDialogAssistant.prototype.submit = function(event) {  
  var button = this.controller.get('okButton');
  var username = this.usernameModel.value;
  var password = this.passwordModel.value;	  
  try {		
    button.mojo.activate();
		this.user = new User(username, password);
		this.user.login(this.onRequestSuccess.bind(this), this.onRequestFailure.bind(this));
  }
  catch (error) {
    button.mojo.deactivate();
		Mojo.Log.error("AcountDialogAssistant::submit" + error);
  }
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
AcountDialogAssistant.prototype.onRequestSuccess = function(transport) {
  try {
    this.controller.get('okButton').mojo.deactivate();
    var data = transport.responseJSON;
		this.user.id = data.id;
    this.sceneAssistant.addAccount(this.user);	 
  	this.widget.mojo.close(); 
  }
  catch(error) {
    Mojo.Log.error("AcountDialogAssistant::onRequestSuccess" + error);
  }
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
AcountDialogAssistant.prototype.onRequestFailure = function(transport) {
  this.controller.get('okButton').mojo.deactivate();
  var data = transport.responseJSON;  
  this.controller.get('headerTitle').innerHTML = data["error"] || "Could Not Authenticate You.";
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
AcountDialogAssistant.prototype.validate = function(event) {
	okButtonModel.disabled = (this.usernameModel.value.length == 0 || this.passwordModel.value.length == 0 );
	this.controller.modelChanged(okButtonModel, this);
}
