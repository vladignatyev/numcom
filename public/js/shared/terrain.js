/**************************************************
** Terrain model and generation classes.
**************************************************/

if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(function(require){ // require is unused
    var Terrain = function (size) {
        this.tiles = [];
        var tiles = this.tiles;
        
        this.size = size;
        
        for (var row = 0; row < size; row++) {
            for (var col = 0; col < size; col++) {
                tiles.push(new Tile(col, row));
            }
        }
        
        this.tile = function (x, y) {
            return tiles[x + y * size];
        };
        
        this.left = function (tile) {
            if (tile.x - 1 < 0) return undefined;
            return this.tile(tile.x - 1, tile.y);
        };
        
        this.right = function (tile) {
            if (tile.x + 1 > size - 1) return undefined;
            return this.tile(tile.x + 1, tile.y);
        };
        
        this.top = function (tile) {
            if (tile.y - 1 < 0) return undefined;
            return this.tile(tile.x, tile.y - 1);
        };
        
        this.bottom = function (tile) {
            if (tile.y + 1 > size - 1) return undefined;
            return this.tile(tile.x, tile.y + 1);
        };
    }
    
    
    var Tile = function (
                    x, y, state, payload, 
                    terrainType, terrainSpriteIndices,
                    floraType, floraSpriteIndices
                    ) {
        this.x = x;
        this.y = y;
        this.state = state || '';
        this.payload = payload || {};
    
        this.terrainType = terrainType || '';
        this.terrainSpriteIndices = terrainSpriteIndices; 
        if (!this.terrainSpriteIndices) this.terrainSpriteIndices = [0, 0];
    
        this.floraType = floraType || undefined;
        this.floraSpriteIndices = floraSpriteIndices;
        if (!this.floraSpriteIndices) this.floraSpriteIndices = [0, 0];
        
        
        var WALKABLE_TILES_INDICES = [[5, 1], [5, 4]];
        
        function indexOfXYIndex(i, j, indices) {
            for (var l = indices.length - 1; l >= 0; l--) {
                var indexArr = indices[l]; // [x, y]
                if (i == indexArr[0] && j == indexArr[1]) {
                    return l;
                }
            }
            return -1;
        }
        
        this.updateWalkable = function () {
            if (!this.floraType) {
                if (indexOfXYIndex(this.terrainSpriteIndices[0], 
                    this.terrainSpriteIndices[1], WALKABLE_TILES_INDICES) >= 0) {
                    this.walkable = true;
                }
            } else {
                this.walkable = false;
            }
        }
        
        this.walkable = false;
    
        this.clean = function() {
            this.state = '';
            this.payload = {};
        };
        
        this.copyFrom = function(tileObj) {
            this.x = tileObj.x;
            this.y = tileObj.y;
            this.state = tileObj.state;
            this.payload = tileObj.payload;
        
            this.terrainType = tileObj.terrainType;
            this.terrainSpriteIndices = tileObj.terrainSpriteIndices; 
        
            this.floraType = tileObj.floraType;
            this.floraSpriteIndices = tileObj.floraSpriteIndices;
            
            this.updateWalkable();
        };
    }
    

    var TileMapGenerator = function () {
        
        function addLake (terrain, tx0, ty0, tx1, ty1) {
            terrain.tile(tx0, ty0).terrainType = 'icegrass'; //topleft
            terrain.tile(tx0, ty0).terrainSpriteIndices = [1,3];
            for (var i = tx0 + 1; i < tx1; i++) { // top border
                terrain.tile(i, ty0).terrainType = 'icegrass';
                terrain.tile(i, ty0).terrainSpriteIndices = [2,3];
            }
            terrain.tile(tx1, ty0).terrainType = 'icegrass'; //topright
            terrain.tile(tx1, ty0).terrainSpriteIndices = [3,3];
            
            
            terrain.tile(tx0, ty1).terrainType = 'icegrass'; //bottomleft
            terrain.tile(tx0, ty1).terrainSpriteIndices = [1,5];
            for (var i = tx0 + 1; i < tx1; i++) { // bottom border
                terrain.tile(i, ty1).terrainType = 'icegrass';
                terrain.tile(i, ty1).terrainSpriteIndices = [2,3];
            }
            terrain.tile(tx1, ty1).terrainType = 'icegrass'; //bottomright
            terrain.tile(tx1, ty1).terrainSpriteIndices = [3,5];
            
            
            // the lake center
            
            for (var i = tx0 + 1; i < tx1 + 1; i++) {
                for (var j = ty0 + 1; j < ty1; j++) {
                    terrain.tile(i, j).terrainType = 'icegrass';
                    terrain.tile(i, j).terrainSpriteIndices = [2, 4];
                }
            }
            
            //left and right borders
            for (var i = ty0 + 1; i < ty1; i++) {
                terrain.tile(tx0, i).terrainType = 'icegrass';
                terrain.tile(tx0, i).terrainSpriteIndices = [1, 4];
                terrain.tile(tx1, i).terrainType = 'icegrass';
                terrain.tile(tx1, i).terrainSpriteIndices = [3, 4];
            }
            
        }
        
        this.generateMap = function (size) { //laguna
        //  size is ignored now
            var terrain = new Terrain(32);
            for (var i = 0; i < 32; i++) {
                for (var j = 0; j < 32; j++) {
                    var tile = terrain.tile(i, j);
                    tile.terrainType = 'icegrass';
                    tile.terrainSpriteIndices = [5, 1];
                }
            }
            
            addLake(terrain, 10, 10, 20, 20);
            
            for (i = 0; i < 5; i++) {
                for (j = 0; j < 5; j++) {
                    tile = terrain.tile(i, j);
                    tile.updateWalkable();
                }
            }
            return terrain;
        };
    };

    // Define which variables and methods can be accessed
    return {
        TileMapGenerator: TileMapGenerator,
        Terrain: Terrain,
        Tile: Tile
    };
});

