function LaunchAssistant(launchParams) {
	
	if (launchParams) {
		this.launchParams = launchParams;
	}
	
	TPPD.DB = new Lawnchair({
		name: TPPD.DbName,
		adaptor: "webkit"
	});

	this.prefs = TPPD.getPrefs();

}

LaunchAssistant.prototype = {
	setup: function() {
		
		// scene spinner
		this.sceneSpinnerModel = {
			spinning: false
		};
		this.controller.setupWidget('scene_spinner', {spinnerSize: "large"}, this.sceneSpinnerModel);
		
		this.usernameAttr = {
			hintText: 'Username',
			textCase: Mojo.Widget.steModeLowerCase
		};
		this.usernameModel = {
			disabled: false
		};
		this.controller.setupWidget('username', this.usernameAttr, this.usernameModel);

		this.passwordAttr = {
			hintText: 'Password',
			textCase: Mojo.Widget.steModeLowerCase
		};
		this.passwordModel = {
			disabled: false
		};
		this.controller.setupWidget('password', this.passwordAttr, this.passwordModel);

		this.loginButtonModel = {
			label: $L("Login"),
			disabled: false,
			buttonClass: 'primary'
		};
		this.controller.setupWidget('loginButton', {
			type: Mojo.Widget.activityButton
		}, this.loginButtonModel);

		this.signupButtonModel = {
			label: $L("Sign up!"),
			disabled: false,
			buttonClass: 'secondary'
		};
		this.controller.setupWidget('signupButton', {}, this.signupButtonModel);

		// handlers
		this.loginButtonTapHandler = this.loginButtonTapped.bind(this);
		this.signupButtonTapHandler = this.signupButtonTapped.bind(this);
		
		// listeners
		this.controller.listen('loginButton', Mojo.Event.tap, this.loginButtonTapHandler);
		this.controller.listen('signupButton', Mojo.Event.tap, this.signupButtonTapHandler);
		
		this.controller.get('loginForm').hide();
		
		if (!this.prefs.username || !this.prefs.password) {
			this.controller.get('loginForm').show();
		} else {
			this.username = this.prefs.username;
			this.password = this.prefs.password;

			this.login(this.username, this.password);

			// we found credentials, start to main scene...
		 	// this.startTimer = this.controller.window.setTimeout(function(t) {
			//	t.startApp();
			//}, 150, this);
		}

	},
	
	aboutToActivate: function(callback) {
		callback.defer();
	},
	
	activate: function(event) {
		// this.prefs.username = undefined;
		// this.prefs.password = undefined;
	},
	
	deactivate: function(event) {},
	
	cleanup: function(event) {

		this.controller.window.clearTimeout(this.startTimer);

		// listeners
		this.controller.stopListening('loginButton', Mojo.Event.tap, this.loginButtonTapHandler);
		this.controller.stopListening('signupButton', Mojo.Event.tap, this.signupButtonTapHandler);

	},
	
	showSceneSpinner: function(message) {
		this.sceneSpinnerModel.spinning = true;
		this.controller.modelChanged(this.sceneSpinnerModel);
		
		this.controller.get('scene_scrim_message').update(message);
		this.controller.get('scene_scrim').show();
	},
	hideSceneSpinner: function() {
		this.sceneSpinnerModel.spinning = false;
		this.controller.modelChanged(this.sceneSpinnerModel);
		this.controller.get('scene_scrim').hide();
	},
	startApp: function() {		
		this.controller.stageController.swapScene({
			name: "main",
			transition: Mojo.Transition.crossFade,
			disableSceneScroller: true
		}, this.launchParams);
	},
	
	loginButtonTapped: function() {
		this.username = this.usernameModel.value;
		this.password = this.passwordModel.value;
		
		if (!this.username || !this.password) {
			this.controller.get('loginButton').mojo.deactivate();
			return;
		}

		this.loginButtonModel.disabled = true;
		this.controller.modelChanged(this.loginButtonModel);

		this.login(this.username, this.password);
	},
	signupButtonTapped: function() {
		this.controller.serviceRequest("palm://com.palm.applicationManager", {
								method: "open",
								parameters: {
									target: "http://untappd.com/create"
								}
							});
	},
	
	login: function(username, password) {
		
		this.showSceneSpinner($L("Checking account..."));
		var untappd = new UntappdApi(TPPD.ApiKey, TPPD.ApiSecret, username, password);
		
		var login = untappd.userInfo(null, this.loginSuccess.bind(this), this.loginFailure.bind(this));

	},
	
	loginSuccess: function(response) {
		Mojo.Log.info("Success login!: %j", response);
		
		if (response.user) {
			
			// we found ourself, so login worked!
			this.prefs.username = this.username;
			this.prefs.password = this.password;
			
			TPPD.savePrefs();

			TPPD.currentUser = response.user;
			// this.controller.get('loginForm').hide();

			this.startTimer = this.controller.window.setTimeout(function(t) {
				t.hideSceneSpinner();
				t.startApp();
			}, 500, this);

		}
	},
	loginFailure: function(response) {
		Mojo.Log.info("Login failed! %j", response);

		this.controller.get('loginButton').mojo.deactivate();
		this.loginButtonModel.disabled = false;
		this.controller.modelChanged(this.loginButtonModel);
		
		this.hideSceneSpinner();
		errorDialog(response.responseJSON.error, this.controller.window);
		// Mojo.Controller.errorDialog(response.responseJSON.error, this.controller.window);
	}
	
};
