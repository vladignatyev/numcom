var showScoreTable;
window.onload = function () {
    showScoreTable = function (scoreTable) {
        var modalContent = '';
        
        for (var i = 0; i < scoreTable.length; i++) {
            var score = scoreTable[i]['score'];
            var name = scoreTable[i]['name'];
            
            modalContent = modalContent + '<h3>' + score + ' - <small>' + name + '</small></h3>';
        }
        
        var html = '<div class="modal fade" id="scoreTable" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true">' +
          '<div class="modal-dialog">' +
            '<div class="modal-content">' +
              '<div class="modal-header">' +
                '<button type="button" class="close" data-dismiss="modal"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>' +
                '<h4 class="modal-title" id="exampleModalLabel">Game Over!</h4>' +
              '</div>' +
              '<div class="modal-body">' +
                modalContent + 
              '</div>' +
              '<div class="modal-footer">' +
                '<button type="button" class="btn btn-default" data-dismiss="modal">Close</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>';
        
        $(document.body).append($(html));
        $('#scoreTable').modal();
        
    }

}

requirejs(['terrain', 'dynamic', 'player'], function(terrainModule, dynamicModule, playerModule) {
    //window.onload = function() {
        RemotePlayer = function (index, game, player, startX, startY) {
        
        //     var x = startX;
            var y = startY;
        
            this.game = game;
            this.health = 3;
            this.player = player;
            this.alive = true;
        
            this.player = game.add.sprite(x, y, 'enemy');
            
            this.player.animations.add('move', [0,1,2,3,4,5,6,7], 20, true);
            this.player.animations.add('stop', [3], 20, true);
        
            this.player.anchor.setTo(0.5, 0.5);
        
            this.player.name = index.toString();
            this.player.body.immovable = true;
            this.player.body.collideWorldBounds = true;
        
            this.player.angle = game.rnd.angle();
        
            this.lastPosition = { x: x, y: y }
        };
        
        RemotePlayer.prototype.update = function() {
            if(this.player.x != this.lastPosition.x || this.player.y != this.lastPosition.y) {
                this.player.play('move');
                this.player.rotation = Math.PI + game.physics.angleToXY(this.player, this.lastPosition.x, this.lastPosition.y);
            } else {
                this.player.play('stop');
            }
        
            this.lastPosition.x = this.player.x;
            this.lastPosition.y = this.player.y;
        };
        
        var game = new Phaser.Game(800, 600, Phaser.AUTO, '', { preload: preload, create: create, update: update, render: render });
        var gui = new GameUI(game);
        var terrain;
        
        var landscapeAssets;
        var gemsAssets;
        var doorAssets;
        
        var artifactsObjs;
        
        
        function preload () {
            game.load.spritesheet('dude', 'assets/charset.png', 32, 32);
            game.load.spritesheet('tilerect', 'assets/rect.png', 32, 32);

            landscapeAssets = new TilesAssets(game);
            gemsAssets = new GemsAssets(game);
            doorAssets = new DoorAsset(game);
            
            // game.load.spritesheet('dude', 'assets/dude.png', 64, 64);
            
            gemsAssets.preload();
            landscapeAssets.preload();
            doorAssets.preload();
            
            gui.preload();
        }
        
        var socket;         // Socket connection
        var pController;
        
        var player;
        
        var enemies;
        
        var currentSpeed = 0;
        var cursors;
        
        function PlayerWrapper (player, sprite) {
            this.player = player;
            this.sprite = sprite;
        }
        
        
        function create () {
        
            //socket = io.connect('http://martynovr.koding.io:3000');
            
            socket = io();
            
            
            guiGroup = game.add.group();
            pController = new PlayerController(game, socket, guiGroup);
            
            gui.create();
            terrain = game.add.group();
            
            //  The base of our player
            var startX = 100,
                startY = 100;
                
            //  Create some baddies to waste :)
            enemies = [];
            
            //  Modify the world and camera bounds
            game.world.setBounds(0, 0, 1920, 1200);
        
            //game.camera.follow(player);
            //game.camera.deadzone = new Phaser.Rectangle(150, 150, 500, 300);
            //game.camera.focusOnXY(0, 0);
        
            cursors = game.input.keyboard.createCursorKeys();
        
            // Start listening for events
            setEventHandlers();
        }
        
        var setEventHandlers = function() {
            // Socket connection successful
            socket.on("connect", onSocketConnected);
        
            // Socket disconnection
            socket.on("disconnect", onSocketDisconnect);
        
            // New player message received
            socket.on("new player", onNewPlayer);
        
            // Player move message received
            socket.on("move player", onMovePlayer);
        
            // Player removed message received
            socket.on("remove player", onRemovePlayer);
            
            // Game state message received
            socket.on("gameStateInit", onGameStateInit);
            
            socket.on("DEBUGTOCLIENTCONSOLE", function (data) { console.log(data)});
        };
        
        var rebuiltTerrain;
        var rebuiltServerDynamicMap;
        var artifactsLayer;
        
        function onGameStateInit(data) {
            socket.removeListener("gameStateInit", onGameStateInit);
            console.log("Recieved game state from socket server", data);
            
            var serverTerrain = data['terrain'];
            var serverDynamicMap = data['dynamicMap'];
            var serverPlayer = data['player'];
            
            rebuiltTerrain = new terrainModule.Terrain(serverTerrain.size);
            for (var i = 0; i < serverTerrain.tiles.length; i++) {
                rebuiltTerrain.tiles[i].copyFrom(serverTerrain.tiles[i]);
            }
            
            var terrainSprites = terrainToSprites(game, landscapeAssets, rebuiltTerrain);
            terrain.addChild(terrainSprites);
            
            console.log('Server dynamic map', serverDynamicMap);
            serverDynamicMap.numbersGrid = dynamicModule.NumberGrid.buildFromData(serverDynamicMap.numbersGrid);
            
            rebuiltServerDynamicMap = serverDynamicMap;
            var dynamicMapSpriteObjects = dynamicMapToSprites(game, gemsAssets, doorAssets, serverDynamicMap);
            
            
            artifactsObjs = dynamicMapSpriteObjects[1]['artifacts'];
            artifactsLayer = game.add.group();
            artifactsLayer.alpha = 0.5;
            for (var i = 0; i < artifactsObjs.length; i++) {
                var sprite = artifactsObjs[i]['sprite'];
                artifactsLayer.addChild(sprite);
            }
            
            var myPlayer = new playerModule.Player(serverPlayer.id, rebuiltTerrain.tile(serverPlayer.tile.x, serverPlayer.tile.y));
            myPlayer.name = serverPlayer.name;
            var playerSprite = playerToSprite(game, myPlayer.tile.x * 32, myPlayer.tile.y * 32);
            
            player = {
                'obj': myPlayer,
                'sprite': playerSprite
            };

            terrain.addChild(playerSprite);
            
            
            terrain.addChild(dynamicMapSpriteObjects[0]);
            
            
        }
        
        // Socket connected
        function onSocketConnected() {
            console.log("Connected to socket server");
        
            // Send local player data to the game server
            socket.emit("new player");
        }
        
        // Socket disconnected
        function onSocketDisconnect() {
            console.log("Disconnected from socket server");
        }
        
        // New player
        function onNewPlayer(serverPlayer) {
            console.log("New player connected: ", serverPlayer.id);
        
            var myPlayer = new playerModule.Player(serverPlayer.id, rebuiltTerrain.tile(serverPlayer.tile.x, serverPlayer.tile.y));
            myPlayer.name = serverPlayer.name;
            var sprite = playerToSprite(game, serverPlayer.tile.x * 32, serverPlayer.tile.y * 32);

            enemies.push({
                'obj': myPlayer,
                'sprite': sprite
            });
            
            terrain.addChild(sprite);
            
            // Add new player to the remote players array
            // enemies.push(new RemotePlayer(data.id, game, player, data.x, data.y));
        }
        
        // Move player
        function onMovePlayer(data) {
            
            var movePlayer = playerById(data.id);
        
            // Player not found
            if (!movePlayer) {
                console.log("Player not found: "+data.id);
                return;
            }
        
            // Update player position by path array
            MovePlayerByPath(movePlayer, data.arPath, data.achievedBonus, data.collectedGems, data.scoreTable);
            
        }
        
        // Remove player
        function onRemovePlayer(data) {
        
            var removePlayer = playerById(data.id);
        
            // Player not found
            if (!removePlayer) {
                console.log("Player not found: "+data.id);
                return;
            }
        
            terrain.removeChild(removePlayer.sprite);
        
            // Remove player from array
            enemies.splice(enemies.indexOf(removePlayer), 1);
        
        }
        
        function tweenTo(avatar, tileTo) {
            if(typeof tileTo === "undefined") {
                console.log("Edge of map");
                return;
            }
            var spriteTween = game.add.tween(avatar.sprite);
            spriteTween.loop(false);
            spriteTween.repeatCounter = 0;
            
            spriteTween.to({x: tileTo.x * 32, y: tileTo.y * 32}, 1000 /*duration of the tween (in ms)*/, 
            Phaser.Easing.Linear.None /*easing type*/, true /*autostart?*/, 100 /*delay*/, false /*yoyo?*/);
            
            spriteTween.repeat(0);
            avatar.obj.tile = tileTo;
        }
        
        function tweenByPath(avatar, pathArray) {
            if(typeof pathArray === "undefined") {
                console.log("Empty path");
                return;
            }
            if(pathArray.length < 1) {
                console.log("Path finished");
                return;
            }
            
            var tileTo = pathArray[0];
            
            // eat gems and update  or show end of level if occured
            
            if (avatar.obj.tile.x > tileTo.x) {
                avatar.sprite.animations.play('moveLeft');
            } 
            else if (avatar.obj.tile.x < tileTo.x) {
                avatar.sprite.animations.play('moveRight');
            }
            else if (avatar.obj.tile.y > tileTo.y) {
                avatar.sprite.animations.play('moveUp');
            }
            else {
                avatar.sprite.animations.play('moveDown');
            }
            
            var spriteTween = game.add.tween(avatar.sprite);
            spriteTween.loop(false);
            spriteTween.repeatCounter = 0;
            
            spriteTween.to({x: tileTo.x * 32, y: tileTo.y * 32}, 1000 /*duration of the tween (in ms)*/, 
            Phaser.Easing.Linear.None /*easing type*/, true /*autostart?*/, 100 /*delay*/, false /*yoyo?*/);
            
            spriteTween.repeat(0);
            avatar.obj.tile = tileTo;
            
            spriteTween.onComplete.add(function() {
                avatar.sprite.animations.play('stop');
                pathArray.splice(0,1);
                tweenByPath(avatar, pathArray);
            }, this);
        }
        
        function updateScoreUI() {
            gui.scoreText.setText('score:' + player['obj'].score);
            
        }
        
        
        function getArtifactByTile(x, y) {
            for (var i = 0; i < artifactsObjs.length; i++) {
                var artifact = artifactsObjs[i]['obj'];
                if (artifact.x == x && artifact.y == y) {
                    return artifactsObjs[i];
                }
            }
            return false;
        }
        
        // Update player position by path array
        function MovePlayerByPath(avatar, arPath, achievedBonus, collectedGems, scoreTable) {
          
            tweenByPath(avatar, arPath);
            
            avatar.obj.score = avatar.obj.score + achievedBonus;
            updateScoreUI();
            
            for (var i = 0; i < collectedGems.length; i++) {
                var collectedGem = collectedGems[i];
                var tileX = collectedGem.tile.x;
                var tileY = collectedGem.tile.y;
                
                var artifact = getArtifactByTile(tileX, tileY);
                if (artifact) {
                    artifactsLayer.removeChild(artifact['sprite']);
                }
                //find and remove gem
            }
            
            if (scoreTable && scoreTable.length) {
                showScoreTable(scoreTable);
            }
        }
        
        function update () {
            gui.update();
            pController.update();
            
            /*for (var i = 0; i < enemies.length; i++)
            {
                if (enemies[i].alive)
                {
                    enemies[i].update();
                    game.physics.collide(player, enemies[i].player);
                }
            }*/
        
        /*
            if (cursors.left.isDown)
            {
                player.sprite.animations.play('moveLeft');
                tweenTo(player.sprite, rebuiltTerrain.left(player.obj.tile));
                //player.obj.tile = rebuiltTerrain.left(player.obj.tile);
            }
            else if (cursors.right.isDown)
            {
                //player.angle += 4;
                player.sprite.animations.play('moveRight');
                tweenTo(player.sprite, rebuiltTerrain.right(player.obj.tile));
            }
            else if (cursors.up.isDown)
            {
                //player.angle += 4;
                player.sprite.animations.play('moveUp');
                tweenTo(player.sprite, rebuiltTerrain.top(player.obj.tile));
            }
            else if (cursors.down.isDown)
            {
                //player.angle += 4;
                player.sprite.animations.play('moveDown');
                tweenTo(player.sprite, rebuiltTerrain.bottom(player.obj.tile));
            }
            */
            /*
        
            if (cursors.up.isDown)
            {
                //  The speed we'll travel at
                currentSpeed = 300;
            }
            else
            {
                if (currentSpeed > 0)
                {
                    currentSpeed -= 4;
                }
            }
        
            if (currentSpeed > 0)
            {
                game.physics.velocityFromRotation(player.rotation, currentSpeed, player.body.velocity);
            
                player.animations.play('move');
            } 
            else 
            {
                player.animations.play('stop');
            }
        
            land.tilePosition.x = -game.camera.x;
            land.tilePosition.y = -game.camera.y;
        
            if (game.input.activePointer.isDown)
            {
                if (game.physics.distanceToPointer(player) >= 10) {
                    currentSpeed = 300;
                
                    player.rotation = game.physics.angleToPointer(player);
                }
            }
        
            socket.emit("move player", {x: player.x, y:player.y});
            */
        }
        
        function render () {
            //debug purpose
            // game.debug.cameraInfo(game.camera, 32, 32);
        }
        
        // Find player by ID
        function playerById(id) {
            if(player.obj.id === id)
                return player;
            
            var i;
            for (i = 0; i < enemies.length; i++) {
                if (enemies[i].obj.id == id)
                    return enemies[i];
            }
            
            return false;
        }

//    };
});


    
