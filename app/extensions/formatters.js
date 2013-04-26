var Formatters;
if (Formatters == null)
  Formatters = {};

/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
Formatters.datetimeFormatter = function(value, item) {
  try {
    var now = new Date();		    
    var createdAt = new Date(value);
    var formattedValue = "";
    
    var elapsedMinutes = Math.ceil((Date.parse(now) - Date.parse(createdAt)) / (1000 * 60));
    if (elapsedMinutes > 1439) {
      formattedValue = createdAt.toDateString();
    }
    else if (elapsedMinutes > 59) {
      var elapsedHours = Math.round(elapsedMinutes / 60);
      formattedValue = elapsedHours + " hour" + (elapsedHours == 1 ? " ago" : "s ago");
    }
    else {
      formattedValue = elapsedMinutes + " minute" + (elapsedMinutes == 1 ? " ago" : "s ago");
    }    
  }
  catch(error) {
    formattedValue = value;
    Mojo.Log.error("TimelineAssistant::datetimeFormatter\n", error);        
  }    
  return formattedValue;
};


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
Formatters.urlFormatter = function(value, item) {
  var formattedValue = value;
  try {
    var pattern = /(https?:\/\/[0-9a-zA-Z][-\w]*[0-9a-zA-Z]\.+[a-zA-Z]{2,9}[:\d{1,4}]?[-\w\/#~:.?+=&%@~]*)/g;  
    formattedValue = value.replace(pattern, "<a href=\"$1\">$1</a>");  
  }
  catch (error) {
    Mojo.Log.logException(error, "Formatters::urlFormatter");
  }
  return formattedValue;
}


/////////////////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////////////////
/*
Formatters.dateFormatter = function(datetime) {
	var dateArray = date.split(' ');
	return new Date(
	   Date.parse( dateArray[0] + ', ' + dateArray[2] + ' '
      + dateArray[1] + ' ' + dateArray[3] + ' '
      + dateArray[5].substring(0,4) )
	 );	
}
*/

