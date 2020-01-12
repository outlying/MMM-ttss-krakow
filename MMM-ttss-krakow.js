/* global Log, Module, moment */

const stopsData = new Map()

Module.register("MMM-ttss-krakow",{

	defaults: {
		text: "Hello World 111!",
	},

	// Define required scripts.
	getScripts() {
		return ["moment.js"];
	},

	// Start all inits
	start: function() {
		Log.info("Starting module: " + this.name);

		// Collect data
		var self = this;
		self.fetchData();
		setInterval(function() {
			self.fetchData();
		}, 10000);
	},

	getHeader: function() {
		return "MPK";
	},

	getDom: function() {
		var wrapper = document.createElement("div");

		this.config.stops.forEach(stopConfig => {

			var key = String([stopConfig.stopId, stopConfig.type]);
			var stop = stopsData.get(key);

			if(stop) {
				stop.actual
					.filter(item => item.actualRelativeTime >= 0)
					.forEach(actual => {
						var timeMinutes = Math.floor(actual.actualRelativeTime / 60);
						var paragraph = document.createElement("p");
						var text = document.createTextNode(actual.patternText + " " + actual.direction + " " + timeMinutes + " min"); 

						paragraph.appendChild(text);
	            		wrapper.appendChild(paragraph); 	
					});
			}
		});

		return wrapper;
	},

	socketNotificationReceived(notification, data) {
		console.log("Recieved notification " + notification);
		console.log(data);

		if(notification === "STOP_DATA" && data.success) {
			var stop = data.result;
			var key = String([stop.stopId, stop.type]);
			stopsData.set(key, stop);
			this.updateDom();
		}
	},

	fetchData() {
		this.config.stops.forEach(element => {
			this.sendSocketNotification("FETCH_DATA", {
				stopId: element.stopId,
				type: element.type
			});
		});
	}
});