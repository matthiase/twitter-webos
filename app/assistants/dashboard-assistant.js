function DashboardAssistant(title, message, count) {
	this.title = title;
	this.message = message;	
	this.count = count || 0;
}


DashboardAssistant.prototype.setup = function() { 
  try {
    this.showNotification();
    this.launchHandler = this.launchMain.bindAsEventListener(this);
    this.controller.listen("dashboardinfo", Mojo.Event.tap, this.launchHandler);
/*  
    var stageDocument = this.controller.stageController.document; 
    Mojo.Event.listen(stageDocument, Mojo.Event.stageActivate, this.activateWindow.bindAsEventListener(this)); 
    Mojo.Event.listen(stageDocument, Mojo.Event.stageDeactivate, this.deactivateWindow.bindAsEventListener(this));
*/
  }
  catch (error) {
    Mojo.Log.logException(error, "DashboardAssistant::setup");
  }
}
	
  
DashboardAssistant.prototype.cleanup = function() {
  // Release event listeners
  this.controller.stopListening("dashboardinfo", Mojo.Event.tap, this.launchHandler);
}  
  
  
DashboardAssistant.prototype.showNotification = function() { 
  try {
    var info = {title: this.title, message: this.message, count: this.count}; 
    var renderedInfo = Mojo.View.render({object: info, template: 'dashboard/notification-template'}); 
    var infoElement = this.controller.get('dashboardinfo'); 
    infoElement.update(renderedInfo);  
  }
  catch (error) {
    Mojo.Log.logException(error, "DashboardAssistant::showNotification");
  }
}


DashboardAssistant.prototype.launchMain = function() { 
  try {
    Mojo.Log.info("DashboardAssistant::launchMain tap event received.");
    var appController = Mojo.Controller.getAppController();
    appController.assistant.handleLaunch({action:"notification"});
    this.controller.window.close();  
  }
  catch (error) {
    Mojo.Log.logException(error, "DashboardAssistant::launchMain");
  }
}