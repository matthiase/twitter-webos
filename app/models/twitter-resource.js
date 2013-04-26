Twitter = {
  Cache: { none: null, session: "TinyTwitterSession", persistent: "TinyTwitter" }
};

Twitter.Resource = Class.create({
  ///////////////////////////////////////////////////////////////////////////////////////
  //
  ///////////////////////////////////////////////////////////////////////////////////////
  initialize: function(url, options) {
    try {
      this.url = url;
      this.options = options;
      // Generate the request signature. The signature is used for caching.      
      var keys = [];
      if (this.options.requestHeaders) {
        keys.concat(this.options.requestHeaders);
      }
      if (this.options.parameters) {
        for(var name in this.options.parameters ) {
          keys.push(this.options.parameters[name]);
        }
      }
			this.signature = hex_md5(this.url + "?" + keys.join("&"));
      Mojo.Log.info("Twitter.Resource::initialize signature =", this.signature);
      // If no caching options is specified, or it's set to "none", go ahead and fire
      // off the request. Otherwise, try to load the item from the cache first.
      if ((this.options.cache || Twitter.Cache.none) == Twitter.Cache.none) {
        Mojo.Log.info("Twitter.Resource::initialize requesting resource from API");
        this.cache = null;
        this.refresh();
      }
      else {    
        Mojo.Log.info("Twitter.Resource::initialize attempting to load item from cache", this.options.cache);
        this.cache = new Mojo.Depot(
          { name: this.options.cache, version: 1, replace: false },
          this.cacheOpened.bind(this),
          this.cacheError.bind(this)
        );
      }
    }
    catch (error) {
      Mojo.Log.logException(error, "Twitter.Resource::initialize");
    }  
  },
  

  ///////////////////////////////////////////////////////////////////////////////////////
  //
  ///////////////////////////////////////////////////////////////////////////////////////
  cacheOpened: function() {
		try {
      Mojo.Log.info("Twitter.Resource::cacheOpened looking for item", this.signature);
			this.cache.simpleGet(this.signature, 
        this.cacheItemLoaded.bind(this),
        this.cacheError.bind(this)
			);
		}
		catch(error) {
	    Mojo.Log.logException(error, "Twitter.Resource::cacheOpened");
		}  
  },
  
  
  ///////////////////////////////////////////////////////////////////////////////////////
  //
  ///////////////////////////////////////////////////////////////////////////////////////
  cacheError: function() {
    Mojo.Log.info("Twitter.Resource::cacheError failed to retrieve item from cache.");
    this.request(this.url);  
  },
  
  
  ///////////////////////////////////////////////////////////////////////////////////////
  //
  ///////////////////////////////////////////////////////////////////////////////////////
  cacheItemLoaded: function(data) {
    try {
      if (data) {
        Mojo.Log.info("Twitter.Resource::cacheItemLoaded found", this.signature, "in cache");
        // Check the cached response for an expiration date.
        if (data.cache) {
          var expiresAt = data.cache.expiresAt || 0;
          if (expiresAt < new Date().valueOf()) {
            Mojo.Log.info("Twitter.Resource::cacheItemLoaded", this.signature, "has expired.");
            data = null;
          }        
        }      
      }
      // If we stil have valid data, immediately send the response to the client.  Otherwise,
      // send off the http request.
      if (data != null) {
        if (this.options.onSuccess) {
          this.options.onSuccess(data);
        }
      }
      else {
        Mojo.Log.info("Twitter.Resource::cacheItemLoaded item", this.signature, "not cached");
        this.refresh(this.url);
      }        
    }
    catch (error) {
      Mojo.Log.logException(error, "Twitter.Resource::cacheItemLoaded");
    }
  },


  ///////////////////////////////////////////////////////////////////////////////////////
  //
  ///////////////////////////////////////////////////////////////////////////////////////
  refresh: function() {
    try {
      Mojo.Log.info("Twitter.Resource::refresh");
      this.request = new Ajax.Request(this.url, {
        method: this.options.method,
        parameters: this.options.parameters,
        requestHeaders: this.options.requestHeaders,
				onCreate: this.options.onCreate ? this.options.onCreate.bind(this) : null,
        onSuccess: this.refreshSuccess.bind(this),
        onFailure: this.refreshError.bind(this)
      });	      
    }
    catch (error) {
      Mojo.Log.logException(error, "Twitter.Resource::refresh");
    }    
  },
  
  
  ///////////////////////////////////////////////////////////////////////////////////////
  //
  ///////////////////////////////////////////////////////////////////////////////////////
  refreshSuccess: function(transport) {
    try {
      Mojo.Log.info("Twitter.Resource::refreshSuccess");
      if (transport.status == 0) {
        if (this.options.onFailure) {
          this.options.onFailure("Request timed out.");
        }
      }
      else {      
        var data = transport.responseJSON;
        // If caching is turned on, save the response.      
        if (this.cache != null) {
          // Set the cache expiration to the user defined value.  If something goes
          // wrong, just use 5 minutes.     
          var timeToLive = 300000;
          try {
            var timeToLive = parseInt(Application.Settings.cacheExpiresAfter);
          }
          catch (error) {
            Mojo.Log.logException(error, "Twitter.Resource::refreshSuccessHandler");
            timeToLive = 300000;
          }
          // Calculate the expiration time and add it to the response data.
          var expiresAt = new Date().valueOf() + timeToLive;
          data.cache = { expiresAt: expiresAt };
          this.cache.simpleAdd(this.signature, data, 
            function() {
              Mojo.Log.info("Twitter.Resource::refreshSuccessHandler caching resource", this.signature, "for", timeToLive, "ms");          
            }.bind(this), 
            function(transaction, result) {
              Mojo.Log.error("Twitter.Resource::refreshSuccessHandler caching for", this.signature, "failed");
            }.bind(this)
          );
        }
        // Make the callback to the client.
        if (this.options.onSuccess) {
          this.options.onSuccess(data);
        }
      }
    }
    catch (error) {
      Mojo.Log.logException(error, "Twitter.Resource::refreshSuccess");
    }     
  },
  
  
  ///////////////////////////////////////////////////////////////////////////////////////
  //
  ///////////////////////////////////////////////////////////////////////////////////////
  refreshError: function(transport) {
    try {
      Mojo.Log.info("Twitter.Resource::refreshError");
      if (this.options.onFailure) {
        this.options.onFailure("Request failed with status " + transport.status);
      }
    }
    catch (error) {
      Mojo.Log.error("Twitter.Resource::refreshError",  error);
    }   
  },

});