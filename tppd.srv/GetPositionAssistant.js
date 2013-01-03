//...
//... Load the Foundations library and create
//... short-hand references to some of its components.
//...
var Foundations = IMPORTS.foundations;
var Future = Foundations.Control.Future;
var PalmCall = Foundations.Comms.PalmCall;

var GetPositionAssistant = function(future) {};

GetPositionAssistant.prototype.run = function(future) {
	console.log("GetPosition Assistant run...");
	
	var getLocation = PalmCall.call("palm://com.palm.location", "getCurrentPosition", {
		"accuracy": "1",
		"maximumAge": "30",
		"responseTime": "1"
	});
	
	getLocation.onError(function(e) {
		console.error(e.exception);
		future.exception = e.exception;
	});

	getLocation.then(function(f) {
		console.log("Got a fix:");
		var result = f.result;
		
		for (var key in result) {
			console.log("Fix: " + key + " : " + result[key]);
		}
		future.result = f.result;
	});
	
};
