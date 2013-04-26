var Advertisement = Class.create({  

	///////////////////////////////////////////////////////////////////////////////////////
	//
	///////////////////////////////////////////////////////////////////////////////////////
	initialize: function(limit) {
		this.counter = 0;
		this.limit = limit || 20;
		this.next();
	},


  ///////////////////////////////////////////////////////////////////////////////////////
  //
  ///////////////////////////////////////////////////////////////////////////////////////
  next: function() {
    try {
			this.counter = this.counter % this.limit;
      new Ajax.Request("http://services.tinytwitter.com/ads.json", {
        method: 'get',
        onSuccess: this.initializeSuccess.bind(this),
        onFailure: this.initializeError.bind(this)
      });	
    }
    catch (error) {
      Mojo.Log.error("Advertisement::get", error);    
    }
  },

  ///////////////////////////////////////////////////////////////////////////////////////
  //
  ///////////////////////////////////////////////////////////////////////////////////////  
  initializeSuccess: function(response) {    
    try {      
      /*
      {"ad": {
        "lon": null, 
        "updated_at": "2009-07-12T19:10:20Z", 
        "short_url": "http://bit.ly/OuT5e", 
        "tweet_count_delta": "20", 
        "company_url": "http://www.justinsnutbutter.com/mission.php", 
        "company_name": "Justin's Nut Butter", 
        "body": "We produce & promote fresh nut butters that will always be simple, delicious & nutritious.", 
        "landing_page": "http://www.justinsnutbutter.com/products.php", 
        "id": 2, 
        "lat": null, 
        "created_at": null
        }
      }
      */	
      this.item = null;
      var data = response.responseJSON.ad;
      if (data != null && Object.toJSON(data) != { }) {
        this.limit = data.tweet_count_delta || 0;
        if (this.limit > 0) {
          this.item = {
            "text": "<a href='" + data.short_url + "'>" + data.body + "</a>",
            "truncated":false,
            "user": {
                "description":null,
                "verified":false,
                "utc_offset":-25200,
                "friends_count":0,
                "screen_name":null,
                "favourites_count":0,
                "url":data.company_url,
                "name":data.company_name,
                "created_at":data.created_at,
                "protected":false,
                "statuses_count":0,
                "following":false,
                "notifications":false,
                "time_zone":"",
                "location":"",
                "id":null,
                "followers_count":0,
                "profile_image_url": data.profile_image_url || "http:\/\/s3.amazonaws.com\/twitter_production\/profile_images\/56996615\/images_normal.jpg"
              },      
            "in_reply_to_status_id":null,
            "in_reply_to_user_id":null,
            "created_at": new Date().toUTCString(), //"Tue Jul 21 22:45:12 +0000 2009",
            "favorited":false,
            "in_reply_to_screen_name":null,
            "id":null,
            "source":"<a href=\"http:\/\/www.tinytwitter.com\/\">Tiny Twitter<\/a>"
          }; 
        }
      }
    }
    catch (error) {
      Mojo.Log.error("Advertisement::initializeSuccess", error);
    }
  },
  
  ///////////////////////////////////////////////////////////////////////////////////////
  //
  ///////////////////////////////////////////////////////////////////////////////////////  
  initializeError: function(callback, response) {
    var template = new Template("Status = #{status}");
    var error = "Request failed: " + template.evaluate(response);
    Mojo.Log.error("Advertisement:initializeError", error);   
  }

});

