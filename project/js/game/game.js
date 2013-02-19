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

goog.require('flags');
goog.require('base');
goog.require('base.IRenderer');
goog.require('base.workers.Broker');
goog.require('base.Mat3');
goog.require('files.ResourceManager');
goog.require('files.bsp');
goog.require('files.md3');
goog.require('files.ShaderScriptLoader');
goog.require('game.InputBuffer');
goog.require('game.FreeCamera');
goog.require('game.CharacterController');
goog.require('game.globals');
goog.require('game.ModelManager');
goog.require('game.Player');

goog.provide('game');

/**
 * @param {base.workers.IBroker} broker
 */
game.init = function (broker) {
    var render;
    var input = new game.InputBuffer();
    var rm = new files.ResourceManager();
    var mapName = 'aggressor';
    
    broker.registerReceiver('base.IInputHandler', input);
    
    render = /**@type{base.IRenderer}*/broker.createProxy('base.IRenderer', base.IRenderer);
    
    rm.load([mapName, 'assassin', "lightning"], function () {
	var map, md3;
	files.ShaderScriptLoader.loadAll(rm.getScripts());
        render.buildShaders(files.ShaderScriptLoader.shaderScripts,
					     rm.getTextures());
	
	map = files.bsp.load(rm.getMap());
        render.registerMap(map.models, map.lightmapData);

	map.models.forEach(function (model) {
            render.registerModelInstance(base.ModelInstance.getNextId(),
	                                   model.id,
	                                   base.Mat4.identity());
	});
	
        var camera = new game.FreeCamera(input, base.Vec3.create([0,0,0]));
        
        var modelManager = new game.ModelManager(render, rm);
        var player = new game.Player(modelManager, rm, 'assassin', 'default');
        var characterController = new game.CharacterController(map.bsp, input, player);
        var spawnPoints = map.getSpawnPoints();
        var spawnPoint = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
        
        characterController.respawn(/**@type{base.Vec3}*/spawnPoint['origin'],
            spawnPoint['angle'] * Math.PI / 180 - Math.PI * 0.5);
        render.updateCamera(characterController.getCameraMatrix());

        function update () {
            input.step();

            if (game.globals.freeCameraControl || game.globals.freeCamera) {
                camera.update();
            } else {
                characterController.update();
            }
            if (game.globals.freeCameraView || game.globals.freeCamera) {
                render.updateCamera(camera.getCameraMatrix());
            } else {
                render.updateCamera(characterController.getCameraMatrix());
            }                

            modelManager.syncWithRenderer();
        };
        setInterval(update, game.globals.TIME_STEP_MS);
    });
};


goog.exportSymbol('game.init', game.init);
