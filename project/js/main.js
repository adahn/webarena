/**
 * @license
 * Copyright (C) 2012 Adam Rzepka
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

'use strict';

goog.require('goog.debug.FancyWindow');
goog.require('base');
goog.require('base.Mat4');
// goog.require('files.ResourceManager');
// goog.require('files.bsp');
// goog.require('files.md3');
// goog.require('files.ShaderScriptLoader');
goog.require('renderer.Renderer');
goog.require('InputHandler');
goog.require('game.Camera');

var DEFAULT_MAP = 'oa_rpg3dm2';

function getQueryVariable(variable) {
    var query = window.location.search.substring(1);
    var vars = query.split("&");
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split("=");
        if (pair[0] == variable) {
            return unescape(pair[1]);
        }
    }
    return null;
}

function initWebGL(canvas) {
    // Initialize the global variable gl to null.
    var gl = null;

    try {
	// Try to grab the standard context. If it fails, fallback to experimental.
	gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    }
    catch(e) {}

    // If we don't have a GL context, give up now
    if (!gl) {
	alert("Unable to initialize WebGL. Your browser may not support it.");
    }
    return gl;
}

window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
        window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;


var render;

function main() {
    var canvas = document.getElementById('glcanvas');

    var gl = initWebGL(canvas);
    if (goog.DEBUG) {
	var debugWindow = new goog.debug.FancyWindow('main');
	debugWindow.setEnabled(true);
	debugWindow.init();
    }

    var map = getQueryVariable('map');

    if (map === null)
        map = DEFAULT_MAP;

//    var rm = new files.ResourceManager();
    var input = new InputHandler();
    var camera = new game.Camera(input, [0, 0, 0]);

    var lastTime = Date.now();
    var timeAcc = 0;

    var weaponMtx = base.Mat4.identity();
    var weaponOff = base.Vec3.create([10, -10, -4]);
    var weaponId = -1;
    var weaponRot = base.Mat4.create([0, 0, -1, 0,
				      -1, 0, 0, 0,
				      0, 1, 0, 0,
				      0, 0, 0, 1]);
    var fpsCounter = 0;
    var fpsTime = 0;
    function update() {
	timeAcc += Date.now() - lastTime;
	fpsTime += Date.now() - lastTime;

	while (timeAcc > 15) {
	    timeAcc -= 15;
	    camera.update();
	    input.clearInput();
	}
	lastTime = Date.now();

	++fpsCounter;
	if (fpsTime > 1000) {
	    fpsTime -= 1000;
	    document.getElementById('fps').textContent = fpsCounter;
	    fpsCounter = 0;
	}
	
	render.updateCamera(camera.getCameraMatrix());
//	base.Mat4.translate(camera.getCameraMatrix(), weaponOff, weaponMtx);
//	base.Mat4.multiply(weaponMtx, weaponRot, weaponMtx);
//	render.updateModel(weaponId, weaponMtx, 0);
	render.render();
	requestAnimationFrame(update);
    }

    render = new renderer.Renderer(gl);
    
    var worker = new Worker('js/game/game.js');
    worker.onmessage = function (event) {
	var msg = event.data;
	switch (msg.type) {
	case 'shaders':
	    render.buildShaders(msg.data[0], msg.data[1]);
	    break;
	case 'map':
	    render.registerMap(msg.data[0], msg.data[1]);
	    requestAnimationFrame(update);
	    break;
	case 'md3':
	    render.registerMd3(msg.data[0]);
	    break;
	case 'instance':
	    render.registerModelInstance.apply(render, msg.data);
	    break;
	default:
	    goog.asserts.fail('Unknown message ' + msg.type);
	};
    };

    // rm.load([map, "lightning"], function () {

    // 	files.ShaderScriptLoader.loadAll(rm.getScripts());
    // 	render.buildShaders(files.ShaderScriptLoader.shaderScripts, rm.getTextures());
	
    // 	var map = files.bsp.load(rm.getMap());
    // 	render.registerMap(map.models, map.lightmapData);
    // 	map.models.forEach(function (model) {
    // 	    render.registerModelInstance(base.ModelInstance.getNextId(),
    // 					 model.id,
    // 					 base.Mat4.identity());
    // 	});
	
    // 	var md3 = files.md3.load(rm.getModel('models/weapons2/lightning/lightning.md3'));
    // 	render.registerMd3(md3);
    // 	weaponId = base.ModelInstance.getNextId();
    // 	render.registerModelInstance(weaponId,
    // 				     md3.id,
    // 				     weaponMtx);
    // 	render.updateCamera(base.Mat4.identity());
    // 	setTimeout(function() {
    // 	    requestAnimationFrame(update);
    // 	}, 1);
    // });
}

goog.exportSymbol('main', main);
