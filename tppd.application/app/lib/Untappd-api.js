/**
* provides a service into the public Untappd API
*
* @author Rene Meister
*
**/

var UntappdApi = Class.create({
	/*
	 * Constructor
	 */
	initialize: function(apiKey, apiSecret, username, password) {
		// URI for the Untappd service
		this.URI_BASE = 'http://api.untappd.com/v4';
	
		// username and password hash
		this._upHash = '';
	
		// API key
		this._apiKey = '';
		
		// Client Secret
		this._apiSecret = '';
	
		// last server response
		this._lastResponse = '';

		this._apiKey = apiKey;
		this._apiSecret = apiSecret;
		this.setAuthenticatedUser(username, password);
	},

	setAuthenticatedUser: function(username, password) {
		if (username && password) {
			this._upHash = Base64.encode(username + ':' + hex_md5(password));
		} else {
			this._upHash = null;
		}
	},

	getDebug: function() {
		var log = {
			upHash: this._upHash,
			apiKey: this._apiKey
		};
		
		return log;
	},

	/**
	 * retrieve the authenticated users friend feed
	 * 
	 * @param {String} since
	 * @param {String} offset
	 * @param {Object} callback
	 * 
	 * @return {Object}
	 */
	myFriendFeed: function(since, offset, inSuccess, inFailure) {
		
		var args = {
			'since': since,
			'offset': offset
		}
		
		this._getServiceRequest('feed', args, true, inSuccess, inFailure);
	},

	/**
	 * retrieve the public feed aka the pub
	 * 
	 * @param {String} since
	 * @param {String} offset
	 * @param {String} longitude
	 * @param {String} latitude
	 * @param {Object} callback
	 * 
	 * @return {Object}
	 */
	publicFeed: function(since, offset, longitude, latitude, inSuccess, inFailure) {
		
		var args = {
			'since': since,
			'offset': offset,
			'geolat': latitude,
			'geolng': longitude
		}

		this._getServiceRequest('thepub', args, false, inSuccess, inFailure);
	},
	
	/**
	 * Gets a users info
	 * 
	 * @param {String} username
	 * @param {Object} callback
	 * 
	 * @return {Object}
	 */
	userInfo: function(username, inSuccess, inFailure) {
		if (!this._upHash) {
			Mojo.Log.error("authentication params must be set!");
			return false;
		}
		
		// if no username is provided the authenticated user is requested (good login test!)
		var args = {};
		if (username) {
			args.user = username;
		}
		
		this._getServiceRequest('user', args, false, inSuccess, inFailure);
	},
	
	/**
	 * Gets a users checkins
	 * 
	 * @param {String} username
	 * @param {String} since
	 * @param {String} offset
	 * @param {Object} callback
	 * 
	 * @return {Object}
	 */
	userFeed: function(username, since, offset, inSuccess, inFailure) {
		if (!this._upHash) {
			Mojo.Log.error("authentication params must be set!");
			return false;
		}
		
		var args = {};
		var args = {
			'since': since,
			'offset': offset
		};
		if (username) {
			args.username = username;
		}
		
		this._getServiceRequest('user_feed', args, false, inSuccess, inFailure);
	},
	
	
	/**
	 * Beer info functions
	 */
	
	/**
	 * Get beer info
	 * 
	 * @param {Int} beerId
	 */
	beerInfo: function(beerId, inSuccess, inFailure) {
		if (!beerId) {
			Mojo.Log.warn("No beerId provided to function.");
			return false;
		}
		
		var args = {
			'bid': beerId
		};
		
		this._getServiceRequest('beer_info', args, false, inSuccess, inFailure);
	},
	
	/**
	 * Search Untappd to find beers matching given string
	 * 
	 * @param {Object} searchString
	 * @param {Object} callback
	 */
	beerSearch: function(searchString, inSuccess, inFailure) {
		if (!searchString) {
			Mojo.Log.warn("No searchString provided to search.");
			return false;
		}
		
		var args = {
			'q': searchString
		};
		
		this._getServiceRequest('beer_search', args, false, inSuccess, inFailure);
	},
	
	
	/**
	 * retrieve all checkins for a specific beerId
	 * 
	 * @param {Int} beerId
	 * @param {Int} since
	 * @param {Int} offset
	 * @param {Object} callback
	 */
	beerFeed: function(beerId, since, offset, inSuccess, inFailure) {
		if (!beerId) {
			Mojo.Log.warn("No beerId provided to beerFeed.");
			return false;
		}
		
		var args = {
			'bid': beerId,
			'since': since,
			'offset': offset
		};
		
		this._getServiceRequest('beer_checkins', args, false, inSuccess, inFailure);
	},

	/**
	 * Gets the trending list of beers based on location
	 * 
	 * @param (all|macro|micro|local) *optional* $type Type of beers to search for
     * @param int *optional* $limit Number of results to return
     * @param (daily|weekly|monthly) *optional* $age Age of checkins to consider
     * @param float *optional* $latitude Numeric latitude to filter the feed
     * @param float *optional* $longitude Numeric longitude to filter the feed
     * 
	 */
	publicTrending: function(type, limit, age, lat, lon, inSuccess, inFailure) {
		if (!type) {
			var type = "all";
		}
		if (!limit || (limit > 10 || limit < 1)) {
			var limit = 10;
		}
		if (!age) {
			var age = "daily";
			
		}
		
		var args = {
			'type': type,
			'limit': limit,
			'age': age,
			'geolat': lat,
			'geolon': lon,
		};
		
		this._getServiceRequest('trending', args, false, inSuccess, inFailure);
	},
	

	/**
	 * Get the details of a checkin
	 * 
	 * @param {Int} checkin_id
	 * @param {Object} inSuccess
	 * @param {Object} inFailure
	 */
	checkinInfo: function(checkin_id, inSuccess, inFailure) {
		if (!checkin_id) {
			Mojo.Log.warn("No checkin_id provided to checkinInfo.");
			return false;
		}
		
		var args = {
			'id': checkin_id
		};
		
		this._getServiceRequest('details', args, false, inSuccess, inFailure);
	},

	/**
	 * comment on a checkin
	 * 
	 * @param {Int} checkin_id
	 * @param {String} comment
	 */
	addComment: function(checkin_id, comment, inSuccess, inFailure) {
		if (!checkin_id || !comment) {
			Mojo.Log.warn("Mandatory values checkin_id and comment are missing!");
			return false;
		}
		
		var args = {
			'checkin_id': checkin_id,
			'comment': comment,
		};
		
		this._postServiceRequest('add_comment', args, true, inSuccess, inFailure);
	},	


	/**
	 * add a beer to users wishlist
	 * 
	 * @param {Int} beerId
	 */
	addToWishlist: function(beerId, inSuccess, inFailure) {
		if (!beerId) {
			Mojo.Log.warn("Mandatory value beerId is missing!");
			return false;
		}

		var args = {
			'bid': beerId
		};

		this._postServiceRequest('add_to_wish', args, true, inSuccess, inFailure);
	},

	/**
	 * remove a beer from users wishlist
	 * 
	 * @param {Int} beerId
	 */
	removeFromWishlist: function(beerId, inSuccess, inFailure) {
		if (!beerId) {
			Mojo.Log.warn("Mandatory value beerId is missing!");
			return false;
		}
		
		var args = {
			'bid': beerId
		};
		
		this._postServiceRequest('remove_from_wish', args, true, inSuccess, inFailure);
	},

	/**
	 * Toast a checkin
	 * 
	 * @param {Int} checkin_id
	 */
	checkinToast: function(checkin_id, inSuccess, inFailure) {
		if (!checkin_id) {
			Mojo.Log.warn("Mandatory value checkin_id missing!");
			return false;
		}
		
		var args = {
			'checkin_id': checkin_id
		};
		
		this._postServiceRequest('toast', args, true, inSuccess, inFailure);
	},

	/**
	 * unToast a checkin
	 * 
	 * @param {Int} checkin_id
	 */
	checkinRemoveToast: function(checkin_id, inSuccess, inFailure) {
		if (!checkin_id) {
			Mojo.Log.warn("Mandatory value checkin_id missing!");
			return false;
		}
		
		var args = {
			'checkin_id': checkin_id
		};
		
		this._postServiceRequest('delete_toast', args, true, inSuccess, inFailure);
	},

	/**
	 * Perform a checkin
	 * 
     * @param int beerId - Untappd beer ID
     * @param string *optional* foursquareId - MD5 hash ID of the venue to check into
     * @param float *optional* geolat - Latitude of the user.  Required if you add a location.
     * @param float *optional* geolong - Longitude of the user.  Required if you add a location.
     * @param string *optional* shout - Text to include as a comment
     * @param boolean *optional* facebook - Whether or not to post to facebook
     * @param boolean *optional* twitter - Whether or not to post to twitter
     * @param boolean *optional* foursquare - Whether or not to checkin on foursquare
	 * @param {Object} inSuccess
	 * @param {Object} inFailure
	 */

	checkin: function(beerId, foursquareId, geolat, geolon,
						comment, rating, facebook, twitter, foursquare, gowalla, inSuccess, inFailure) {

		if (!beerId) {
			Mojo.Log.warn("Mandatory value beerId is missing!");
			return false;
		}
		
		// if foursquareId is passed we need also latitude and longitude
		if (foursquareId && (!geolat || !geolon)) {
			Mojo.Log.warn("FoursquareID needs also geo-position data!");
			return false;
		}
		
		if (rating) {
			rating = parseInt(rating, 10);
		}

		// calc timezone offset
		var gmt_offset = new Date().getTimezoneOffset() / 60;

		var args = {
			gmt_offset: gmt_offset,
			bid: beerId,
			foursquare_id: foursquareId,
			user_lat: geolat,
			user_lng: geolon,
			shout: comment,
			rating_value: rating,
			facebook: (facebook) ? "on" : "off",
			twitter: (twitter) ? "on" : "off",
			foursquare: (foursquare) ? "on" : "off",
			gowalla: (gowalla) ? "on" : "off"
		};
		
		this._postServiceRequest('checkin', args, true, inSuccess, inFailure);
		
	},
	
	/**
	 * Sends a request to the URI
	 * 
	 * @param {String} method
	 * @param {Object} args
	 * @param {Boolean} requireAuth
	 * @param {Object} callback
	 * 
	 * @return {Object}
	 */
	_getRequest: function(method, args, requireAuth, inSuccess, inFailure) {
		if (requireAuth && !this._upHash) {
			Mojo.Log.error("This method requires user authentication, which is not set.");
			return false;
		}
		
		// args.key = this._apiKey;
		args.client_id = this._apiKey;
		args.client_secret = this._apiSecret;

		var requestUri = this.URI_BASE + '/' + method;
		
		var req = new Ajax.Request(requestUri, {
			method: 'get',
			evalJSON: true,
			parameters: args,
			requestHeaders: {'Authorization': 'Basic ' + this._upHash},
			onSuccess: function(transport) {
				var data = transport.responseJSON;
				if (data.http_code == 200) {
					this._lastResponse = data;
					inSuccess(data.results);
				} else {
					Mojo.Log.warn("Error in getRequest %j", transport);
					// callback(false);
				}
			}.bind(this),
			onFailure: function(error) {
				Mojo.Log.warn("Error in request %j", error);
				inFailure(error);
			}
		});
	},
	
	/**
	 * Sends a request to the mojo service
	 * 
	 * @param {String} method
	 * @param {Object} args
	 * @param {Boolean} requireAuth
	 * @param {Object} callback
	 * 
	 * @return {Object}
	 */
	_getServiceRequest: function(method, args, requireAuth, inSuccess, inFailure) {
		if (requireAuth && !this._upHash) {
			Mojo.Log.error("This method requires user authentication, which is not set.");
			return false;
		}

		// args.key = this._apiKey;
		
		args.client_id = this._apiKey;
		args.client_secret = this._apiSecret;

		var requestParams = $H(args).toQueryString();
		var requestUri = this.URI_BASE + '/' + method + '?' + requestParams;
		var requestHeaders = {'Authorization': 'Basic ' + this._upHash};

		var params = {
			method: 'get',
			url: requestUri,
			header: requestHeaders
		};

		var req = new Mojo.Service.Request("palm://com.codingbees.tppd.srv", {
			method: 'untappdService',
			parameters: params,
			onSuccess: function(transport) {
				Mojo.Log.info("API SUCESS: %j", transport);
				var data = transport.responseJSON;
				if (data.http_code == 200) {
					this._lastResponse = data;
					inSuccess(data.results);
				} else {
					errorDialog(data.error, Mojo.Controller.getAppController().getStageController(TPPD.MainStageName).window);
				}
			}.bind(this),
			onFailure: function(error) {
				Mojo.Log.warn("Error in request: %j", error);
				inFailure(error);
			}.bind(this)
		});

	},

	_postRequest: function(method, args, requireAuth, inSuccess, inFailure) {
		if (requireAuth && !this._upHash) {
			Mojo.Log.error("This method requires user authentication, which is not set.");
			return false;
		}
		
		// args.key = this._apiKey;
		
		var requestUri = this.URI_BASE + '/' + method + '?client_id=' + this._apiKey + '&client_secret=' + this._apiSecret;
		
		var req = new Ajax.Request(requestUri, {
			method: 'POST',
			parameters: args,
			requestHeaders: {'Authorization': 'Basic ' + this._upHash},
			onSuccess: function(transport) {
				var data = transport.responseJSON;
				if (data.http_code == 200) {
					this._lastResponse = data;
					inSuccess(data.results);
				} else {
					Mojo.Log.warn("Error in getRequest %j", transport);
					// callback(false);
				}
			}.bind(this),
			onFailure: function(error) {
				Mojo.Log.error("Error in request %j", error);
				inFailure(error);
			}
		});
	},

	_postServiceRequest: function(method, args, requireAuth, inSuccess, inFailure) {
		if (requireAuth && !this._upHash) {
			Mojo.Log.error("This method requires user authentication, which is not set.");
			return false;
		}

		var requestParams = $H(args).toQueryString();
		// var requestUri = this.URI_BASE + '/' + method + '?' + requestParams;
		var requestUri = this.URI_BASE + '/' + method + '?client_id=' + this._apiKey + '&client_secret=' + this._apiSecret; //+ '&' + requestParams;
		var requestHeaders = {'Authorization': 'Basic ' + this._upHash, "Content-type":"application/x-www-form-urlencoded"};
		var params = {
			method: 'post',
			url: requestUri,
			header: requestHeaders,
			body: requestParams
		};

		var req = new Mojo.Service.Request("palm://com.codingbees.tppd.srv", {
			method: 'untappdService',
			parameters: params,
			onSuccess: function(transport) {
				var data = transport.responseJSON;
				if (data.http_code == 200) {
					this._lastResponse = data;
					inSuccess(data);
				} else {
					Mojo.Log.warn("Error in getRequest %j", transport);
					// callback(false);
				}
			}.bind(this),
			onFailure: function(error) {
				Mojo.Log.error("Error in request %j", error);
				inFailure(error);
			}
		});
	},



	getLastResponse: function() {
		return this._lastResponse;
	}

});
