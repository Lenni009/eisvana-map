// Created by pahefu @ 2017 
// Update to overhaul all the UI

/* Initialization */

$('.menuitem').click(function () {
	$(".menuitem").removeClass("active");
	$(".page").removeClass("active");
	$(this).addClass("active");
	$("#" + $(this).attr("rel")).addClass("active");
});

rivets.configure({
	templateDelimiters: ['{{', '}}']
});
rivets.formatters.plus = function (item, plus) { return item + plus };


// HMS Variable instances
var nms_platforms = {
	PLAT_PS4: 1,
	PLAT_PC: 2
}

/* Main code */

// Stars and handlers

// Select box
var c = Phoria.Util.generateUnitCube(50);
var cubeParent = Phoria.Entity.create({
	points: c.points,
	edges: c.edges,
	polygons: c.polygons,
	style: {
		color: [0xee, 0xee, 0xee],
		//opacity: 0.15 ,
		drawmode: "wireframe"
	}
});


function Star(regionId, solarIndex, name, x, y, z, starColorIndex, raceId, metadata) {
	if (!(this instanceof Star)) return new Star(regionId, solarIndex, name, x, y, z, starColorIndex, raceId);

	this.regionId = regionId;
	this.solarIndex = solarIndex;
	this.x = x;
	this.y = y;
	this.z = z;
	this.starColorIndex = starColorIndex;
	this.mapObject = undefined;
	this.metadata = {
		race: raceId,
		name: name,
		systemTags: "",
		systemDescription: "",
		systemPage: ""
	};

	if (metadata) { // Passed data
		this.metadata.systemTags = metadata.SystemTags;
		this.metadata.systemDescription = metadata.SystemDescription;
		this.metadata.systemPage = metadata.SystemPage;
	}

	// Full names here
	this.raceName = races[this.metadata.race];

	this.systemName = (settingsPanelApp.current_platform == nms_platforms.PLAT_PS4) ? this.metadata.name.ps4 : this.metadata.name.pc;
	this.hexSolarId = toHex(this.solarIndex, 4);
	this.starColor = colors[this.starColorIndex];
	this.bgColor = "background-color:rgb(" + this.starColor + ");";

	this.domNodeId = "#sys_" + this.regionId + "_" + this.solarIndex;

	// Methods
	this.getPosArray = function () { return [this.x, this.y, this.z]; }
	this.getPosVector = function () { return { x: this.x, y: this.y, z: this.z }; }
}

var phoriaHandler = {
	cameraAngleH: 1.5708,
	cameraAngleV: 1.5708,
	selectedItem: undefined,

	initialize: function (domId, parentDomId) {

		var canvasParent = document.getElementById(parentDomId);
		var canvas = document.getElementById(domId);

		canvas.width = canvasParent.getBoundingClientRect().width * 0.99;

		var brandHeight = $("#mainnav").height();
		var cliHeight = document.documentElement.clientHeight;

		canvas.height = (cliHeight - brandHeight) * 0.95;

		var scene = new Phoria.Scene();
		scene.camera.position = { x: 0.0, y: 5.0, z: -15.0 };
		scene.perspective.aspect = canvas.width / canvas.height;
		scene.viewport.width = canvas.width;
		scene.viewport.height = canvas.height;
		this.scene = scene;
		this.renderer = new Phoria.CanvasRenderer(canvas);

		scene.graph.push(new Phoria.DistantLight());

		// Region enclosure cube
		/*var c = Phoria.Util.generateUnitCube(50);
		var cubeParent = Phoria.Entity.create({
			points: c.points,
			edges: c.edges,
			polygons: c.polygons,
			style:{
				color: [0xee,0xee,0xee],
				//opacity: 0.15 ,
				drawmode: "wireframe"
			}
		});
		scene.graph.push(cubeParent.translateY(25));*/

		// Select box
		var c = Phoria.Util.generateUnitCube(1);
		var selectBox = Phoria.Entity.create({
			points: c.points,
			edges: c.edges,
			polygons: c.polygons,
			style: {
				color: [0xff, 0x00, 0x00],
				drawmode: "wireframe"
			},
		});
		selectBox.position = [8000, 8000, 8000]; // Infinity and beyond!
		selectBox.translate(selectBox.position);
		scene.graph.push(selectBox);
		this.selectBox = selectBox;

		// Camera
		this.camera = this.scene.camera; // Adjust the camera

		// Mouse actions
		var mouse = Phoria.View.addMouseEvents(canvas, function () {
			var cpv = Phoria.View.calculateClickPointAndVector(phoriaHandler.scene, mouse.clickPositionX, mouse.clickPositionY);
		});

		this.generateStarField(); // Generate background starfield

	},

	moveSelectBox: function (xyzArr) {
		s = this.selectBox;
		s.translate([-s.position[0], -s.position[1], -s.position[2]]);
		s.translate(xyzArr);
		this.selectBox.position = xyzArr;
	},

	resetCameraAngle: function () {
		//this.cameraAngleH = 1.5708;
		//this.cameraAngleV = 1.5708;

		drawPanelApp.horizontalAngle = 90;
		drawPanelApp.verticalAngle = 90;
		drawPanelApp.zoomValue = 0;
		this.camera.unzoomedPosition = {
			x: this.camera.position.x,
			y: this.camera.position.y,
			z: this.camera.position.z
		};

	},

	doUpDownCamera: function (up) {
		this.camera.position.y += (up) ? 10 : -10;
		this.camera.lookat.y += (up) ? 10 : -10;
		this.renderFrame();
	},

	doZoom: function (forward) {

		var lx = this.camera.lookat.x
		var x = this.camera.position.x;
		var ly = this.camera.lookat.y
		var y = this.camera.position.y;
		var lz = this.camera.lookat.z
		var z = this.camera.position.z;

		var step = (!forward) ? -1 : 1;

		var dx = lx - x; dx *= step;
		var dy = ly - y; dy *= step;
		var dz = lz - z; dz *= step;

		this.camera.position.x += dx / 10;
		this.camera.position.y += dy / 10;
		this.camera.position.z += dz / 10;

		this.renderFrame();
	},

	doZoomBar: function (value) {
		var lx = this.camera.lookat.x
		var x = this.camera.unzoomedPosition.x;
		var ly = this.camera.lookat.y
		var y = this.camera.unzoomedPosition.y;
		var lz = this.camera.lookat.z
		var z = this.camera.unzoomedPosition.z;

		var step = value / 100.0;

		var dx = lx - x; dx *= step;
		var dy = ly - y; dy *= step;
		var dz = lz - z; dz *= step;

		this.camera.position.x = this.camera.unzoomedPosition.x + dx;
		this.camera.position.y = this.camera.unzoomedPosition.y + dy;
		this.camera.position.z = this.camera.unzoomedPosition.z + dz;

		this.renderFrame();
	},
	rotateCamXZ: function (left) {
		var variation = 0.0174533 * ((left) ? 1 : -1);
		var lx = this.camera.lookat.x
		var x = this.camera.position.x;
		var lz = this.camera.lookat.z
		var z = this.camera.position.z;
		var dist = Math.sqrt(Math.pow(lx - x, 2) + Math.pow(lz - z, 2));
		this.cameraAngleH -= variation;
		this.camera.position.x = lx + Math.cos(this.cameraAngleH) * dist;
		this.camera.position.z = lz + Math.sin(this.cameraAngleH) * dist;
		this.renderFrame();
	},

	rotateCamXZDegree: function (degrees) {
		var variation = 0.0174533 * degrees;
		var lx = this.camera.lookat.x
		var x = this.camera.position.x;
		var lz = this.camera.lookat.z
		var z = this.camera.position.z;
		var dist = Math.sqrt(Math.pow(lx - x, 2) + Math.pow(lz - z, 2));
		this.cameraAngleH = variation;
		this.camera.position.x = lx + Math.cos(this.cameraAngleH) * dist;
		this.camera.position.z = lz + Math.sin(this.cameraAngleH) * dist;
		this.renderFrame();
	},

	rotateCamYZ: function (up) {
		var variation = 0.0174533 * ((up) ? 1 : -1);
		var ly = this.camera.lookat.y
		var y = this.camera.position.y;
		var lz = this.camera.lookat.z
		var z = this.camera.position.z;
		var dist = Math.sqrt(Math.pow(ly - y, 2) + Math.pow(lz - z, 2));
		this.cameraAngleV -= variation;
		this.camera.position.y = ly + Math.cos(this.cameraAngleV) * dist;
		this.camera.position.z = lz + Math.sin(this.cameraAngleV) * dist;
		this.renderFrame();
	},
	rotateCamYZDegree: function (degrees) {
		var variation = 0.0174533 * degrees;
		var ly = this.camera.lookat.y
		var y = this.camera.position.y;
		var lz = this.camera.lookat.z
		var z = this.camera.position.z;
		var dist = Math.sqrt(Math.pow(ly - y, 2) + Math.pow(lz - z, 2));
		this.cameraAngleV = variation;
		this.camera.position.y = ly + Math.cos(this.cameraAngleV) * dist;
		this.camera.position.z = lz + Math.sin(this.cameraAngleV) * dist;
		this.renderFrame();
	},

	renderFrame: function () {
		if (this.scene != undefined) {
			this.scene.modelView();
			this.renderer.render(this.scene);
		}
	},

	addToScene: function (phoriaObj) {
		if (this.scene != undefined) {
			this.scene.graph.push(phoriaObj);
		}
	},

	generateStarField: function () {
		var num = 500; var scale = 5000;
		scale = scale || 1;
		var s = scale / 2;
		var points = [];
		for (var i = 0; i < num; i++) {
			points.push({ x: Math.random() * scale - s, y: Math.random() * scale - s, z: Math.random() * scale - s });
		}
		var starfield = Phoria.Entity.create({
			points: points,
			style: {
				color: [200 + ~~(Math.random() * 55), 200 + ~~(Math.random() * 55), 200 + ~~(Math.random() * 55)],
				drawmode: "point",
				shademode: "plain",
				linewidth: 0.5,
				linescale: 200,
				objectsortmode: "back"
			}
		});
		starfield.matrix = null;
		this.scene.graph.push(starfield);
	},

	generateStar: function (star, parent) {
		var scale = 0.25;

		var cube = undefined;

		if (star.solarIndex == 0) {
			scale = 100;
			var points = [];
			points.push({ x: 0, y: 0, z: 0 });
			cube = Phoria.Entity.create({
				id: star.systemName,
				points: points,
				style: {
					color: star.starColor,
					drawmode: "point",
					shademode: "plain",
					linewidth: 2,
					linescale: 80000,
					objectsortmode: "back"
				}
			}).translateX(star.x).translateY(star.y).translateZ(star.z);


		} else {

			var points = [];
			points.push({ x: star.x, y: star.y, z: star.z });
			cube = Phoria.Entity.create({
				id: star.systemName,
				points: points,
				style: {
					color: star.starColor,
					drawmode: "point",
					shademode: "plain",
					linewidth: 0.5,
					linescale: 50,
					objectsortmode: "back"
				}
			});

			var debugEntity = new Phoria.Entity();
			debugEntity.id = cube.id;
			debugEntity.points = [{ x: star.x, y: star.y, z: star.z }];
			debugEntity.style = {
				drawmode: "point",
				shademode: "callback",
				geometrysortmode: "none",
				objectsortmode: "front"    // force render on-top of everything else
			};

			// config object - will be combined with input later
			debugEntity.config = {};

			debugEntity.onRender(function (ctx, x, y) {

				var tx = phoriaHandler.camera.position.x;
				var ty = phoriaHandler.camera.position.y;
				var tz = phoriaHandler.camera.position.z;

				var sx = star.x;
				var sy = star.y;
				var sz = star.z;

				var dist = Math.sqrt((Math.pow(tx - sx, 2)) + (Math.pow(ty - sy, 2)) + (Math.pow(tz - sz, 2)));

				if (dist < 50 || regionHandler.selectedStar == star) {

					// render debug text
					ctx.fillStyle = "#999999";
					ctx.font = "14pt Helvetica";
					var textPos = y;
					textPos += 5;
					ctx.fillText(cube.id ? cube.id : "unknown - set Entity 'id' property", x + 5, textPos);

				}
			});
			cube.children.push(debugEntity);


		}

		return cube;
	}

};

var regionHandler = {

	initialize: function () {
		this.stars = [];
		this.mapObjects = [];
		this.selectedStar = undefined;

		// Populate the pointers base
		var points = [
			new Star(1, 0, { ps4: 'Galaxy center', pc: 'Galaxy center' }, -145762.8716783917, 0.019204677335472303, -0.00010293581164446534, 0, 0),
			new Star(1, 0x124, { ps4: 'CoolJungle', pc: 'CoolJungle' }, 20825.72704688998, -19.202783753792243, -3.0805012641606018, 3, 2),
			new Star(1, 0x1b4, { ps4: 'LizardWorld', pc: 'LizardWorld' }, 20818.927720684194, -12.418330391875925, 8.679687637891412, 3, 2),
			new Star(1, 0x999, { ps4: 'Hub', pc: 'Hub' }, 20811.32748949516, -16.15057093374628, -5.244964575966744, 1, 0),
			new Star(1, 0xFE, { ps4: 'Faith', pc: 'Faith' }, 20826.327571536, -15.405985004529528, -4.635964087619606, 3, 1),
			new Star(1, 0x17F, { ps4: 'SouthernLight', pc: 'SouthernLight' }, 20797.12265919312, -43.269288425630926, 2.8450806637888504, 3, 2),
			new Star(1, 0x74, { ps4: 'FistOfTheNorth', pc: 'FistOfTheNorth' }, 20838.417260783983, 60.512951161021306, -3.449881518159776, 0, 1),
			new Star(1, 0x79, { ps4: 'BlackHole', pc: 'BlackHole' }, 20845.021929809347, 45.91480267460992, 4.886646137508365, 0, 2)
		];

		// Force HUB as center of the region
		this.regionCenter = { x: points[3].x, y: points[3].y, z: points[3].z };

		for (var i = 0; i < points.length; i++) {
			this.addStar(points[i]);
		}

		var a = this.stars[0];
		var b = this.stars[3];
		var linep = [{ x: a.x, y: a.y, z: a.z }, { x: b.x, y: b.y, z: b.z }];
		var edges = [{ a: 0, b: 1 }];

		if (phoriaHandler.scene != undefined) {
			phoriaHandler.camera.lookat = { x: points[3].x, y: points[3].y, z: points[3].z };
			phoriaHandler.camera.position = { x: points[3].x, y: points[3].y, z: points[3].z + 220 };
			phoriaHandler.moveSelectBox(points[3].getPosArray());
			phoriaHandler.camera.position = { x: 9999, y: 9999, z: 9999 };
			phoriaHandler.camera.lookat = { x: 0, y: 0, z: 0 };
			// Try to render less, to speed first time loading
			//phoriaHandler.renderFrame();
		}

		phoriaHandler.scene.graph.push(cubeParent);

	},

	getStarByIndex: function (solarIndex) {
		for (var j = 0; j < this.stars.length; j++) {
			if (this.stars[j].solarIndex == solarIndex) {
				return this.stars[j];
			}
		}
		return null;
	},

	getDistance: function (p1, p2) {
		var dX = p2.x - p1.x;
		var dY = p2.y - p1.y;
		var dZ = p2.z - p1.z;

		var distance = Math.sqrt(dX * dX + dY * dY + dZ * dZ);
		return distance;
	},

	addStar: function (star) {
		star.x -= this.regionCenter.x;
		star.y -= this.regionCenter.y;
		star.z -= this.regionCenter.z;

		// Create new object
		var mapObject = phoriaHandler.generateStar(star, undefined);
		//phoriaHandler.addToScene(mapObject);
		star.mapObject = mapObject;

		cubeParent.children.push(mapObject);

		this.stars.push(star);
	},

	addPseudoStar: function (regionId, solarIndex, name, starColorIndex, raceId, blobids, blobdistances, metadata) {
		var ids = blobids;
		var distances = blobdistances;
		var trilatePoints = [];
		var NMS_SCALE_DIFFERENCE = 4.0;


		for (var i = 0; i < ids.length; i++) {
			if (ids[i].length == 0) { // Solve spaces here
				return;
			}

			var hexId = 0;
			var distanceRegion = 1;

			if (ids[i].trim() != "0") {
				var vals = ids[i].split("_");
				hexId = parseInt(vals[0], 16);
				distanceRegion = Number(vals[1]);
			} else { // Center will be treated always as region 1
				hexId = 0x00;
				distanceRegion = 1;
			}
			ids[i] = hexId; // Hotfix

			distances[i] = Number(distances[i]);
			if (distances[i] < 100000) { distances[i] /= NMS_SCALE_DIFFERENCE; } // NMS lineal distance is not distance 

			for (var j = 0; j < this.stars.length; j++) {
				if (this.stars[j].solarIndex == hexId && this.stars[j].regionId == distanceRegion) {
					var tp = this.stars[j];
					trilatePoints.push({ x: tp.x, y: tp.y, z: tp.z, r: distances[i] });
					break;
				}
			}
		}

		if (trilatePoints.length != ids.length) {
			console.log("Cannot add: ", name, "with", blobids, blobdistances, "Not All ids found");
			return;
		}

		var pack1 = trilaterate(trilatePoints[0], trilatePoints[1], trilatePoints[2]);
		var pack2 = trilaterate(trilatePoints[0], trilatePoints[2], trilatePoints[3]);
		var pack3 = trilaterate(trilatePoints[1], trilatePoints[2], trilatePoints[3]);
		var pack4 = trilaterate(trilatePoints[0], trilatePoints[1], trilatePoints[3]);

		var results = [];

		if (pack1 != null) { pack1.forEach(function (a) { results.push(a) }); }
		if (pack2 != null) { pack2.forEach(function (a) { results.push(a) }); }
		if (pack3 != null) { pack3.forEach(function (a) { results.push(a) }); }
		if (pack4 != null) { pack4.forEach(function (a) { results.push(a) }); }

		results.forEach(function (r) {
			r.error1 = Math.abs(regionHandler.getDistance(r, regionHandler.getStarByIndex(ids[0])) - distances[0]);
			r.error2 = Math.abs(regionHandler.getDistance(r, regionHandler.getStarByIndex(ids[1])) * NMS_SCALE_DIFFERENCE - distances[1] * NMS_SCALE_DIFFERENCE);
			r.error3 = Math.abs(regionHandler.getDistance(r, regionHandler.getStarByIndex(ids[2])) * NMS_SCALE_DIFFERENCE - distances[2] * NMS_SCALE_DIFFERENCE);
			r.error4 = Math.abs(regionHandler.getDistance(r, regionHandler.getStarByIndex(ids[3])) * NMS_SCALE_DIFFERENCE - distances[3] * NMS_SCALE_DIFFERENCE);
			r.errormean = (r.error1 + r.error2 + r.error3 + r.error4) / NMS_SCALE_DIFFERENCE;
		});

		results.sort(function (a, b) {
			if (a.errormean < b.errormean) {
				return -1;
			}
			return 1;
		});

		var i = 0;
		results.forEach(function (r) {
			if (i == 0) {
				regionHandler.addStar(new Star(regionId, solarIndex, name, r.x + 20811.32748949516, r.y - 16.15057093374628, r.z - 5.244964575966744, starColorIndex, raceId, metadata));
			}
			i++;
		});

		return;
	},

	updateLabels: function (labelType, max_label_length) {
		for (var i = 0; i < this.stars.length; i++) {
			var localStr = " ";
			switch (labelType) {
				case 0: localStr = " "; break;
				case 1: localStr = this.stars[i].systemName; break;
				case 2: localStr = this.stars[i].hexSolarId; break;
				case 3: localStr = this.stars[i].hexSolarId + " - " + this.stars[i].systemName; break;
			}

			if (max_label_length <= 0) {
				max_label_length = 9999;
			}

			if (this.stars[i] != regionHandler.selectedStar) {
				this.stars[i].mapObject.id = localStr.substr(0, max_label_length);
			} else {
				this.stars[i].mapObject.id = localStr;
			}
		}
		phoriaHandler.renderFrame();
	},

	lookAt: function (regionId, solarIndex) {
		solarIndex = Number(solarIndex);
		if (isNaN(solarIndex)) {
			return;
		}

		for (var i = 0; i < this.stars.length; i++) {
			if (this.stars[i].solarIndex == solarIndex && this.stars[i].regionId == regionId) {
				var s = this.stars[i];
				this.selectedStar = s;
				phoriaHandler.camera.lookat = { x: s.x, y: s.y, z: s.z };
				phoriaHandler.camera.position = { x: s.x, y: s.y, z: s.z + 220 };
				phoriaHandler.moveSelectBox(s.getPosArray());
				phoriaHandler.resetCameraAngle();
				break;
			}
		}

		phoriaHandler.renderFrame();
	}

};

/* UI Elements 
	// Usage as element changes
*/

var settingsPanelApp = {
	viewActive: false,
	isTab: true,
	current_platform: nms_platforms.PLAT_PS4,
	items_per_page: 5,
	max_name_length: 0,
	changeCallbacks: [],

	runCallbacks: function () {
		var pthis = settingsPanelApp;
		for (var i = 0; i < pthis.changeCallbacks.length; i++) {
			pthis.changeCallbacks[i](); // Run it
		}
	},
	applySettings: function () {
		var pthis = settingsPanelApp;
		pthis.runCallbacks();
	}

};
var settingsPanelAppBind = rivets.bind($("#settingsPanelApp")[0], settingsPanelApp);


var systemSelectionApp = {

	viewActive: true,
	isTab: true,
	systemFilter: "",
	visibleSystems: [],
	currentPage: 0,
	maxPages: 1,
	maxPerPage: settingsPanelApp.items_per_page,
	pagesAvailable: false,
	wikiLoading: false,


	maxPerPageChange: function () {
		var pthis = systemSelectionApp;
		pthis.currentPage = 0;
		pthis.maxPerPage = Number(settingsPanelApp.items_per_page);
		pthis.refreshSystems();
	},
	prevPage: function () {
		var pthis = systemSelectionApp;
		if (pthis.currentPage > 0) {
			pthis.currentPage--;
		}
		pthis.refreshSystems();
	},
	nextPage: function () {
		var pthis = systemSelectionApp;
		if (pthis.currentPage < pthis.maxPages - 1) {
			pthis.currentPage++;
		}
		pthis.refreshSystems();
	},

	dynamicSort: function (property) {
		var sortOrder = 1;
		if (property[0] === "-") {
			sortOrder = -1;
			property = property.substr(1);
		}
		return function (a, b) {
			var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
			return result * sortOrder;
		}
	},
	sortById: function (propertyName) {
		var pthis = systemSelectionApp;
		pthis.privateData = pthis.privateData.sort(pthis.dynamicSort(propertyName));
	},
	applyFilter: function () {
		// Apply filters then gather info from current subview
		var pthis = systemSelectionApp;
		pthis.currentPage = 0; // Reset to 0
		var localData = regionHandler.stars.slice();

		var localFilter = pthis.systemFilter.toLowerCase();

		var result = [];
		for (var i = 0; i < localData.length; i++) {

			if (localData[i].systemName.toLowerCase().includes(localFilter) ||
				localData[i].hexSolarId.toLowerCase().includes(localFilter) ||
				("race:" + (localData[i].raceName.toLowerCase())[0]) == (localFilter) ||
				"color:" + (systemColors[localData[i].starColorIndex]) == (localFilter)
			) {
				result.push(localData[i]);
			}
		}

		pthis.privateData = result;
		pthis.sortById("solarIndex");
		pthis.refreshSystems();
	},
	refreshSystems: function () {
		var pthis = systemSelectionApp;
		pthis.maxPages = Math.ceil(pthis.privateData.length / pthis.maxPerPage);
		pthis.pagesAvailable = pthis.maxPages != 0;
		pthis.visibleSystems = pthis.privateData.slice(pthis.currentPage * pthis.maxPerPage, pthis.currentPage * pthis.maxPerPage + pthis.maxPerPage);
	},
	showSystem: function (element) {
		var tag = "#sys_";
		if (element.target.id.indexOf(tag != -1)) {

			var data = element.target.id.replace(tag, "").split("_");
			var regionId = Number(data[0]);
			var solarIndex = Number(data[1]);

			regionHandler.lookAt(regionId, solarIndex);
		}
	}

};
systemSelectionApp.privateData = []; // Outside values, not watched by apps (a lot faster, low low memory footprint)
settingsPanelApp.changeCallbacks.push(systemSelectionApp.maxPerPageChange);
/* Auto Bindings */

$("#systemFilterTexBox").keyup(function (event) {
	systemSelectionApp.applyFilter();
});

var uiSelectionApp = {
	isTab: true,
	viewSystemList: true,
	viewMaterials: false,
	viewSettings: false,
	systemSelectionApp: systemSelectionApp,
	viewChangeCallbacks: Array(),

	runCallbacks: function () {
		for (var i = 0; i < this.viewChangeCallbacks.length; i++) {
			this.viewChangeCallbacks[i](); // Run it
		}
		systemSelectionApp.viewActive = this.viewSystemList;
		materialSelectionApp.viewActive = this.viewMaterials;
		settingsPanelApp.viewActive = this.viewSettings;
	},
	showSystemList: function () {
		this.viewSystemList = true;
		this.viewMaterials = false;
		this.viewSettings = false;
		this.runCallbacks();
	},
	showMaterials: function () {
		this.viewSystemList = false;
		this.viewMaterials = true;
		this.viewSettings = false;
		this.runCallbacks();
	},
	showSettings: function () {
		this.viewSystemList = false;
		this.viewMaterials = false;
		this.viewSettings = true;
		this.runCallbacks();
	}

};

var uiSelectionAppBind = rivets.bind($("#systemSelectionApp")[0], uiSelectionApp);


var drawPanelApp = {

	horizontalAngle: 90,
	verticalAngle: 90,
	zoomValue: 0,
	labelType: 1,


	updateCameraRotationH: function () {
		var pthis = drawPanelApp;
		phoriaHandler.rotateCamXZDegree(pthis.horizontalAngle);
	},
	updateCameraRotationV: function () {
		var pthis = drawPanelApp;
		phoriaHandler.rotateCamYZDegree(pthis.verticalAngle);
	},
	updateZoom: function () {
		var pthis = drawPanelApp;
		phoriaHandler.doZoomBar(pthis.zoomValue);
	},
	updateLabels: function () {
		var pthis = drawPanelApp;
		regionHandler.updateLabels(Number(pthis.labelType), settingsPanelApp.max_name_length);
	}

};
settingsPanelApp.changeCallbacks.push(drawPanelApp.updateLabels);
var drawPanelAppBind = rivets.bind($("#drawPanelApp")[0], drawPanelApp);


