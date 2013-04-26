var User = Class.create({
  ///////////////////////////////////////////////////////////////////////////////////////
  //
  ///////////////////////////////////////////////////////////////////////////////////////
  initialize: function(username, password) {  
    this.id = -1;
    this.username = username;
    this.password = password;
    this.profile = {};
    this.friendsTimeline = [];    
    this.receivedMessages = [];
    this.sentMessages = [];
    this.lastUpdateAttempt = 0;
    this.lastUpdateSuccess = 0;
  },
  
  ///////////////////////////////////////////////////////////////////////////////////////
  //
  ///////////////////////////////////////////////////////////////////////////////////////
  login: function(onSuccess, onFailure) {
    try {         
      Mojo.Log.info("User::login API REQUEST: http://twitter.com/account/verify_credentials.json");	
      var authToken = btoa(this.username + ":" + this.password);      
      new Ajax.Request("http://twitter.com/account/verify_credentials.json", {
        method: 'get',
        requestHeaders: ["Authorization", "Basic " + authToken],
        onSuccess: onSuccess.bind(this),
        onFailure: onFailure.bind(this)
      });	    
    }
    catch (error) {
      Mojo.Log.logException(error, "User::login"); 
    }
  },
  

  ///////////////////////////////////////////////////////////////////////////////////////
  //
  ///////////////////////////////////////////////////////////////////////////////////////  
  loadProfile: function(onSuccess, onFailure) {
    try {     
      Mojo.Log.info("User::loadProfile API REQUEST: http://twitter.com/users/show.json");    
      var authToken = btoa(this.username + ":" + this.password);      
      new Ajax.Request("http://twitter.com/users/show.json", {
        method: 'get',
        parameters: { screen_name: this.username },
        requestHeaders: ["Authorization", "Basic " + authToken],
        onSuccess: this.loadProfileSuccess.bind(this, onSuccess.bind(this)),
        onFailure: requestErrorHandler.bind(this, onFailure.bind(this))
      });	    
    }
    catch (error) {
      Mojo.Log.logException(error, "User::loadProfile"); 
    }  
  },
    
  
  ///////////////////////////////////////////////////////////////////////////////////////
  //
  ///////////////////////////////////////////////////////////////////////////////////////    
  loadProfileSuccess: function(callback, response) {
    try {
      Mojo.Log.info("User::loadProfileSuccess");
      var data = response.responseJSON;
      if (data != null && Object.toJSON(data) != {}) {
        this.profile = data;
      }    
    }
    catch (error) {
      Mojo.Log.logException(error, "User::loadProfileSuccess");
    }  
    finally {
      if (callback) {
        callback(data);
      }
    }
  },

    
  ///////////////////////////////////////////////////////////////////////////////////////
  //
  ///////////////////////////////////////////////////////////////////////////////////////
  loadFriendsTimeline: function(onSuccess, onFailure) {
    try {
      this.lastUpdateAttempt = new Date().valueOf();
			var parameters = { };
			if (this.friendsTimeline && this.friendsTimeline.length > 0) {
        // Check the item id.  If it's null then the item is an advertisement and we don't
        // want to use that for our since_id parameter.  Continue looking for a valid one.
	      for(var index = 0; index < this.friendsTimeline.length; ++index) {
	        if (this.friendsTimeline[index].id) {
	          parameters.since_id = this.friendsTimeline[index].id;
	          break;
	        }
	      }				
			}
			else {
				parameters.count = 20;
			}
      Mojo.Log.info("User::loadFriendsTimeline API REQUEST: http://twitter.com/statuses/friends_timeline.json");     
      var authToken = btoa(this.username + ":" + this.password);    
      new Ajax.Request("http://twitter.com/statuses/friends_timeline.json", {
        method: 'get',
				parameters: parameters,
        requestHeaders: ["Authorization", "Basic " + authToken],
        onSuccess: this.friendsTimelineSuccessHandler.bind(this, onSuccess.bind(this)),
        onFailure: this.requestErrorHandler.bind(this, onFailure.bind(this))
      });	
    }
    catch (error) {
      Mojo.Log.logException(error, "User::loadFriendsTimeline");      
    }
  },

  ///////////////////////////////////////////////////////////////////////////////////////
  //
  ///////////////////////////////////////////////////////////////////////////////////////  
  friendsTimelineSuccessHandler: function(callback, response) {    
    try {      
      var items = response.responseJSON;      
      if (items) {    
        // If the number of items exceeds the limit, trim it down.
        var limit = 20;
        if (items.length > limit) {
          this.friendsTimeline = items.slice(0, limit);
        }
        else {
          // Concatenate the items array with the list model, but slice an equal number 
          // of items off the end to make sure the limit is not exceeded.
          this.friendsTimeline = items.concat(this.friendsTimeline.slice(0, limit - items.length));
        }
				Mojo.Log.info("User::friendsTimelineSuccessHandler fetched", items.length, "items.");
      }
			else {
				Mojo.Log.error("User::friendsTimelineSuccessHandler received empty dataset from API.")
			}
    }
    catch (error) {
      Mojo.Log.logException(error, "User::friendsTimelineSuccessHandler");  
    }
    finally {
      // The attempt was successful.  Update the timestamp.
      this.lastUpdateSuccess = this.lastUpdateAttempt;    
      if (callback) {
        callback(items);
      }
    }
  },
  
  
  ///////////////////////////////////////////////////////////////////////////////////////
  //
  ///////////////////////////////////////////////////////////////////////////////////////
  loadReceivedMessages: function(onSuccess, onFailure) {
    try {
      this.lastUpdateAttempt = new Date().valueOf();
			var parameters = { };
			if (this.receivedMessages && this.receivedMessages.length > 0) {
        parameters.since_id = this.receivedMessages[0].id;
			}
			else {
				parameters.count = 20;
			}
      Mojo.Log.info("User::loadReceivedMessages API REQUEST: http://twitter.com/direct_messages.json");      
      var authToken = btoa(this.username + ":" + this.password);    
      new Ajax.Request("http://twitter.com/direct_messages.json", {
        method: 'get',
				parameters: parameters,
        requestHeaders: ["Authorization", "Basic " + authToken],
        onSuccess: this.receivedMessagesSuccessHandler.bind(this, onSuccess.bind(this)),
        onFailure: this.requestErrorHandler.bind(this, onFailure.bind(this))
      });	
    }
    catch (error) {
      Mojo.Log.logException(error, "User::loadReceivedMessages");   
    }  
  },  
  
    
  ///////////////////////////////////////////////////////////////////////////////////////
  //
  ///////////////////////////////////////////////////////////////////////////////////////  
  receivedMessagesSuccessHandler: function(callback, response) {   
    try {      
      var items = response.responseJSON;      
      if (items) {    
        // If the number of items exceeds the limit, trim it down.
        var limit = 20;
        if (items.length > limit) {
          this.receivedMessages = items.slice(0, limit);
        }
        else {
          // Concatenate the items array with the list model, but slice an equal number 
          // of items off the end to make sure the limit is not exceeded.
          this.receivedMessages = items.concat(this.receivedMessages.slice(0, limit - items.length));
        }
      }
			Mojo.Log.info("User::receivedMessagesSuccessHandler fetched", items.length, "items.");      
    }
    catch (error) {
      Mojo.Log.logException(error, "User::receivedMessagesSuccessHandler"); 
    }
    finally {   
      this.lastUpdateSuccess = this.lastUpdateAttempt; 
      if (callback) {
        callback(items);
      }
    }
  },  

  
  ///////////////////////////////////////////////////////////////////////////////////////
  //
  ///////////////////////////////////////////////////////////////////////////////////////
  loadSentMessages: function(onSuccess, onFailure) {
    try {
      this.lastUpdateAttempt = new Date().valueOf();    
			var parameters = { };
			if (this.sentMessages && this.sentMessages.length > 0) {
        parameters.since_id = this.sentMessages[0].id;
			}
			else {
				parameters.count = 20;
			}
      Mojo.Log.info("User::loadSentMessages API REQUEST: http://twitter.com/direct_messages/sent.json");      
      var authToken = btoa(this.username + ":" + this.password);    
      new Ajax.Request("http://twitter.com/direct_messages/sent.json", {
        method: 'get',
				parameters: parameters,
        requestHeaders: ["Authorization", "Basic " + authToken],
        onSuccess: this.sentMessagesSuccessHandler.bind(this, onSuccess.bind(this)),
        onFailure: this.requestErrorHandler.bind(this, onFailure.bind(this))
      });	
    }
    catch (error) { 
      Mojo.Log.logException(error, "User::loadSentMessages");      
    }  
  },  
    
    
  ///////////////////////////////////////////////////////////////////////////////////////
  //
  ///////////////////////////////////////////////////////////////////////////////////////  
  sentMessagesSuccessHandler: function(callback, response) {   
    try {      
      var items = response.responseJSON;      
      if (items) {    
        // If the number of items exceeds the limit, trim it down.
        var limit = 20;
        if (items.length > limit) {
          this.sentMessages = items.slice(0, limit);
        }
        else {
          // Concatenate the items array with the list model, but slice an equal number 
          // of items off the end to make sure the limit is not exceeded.
          this.sentMessages = items.concat(this.sentMessages.slice(0, limit - items.length));
        }
      }
			Mojo.Log.info("User::sentMessagesSuccessHandler fetched", items.length, "items.");      
    }
    catch (error) {
      Mojo.Log.logException(error, "User::sentMessagesSuccessHandler");
    }
    finally { 
      this.lastUpdateSuccess = this.lastUpdateAttempt;     
      if (callback) {
        callback(items);
      }
    }
  },    
    

  ///////////////////////////////////////////////////////////////////////////////////////
  //
  /////////////////////////////////////////////////////////////////////////////////////// 
  follow: function(screen_name, onSuccess, onError) {
    try {         
      Mojo.Log.info("User::follow API REQUEST: http://twitter.com/friendships/create.json");	
      var authToken = btoa(this.username + ":" + this.password);      
      new Ajax.Request("http://twitter.com/friendships/create.json", {
        method: 'post',
				parameters: {screen_name: screen_name},
        requestHeaders: ["Authorization", "Basic " + authToken],
        onSuccess: onSuccess.bind(this),
        onFailure: onError.bind(this)
      });	    
    }
    catch (error) {
      Mojo.Log.logException(error, "User::follow"); 
    }
  },
  

  ///////////////////////////////////////////////////////////////////////////////////////
  //
  /////////////////////////////////////////////////////////////////////////////////////// 
  stopFollowing: function(screen_name, onSuccess, onError) {
    try {         
      Mojo.Log.info("User::stopFollowing API REQUEST: http://twitter.com/friendships/destroy.json");	
      var authToken = btoa(this.username + ":" + this.password);      
      new Ajax.Request("http://twitter.com/friendships/destroy.json", {
        method: 'delete',
				parameters: {screen_name: screen_name},
        requestHeaders: ["Authorization", "Basic " + authToken],
        onSuccess: onSuccess.bind(this),
        onFailure: onError.bind(this)
      });	    
    }
    catch (error) {
      Mojo.Log.logException(error, "User::stopFollowing"); 
    }  
  },
    
  
  ///////////////////////////////////////////////////////////////////////////////////////
  //
  /////////////////////////////////////////////////////////////////////////////////////// 
  block: function(screen_name, onSuccess, onError) {
    try {         
      Mojo.Log.info("User::block API REQUEST: http://twitter.com/blocks/create.json");	
      var authToken = btoa(this.username + ":" + this.password);      
      new Ajax.Request("http://twitter.com/blocks/create.json", {
        method: 'post',
				parameters: {id: screen_name},
        requestHeaders: ["Authorization", "Basic " + authToken],
        onSuccess: onSuccess.bind(this),
        onFailure: onError.bind(this)
      });	    
    }
    catch (error) {
      Mojo.Log.logException(error, "User::block"); 
    }  
  },


  ///////////////////////////////////////////////////////////////////////////////////////
  //
  /////////////////////////////////////////////////////////////////////////////////////// 
  unblock: function(screen_name, onSuccess, onError) {
    try {         
      Mojo.Log.info("User::unblock API REQUEST: http://twitter.com/blocks/destroy.json");	
      var authToken = btoa(this.username + ":" + this.password);      
      new Ajax.Request("http://twitter.com/blocks/destroy.json", {
        method: 'delete',
				parameters: {id: screen_name},
        requestHeaders: ["Authorization", "Basic " + authToken],
        onSuccess: onSuccess.bind(this),
        onFailure: onError.bind(this)
      });	    
    }
    catch (error) {
      Mojo.Log.logException(error, "User::unblock"); 
    }  
  },
  
  
  ///////////////////////////////////////////////////////////////////////////////////////
  //
  /////////////////////////////////////////////////////////////////////////////////////// 
  requestErrorHandler: function(callback, response) {
    var template = new Template("Status = #{status}");
    var error = "Request failed: " + template.evaluate(response);
    Mojo.Log.error("User:requestErrorHandler", error);
    if (callback) {
      callback(error);
    }    
  },
    
});