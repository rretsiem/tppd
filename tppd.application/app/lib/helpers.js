/**
 * global helper functions
 * 
 */


/**
 * searches in an array for a specific needle 
 * @param {String} needle
 * @param {Array} haystack
 * @param {String} item
 */
function findUnitIndex(needle, haystack, item) {
	for (var i=0; i < haystack.length; i++) {
		if (haystack[i][item] == needle) {
			return i;
		}
	}
	return false;
};

function showBanner(msg) {
	Mojo.Controller.getAppController().showBanner(msg, {source: 'notification'});
};

function errorDialog(error, sceneWindow) {
	Mojo.Controller.errorDialog(error, sceneWindow);
}

function openUrl(url, controller) {
	Mojo.Log.info("open link in browser...", url);
	controller.serviceRequest("palm://com.palm.applicationManager", {
		method: "open",
		parameters: {
			id: 'com.palm.app.browser',
			params: {
				scene: 'page',
				target: url
			}
		}
	});

};


function getRelativeTime(date) {
	var date_obj = Date.fromString(date);
	var relative_time = date_obj.toRelativeTime();
	delete date_obj;
	return relative_time;
};


/**
 * toggle the spinner object and adjusts it to screen size

 * @param {String} action (start/stop)
 * @param {Object} sceneController
 */
function toggleSmallSpinner(action, sceneController) {

    var sc = sceneController;
    
    if (action == "stop") {
		sc.controller.window.setTimeout(function(t) {
            sc.controller.get("spin-overlay").setStyle({
               "top": "-60px"
            });
			sc.spinnerSmallModel.spinning = false;
			sc.controller.modelChanged(sc.spinnerSmallModel);
		}, 750, this);
    } else {
            sc.controller.get("spin-overlay").setStyle({
               "top": "0px"
            });
		sc.spinnerSmallModel.spinning = true;
		sc.controller.modelChanged(sc.spinnerSmallModel);
	}
	return;
};

/**
 * Add global timeout support to Ajax.Request
 */
Ajax.Responders.register({
   onCreate: function(request) {
		this.appController = Mojo.Controller.getAppController();
		this.stageController = this.appController.getStageController(TPPD.MainStageName);

		this.sceneController = this.stageController.activeScene();

		request['timeoutId'] = window.setTimeout(function() {
			if (request.transport.readyState != 0 && request.transport.readyState != 4) {
				window.clearTimeout(request['timeoutId']);
	            Mojo.Log.info("AJAX Timeout");

	            request.transport.abort();
				var msg = {};
	            msg.status = "Connection timed out...";
	            msg.responseJSON = {error: "uh oh, it looks like the network is down. Try again shortly", errors: ""};
				if (request.options.onFailure != null) {
		            request.options.onFailure(msg);
				}
			}
		}, 30000); // 30 seconds
	},
	onComplete: function(request) {
		if (this.sceneController.window.clearTimeout(request['timeoutId']));
	}
});
