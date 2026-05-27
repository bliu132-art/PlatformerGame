// Jim Whitehead
// Created: 5/14/2025
// Phaser: 3.70.0
//
// Particle Practice Kit
//
// An example platformer layer with coin objects.
// The goal is to add particle effects for when the player collects a coin, and
// for the water to have bubbles, and for when the player falls in the water.
//

// debug with extreme prejudice
"use strict"

// game config
let config = {
    parent: 'phaser-game',
    type: Phaser.CANVAS,
    render: {
        pixelArt: true  // prevent pixel art from getting blurred when scaled
    },
    physics: {
        default: 'arcade',
        arcade: {
            debug: false,
            gravity: {
                x: 0,
                y: 0
            }
        }
    },
    width: 1440,
    height: 900,
    scene: [Load, Platformer]
}

var cursors;
const SCALE = 2.0;
var my = {sprite: {}, text: {}, vfx: {}};

const game = new Phaser.Game(config);