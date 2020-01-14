/* global Log, Module, moment */

const stopsData = new Map()

function groupItemsBy(arr, groupByKeyFn ) {
	return arr.reduce( (acc, c) => {
		var key = groupByKeyFn(c);
		acc[key] = acc[key] || [];
		acc[key].push(c)
		return acc;
	}, [])
}

Module.register("MMM-ttss-krakow",{

	defaults: {
		minutesMin: 0,
		minutesMax: Number.MAX_SAFE_INTEGER,
		departuresMin: 0,
		departuresMax: Number.MAX_SAFE_INTEGER,
		itemsMin: 0,
		itemsMax: Number.MAX_SAFE_INTEGER
	},

	// Define required scripts.
	getScripts() {
		return ["moment.js"];
	},

	getStyles: function() {
		return [
			this.file('ttss-krakow.css')
		]
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
		var table = document.createElement("table");
		table.className = "small"; // core style class

		var globalConfig = this.config;

		this.config.stops.forEach(stopConfig => {

			var minutesMin = (stopConfig.minutesMin === undefined) ? globalConfig.minutesMin : stopConfig.minutesMin;
			var minutesMax = (stopConfig.minutesMax === undefined) ? globalConfig.minutesMax : stopConfig.minutesMax;
			var itemsMin = (stopConfig.itemsMin === undefined) ? globalConfig.itemsMin : stopConfig.itemsMin;
			var itemsMax = (stopConfig.itemsMax === undefined) ? globalConfig.itemsMax : stopConfig.itemsMax;
			var groupBy = (stopConfig.groupBy === undefined) ? globalConfig.groupBy : stopConfig.groupBy;

			var key = String([stopConfig.stopId, stopConfig.type]);
			var departures = stopsData.get(key);

			if(departures) {

				row = table.insertRow();
				cell = row.insertCell();
				cell.colSpan = 3;
				cell.innerHTML = departures.stopName;
				cell.style.textAlign = "left";

				actuals = departures.actual;

				if(actuals.length <= itemsMin){
					[...Array(itemsMin - actuals.length).keys()].forEach(item => {
						actuals.push({actualRelativeTime: minutesMin * 60});
					})
				}

				groups = groupItemsBy(actuals, item => undefined);

				Object.keys(groups).forEach(function(groupKey) {

					group = groups[groupKey];

					filtered = group
						.filter(item => item.actualRelativeTime >= 0)
						.filter(item => item.actualRelativeTime >= minutesMin * 60)
						.filter(item => item.actualRelativeTime <= minutesMax * 60)
						.filter((item, index) => index < itemsMax);

					filtered.forEach(function(actual, i, array) {
							var timeMinutes = Math.floor(actual.actualRelativeTime / 60);

							row = table.insertRow();
							row.style.opacity = 1 - (i / array.length);

							lineCell = row.insertCell();
							lineCell.className = "line bright";
							lineCell.innerHTML = actual.patternText;
							
							directionCell = row.insertCell();
							directionCell.style.textAlign = "left";
							directionCell.innerHTML = actual.direction;

							timeCell = row.insertCell();
							timeCell.className = "time bright";
							timeCell.innerHTML = timeMinutes + " min";
						});
					
					if(filtered.length < itemsMin) {
						[...Array(itemsMin - filtered.length).keys()].forEach(item => {
							emptyRow = table.insertRow();
							emptyRow.style.opacity = 0;
							emptyCell = emptyRow.insertCell();
							emptyCell.colSpan = 3;
							emptyCell.innerHTML = "XXX";
						})
					}
				})
			}
		});

		return table;
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
