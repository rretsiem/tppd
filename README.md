## Tppd! - Untappd client for webOS

Author: The CodingBees  
Twitter: @codingbees  
E-Mail: rene@codingbees.com  
Web: http://codingbees.com

### Info
Tppd is an Untappd client for webOS which I've written as a hobby to learn more about Mojo development and webOS services.  
The app uses a webOS service to request venues from Foursquare, get the current GPS position and all the Ajax-Requests to Untappd are also made via the webOS service.

#### Untappd API v4
Due to the changes to the Untappd API, the client currently does not work, because v4 reuqires oAuth and this is currently not implemented in the API methods.

### Requirements
1. You need your own Untappd API Key and enter the information in app-assistant.js
2. You need your own Foursquare API Key to enable the venue lookup. The Key is defined in the service GetVenuesAssistant.js


### License
You may do whatever you want with this source code with the following conditions:

1. You may not use reproductions, distributions, modifications or any part of this source code or included images, graphics and other media for commercial purposes.
2. You may not use the name "Tppd!" or "The CodingBees" in a manner that implies endorsement of official involvement.
3. You must retain this license notice.

E-Mail rene@codingbees.com if you need an exception made to the license.

Copyright 2011-2013 The CodingBees