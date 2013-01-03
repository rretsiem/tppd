function MainAssistant(params) {

	this.searchTerm = null;
	if (params && params.action == "search") {
		this.searchTerm = params.q;
	}

	this.availPanes = TPPD.availPanes;

	this.currentPanel = 0; // index of the first displayed panel;
	this.internetAvail = false;
	this.models = [];

	this.refreshActive = [];
	this.refreshInterval = undefined;
	this.timesUpdater = undefined;

	// make sure a back gesture is not interpreted false
	this.metaKeyPressed = false;
	
	// trending defaults
	this.trendingType = "all";
	this.trendingAge = "daily";
	
	this.trendingBeers = [];
	this.recentBeers = [];
	this.searchBeers = [];

	this.listenersCreated = false;

	this.prefs = TPPD.getPrefs();

	this.untappd = new UntappdApi(TPPD.ApiKey, TPPD.ApiSecret, this.prefs.username, this.prefs.password);

}

MainAssistant.prototype.setup = function() {
	Mojo.Log.info("MainAssistant setup called...");
	
	if (this.controller.stageController.setWindowOrientation) {
		this.controller.stageController.setWindowOrientation("up");
	}
	
	this.screenWidth = this.controller.window.innerWidth;
	this.screenHeight = this.controller.window.innerHeight;

	// setup the menus
	this.controller.setupWidget(Mojo.Menu.appMenu, TPPD.appMenuAttributes, TPPD.appMenuModel);

	// command menu
	this.cmdMenuModel = {
		visible: false,
		items: [
			{},
			{label: $L("Continue..."), command: 'do-continue'},
			{}
		]
	};
	this.controller.setupWidget(Mojo.Menu.commandMenu, {menuClass: 'no-fade'}, this.cmdMenuModel);

	this.controller.setupWidget ('spinner-small', 
		this.spinnerSmallAttributes = {
			spinnerSize: Mojo.Widget.spinnerSmall,
		}, this.spinnerSmallModel = {
			spinning: false
		}
	);

	// setup navigation scroller
	this.navigationScrollModel = {
		snapIndex: 0
	};

	// setup headline scroller (upper horizontal scroller)
	this.controller.setupWidget("navigationScroller", {
		mode: "horizontal"
	}, this.navigationScrollModel);

	// setup content-scroller
	var elements = [];
	this.controller.setupWidget("contentScroller", {
		mode: "horizontal-snap"
	}, this.contentScrollerModel = {
		snapElements: {
			x: elements
		},
		snapIndex: 0
	});


	// post comment textfield
	this.postCommentTextFieldModel = {
		disabled: false,
		value: ''
	};
	this.controller.setupWidget('post-comment-body', {
		hintText: "...",
		focus: true,
		multiline: true,
		autoFocus: true,
		changeOnKeyPress: true,
		enterSubmits: false
	}, this.postCommentTextFieldModel);
	this.postCommentTextField = this.controller.get('post-comment-body');
	this.postCommentTextFieldHandler = this.postCommentTextFieldChange.bind(this);
	this.controller.listen(this.postCommentTextField, Mojo.Event.propertyChange, this.postCommentTextFieldHandler);

	// setup search inputs
	this.searchFieldAttr = {
		hintText: $L("Beer..."),
		textCase: Mojo.Widget.steModeLowerCase,
		focusMode: Mojo.Widget.focusSelectMode,
		changeOnKeyPress: true,
		autoFocus: true,
	};
	this.searchFieldModel = {
		disabled: false,
		value: ''
	};
	this.controller.setupWidget("search-pane-field", this.searchFieldAttr, this.searchFieldModel);
	this.searchPaneField = this.controller.get("search-pane-field");

	// handlers
	this.sceneScrimTapHandler = this.sceneScrimTaped.bind(this);
	this.showFriendFeedDetailsHandler = this.showFriendFeedDetails.bind(this);
	this.showPostCommentHandler = this.showPostComment.bind(this);
	this.navigationTappedHandler = this.navigationTapped.bind(this);
	this.navigationScrollerHandler = this.navigationScrollerChanged.bind(this);

	this.contentScrollerChangedHandler = this.contentScrollerChanged.bind(this);
	this.contentTappedHandler = this.contentTapped.bind(this);

	this.getEnabledNavItems();
	this.setupNavItems();

	this.setupContentPanels();

	// listeners
	this.controller.listen('scene-scrim', Mojo.Event.tap, this.sceneScrimTapHandler);
	//this.controller.listen('contentScroller', Mojo.Event.tap, function() {
	//	this.showFriendFeedDetailsHandler();
	//}.bind(this));

	Mojo.Log.info("setup done...");
};

MainAssistant.prototype.aboutToActivate = function(callback) {
	callback.defer();
};

MainAssistant.prototype.activate = function(params) {

	// some listeners only when stage is activated	
	this.controller.listen("navigationScroller", Mojo.Event.propertyChange, this.navigationScrollerHandler);
	this.controller.listen("contentScroller", Mojo.Event.propertyChange, this.contentScrollerChangedHandler);
	this.controller.listen("navigationContainer", Mojo.Event.tap, this.navigationTappedHandler);

	// this.showCommandMenu();
	if ((params && params.action == "search") || this.searchTerm) {
		if (!this.searchTerm) {
			this.searchTerm = params.q;
		}
		this.initSearch(this.searchTerm);
	} else {
		this.setupAndCheckContent(this.currentPanel);
	}

	this.handleKeyPressHandler = this.handleKeyPress.bind(this);
	this.controller.document.addEventListener("keydown", this.handleKeyPressHandler, true);

};

MainAssistant.prototype.deactivate = function(event) {
	// make sure a back gesture is not interpreted false
	this.metaKeyPressed = false;
	
	Mojo.Log.info("main-assistant deactivate called...");

	this.controller.document.removeEventListener("keydown", this.handleKeyPressHandler, true);

	this.controller.stopListening("navigationScroller", Mojo.Event.propertyChange, this.navigationScrollerHandler);
	this.controller.stopListening("contentScroller", Mojo.Event.propertyChange, this.contentScrollerChangedHandler);
	this.controller.stopListening("navigationContainer", Mojo.Event.tap, this.navigationTappedHandler);

};

MainAssistant.prototype.cleanup = function(event) {
	this.controller.stopListening(this.postCommentTextField, Mojo.Event.propertyChange, this.postCommentTextFieldHandler);
	this.controller.stopListening('scene-scrim', Mojo.Event.tap, this.sceneScrimTapHandler);
};

MainAssistant.prototype.anyPanesOpen = function() {
	
	var panes;

	panes = this.availPanes.findAll(function(item) {
		return item.showing === true;
	});

	return panes;
};

MainAssistant.prototype.isPaneOpen = function(pane) {

	if (!pane) {
		return false;
	}

	var panes;
	panes = this.availPanes.find(function(item) {
		return pane == item.name && item.showing === true;
	});
	
	if (panes) {
		return true;
	} else {
		return false;
	}

};

MainAssistant.prototype.togglePane = function(show, pane, params) {

	var item = this.availPanes.find(function(fp) {
		return pane == fp.name;
	});
Mojo.Log.info("ITEM: %j", item);
	if (item) {
		// set state of pane
		item.showing = (show) ? true : false;
	} else {
		return false;
	}

	switch(item.name) {
		case 'searchPane':
			(show) ? this.showSearch() : this.hideSearchPane();
			break;
		case 'postCommentPane':
			(show) ? this.showPostComment(params) : this.hidePostComment();
			break;
		case 'friendFeedPane':
			(show) ? this.showFriendFeedDetails(params) : this.hideFriendFeedDetails();
			break;
		case 'venueSearchPane':
			(show) ? this.showVenueSearch() : this.hideVenueSearch();
			break;
		case 'checkinPane':
			(show) ? this.showCheckin() : this.hideCheckin();
			break;
		case 'beerDetailsPane':
			(show) ? this.showBeerDetails(params) : this.hideBeerDetails();
			break;
		case 'checkinSuccessPane':
			(show) ? this.showCheckinSuccess(params) : this.hideCheckinSuccess();
			break;
	}
	
	if (!show && this.anyPanesOpen().length === 0) {
		this.controller.get('scene-scrim').hide();
	} else {
		this.controller.get('scene-scrim').setStyle({'display': 'block'});
	}

	return item;

};

MainAssistant.prototype.handleCommand = function(event) {
	// checking for back event and hiding panes if a panel is shown
	if (event.type === Mojo.Event.back) {
		if (this.hideAllPanes(false)) {
			event.stop();
		}
		return;
	}
	
	if (event.type == Mojo.Event.command) {
		switch(event.command) {
			case 'cmdAddComment':
				this.togglePane(true, 'postCommentPane', this.showFriendFeedItem);
				break;
			case 'cmdAddToWishList':
				this.addToWishList();
				break;
			case 'cmdSendComment':
				this.submitComment();
				break;
			case 'cmdToastCheckin':
				this.toastCheckin(this.showFriendFeedItem);
				break;
			case 'cmdRemoveToast':
				this.removeToastCheckin(this.showFriendFeedItem);
				break;
			case 'cmdSubmitSearch':
				this.submitSearch();
				break;
			case 'cmdShowSearch':
				// this.showSearch();
				this.togglePane(true, 'searchPane', null);
				break;
			case 'cmdCloseVenueSearch':
				this.selectedVenue = null;
				this.controller.get("checkin-details-location").update("");
				// if (TPPD.currentUser.social_accounts.foursquare) {
					this.controller.get('checkin-share-foursquare-title').addClassName('toggleDisabled');
					this.checkinToggleFoursquareModel.disabled = true;
					this.checkinToggleFoursquareModel.value = false;
					this.controller.modelChanged(this.checkinToggleFoursquareModel);
				// }
				this.togglePane(false, 'venueSearchPane', null);
				break;
			case 'cmdSubmitVenueSearch':
				this.submitVenueSearch();
				break;
			case 'cmdBeerCheckin':
				this.togglePane(true, 'checkinPane', null);
				break;
			case 'cmdShowVenueSearch':
				this.togglePane(true, 'venueSearchPane', null);
				break;
			case 'cmdSubmitCheckin':
				this.submitCheckin();
				break;
			case 'cmdCloseCheckinSuccess':
				this.togglePane(false, 'checkinSuccessPane', null);
				break;
			case 'cmdRefreshFriendFeed':
				this.getFriendFeed();
				break;
			case 'cmdRefreshPubFeed':
				this.getPubFeed();
				break;
			case 'cmdRemoveFromWishList':
				this.removeFromWishList();
				break;
		}
	
		return;
	}
};

MainAssistant.prototype.handleKeyPress = function(event) {

	var panelId = this.enabledNavItems[this.currentPanel].id;

	if (panelId == "checkin") {
		if (event.keyCode !== Mojo.Char.escape && event.keyCode !== Mojo.Char.metaKey && !this.isPaneOpen('searchPane')) {
			var panes = this.anyPanesOpen();
			// only open search pane if no other pane is open here...
			if (panes && panes.length == 0) {
				this.togglePane(true, 'searchPane', null);
			}
		}
		if (Mojo.Char.isEnterKey(event.keyCode)) {
			if (this.isPaneOpen('searchPane')) {
				// enter was hit, start the search
				this.submitSearch();
			} else if (this.isPaneOpen('venueSearchPane')) {
				this.submitVenueSearch();
			}
		}
		
		if (Mojo.Char.isEnterKey(event.keyCode) && this.isPaneOpen('searchPane')) {
			// enter was hit, start the search
			this.submitSearch();
		}
	}

};

MainAssistant.prototype.hideAllPanes = function(closeAll) {
	var hadOpenPanes = false;

	var that = this;

	var panes = this.anyPanesOpen();
	if (panes && panes.length > 0) {
		
		// handle special cases
		if (this.isPaneOpen('checkinSuccessPane') && this.isPaneOpen('beerDetailsPane')) {
			// recommendations tapped on checkin success, close only beerDetails
			this.togglePane(false, 'beerDetailsPane', null);
		} else {
			panes.each(function(item) {
				that.togglePane(false, item.name, null);
			});
		}
		hadOpenPanes = true;
	}

	return hadOpenPanes;
};

MainAssistant.prototype.navigationTapped = function(event) {
	var id = event.target.id.replace("-nav-item", ""); // we only need the first id
	var idx = findUnitIndex(id, this.enabledNavItems, "id");

	var currentPanel = this.contentScrollerModel.snapIndex;
	if (currentPanel === idx) {
		// jump to top of the list, because user tapped the current active headline, not another one
		this.controller.get(id + "-scroller").mojo.setState({left: 0, top: 0}, true);
	} else {
		this.scrollContentTo(idx);
		this.scrollNavigationTo(idx);
	}

};

MainAssistant.prototype.navigationScrollerChanged = function(event) {
	this.currentPanel = event.value;

	this.getEnabledNavItems();

	var panel = this.enabledNavItems[event.value];

	this.setActiveNavItem(panel.id);
	this.scrollContentTo(this.currentPanel);
};

MainAssistant.prototype.setupAndCheckContent = function(panel) {

	switch (this.enabledNavItems[panel].id) {
		case "friends":
			if (!this.enabledNavItems[panel].model.items.length) {
				this.getFriendFeed();
			}
			break;
		case "pub":
			if (!this.enabledNavItems[panel].model.items.length) {
				this.getPubFeed();
			}
			break;
		case "checkin":
			if (!this.searchResultsModel.items.length) {
				// no items in searchResultsList, request default
				this.getPublicTrending(true);
				this.getRecentBeers(true);
				// reset eventually stored items
				this.checkinBeerItem = null;
				this.selectedVenue = null;
			}
			break;
		case "tab":
			break;
	}
	
	this.showCommandMenu();
	
};

MainAssistant.prototype.contentScrollerChanged = function(event) {
	this.currentPanel = event.value;
	this.scrollNavigationTo(this.currentPanel);
	// set correct command menu

	this.setupAndCheckContent(this.currentPanel);

	this.showCommandMenu();
};

MainAssistant.prototype.setActiveNavItem = function(id) {
	// get all available header items
	var scrollNodes = this.controller.document.querySelectorAll(".active");
	if (scrollNodes && scrollNodes.length > 0) {
		for (var i = 0; i < scrollNodes.length; i++) {
			scrollNodes[i].removeClassName("active");
		}
	}

	this.controller.get(id + "-nav-item").addClassName("active");
};

MainAssistant.prototype.scrollNavigationTo = function(index) {
	var position = 0;
	var elements = this.navigationElements;
	for (var i=0; i <= index; i++) {
		position = position + elements[i].scrollWidth;
	}
	position = position - elements[index].scrollWidth - 10; // set back one element to the beginning
	Mojo.Log.info("position is: ", position);

	// this.controller.get("headlineScroller").mojo.setSnapIndex(index, true);
	this.controller.get("navigationScroller").mojo.setState({left: -position, top: 0}, true);
	this.getEnabledNavItems();

	this.setActiveNavItem(this.enabledNavItems[index].id);
};

MainAssistant.prototype.contentTapped = function(event) {
	Mojo.Log.info("list item tapped...");

	// check which panel either feed or pub
	switch(this.enabledNavItems[this.currentPanel].id) {
		case 'friends':
			this.togglePane(true, 'friendFeedPane', event.item);
		break;
		case 'pub':
			this.togglePane(true, 'friendFeedPane', event.item);
		break;
	}

};

/**
 * getEnabledNavItems
 */
MainAssistant.prototype.getEnabledNavItems = function() {
	var navItems = TPPD.Panels.findAll(function(item){
		return item.enabled === true;
	});

	this.enabledNavItems = TPPD.sortByIndex(navItems);
	
};

/**
 * create or destry navigation items in top scroller
 */
MainAssistant.prototype.setupNavItems = function() {
	
	var width = 0, panel, content;

	// first check if elements exist already, if yes remove them...
	var scrollNodes = this.controller.document.querySelectorAll(".nav-item");
	if (scrollNodes.length) {
		Mojo.Log.info("removing scrollnodes first...");
		for (var i = 0; i < scrollNodes.length; i++) {
			scrollNodes[i].remove();
		}
	}

	panel = this.controller.get("navigationContainer");
	for (var i = 0; i < this.enabledNavItems.length; i++) {
		var cssClass = "";
		if (i === this.currentPanel) {
			cssClass = "active";
		}
		content = new Element("div", {
			"id": this.enabledNavItems[i].id + "-nav-item",
			"class": "nav-item " + cssClass
		}).update(this.enabledNavItems[i].label);
		panel.insert(content);
		width += content.getWidth(); // get calculated width of created element (for long texts...)
	}
	// adjust the container
	this.controller.get("navigationContainer").setStyle({
		"width": width + "px"
	});

	// retrieve created items inside scroller to set the snapElements
	var scrollNodes = this.controller.document.querySelectorAll(".nav-item");
	this.navigationElements = [];
	for (var i = 0; i < scrollNodes.length; i++) {
		this.navigationElements.push(scrollNodes[i]);
	}
	
	this.navigationScrollModel.snapElements = {
		x: this.navigationElements
	};
	this.controller.modelChanged(this.navigationScrollModel);

};

MainAssistant.prototype.setupContentPanels = function() {
	Mojo.Log.info("creating content panels...");
	// creating topic panels...
	var content, html, panel;

	// first check if elements exist already, if yes remove them...
	var scrollNodes = this.controller.document.querySelectorAll(".panel");
	if (scrollNodes.length) {
		Mojo.Log.info("remove scrollItems first...");
		for (var i = 0; i < scrollNodes.length; i++) {
			scrollNodes[i].remove();
			// TODO: remove listeners...
		}
	}

	this.enabledNavItems.each(function(item){
		
		switch(item.type) {
			case "feed":
				this.createFeedPanel(item);
			break;
			case "pub":
				this.createPubPanel(item);
			break;
			case "checkin":
				this.createCheckinPanel(item);
			break;
			case "info":
				this.createInfoPanel(item);
		}

	}.bind(this));

	// we need to call this to setupWidgets NOW!
	this.controller.instantiateChildWidgets(this.controller.get("scrollItems"));

	this.setScrollerSizes();
	// setup the sidescroller
	var scrollNodes = this.controller.document.querySelectorAll(".panel");
	var elements = [];
	for (var i = 0; i < scrollNodes.length; i++) {
		elements.push(scrollNodes[i]);
	}

	this.contentScrollerModel.snapElements = {
		x: elements
	}
	this.controller.modelChanged(this.contentScrollerModel);

	this.setupListeners();
};

MainAssistant.prototype.createFeedPanel = function(item) {
	
	content = Mojo.View.render({
		object: item,
		template: "partials/panel-tpl"
	});

	this.controller.get("scrollItems").insert(content);
	this.controller.setupWidget(item.id + "-scroller", {
		mode: "vertical"
	}, {});

	item.model = {
		disabled: false,
		items: item.model.items
	};
	this.controller.setupWidget(item.id + "-list", {
		itemTemplate: "partials/content-item",
		listTemplate: "partials/list",
		renderLimit: 100
	}, item.model);

	this.controller.listen(item.id + "-list", Mojo.Event.listTap, this.contentTappedHandler);

};

MainAssistant.prototype.createPubPanel = function(item) {

	content = Mojo.View.render({
		object: item,
		template: "partials/panel-tpl"
	});

	this.controller.get("scrollItems").insert(content);
	this.controller.setupWidget(item.id + "-scroller", {
		mode: "vertical"
	}, {});

	item.model = {
		disabled: false,
		items: item.model.items
	};
	this.controller.setupWidget(item.id + "-list", {
		itemTemplate: "partials/content-item",
		listTemplate: "partials/list",
		renderLimit: 100
	}, item.model);

	this.controller.listen(item.id + "-list", Mojo.Event.listTap, this.contentTappedHandler);

};

MainAssistant.prototype.createCheckinPanel = function(item) {

	Mojo.Log.info("creating drink up panel...");
	content = Mojo.View.render({
		object: item,
		template: "partials/drinkup/panel-tpl"
	});

	this.controller.get("scrollItems").insert(content);
	this.controller.setupWidget(item.id + "-scroller", {
		mode: "vertical"
	}, {});

	this.searchResultsModel = {
		items: []
	};
	this.controller.setupWidget("resultList", {
		itemTemplate: "partials/drinkup/resultItem-tpl",
		dividerTemplate: "partials/drinkup/divider-tpl",
		dividerFunction: this.groupSearchResults
	}, this.searchResultsModel);
	
	// this.getPublicTrending(true);
	// this.getRecentBeers(true);

	// this.showVenueSearch();
	// this.getVenues();
	// this.showCheckin();

};

MainAssistant.prototype.setupListeners = function() {
	// this.searchButtonTapHandler = this.searchButtonTap.bind(this);
	this.searchListTapHandler = this.searchListTap.bind(this);
	this.controller.listen(this.controller.get("resultList"), Mojo.Event.listTap, this.searchListTapHandler);

	this.listenersCreated = true;
};

MainAssistant.prototype.destroyListeners = function() {

	if (this.listenersCreated) {
		// stop only if correclty setup all listeners
		this.controller.stopListening(this.controller.get("resultList"), Mojo.Event.listTap, this.searchListTapHandler);
		this.listenersCreated = false;
	}
};

MainAssistant.prototype.searchListTap = function(event) {
	Mojo.Log.info("resultList tapped: %j", event.item);
	// this.showBeerDetails(event.item);
	this.togglePane(true, 'beerDetailsPane', event.item);
}

MainAssistant.prototype.beerSearchSuccess = function(response) {
	Mojo.Log.info("Result is: %j", response);
	
	this.searchInProgress = false;

	this.searchBeers = response;

	this.mergeSearchResultList();

	// this.searchResultsModel.items = response;
	this.controller.modelChanged(this.searchResultsModel);
	
	this.cmdMenuModel.items[1].disabled = false;
	this.controller.modelChanged(this.cmdMenuModel);

	this.controller.get(this.enabledNavItems[this.currentPanel].id + "-scroller").mojo.scrollTo(0, 0, true);

	this.hideAllPanes();
	toggleSmallSpinner("stop", this);

	// null launchparams searchTerm
	this.searchTerm = null;
}

MainAssistant.prototype.beerSearchFailed = function(response) {
	// this.controller.get("searchButton").mojo.deactivate();

	this.searchInProgress = false;

	this.cmdMenuModel.items[1].disabled = false;
	this.controller.modelChanged(this.cmdMenuModel);

	Mojo.Log.error("error in getting beer search: %j", response);

	toggleSmallSpinner("stop", this);

	errorDialog(response, this.controller.window);

	// null launchparams searchTerm
	this.searchTerm = null;

};

MainAssistant.prototype.groupSearchResults = function(item) {
	if (item.group) {
		return item.group;
	} else {
		return "Search Results";
	}
};

MainAssistant.prototype.groupVenueSearchResults = function(item) {
	if (item.group) {
		return item.group;
	} else {
		return "Search Results";
	}
};

MainAssistant.prototype.createInfoPanel = function(item) {

	Mojo.Log.info("creating info panel...");
	content = Mojo.View.render({
		object: item,
		template: "partials/yourtab/panel-tpl"
	});

	this.controller.get("scrollItems").insert(content);
	this.controller.setupWidget(item.id + "-scroller", {
		mode: "vertical"
	}, {});
};


MainAssistant.prototype.setScrollerSizes = function() {

	var screenHeight = this.controller.window.innerHeight;
	var screenWidth = this.controller.window.innerWidth;
	var height = screenHeight - 56; // 56px is current size of header + separator
	var scrollNodes = this.controller.document.querySelectorAll(".panel");
	var panel;
	var elements = [];

	// first adjust scene-wrapper
	this.controller.get("scene-wrapper").setStyle({
		"height": screenHeight + "px"
	});

	for (var i = 0; i < scrollNodes.length; i++) {
		panel = scrollNodes[i];
		panel.setStyle({
			"width": screenWidth - 20 + "px"
		});

		this.controller.get(this.enabledNavItems[i].id + "-scroller").setStyle({
			"max-height": height + "px"
			});
			elements.push(scrollNodes[i]);
	}

	this.controller.get("scrollItems").setStyle({
		"width": (this.enabledNavItems.length * screenWidth) + "px"
	});

	this.contentScrollerModel.snapElements = {
		x: elements
	}
	this.controller.modelChanged(this.contentScrollerModel);

};

/**
 * drink up function
 */
MainAssistant.prototype.showDrinkup = function() {

};

/**
 * got friend feed functions...
 */
MainAssistant.prototype.getFriendFeed = function(panel) {
	Mojo.Log.info("getting friend feed");
	toggleSmallSpinner("start", this);
	
	this.untappd.myFriendFeed(null, null, this.gotFriendFeedSuccess.bind(this), this.gotFriendFeedFailed.bind(this));
};

MainAssistant.prototype.gotFriendFeedSuccess = function(response) {
	Mojo.Log.info("Result is: %j", response);
	// var id = 0; // for now hard-coded
	var panel = this.enabledNavItems.find(function(item) {
		return item.id === "friends";
	});
	var id = panel.index;
	// var panel = this.enabledNavItems[id];
	
	panel.model.items = response;
	
	panel.model.items.each(function(item) {
		item.relative_created_at = getRelativeTime(item.created_at);
		
		if (item.venue_id > 0) {
			item.hasLocation = "content-haslocation";
		}
		
	});

	this.controller.get(this.enabledNavItems[id].id + "-list").mojo.noticeUpdatedItems(0, this.enabledNavItems[id].model.items);
	toggleSmallSpinner("stop", this);

};

MainAssistant.prototype.gotFriendFeedFailed = function(response) {
	Mojo.Log.error("error in getting friend feed: %j", response);
	toggleSmallSpinner("stop", this);

	errorDialog(response, this.controller.window);
};

/**
 * got friend feed functions...
 */
MainAssistant.prototype.getPubFeed = function(panel) {
	Mojo.Log.info("getting pub feed");
	toggleSmallSpinner("start", this);
	
	this.untappd.publicFeed(null, null, null, null, this.gotPubFeedSuccess.bind(this), this.gotPubFeedFailed.bind(this));
};

MainAssistant.prototype.gotPubFeedSuccess = function(response) {
	Mojo.Log.info("Result is: %j", response);

	var id = findUnitIndex('pub', this.enabledNavItems, 'id');
	var panel = this.enabledNavItems[id];

	panel.model.items = response;
	
	panel.model.items.each(function(item) {
		item.relative_created_at = getRelativeTime(item.created_at);
		
		if (item.venue_id > 0) {
			item.hasLocation = "content-haslocation";
		}
	});

	this.controller.get(this.enabledNavItems[id].id + "-list").mojo.noticeUpdatedItems(0, this.enabledNavItems[id].model.items);
	toggleSmallSpinner("stop", this);

};

MainAssistant.prototype.gotPubFeedFailed = function(response) {
	Mojo.Log.error("error in getting friend feed: %j", response);
	toggleSmallSpinner("stop", this);

	errorDialog(response, this.controller.window);
};

MainAssistant.prototype.scrollContentTo = function(index) {
	this.controller.get("contentScroller").mojo.setSnapIndex(index, true)
};

MainAssistant.prototype.postCommentTextFieldChange = function(event) {
	this.updatePostCommentCharCount();
};

MainAssistant.prototype.updatePostCommentCharCount = function() {
	var commentLength = this.postCommentTextFieldModel.value.length;

	this.controller.get('post-comment-char-count').update(140 - commentLength);
	
	// add red class when not already set and length exceeds limit (135, max 140!)
	if (commentLength > 130 && !(this.controller.get('post-comment-char-count').hasClassName('red'))) {
		this.controller.get('post-comment-char-count').addClassName('red');
	}
	
	if (commentLength < 130 && (this.controller.get('post-comment-char-count').hasClassName('red'))) {
		this.controller.get('post-comment-char-count').removeClassName('red');
	}

	// disable send button of no message of length exceeds maxLength
	this.cmdMenuModel.items[0].disabled = false;
	if (commentLength <= 0 || commentLength > 140) {
		this.cmdMenuModel.items[0].disabled = true;
	}
	this.controller.modelChanged(this.cmdMenuModel);
	
};

MainAssistant.prototype.updateCheckinDetailsCommentCharCount = function() {
	var commentLength = this.checkinCommentTextFieldModel.value.length;
	var countElem = this.controller.get('checkin-details-comment-char-count');

	countElem.update(140 - commentLength);
	
	
	// add red class when not already set and length exceeds limit (135, max 140!)
	if (commentLength > 130 && !(countElem.hasClassName('red'))) {
		countElem.addClassName('red');
	}
	
	if (commentLength < 130 && (countElem.hasClassName('red'))) {
		countElem.removeClassName('red');
	}

	// disable send button of no message of length exceeds maxLength
	this.cmdMenuModel.items[1].disabled = false;
	if (commentLength > 140) {
		this.cmdMenuModel.items[1].disabled = true;
	}
	this.controller.modelChanged(this.cmdMenuModel);
	
};


MainAssistant.prototype.showCommandMenu = function(action) {
	Mojo.Log.info("showing commandMenu with action: ", action);

	this.hideCommandMenu();
	this.controller.window.setTimeout(function(t) {
		t.controller.setMenuVisible(Mojo.Menu.commandMenu, true);
	}, 350, this);

	switch(action) {
	case 'friendFeedDetails':
	    this.cmdMenuModel.items = TPPD.cmdMenuItems.friendFeedDetails;
		break;
	case 'friendFeed':
	    this.cmdMenuModel.items = TPPD.cmdMenuItems.friendFeed;
		break;
	case 'postComment':
	    this.cmdMenuModel.items = TPPD.cmdMenuItems.postComment;
		break;
	case 'searchPane':
		this.cmdMenuModel.items = TPPD.cmdMenuItems.searchPane;
		break;
	case 'showSearchBox':
		this.cmdMenuModel.items = TPPD.cmdMenuItems.showSearchBox;
		break;
	case 'beerDetails':
		this.cmdMenuModel.items = TPPD.cmdMenuItems.beerDetails;
		break;
	case 'venueSearch':
		this.cmdMenuModel.items = TPPD.cmdMenuItems.venueSearch;
		break;
	case 'checkinDetails':
		this.cmdMenuModel.items = TPPD.cmdMenuItems.checkinDetails;
		break;
	case 'checkinSuccess':
		this.cmdMenuModel.items = TPPD.cmdMenuItems.checkinSuccess;
		break;
	default:
		var paneDefault = this.enabledNavItems[this.currentPanel].cmdMenu;
		this.cmdMenuModel.items = TPPD.cmdMenuItems[paneDefault];
	}

	this.controller.modelChanged(this.cmdMenuModel);
	
};

MainAssistant.prototype.hideCommandMenu = function() {
	this.controller.setMenuVisible(Mojo.Menu.commandMenu, false);
};

MainAssistant.prototype.showFriendFeedDetails = function(item) {
	if (!item) {
//		return;
	}

	this.showFriendFeedPane = true;
	this.showFriendFeedItem = item;
	
	this.renderFriendFeedDetails(item);
//	this.controller.get('scene-scrim').setStyle({'display': 'block'});
	this.controller.get('friendfeed-pane').setStyle({'bottom': '0px'});

	this.showCommandMenu('friendFeedDetails');

};

MainAssistant.prototype.hideFriendFeedDetails = function() {
	this.showFriendFeedPane = false;
	this.showFriendFeedItem = null;

	// this.controller.get('scene-scrim').hide();
	this.controller.get('friendfeed-pane').setStyle({'bottom': '-400px'});

	this.showCommandMenu();
};

MainAssistant.prototype.renderFriendFeedDetails = function(item) {

	var screenWidth = this.screenWidth;
	// we add a google maps image to the pane
	if (item.venue_id > 0) {
		var gmapUrl = "http://maps.google.com/maps/api/staticmap?";
		var gmapParams = $H({
			center: item.venue_lat + "," + item.venue_lng,
			zoom: 15,
			size: parseInt(this.screenWidth / 100 * 94, 10) + 'x100', // calculate actual screenwidth as set in CSS
			markers: 'color:orange|' + item.venue_lat + ',' + item.venue_lng,
			sensor: false
		});
		gmapUrl = gmapUrl + gmapParams.toQueryString();
	
		var image = "<img id='friendfeed-details-location-image' src=' " + gmapUrl + "' />";
		item.googleMap = image;
	}

	this.showFriendFeedItem = item;

	var friendFeedContent = Mojo.View.render({
		object: item,
		template: 'partials/friendfeed/friendfeed-pane-tpl'
	});

	this.controller.get('friendfeed-pane').innerHTML = friendFeedContent;	

	// friendfeed elements
	this.controller.setupWidget('friendfeed-details-scroller', {
		mode: 'vertical'
	}, {});
	
	this.controller.setupWidget('friendfeed-comments-spinner', {
		spinnerSize: 'small'
	},
		this.friendfeedCommentsSpinnerModel = {
			spinning: true
	});

	this.friendFeedCommentsListModel = {
		items: [],
		renderLimit: 10
	};

	this.controller.setupWidget('friendfeed-comments-list', {
		itemTemplate: 'partials/friendfeed/comment-item',
		listTemplate: 'partials/list',
		nullTemplate: 'partials/friendfeed/empty-list'
	}, this.friendFeedCommentsListModel );
	this.controller.instantiateChildWidgets(this.controller.get("friendfeed-pane"));

	this.controller.get('friendfeed-comments-spinner').mojo.start();
	this.untappd.checkinInfo(item.checkin_id, this.gotCheckinInfoSuccess.bind(this), this.gotCheckinInfoFailed.bind(this))

};

MainAssistant.prototype.showBeerDetails = function(item) {
	if (!item) {
		return;
	}
	
	// if (this.isPaneOpen('beerDetailsPane')) {
	//	this.togglePane(false, 'beerDetailsPane', null);
	//}

	this.untappd.beerInfo(item.beer_id, this.gotBeerInfoSuccess.bind(this), this.gotBeerInfoFailed.bind(this));

	this.showBeerPane = true;
	this.showBeerItem = item;
	
	this.renderBeerDetails(item);
//	this.controller.get('scene-scrim').setStyle({'display': 'block'});
	this.controller.get('beerDetails-pane').setStyle({'bottom': '0px'});

	this.showCommandMenu('beerDetails');
};

MainAssistant.prototype.hideBeerDetails = function() {
	this.showBeerPane = false;
	this.showBeerItem = null;

	// handle info from checkin success pane
	if (this.isPaneOpen('checkinSuccessPane')) {
		this.showCommandMenu('checkinSuccess');
	} else {
//		this.controller.get('scene-scrim').hide();
		this.showCommandMenu();
	}

	this.controller.get('beerDetails-pane').setStyle({'bottom': '-400px'});

};

MainAssistant.prototype.renderBeerDetails = function(item) {

	item.your_count = item.your_count || "-";

	this.showBeerItem = item;

	var beerDetailsContent = Mojo.View.render({
		object: item,
		template: 'partials/drinkup/beerDetails-pane-tpl'
	});

	this.controller.get('beerDetails-pane').innerHTML = beerDetailsContent;

};

MainAssistant.prototype.showVenueSearch = function() {

	this.showVenueSearchPane = true;

	this.renderVenueSearchDetails();
//	this.controller.get('scene-scrim').setStyle({'display': 'block'});
	this.controller.get('venueSearch-pane').setStyle({'bottom': '0px'});

	this.showCommandMenu('venueSearch');
};

MainAssistant.prototype.hideVenueSearch = function() {
	this.showVenueSearchPane = false;

//	this.controller.get('scene-scrim').hide();
	this.controller.get('venueSearch-pane').setStyle({'bottom': '-480px'});

	// TODO: back to checkin from here, not to parent pane!!! //
	this.controller.stopListening("venue-search-list", Mojo.Event.listTap, this.venueSearchListHandler);

	this.showCommandMenu("checkinDetails");
};

MainAssistant.prototype.renderVenueSearchDetails = function() {

	var item = {};
	var venueSearchContent = Mojo.View.render({
		object: item,
		template: 'partials/venues/venue-pane-tpl'
	});
	
	this.controller.get('venueSearch-pane').innerHTML = venueSearchContent;

	this.venueSearchScrollerModel = {};
	this.controller.setupWidget("venue-search-scroller", {
		mode: "vertical"
	}, this.venueSearchScrollerModel);

	this.venueSearchListModel = {
		items: []
	};
	this.controller.setupWidget("venue-search-list", {
		itemTemplate: "partials/venues/venue-item",
		listTemplate: "partials/list",
		dividerTemplate: "partials/venues/divider-tpl",
		dividerFunction: this.groupVenueSearchResults,
		renderLimit: 50
	}, this.venueSearchListModel);

	// setup search inputs
	this.venueSearchFieldAttr = {
		hintText: $L("search..."),
		textCase: Mojo.Widget.steModeLowerCase,
		focusMode: Mojo.Widget.focusSelectMode,
		changeOnKeyPress: true,
		autoFocus: true,
	};
	this.venueSearchFieldModel = {
		disabled: false,
		value: ''
	};
	this.controller.setupWidget("venue-search-field", this.venueSearchFieldAttr, this.venueSearchFieldModel);

	// we need to call this to setupWidgets NOW!
	this.controller.instantiateChildWidgets(this.controller.get("venueSearch-pane"));

	this.venueSearchListHandler = this.venueSearchListTap.bind(this);
	this.controller.listen("venue-search-list", Mojo.Event.listTap, this.venueSearchListHandler);

};

MainAssistant.prototype.venueSearchListTap = function(event) {
	Mojo.Log.info("venue selected!");
	this.selectedVenue = null;

	if (event.item && event.item.id) {
		this.selectedVenue = event.item;
		var venueName = event.item.name;
		var html;
		if (event.item.image) {
			html = '<img src="' + event.item.image + '" style="width:16px;height:16px;" /> ';
		}
		html = html += venueName;
		this.controller.get("checkin-details-location").update(html);
	}

	// if checkinPane is open, we change the model of the foursquareToggleButton
	if (this.isPaneOpen('checkinPane') && this.selectedVenue) {
		if (TPPD.currentUser.social_accounts.foursquare) {
			this.controller.get('checkin-share-foursquare-title').removeClassName('toggleDisabled');
			this.checkinToggleFoursquareModel.disabled = false;
			this.controller.modelChanged(this.checkinToggleFoursquareModel);
		}
	}

	this.togglePane(false, 'venueSearchPane', null);
	// this.hideVenueSearch();
};

MainAssistant.prototype.gotBeerInfoSuccess = function(response) {
	Mojo.Log.info("Got beer info");
	if (!this.isPaneOpen('beerDetailsPane')) {
		return;
	}
	var item = this.showBeerItem;
	var infoItem = response;

	infoItem.your_count = item.your_count;
	infoItem.beer_stamp = infoItem.img;
	infoItem.starRating = parseInt(infoItem.avg_rating, 10) * 20 + "%"; // calc to percent
	infoItem.yourRating = parseInt(infoItem.your_rating, 10) * 20 + "%"; // calc to percent

	if (infoItem.beer_abv) {
		infoItem.display_abv = "(" + parseInt(infoItem.beer_abv, 10).toFixed(1) + "%)";
	}
	
	// set wishlist cmdMenu
	if (infoItem.is_had == true) {
		/*
		is_had in beer_info is true = when it's on your wish list and you 
		haven't had it. 
		is_had in beer_info is false = when it's not on your wish list or it 
		was previous on your wish list and you had it already.
		*/
		this.cmdMenuModel.items[0].label = $L("- Wish List");
		this.cmdMenuModel.items[0].command = 'cmdRemoveFromWishList';
	} else {
		this.cmdMenuModel.items[0].label = $L("+ Wish List");
		this.cmdMenuModel.items[0].command = 'cmdAddToWishList';
	}
	this.cmdMenuModel.items[0].disabled = false;
	this.controller.modelChanged(this.cmdMenuModel);

	var beerDetailsContent = Mojo.View.render({
		object: infoItem,
		template: 'partials/drinkup/beerDetails-pane-tpl'
	});

	this.controller.get('beerDetails-pane').innerHTML = beerDetailsContent;
	toggleSmallSpinner("stop", this);

};

MainAssistant.prototype.gotBeerInfoFailed = function(response) {
	Mojo.Log.warn("Error in getting beer info result %j", error);
	toggleSmallSpinner("stop", this);
};

MainAssistant.prototype.gotCheckinInfoSuccess = function(response) {
	Mojo.Log.info("Got checkin info result: %j", response);
	var item = response;
	
	if (item.you_toast) {
		this.cmdMenuModel.items[1].disabled = false;
		this.cmdMenuModel.items[1].label = $L("Untoast");
		this.cmdMenuModel.items[1].command = 'cmdRemoveToast';
	} else {
		this.cmdMenuModel.items[1].label = $L("Toast");
		this.cmdMenuModel.items[1].command = 'cmdToastCheckin';
		this.showCommandMenu("friendFeedDetails");
	}

	this.controller.modelChanged(this.cmdMenuModel);

	item.comments.each(function(comment) {
		comment.relative_created_at = getRelativeTime(comment.created_at);
	});
	
	this.friendFeedCommentsListModel.items = item.comments;
	this.controller.modelChanged(this.friendFeedCommentsListModel);

	if (this.friendFeedCommentsListModel.items.length === 0) {
		this.controller.get('friendfeed-comments-noitems').setStyle({'display': 'block'});
	}
	this.controller.get('friendfeed-details-toastcount').innerHTML = item.toast_count;
	this.controller.get('friendfeed-comments-spinner').mojo.stop();
	this.controller.get('friendfeed-comments-spinner').hide();
};

MainAssistant.prototype.gotCheckinInfoFailed = function(error) {
	Mojo.Log.warn("Error in getting checkin info result %j", error);

	this.controller.get('friendfeed-comments-spinner').mojo.stop();
	this.controller.get('friendfeed-comments-spinner').hide();
};


MainAssistant.prototype.showPostComment = function(item) {

	this.showPostCommentPane = true;
	this.showPostCommentItem = item;

	// this.hideFriendFeedDetails();
	this.togglePane(false, 'friendFeedPane', null)

	// this.controller.get('scene-scrim').show();
//	this.controller.get('scene-scrim').setStyle({'display': 'block'});
	this.controller.get('post-comment-pane').setStyle({'bottom': '0px'});

	this.showCommandMenu('postComment');

	this.updatePostCommentCharCount();
	this.controller.get('post-comment-body').mojo.focus();

};

MainAssistant.prototype.hidePostComment = function() {
	this.showPostCommentItem = null;

	this.controller.get('post-comment-pane').setStyle({'bottom': '-250px'});

	this.showCommandMenu('friendFeed');
};

MainAssistant.prototype.submitComment = function() {
	// should'nt happen
	if (this.sendingComment) {
		return;
	}
	if (this.showPostCommentPane && this.showPostCommentItem) {
		toggleSmallSpinner("start", this);

		this.sendingComment = true;
		
		this.cmdMenuModel.items[0].disabled = true;
		this.controller.modelChanged(this.cmdMenuModel);

		var message = this.postCommentTextFieldModel.value;
		
		var checkinId = this.showPostCommentItem.checkin_id;
		this.untappd.addComment(checkinId, message, this.submitCommentSuccess.bind(this), this.submitCommentFailed.bind(this));
	}
};

MainAssistant.prototype.toastCheckin = function(item) {
	if (!item || !this.isPaneOpen('friendFeedPane')) {
		return false;
	}

	toggleSmallSpinner("start", this);
	this.cmdMenuModel.items[1].disabled = true;
	this.controller.modelChanged(this.cmdMenuModel);

	var checkinId = item.checkin_id;
	this.untappd.checkinToast(checkinId, this.submitToastCheckinSuccess.bind(this), this.submitToastCheckinFailed.bind(this));
};

MainAssistant.prototype.removeToastCheckin = function(item) {
	if (!item || !this.isPaneOpen('friendFeedPane')) {
		return false;
	}

	toggleSmallSpinner("start", this);
	this.cmdMenuModel.items[1].disabled = true;
	this.controller.modelChanged(this.cmdMenuModel);

	var checkinId = item.checkin_id;
	this.untappd.checkinRemoveToast(checkinId, this.submitRemoveToastCheckinSuccess.bind(this), this.submitRemoveToastCheckinFailed.bind(this));
};


MainAssistant.prototype.showSearch = function() {

//	this.controller.get('scene-scrim').setStyle({'display': 'block'});
	this.controller.get('search-pane').setStyle({'bottom': '60px'});

	this.showCommandMenu('showSearchBox');

	this.searchPaneField.mojo.focus();

};

MainAssistant.prototype.hideSearchPane = function() {
	// this.showSearchPane = false;
	
//	this.controller.get('scene-scrim').hide();
	this.controller.get('search-pane').setStyle({'bottom': '-140px'});
	
	// this.searchPaneField.mojo.blur();
	this.searchPaneField.mojo.setValue("");
	this.searchPaneField.mojo.blur();

	this.showCommandMenu();
};

MainAssistant.prototype.submitSearch = function() {
	Mojo.Log.info("starting search...");
	// should'nt happen
	if (this.searchInProgress) {
		return;
	}

	if (this.isPaneOpen('searchPane') !== false) {
	// if (this.showSearchPane) {
		toggleSmallSpinner("start", this);

		this.searchInProgress = true;
		
		this.cmdMenuModel.items[1].disabled = true;
		this.controller.modelChanged(this.cmdMenuModel);

		var search = this.searchFieldModel.value;
	
		if (search != "") {
			this.untappd.beerSearch(search, this.beerSearchSuccess.bind(this), this.beerSearchFailed.bind(this));
		}
	}
};

MainAssistant.prototype.addToWishList = function() {
	Mojo.Log.info("add to Wishlist...");

	if (!this.showBeerItem) {
		return false;
	}

	var beerId = this.showBeerItem.beer_id;

	if (this.isPaneOpen('beerDetailsPane') !== false) {
	// if (this.showSearchPane) {
		toggleSmallSpinner("start", this);

		this.cmdMenuModel.items[0].disabled = true;
		this.controller.modelChanged(this.cmdMenuModel);

		this.untappd.addToWishlist(beerId, this.addToWishlistSuccess.bind(this), this.addToWishlistFailed.bind(this));

	}
};

MainAssistant.prototype.addToWishlistSuccess = function(response) {
	Mojo.Log.info("Success adding beer to wish list!");
	toggleSmallSpinner("stop", this);

	this.cmdMenuModel.items[0].disabled = false;
	this.cmdMenuModel.items[0].label = $L("- Wish List");
	this.cmdMenuModel.items[0].command = 'cmdRemoveFromWishList';
	this.controller.modelChanged(this.cmdMenuModel);

	showBanner($L("May your wish will come true!"));
};

MainAssistant.prototype.addToWishlistFailed = function(response) {
	toggleSmallSpinner("stop", this);
	errorDialog($L("Failed to add beer to wishlist."), this.controller.window);
};

MainAssistant.prototype.removeFromWishList = function() {
	Mojo.Log.info("remove to Wishlist...");

	if (!this.showBeerItem) {
		return false;
	}

	var beerId = this.showBeerItem.beer_id;

	if (this.isPaneOpen('beerDetailsPane') !== false) {
	// if (this.showSearchPane) {
		toggleSmallSpinner("start", this);

		this.cmdMenuModel.items[0].disabled = true;
		this.controller.modelChanged(this.cmdMenuModel);

		this.untappd.removeFromWishlist(beerId, this.removeFromWishListSuccess.bind(this), this.removeFromWishListFailed.bind(this));

	}
};

MainAssistant.prototype.removeFromWishListSuccess = function(response) {
	Mojo.Log.info("Success removing beer from wish list!");
	toggleSmallSpinner("stop", this);

	this.cmdMenuModel.items[0].disabled = false;
	this.cmdMenuModel.items[0].label = $L("+ Wish List");
	this.cmdMenuModel.items[0].command = 'cmdAddToWishList';
	this.controller.modelChanged(this.cmdMenuModel);

	showBanner($L("Removed from Wish List."));
};

MainAssistant.prototype.removeFromWishListFailed = function(response) {
	toggleSmallSpinner("stop", this);
	errorDialog($L("Failed to remove beer to wishlist."), this.controller.window);
};

MainAssistant.prototype.getPublicTrending = function(force) {
	
	if (!force) {
		return false;
	}
	toggleSmallSpinner("start", this);

	this.untappd.publicTrending(this.trendingType, 5, this.trendingAge, '', '', this.gotPublicTrendingSuccess.bind(this), this.gotPublicTrendingFailed.bind(this));

};

MainAssistant.prototype.mergeSearchResultList = function() {
	this.searchResultsModel.items = [];
	
	this.searchResultsModel.items = this.searchBeers.concat(this.recentBeers, this.trendingBeers);
};

MainAssistant.prototype.gotPublicTrendingSuccess = function(response) {
	Mojo.Log.info("Got public trending result!");

	this.trendingBeers = response;

	this.trendingBeers.each(function(item) {
		item.beer_stamp = item.img;
		item.group = "Trending Beers";
	});

	this.mergeSearchResultList();

	this.controller.modelChanged(this.searchResultsModel);

	this.controller.get(this.enabledNavItems[this.currentPanel].id + "-scroller").mojo.revealTop();
	// this.hideAllPanes();
	toggleSmallSpinner("stop", this);

	
};
MainAssistant.prototype.gotPublicTrendingFailed = function(response) {
	toggleSmallSpinner("stop", this);
	errorDialog($L("Failed to got public trending results."), this.controller.window);
};


MainAssistant.prototype.getRecentBeers = function(force) {
	if (!force) {
		return false;
	}
	toggleSmallSpinner("start", this);
	
	this.untappd.userFeed("", "", "", this.gotRecentBeersSuccess.bind(this), this.gotRecentBeersFailed.bind(this));
};

MainAssistant.prototype.gotRecentBeersSuccess = function(response) {
	this.recentBeers = [];
	var recentBeers = [];
	
	response.each(function(item) {
		if (recentBeers.length < 3) {
			item.group = "Recent Beers";
			recentBeers.push(item);
		} else {
			return false;
		}
	});
	
	this.recentBeers = recentBeers;
	this.mergeSearchResultList();

	this.controller.modelChanged(this.searchResultsModel);
	
	this.controller.get(this.enabledNavItems[this.currentPanel].id + "-scroller").mojo.revealTop();
	toggleSmallSpinner("stop", this);

};
MainAssistant.prototype.gotRecentBeersFailed = function(response) {
	toggleSmallSpinner("stop", this);
	errorDialog($L("Failed to get recent beers."), this.controller.window);
};


MainAssistant.prototype.submitCommentSuccess = function(response) {
	this.sendingComment = false;
	this.hideAllPanes();
	showBanner($L("Comment sent! :-)"));
	toggleSmallSpinner("stop", this);

};

MainAssistant.prototype.submitCommentFailed = function(response) {
	this.sendingComment = false;
	errorDialog($L("Could not sumit comment. Please try again."), this.controller.window);
	// just to re-enable the send button...
	this.updatePostCommentCharCount();
	toggleSmallSpinner("stop", this);

};

MainAssistant.prototype.submitToastCheckinSuccess = function(response) {
	// enable untoast button after successful toast
	this.cmdMenuModel.items[1].disabled = false;
	this.cmdMenuModel.items[1].label = $L("Untoast");
	this.cmdMenuModel.items[1].command = 'cmdRemoveToast';
	this.controller.modelChanged(this.cmdMenuModel);

	showBanner($L("Toasted! :-)"));
	toggleSmallSpinner("stop", this);

};

MainAssistant.prototype.submitToastCheckinFailed = function(response) {
	// enabled toast button
	this.cmdMenuModel.items[1].disabled = false;
	this.cmdMenuModel.items[1].label = $L("Toast");
	this.controller.modelChanged(this.cmdMenuModel);

	errorDialog($L("Could not toast check in. Please try again."), this.controller.window);

	toggleSmallSpinner("stop", this);
};

MainAssistant.prototype.submitRemoveToastCheckinSuccess = function(response) {
	// enable untoast button after successful toast
	this.cmdMenuModel.items[1].disabled = false;
	this.cmdMenuModel.items[1].label = $L("Toast");
	this.cmdMenuModel.items[1].command = 'cmdToastCheckin';
	this.controller.modelChanged(this.cmdMenuModel);

	showBanner($L("Toast removed :'("));
	toggleSmallSpinner("stop", this);
};

MainAssistant.prototype.submitRemoveToastCheckinFailed = function(response) {
	// enabled toast button
	this.cmdMenuModel.items[1].disabled = false;
	this.controller.modelChanged(this.cmdMenuModel);
	errorDialog($L("Could not remove toast. Please try again."), this.controller.window);
	toggleSmallSpinner("stop", this);
};

MainAssistant.prototype.sceneScrimTaped = function() {
	this.hideAllPanes();
};

MainAssistant.prototype.submitVenueSearch = function() {

	Mojo.Log.info("Requesting GPS fix from service...");

	toggleSmallSpinner("start", this);

	var req = new Mojo.Service.Request("palm://com.codingbees.tppd.srv", {
		method: 'getPosition',
		parameters: {},
		onSuccess: function(transport) {
			Mojo.Log.info("GPS POS SUCESS: %j", transport);
			this.currentPosition = transport;
			this.callFoursquare(this.currentPosition);
		}.bind(this),
		onFailure: function(error) {
			Mojo.Log.warn("Error in request: %j", error);
		}.bind(this)
	});

};

MainAssistant.prototype.callFoursquare = function(position) {
	if (!position) {
		return false;
	}

	Mojo.Log.info("asking foursquare for venues...");
	var lat = position.latitude;
	var lon = position.longitude;
	var query = this.venueSearchFieldModel.value;
	
	var params = {
		lat: lat,
		lon: lon,
		query: query
	};

	var req = new Mojo.Service.Request("palm://com.codingbees.tppd.srv", {
		method: 'getVenues',
		parameters: params,
		onSuccess: this.gotVenuesFromService.bind(this),
		onFailure: function(error) {
			Mojo.Log.warn("Error in request: %j", error);
		}.bind(this)
	});	
};

MainAssistant.prototype.gotVenuesFromService = function(response) {
	Mojo.Log.info("Got venues from Service...");
	var venues = [];

	response.each(function(group) {
		group.items.each(function(item) {
			item.group = group.name;
			if (item.categories.length) {
				item.image = item.categories[0].icon || "";
			} else {
				item.image = "images/category-other.png";
			}
			venues.push(item);
		})
	});

	venues.sort(function(a, b) {
		return (a.location.distance - b.location.distance);
	});
	
	this.venueSearchListModel.items = venues;
	this.controller.get("venue-search-list").mojo.noticeUpdatedItems(0, venues);

	toggleSmallSpinner("stop", this);

};

MainAssistant.prototype.showCheckin = function() {
	if (!this.showBeerItem) {
		return false;
	}

	this.checkinBeerItem = this.showBeerItem;
	this.checkinVenueItem = this.selectedVenue || null;
	
	// now hide beerDetails...
	// this.hideBeerDetails();
	this.togglePane(false, 'beerDetailsPane', null);
	
	this.renderCheckinDetails();
//	this.controller.get('scene-scrim').setStyle({'display': 'block'});
	this.controller.get('checkinDetails-pane').setStyle({'bottom': '0px'});

	this.showCommandMenu('checkinDetails');

};

MainAssistant.prototype.hideCheckin = function() {
	this.checkinBeerItem = null;
	this.checkinBeerItem = null;

//	this.controller.get('scene-scrim').hide();
	this.controller.get('checkinDetails-pane').setStyle({'bottom': '-400px'});

	this.controller.stopListening(this.checkinDetailsTextField, Mojo.Event.propertyChange, this.checkinDetailsTextFieldHandler);
	this.controller.stopListening(this.controller.get("star-rating-wrapper"), Mojo.Event.tap, this.checkinRatingHandler);
	this.showCommandMenu();

};

MainAssistant.prototype.renderCheckinDetails = function() {
	if (!this.checkinBeerItem) {
		return false;
	}

	// TODO: disabled text for not enabled accounts
	var item = this.checkinBeerItem || {};
	item.facebookToggleDisabled = TPPD.currentUser.social_accounts.facebook ? "" : "toggleDisabled";
	item.twitterToggleDisabled = TPPD.currentUser.social_accounts.twitter ? "" : "toggleDisabled";
	item.foursquareToggleDisabled = TPPD.currentUser.social_accounts.foursquare && this.selectedVenue ? "" : "toggleDisabled";
	item.gowallaToggleDisabled = TPPD.currentUser.social_accounts.gowalla ? "" : "toggleDisabled";

	var beerDetailsContent = Mojo.View.render({
		object: item,
		template: 'partials/drinkup/checkinDetails-pane-tpl'
	});

	this.controller.get('checkinDetails-pane').innerHTML = beerDetailsContent;
	
		// post comment textfield
	this.checkinCommentTextFieldModel = {
		disabled: false,
		value: ''
	};
	this.controller.setupWidget('checkin-details-comment-body', {
		hintText: "add comment...",
		focus: true,
		multiline: true,
		autoFocus: true,
		changeOnKeyPress: true,
		enterSubmits: false
	}, this.checkinCommentTextFieldModel);
	this.checkinDetailsTextField = this.controller.get('checkin-details-comment-body');

	this.checkinDetailScrollerModel = {};
	this.controller.setupWidget("checkin-details-scroller", {
		mode: "vertical"
	}, this.checkinDetailScrollerModel);

	this.checkinToggleFacebookModel = {
		disabled: TPPD.currentUser.social_accounts.facebook ? false : true,
		value: false
	};
	this.controller.setupWidget("checkin-share-facebook", {}, this.checkinToggleFacebookModel);

	this.checkinToggleTwitterModel = {
		disabled: TPPD.currentUser.social_accounts.twitter ? false : true,
		value: false
	};
	this.controller.setupWidget("checkin-share-twitter", {}, this.checkinToggleTwitterModel);

	this.checkinToggleFoursquareModel = {
		disabled: TPPD.currentUser.social_accounts.foursquare && this.selectedVenue ? false : true,
		value: false
	};
	this.controller.setupWidget("checkin-share-foursquare", {}, this.checkinToggleFoursquareModel);

	this.checkinToggleGowallaModel = {
		disabled: TPPD.currentUser.social_accounts.gowalla ? false : true,
		value: false
	};
	this.controller.setupWidget("checkin-share-gowalla", {}, this.checkinToggleGowallaModel);

	this.controller.instantiateChildWidgets(this.controller.get("checkinDetails-pane"));

	this.checkinDetailsTextFieldHandler = this.checkinDetailsTextFieldChange.bind(this);
	this.controller.listen(this.checkinDetailsTextField, Mojo.Event.propertyChange, this.checkinDetailsTextFieldHandler);

	this.rating = 0;
	this.checkinRatingHandler = this.checkinDetailsRating.bind(this);
	this.controller.listen(this.controller.get("star-rating-wrapper"), Mojo.Event.tap, this.checkinRatingHandler);

};

MainAssistant.prototype.checkinDetailsRating = function(event) {
	Mojo.Log.info("Rating tapped", event.target.id);
	for (var i=1; i <= 5; i++) {
		this.controller.get("star" + i).addClassName("off");
	}
	var rating = (event.target.id).replace(/[A-Za-z]+/, '');
	rating = parseInt(rating, 10);
	if (rating && !isNaN(rating)) {
		this.rating = rating;
	} else {
		return false;
	}
	Mojo.Log.info("Setting rating to ", rating);
	for (var i=1; i <= rating; i++) {
		this.controller.get("star" + i).removeClassName("off");
	}

};

MainAssistant.prototype.checkinDetailsTextFieldChange = function(event) {
	this.updateCheckinDetailsCommentCharCount();
};

MainAssistant.prototype.submitCheckin = function() {
	if (!this.isPaneOpen('checkinPane') && !this.checkinBeerItem) {
		return false;
	}
	toggleSmallSpinner("start", this);

	var geolat = "";
	var geolon = "";
	var foursquareId = "";
	var rating = this.rating || 0;
	if (this.selectedVenue && this.currentPosition) {
		geolat = this.currentPosition.latitude;
		geolon = this.currentPosition.longitude;
		foursquareId = this.selectedVenue.id;
	}

	var facebook = this.checkinToggleFacebookModel.value;
	var twitter = this.checkinToggleTwitterModel.value;
	var foursquare = this.checkinToggleFoursquareModel.value;
	var gowalla = this.checkinToggleGowallaModel.value;

	var beerId = this.checkinBeerItem.beer_id; // this.checkinBeerItem.beer_id;
	var comment = this.checkinDetailsTextField.mojo.getValue();

	this.untappd.checkin(beerId, foursquareId, geolat, geolon, comment, rating, facebook, twitter, foursquare, gowalla, this.submitCheckinSuccess.bind(this), this.submitCheckinFailed.bind(this));

};

MainAssistant.prototype.submitCheckinSuccess = function(response) {
	Mojo.Log.info("Checkin success!!!: %j", response);
	toggleSmallSpinner("stop", this);
	
	showBanner($L("Enjoy your beer! We got it."));
	this.checkinBeerItem = null;
	this.selectedVenue = null;

	// update the recent beers in the drink-up list
	this.getRecentBeers(true);

	this.hideAllPanes();
	this.togglePane(true, 'checkinSuccessPane', response);

};

MainAssistant.prototype.submitCheckinFailed = function(error) {
	Mojo.Log.warn("Checkin failed: %j", error);
	toggleSmallSpinner("stop", this);
	errorDialog(error, this.controller.window);
};

MainAssistant.prototype.showCheckinSuccess = function(response) {

	this.renderCheckinSuccessDetails(response);
//	this.controller.get('scene-scrim').setStyle({'display': 'block'});
	this.controller.get('checkinSuccess-pane').setStyle({'bottom': '0px'});

	this.showCommandMenu('checkinSuccess');
};

MainAssistant.prototype.hideCheckinSuccess = function() {

	this.controller.get('checkinSuccess-pane').setStyle({'bottom': '-480px'});

	this.controller.stopListening("checkin-success-recommendations", Mojo.Event.listTap, this.checkinSuccessBeerListHandler);

	this.showCommandMenu();
};

MainAssistant.prototype.renderCheckinSuccessDetails = function(response) {

	var item = response;
	var checkinSuccessContent = Mojo.View.render({
		object: item,
		template: 'partials/drinkup/checkinSuccess-pane-tpl'
	});

	this.controller.get('checkinSuccess-pane').innerHTML = checkinSuccessContent;

	this.checkinSuccessScrollerModel = {};
	this.controller.setupWidget("checkin-success-scroller", {
		mode: "vertical"
	}, this.checkinSuccessScrollerModel);

	if (response.badges && response.badges.length > 0) {
		var badgeContent = Mojo.View.render({
			collection: response.badges,
			template: 'partials/drinkup/badge-item',
			// separator: 
		});
		this.controller.get('checkin-success-badges').innerHTML = badgeContent;

		this.controller.get("checkin-success-badge-wrapper").show();
	} else {
		this.controller.get("checkin-success-badge-wrapper").hide();
	}

	this.checkinSuccessBeerListModel = {
		items: response.recommendations
	};
	this.controller.setupWidget("checkin-success-recommendations", {
		itemTemplate: "partials/drinkup/recommendItem-tpl",
		listTemplate: "partials/list",
		renderLimit: 15
	}, this.checkinSuccessBeerListModel);

	// we need to call this to setupWidgets NOW!
	this.controller.instantiateChildWidgets(this.controller.get("checkinSuccess-pane"));

	this.checkinSuccessBeerListHandler = this.checkinSuccessBeerListTap.bind(this);
	this.controller.listen("checkin-success-recommendations", Mojo.Event.listTap, this.checkinSuccessBeerListHandler);
	
};

MainAssistant.prototype.checkinSuccessBeerListTap = function(event) {
	Mojo.Log.info("recommendation selected!");
	
	if (event.item && event.item.beer_id) {
		var newItem = event.item;
		// we need to transform to another object
		newItem.name = event.item.beer_name;

		this.togglePane(true, 'beerDetailsPane', newItem);
		// this.showBeerDetails(newItem);
	}

};

MainAssistant.prototype.initSearch = function() {
	if (!this.searchTerm) {
		return false;
	}

	var checkinPaneIndex = findUnitIndex('checkin', this.enabledNavItems, 'id');
	this.scrollContentTo(checkinPaneIndex);
	
	this.untappd.beerSearch(this.searchTerm, this.beerSearchSuccess.bind(this), this.beerSearchFailed.bind(this));
	toggleSmallSpinner("start", this);
}
