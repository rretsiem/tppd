var TPPD = {};

TPPD.MainStageName = "mainStage";

TPPD.PrefsCookieName = "tppdPrefs";

TPPD.DbName = "tppdDB";
TPPD.CacheTable = "tppdCache";
TPPD.ConnectionState = undefined;

TPPD.ApiKey = "YOURUntappdApiKey";
TPPD.ApiSecret = "YOURUntappdApiSecret";
TPPD.currentUser = undefined;

TPPD.defaultPrefs = {
	username: undefined,
	password: undefined,
};

TPPD.Panels = [
	{index: 0, id: "checkin", type: "checkin", label: $L("Drink Up"), cmdMenu: "drinkUp", enabled: true, model: {items: []}},
	{index: 1, id: "friends", type: "feed", label: $L("friends"), cmdMenu: "friendFeed", enabled: true, model: {items: []}},
	{index: 2, id: "pub", type: "feed", label: $L("The Pub"), cmdMenu: "pubFeed", enabled: true, model: {items: []}},
	// {index: 3, id: "tab", type: "info", label: $L("Your Tab"), cmdMenu: "yourtab", enabled: true, model: {items: []}},
];

TPPD.Prefs = undefined;
TPPD.DB = undefined;
TPPD.CONFDB = undefined;

TPPD.appMenuModel = {
	visible: true,
	items: [
		{label: $L("Logout"), command: "cmdLogout"},
		{label: $L("About"),command: Mojo.Menu.helpCmd}
	]
};

TPPD.appMenuAttributes = { omitDefaultItems: true};

TPPD.cmdMenuModel = {
	visible: true,
	items: [ 
		{},
        { icon: 'refresh', command: 'cmdRefreshTopics'}
    ]
};
TPPD.cmdMenuAttributes = {
	menuClass: "no-fade"
};

// global functions
TPPD.getPrefs = function() {
	Mojo.Log.info("Get Preferences called...");
	
	var prefsCookie = new Mojo.Model.Cookie(TPPD.PrefsCookieName);
	var prefs = prefsCookie.get();
	if (!prefs) {
		Mojo.Log.info("no prefs found, setting default...");
		var prefs = TPPD.defaultPrefs;
		prefsCookie.put(prefs);
	}
	TPPD.Prefs = prefs;
	return prefs;
};

TPPD.savePrefs = function() {
	Mojo.Log.info("Save Preferences called...");
	
	var prefsCookie = new Mojo.Model.Cookie(TPPD.PrefsCookieName);
	prefsCookie.put(TPPD.Prefs);
};

TPPD.sortByIndex = function(items) {
	if (items.length > 0) {
		items.sort(function(a,b) {
			return parseInt(a.index, 10) - parseInt(b.index, 10)
		});
	}
	return items;
};

// app assistant starts here...
function AppAssistant(appController) {
}

AppAssistant.prototype.setup = function() {
};

AppAssistant.prototype.handleLaunch = function(launchParams) {
	Mojo.Log.info("AppAssistant handleLaunch called...");
	
	TPPD.getPrefs();

	// init the db
	TPPD.DB = new Lawnchair({
		name: TPPD.DbName ,
		adaptor: "webkit"
	});	

	var cardStageController = this.controller.getStageController(TPPD.MainStageName);
    var appController = Mojo.Controller.getAppController();
	
	if (!launchParams || launchParams == {}) {
		Mojo.Log.info("... without launchParams");
		
		if (cardStageController) {
			Mojo.Log.info("Main Stage exists...");
			cardStageController.popScenesTo("main");
			cardStageController.activate();
		} else {
			var pushMainScene = function(stageController) {
				stageController.pushScene({
					name: "launch",
					disableSceneScroller: true
				});
			}
			
			Mojo.Log.info("creating Main stage...");
			var stageArguments = {
				name: TPPD.MainStageName,
				lightweight: true
			};
			this.controller.createStageWithCallback(stageArguments, pushMainScene.bind(this), "card");
		}
	} else {
		Mojo.Log.info("... with launchParams: %j", launchParams);
		
		if (cardStageController) {
			Mojo.Log.info("Main Stage exists...");
			cardStageController.popScenesTo("main", launchParams);
			cardStageController.activate();
		} else {
			var pushMainScene = function(stageController) {
				stageController.pushScene({
					name: "launch",
					disableSceneScroller: true
				}, launchParams);
			}

			Mojo.Log.info("creating Main stage...");
			var stageArguments = {
				name: TPPD.MainStageName,
				lightweight: true
			};
			this.controller.createStageWithCallback(stageArguments, pushMainScene.bind(this), "card");
		}
		
	}

};

AppAssistant.prototype.handleCommand = function(event) {
	var stageController = this.controller.getActiveStageController();
	var currentScene = stageController.activeScene();
	
	if(event.type === Mojo.Event.commandEnable && (event.command === Mojo.Menu.helpCmd || event.command === Mojo.Menu.prefsCmd)) {
		// enable help Cmd and Preferences
		event.stopPropagation();
	}

	if (event.type === Mojo.Event.command) {
		switch (event.command) {
			case Mojo.Menu.helpCmd:
				stageController.pushScene("help");
				break;
			// case Mojo.Menu.prefsCmd:
			//	stageController.pushScene("preferences");
			//	break;
			case "cmdLogout":
				var prefs = TPPD.getPrefs();
				prefs.username = "";
				prefs.password = "";
				TPPD.savePrefs();
				TPPD.currentUser = {};
				this.controller.closeAllStages();
				break;
		}
	}

};