function HelpAssistant() {}

HelpAssistant.prototype.setup = function() {
	
	this.controller.get("appName").update(Mojo.appInfo.title);
	this.controller.get("appVersion").update(Mojo.appInfo.version + " " + $L("by #{vendor}").interpolate(Mojo.appInfo));

	this.cmdMenuModel = {
		visible: true,
		items: [
			{items: [
				{label: "Back", icon: "back", command: 'do-back', disabled: false},
			]},
		]
	};
	this.controller.setupWidget(Mojo.Menu.commandMenu, {
			menuClass:'no-fade'
		},
		this.cmdMenuModel);
};

HelpAssistant.prototype.activate = function(event) {};

HelpAssistant.prototype.deactivate = function(event) {};

HelpAssistant.prototype.cleanup = function(event) {};

HelpAssistant.prototype.handleCommand = function(event) {
	
	if (event.type == Mojo.Event.command) {
		switch (event.command) {
			case 'do-back':
				this.controller.stageController.popScene();
				break;
			
		}
		
	}
	
	
};


