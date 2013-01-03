//...
//... Load the Foundations library and create
//... short-hand references to some of its components.
//...
var Foundations = IMPORTS.foundations;
var Future = Foundations.Control.Future;
var PalmCall = Foundations.Comms.PalmCall;
var AjaxCall = Foundations.Comms.AjaxCall;


var GetVenuesAssistant = function(future) {	
}

GetVenuesAssistant.prototype.run = function(future) {
	var args = this.controller.args;
	
	var clientId = "YOUR4SQClientID";
	var clientSecret = "YOUR4SQClientSecret";

	var url = "https://api.foursquare.com/v2/venues/search";

	var options = {};

	url = url + "?ll=" + args.lat + "," + args.lon;
	url = url + "&client_id=" + clientId;
	url = url + "&client_secret=" + clientSecret;
	url = url + "&query=" + encodeURIComponent(args.query);
	url = url + "&limit=20&intent=checkin";

	var getVenues = AjaxCall.get(url, options);
	
	getVenues.onError(function(e) {
		console.error(e.exception);
		future.exception = e.exception;
	});

	getVenues.then(function(f) {
		console.log("Got venues...");
		var result = f.result.responseJSON.response;

		var groups = result.groups;
		var nearby = [];
		if (groups) {
			for (var i = 0, max = groups.length; i < max; i++) {
				if (groups[i].type == "nearby" || groups[i].type == "places") {
					nearby.push(groups[i]);
				}
			}

		}
		// console.log("parsing nearby venues...")

		future.result = nearby;
	});

}