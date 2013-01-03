//...
//... Load the Foundations library and create
//... short-hand references to some of its components.
//...
var Foundations = IMPORTS.foundations;
var Future = Foundations.Control.Future;
// var PalmCall = Foundations.Comms.PalmCall;
var AjaxCall = Foundations.Comms.AjaxCall;

var UntappdAssistant = function(future) {};

UntappdAssistant.prototype.run = function(future) {
	var args = this.controller.args;
	
	console.log("UntappdService running with params: " + JSON.stringify(args));

	var options = {
		headers: args.header
	};
	
	if (args.method == "get") {
		var getReq = AjaxCall.get(args.url, options);

		getReq.onError(function(e) {
			console.error(e.exception);
			future.exception = e.exception;
		});

		getReq.then(function(f) {
			console.log("Untappd Service: Got a result");
			future.result = f.result;

		});
		
	} else if (args.method == "post") {
		var body = ""; //JSON.stringify(args.body);
		var postReq = AjaxCall.call(args.method, args.url, args.body, {
			headers: args.header,
			onData: function(chunk){
				// console.log("Got Data: " + JSON.stringify(chunk));
			}
		});

		postReq.onError(function(e) {
			console.error(e.exception);
			future.exception = e.exception;
		});

		postReq.then(function(f) {
			// console.log("Untappd Service: Post request result");
			future.result = f.result;
		});

	} else {

		future.result = {returnValue: false, errorText: 'No method found'};

	}

};
