UrlShortener = Class.create({
  ///////////////////////////////////////////////////////////////////////////////////////
  //
  ///////////////////////////////////////////////////////////////////////////////////////
  initialize: function(settings) {
    try {
      if (settings) {
        switch(settings.name) {
          case "bit.ly":
            this.implementation = new UrlShortener.BitlyClient(settings.login, settings.apiKey);
            break;
        }
      }      
      // If no url shortening service has been configured, use TinyUrl.
      if (this.implementation == null) {
        this.implementation = new UrlShortener.TinyUrlClient();
      }
    }
    catch (error) {
      throw error;
    }
  }, 
  
  ///////////////////////////////////////////////////////////////////////////////////////
  //
  ///////////////////////////////////////////////////////////////////////////////////////
  shorten: function(url, onSuccess, onFailure) {  
    // Append the protocol if it's missing.
    if(/^https?:\/\//.test(url) === false) {
      url = "http://" + url;
    }
    // Rely on the specific implementation to take care of the shortening.
    if (this.implementation) {
      this.implementation.shorten(url, onSuccess, onFailure);
    }
  },
  
});



UrlShortener.TinyUrlClient = Class.create({
  ///////////////////////////////////////////////////////////////////////////////////////
  //
  ///////////////////////////////////////////////////////////////////////////////////////
  initialize: function() {
  
  },
  
  ///////////////////////////////////////////////////////////////////////////////////////
  //
  ///////////////////////////////////////////////////////////////////////////////////////
  shorten: function(url, onSuccess, onFailure) {
    try {
      new Ajax.Request("http://tinyurl.com/api-create.php", {
        method: "post",
        parameters: {url: url},
        onSuccess: this.requestSuccess.bind(this, onSuccess.bind(this)),
        onFailure: this.requestFailure.bind(this, onFailure.bind(this))
      });
    }
    catch (error) {
      Mojo.Log.logException(error, "UrlShortener::shorten");
    }
  },  


  ///////////////////////////////////////////////////////////////////////////////////////
  //
  ///////////////////////////////////////////////////////////////////////////////////////
  requestSuccess: function(callback, transport) {
    var result = transport.responseText;
    Mojo.Log.info("UrlShortener::requestSuccess", result);
    if (callback) {
      callback(result);
    }
  },
  
  
  ///////////////////////////////////////////////////////////////////////////////////////
  //
  ///////////////////////////////////////////////////////////////////////////////////////
  requestFailure: function(callback, transport) {
    var error = transport.responseText;
    Mojo.Log.info("UrlShortener::requestFailure", error);
    if (callback) {
      callback(error);
    }
  },

  
});



UrlShortener.BitlyClient = Class.create({
  ///////////////////////////////////////////////////////////////////////////////////////
  //
  ///////////////////////////////////////////////////////////////////////////////////////
  initialize: function(login, apiKey) {
    this.login = login;
    this.apiKey = apiKey;
  },
  
  ///////////////////////////////////////////////////////////////////////////////////////
  //
  ///////////////////////////////////////////////////////////////////////////////////////
  shorten: function(url, onSuccess, onFailure) {
    try {
      new Ajax.Request("http://bit.ly/shorten", {
        method: "post",
        parameters: {
          version: "2.0.1",        
          longUrl: url,
          login: this.login,
          apiKey: this.apiKey,
          history: 1
        },
        onSuccess: onSuccess.bind(this),
        onFailure: onFailure.bind(this)
      });
    }
    catch (error) {
      Mojo.Log.logException(error, "UrlShortener::shorten");
    }
  },
  
});