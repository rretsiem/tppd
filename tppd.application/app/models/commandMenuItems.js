TPPD.cmdMenuItems = {
	friendFeed: [
		// {icon: 'new', command: 'cmdAddCheckIn'},
		{},
		{icon: 'refresh', type: 'progress', command: 'cmdRefreshFriendFeed'}
	],
	friendFeedDetails: [
		{label: $L("Comment"), width: 120, command: 'cmdAddComment'},
		{label: $L("Toast"), width: 120, command: 'cmdToastCheckin'}
	],
	pubFeed: [
		{},
		{icon: 'refresh', type: 'progress', command: 'cmdRefreshPubFeed'}
		// {label: $L("Not done yet..."), command: ''}
	],
	postComment: [
		{},
		{label: $L("Send"), width: 140, disabled: false, icon: 'send', command: 'cmdSendComment'},
	],
	drinkUp: [
		// {label: $L("Trends"), width: 110, disabled: false, command: 'cmdShowTrends'},
		{}, // remove when Trends working!
		{label: $L("Search"), disabled: false, icon: 'search', command: 'cmdShowSearch'}
	],
	yourtab: [
		{label: $L("Nothing here yet..."), disabled: true}
	],
	showSearchBox: [
		{},
		{label: $L("Search"), width: 140, disabled: false, command: 'cmdSubmitSearch'},
		{}
	],
	beerDetails: [
		{label: $L("+ Wish List"), width: 140, disabled: false, command: 'cmdAddToWishList'},
		{},
		{label: $L("Check in..."), width: 140, disabled: false, command: 'cmdBeerCheckin'}
	],
	checkinDetails: [
		{label: $L("Add Venue..."), width: 140, disabled: false, command: 'cmdShowVenueSearch'},
		// {label: $L("Location"), iconPath: 'images/location.png', disabled: false, command: 'cmdShowVenueSearch'},
		{label: $L("Check in!"), width: 140, disabled: false, command: 'cmdSubmitCheckin'}
	],
	checkinSuccess: [
		{},
		{label: $L("Close"), width: 110, command: 'cmdCloseCheckinSuccess'},
		{}
	],
	venueSearch: [
		{label: $L("no venue"), disabled: false, command: 'cmdCloseVenueSearch'},
		{label: $L("Search"), disabled: false, icon: 'search', command: 'cmdSubmitVenueSearch'}
	]

};
