class Platformer extends Phaser.Scene {
    constructor() {
        super("platformerScene");
    }

    init() {
        // variables and settings
        this.ACCELERATION = 600;
        this.DRAG = 2600;    // DRAG < ACCELERATION = icy slide
        this.physics.world.gravity.y = 1100;
        this.JUMP_VELOCITY = -750;
        this.PARTICLE_VELOCITY = 50;
        this.SCALE = 2.0;
    }

    create() {
        // Create a new tilemap game object which uses 18x18 pixel tiles, and is
        // 45 tiles wide and 25 tiles tall.
        this.map = this.add.tilemap("platformer-level-1");

        // Add a tileset to the map
        // First parameter: name we gave the tileset in Tiled
        // Second parameter: key for the tilesheet (from this.load.image in Load.js)
        this.tileset = this.map.addTilesetImage("kenny_tilemap_packed", "tilemap_tiles");

        // Create a layer
        this.groundLayer = this.map.createLayer("Ground-n-Platforms", this.tileset, 0, 0);

        // Make it collidable
        this.groundLayer.setCollisionByProperty({
            collides: true
        });

        // Detecting Hazards
        this.hazards = this.groundLayer.filterTiles(tile => {
            return tile.properties.hazard;
        });

        // Create coins from Objects layer in tilemap
        this.coins = this.map.createFromObjects("Objects", {
            name: "coin",
            key: "tilemap_sheet",
            frame: 151
        });

        this.physics.world.enable(this.coins, Phaser.Physics.Arcade.STATIC_BODY);

        // Create a Phaser group out of the array this.coins
        // This will be used for collision detection below.
        this.coinGroup = this.add.group(this.coins);

        // Find water tiles
        this.waterTiles = this.groundLayer.filterTiles(tile => {
            return tile.properties.water || tile.properties.hazard;
        });

        ////////////////////
        // TODO: put water bubble particle effect here
        // It's OK to have it start running
        ////////////////////
        this.waterParticles = this.add.particles(0, 0, "kenny-particles", {

            frame: ['circle_05.png'],
            lifespan: 2000,
            speedY: { min: -100, max: -200 },
            speedX:{ min: -20, max: 20 },
            scale: { start: 0.4, end: 0 },
            alpha: { start: 1, end: 0 },
            quantity: 1,
            frequency: 150,

            emitCallback: (particle) => {
                if (this.waterTiles.length === 0) {
                    return;
                }

                let tile = Phaser.Math.RND.pick(this.waterTiles);
                particle.x = tile.pixelX + Phaser.Math.Between(0, tile.width);
                particle.y = tile.pixelY + Phaser.Math.Between(4, tile.height - 4);
            }
        });


        // set up player avatar
        let spawnPoint = this.map.findObject("Objects", obj => obj.name === "playerSpawn");
        
        my.sprite.player = this.physics.add.sprite(
            spawnPoint.x,
            spawnPoint.y,
            "platformer_characters",
            "tile_0000.png"
        );
        my.sprite.player.setCollideWorldBounds(true);
        my.sprite.player.body.enable = true;
        my.sprite.player.body.setAllowGravity(true);
        my.sprite.player.setGravityY(1500);

        // Endpoint Creation
        let goalPoint = this.map.findObject("Objects", obj => obj.name === "goal");
        
        this.goal = this.add.rectangle(
            goalPoint.x,
            goalPoint.y,
            goalPoint.width,
            goalPoint.height,
            0x00ff00,
            0
        );
        
        this.physics.add.existing(this.goal, true);

        // Create enemies from Objects layer
        this.enemies = this.physics.add.group();
        
        let enemyObjects = this.map.getObjectLayer("Objects").objects.filter(obj => obj.name === "enemy");
        
        enemyObjects.forEach(obj => {
            
            let enemy = this.enemies.create(
                obj.x,
                obj.y,
                "platformer_characters",
                "tile_0015.png"
            );
            
            enemy.setCollideWorldBounds(true);
            enemy.setVelocityX(80);
            enemy.direction = 1;
        });

        // Enable collision handling
        this.physics.add.collider(my.sprite.player, this.groundLayer);

        this.physics.add.collider(this.enemies, this.groundLayer);
        
        this.physics.add.overlap(my.sprite.player, this.enemies, () => {
            this.damagePlayer();
        });

        // Detect hazards like spikes, water, lasers
        this.physics.add.overlap(my.sprite.player, this.groundLayer, () => {
            let tile = this.groundLayer.getTileAtWorldXY(
                my.sprite.player.x,
                my.sprite.player.y
            );
            
            if (tile && tile.properties.hazard) {
                // Restart level
                this.damagePlayer();
            }
        });

        //After reaching the finish line
        this.levelComplete = false;
        
        this.physics.add.overlap(my.sprite.player, this.goal, () => {
            if (this.levelComplete) {
                return;
            }
            
            this.levelComplete = true;
            
            this.add.text(
                my.sprite.player.x - 120,
                my.sprite.player.y - 100,
                "MISSION COMPLETE\nPress R to Restart",
                {
                    fontSize: "24px",
                    color: "#ffffff",
                    backgroundColor: "#000000",
                    padding: { x: 10, y: 10 }
                }
            );
            
            my.sprite.player.setVelocity(0, 0);
            my.sprite.player.body.enable = false;
        });

        // TODO: create coin collect particle effect here
        // Important: make sure it's not running
        this.coinParticles = this.add.particles(0, 0, "kenny-particles", {
            frame: ['star_09.png'],
    
            speed: { min: 500, max: 1000 },

            angle: { min: 0, max: 360 },

            scale: { start: 0.08, end: 0 },

            lifespan: 500,

            gravityY: 200,

            quantity: 8,

            emitting: false
        });

        // Create Sound Object
        this.jumpSound = this.sound.add("jumpSound");
        this.landSound = this.sound.add("landSound");
        this.collectSound = this.sound.add("collectSound");

        // set up Phaser-provided cursor key input
        cursors = this.input.keyboard.createCursorKeys();
        this.leftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
        this.rightKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
        this.upKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);

        this.rKey = this.input.keyboard.addKey('R');

        // debug key listener (assigned to D key)
        this.input.keyboard.on('keydown-D', () => {
            this.physics.world.drawDebug = this.physics.world.drawDebug ? false : true
            this.physics.world.debugGraphic.clear()
        }, this);

        // toggle flag used for pause on striking a particle
        this.pauseParticles = false;
        this.input.keyboard.on('keydown-P', () => {
            this.pauseParticles = !this.pauseParticles;
        });

        // TODO: Add creation of movement vfx here
        my.vfx.walking = this.add.particles(0, 0, "kenny-particles", {
            frame: ['smoke_01.png', 'smoke_02.png', 'smoke_03.png'],
            lifespan: { min: 250, max: 450 },
            speed: { min: 20, max: 60 },
            angle: { min: 210, max: 330 },
            scale: { start: 0.08, end: 0 },
            alpha: { start: 0.6, end: 0 },
            quantity: 1,
            frequency: 70,
            emitting: false
        });

        my.vfx.jump = this.add.particles(0, 0, "kenny-particles", {
            frame: ['flare_02.png', 'flare_03.png', 'flare_04.png'],
            speedY: { min: 150, max: 300 },
            speedX: { min: -50, max: 50 },
            scale: { start: 0.12, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 250,
            quantity: 18,
            gravityY: 150,
            emitting: false
        });
        
        // Expanding Boundaries
        this.physics.world.setBounds(
            0,
            0,
            this.map.widthInPixels,
            this.map.heightInPixels
        );

        // Simple camera to follow player
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.cameras.main.startFollow(my.sprite.player, true, 0.25, 0.25); // (target, [,roundPixels][,lerpX][,lerpY])
        this.cameras.main.setDeadzone(50, 50);
        this.cameras.main.setZoom(this.SCALE);

        // HUD
        this.playerHP = 3;
        this.coinCount = 0;
        
        this.hpText = this.add.text(0, 0, "HP: 3", {
            fontSize: "20px",
            color: "#ffffff",
            backgroundColor: "#000000"
        });
        
        this.coinText = this.add.text(0, 0, "Coins: 0", {
            fontSize: "20px",
            color: "#ffff00",
            backgroundColor: "#000000"
        });
        
        this.hpText.setDepth(9999);
        this.coinText.setDepth(9999);

        this.canTakeDamage = true;
        
        this.damagePlayer = () => {
            if (!this.canTakeDamage) {
                return;
            }
            
            this.canTakeDamage = false;
            
            this.playerHP -= 1;
            
            this.hpText.setText("HP: " + this.playerHP);
            
            my.sprite.player.setTint(0xff0000);
            
            this.time.delayedCall(700, () => {
                my.sprite.player.clearTint();
                this.canTakeDamage = true;
            });
            
            if (this.playerHP <= 0) {
                this.playerHP = 0;
                this.hpText.setText("HP: 0");
                this.canTakeDamage = false;
                this.scene.restart();
                return;
            }
        };
        

    }

    update() {

        this.hpText.setPosition(my.sprite.player.x - 45, my.sprite.player.y - 95);
        this.coinText.setPosition(my.sprite.player.x - 65, my.sprite.player.y - 70);

        if(this.leftKey.isDown) {
            my.sprite.player.setAccelerationX(-this.ACCELERATION);
            my.sprite.player.resetFlip();
            my.sprite.player.anims.play('walk', true);
            // TODO: add particle following code here
            if(my.sprite.player.body.blocked.down) {
                my.vfx.walking.start();
                my.vfx.walking.setPosition(
                    my.sprite.player.x + Phaser.Math.Between(4, 12),
                    my.sprite.player.y + 14
                );
            
            } else {
                my.vfx.walking.stop();
            }

        } else if(this.rightKey.isDown) {
            my.sprite.player.setAccelerationX(this.ACCELERATION);
            my.sprite.player.setFlip(true, false);
            my.sprite.player.anims.play('walk', true);
            // TODO: add particle following code here
            if(my.sprite.player.body.blocked.down) {
                my.vfx.walking.start();
                my.vfx.walking.setPosition(
                    my.sprite.player.x - Phaser.Math.Between(4, 12),
                    my.sprite.player.y + 14
                );

            } else {
                my.vfx.walking.stop();
            }

        } else {
            // Set acceleration to 0 and have DRAG take over
            my.sprite.player.setAccelerationX(0);
            my.sprite.player.setDragX(this.DRAG);
            my.sprite.player.anims.play('idle');
            // TODO: have the vfx stop playing
            my.vfx.walking.stop();
        }

        // player jump
        // note that we need body.blocked rather than body.touching b/c the former applies to tilemap tiles and the latter to the "ground"
        if(!my.sprite.player.body.blocked.down) {
            my.sprite.player.anims.play('jump');
        }
        if(my.sprite.player.body.blocked.down && Phaser.Input.Keyboard.JustDown(this.upKey)) {
            my.sprite.player.body.setVelocityY(this.JUMP_VELOCITY);
            this.jumpSound.play();

            my.vfx.jump.setPosition(
                my.sprite.player.x,
                my.sprite.player.y + 12
            );
            
            my.vfx.jump.explode();
        }

        // Hazard check: water / spikes / blue laser
        let body = my.sprite.player.body;
        
        let hazardPoints = [
            { x: body.left + 4, y: body.bottom - 2 },
            { x: body.right - 4, y: body.bottom - 2 },
            { x: body.center.x, y: body.center.y }
        ];
        
        for (let point of hazardPoints) {
            let tile = this.groundLayer.getTileAtWorldXY(point.x, point.y);
            
            if (tile && tile.properties.hazard) {
                this.damagePlayer();
                return;
            }
        }

        // Coin detection
        let coinTiles = this.groundLayer.getTilesWithinWorldXY(
            my.sprite.player.body.left,
            my.sprite.player.body.top,
            my.sprite.player.body.width,
            my.sprite.player.body.height
        );
        
        for (let coinTile of coinTiles) {
            if (coinTile && coinTile.properties.coin) {
                
                this.groundLayer.removeTileAt(coinTile.x, coinTile.y);
                
                this.collectSound.play();
                
                this.coinCount += 1;
                this.coinText.setText("Coins: " + this.coinCount);
                
                this.coinParticles.setPosition(
                    coinTile.pixelX + coinTile.width / 2,
                    coinTile.pixelY + coinTile.height / 2
                );
                
                this.coinParticles.explode(15);
                
                break;
            }
        }

        if(Phaser.Input.Keyboard.JustDown(this.rKey)) {
            this.damagePlayer();
        }

        // Enemy patrol logic
        this.enemies.children.iterate(enemy => {
            if (!enemy) {
                return;
            }
            
            let checkX = enemy.x + enemy.direction * 20;
            let checkY = enemy.y + 20;
            
            let groundAhead = this.groundLayer.getTileAtWorldXY(checkX, checkY);
            
            if (
                !groundAhead ||
                !groundAhead.properties.collides ||
                enemy.body.blocked.left ||
                enemy.body.blocked.right
            ) {
                
                enemy.direction *= -1;
                
                enemy.setVelocityX(80 * enemy.direction);
                
                enemy.setFlipX(enemy.direction < 0);
            }
        });

        let playerTile = this.groundLayer.getTileAtWorldXY(
            my.sprite.player.x,
            my.sprite.player.y
        );
        
        if (playerTile && playerTile.properties.hazard) {
            this.damagePlayer();
        }

    }
}