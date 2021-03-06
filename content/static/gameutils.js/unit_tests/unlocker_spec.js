/*
 * Copyright Olli Etuaho 2016.
 */

'use strict';

var testUnlockCondition = function() {
    var TestCondition = function(options) {
        this.initCondition(options);
    };
    
    TestCondition.prototype = new GJS.UnlockCondition();
    
    TestCondition.prototype.update = function(gameState, deltaTime) {
        if (gameState.unlocked) {
            this.fulfilled = true;
        }
    };
    
    return new TestCondition({unlockId: 'test'});
};

/**
 * @constructor
 */
var TestGameState = function() {
    this.unlocked = false;
};

describe('UnlockCondition', function() {
    it('initializes', function() {
        var condition = testUnlockCondition();
        expect(condition.unlockId).toBe('test');
        expect(condition.fulfilled).toBe(false);
    });
    
    it('initializes unlocked by default', function() {
        var condition = new GJS.UnlockByDefault({unlockId: 'foo'});
        expect(condition.unlockId).toBe('foo');
        expect(condition.fulfilled).toBe(true);
    });
});

describe('Unlocker', function() {
    it('initializes', function() {
        var unlocker = new GJS.Unlocker({
            needCommitUnlocks: true,
            conditions: [testUnlockCondition()]
        });
        expect(unlocker.needCommitUnlocks).toBe(true);
        expect(unlocker.unlocks['test']).toBe(false);
        expect(unlocker.saveState.unlocksInOrder.length).toBe(0);
    });
    
    it('initializes with something unlocked by default', function() {
        var unlocker = new GJS.Unlocker({
            needCommitUnlocks: false,
            conditions: [new GJS.UnlockByDefault({unlockId: 'foo'})]
        });
        expect(unlocker.needCommitUnlocks).toBe(false);
        expect(unlocker.unlocks['foo']).toBe(true);
        expect(unlocker.saveState.unlocksInOrder[0]).toBe('foo');
    });
    
    
    it('updates', function() {
        var gameState = new TestGameState();
        var unlocker = new GJS.Unlocker({
            needCommitUnlocks: false,
            conditions: [testUnlockCondition()]
        });
        unlocker.update(gameState, 1 / 60);
        expect(unlocker.unlocks['test']).toBe(false);
        expect(unlocker.saveState.unlocksInOrder.length).toBe(0);
        gameState.unlocked = true;
        unlocker.update(gameState, 1 / 60);
        expect(unlocker.unlocks['test']).toBe(true);
        expect(unlocker.saveState.unlocksInOrder[0]).toBe('test');
    });
    
    it('manually commits unlocks', function() {
        var gameState = new TestGameState();
        var unlocker = new GJS.Unlocker({
            needCommitUnlocks: true,
            conditions: [testUnlockCondition()]
        });
        gameState.unlocked = true;
        unlocker.update(gameState, 1 / 60);
        expect(unlocker.unlocks['test']).toBe(false);
        expect(unlocker.saveState.unlocksInOrder.length).toBe(0);
        expect(unlocker._fulfilledConditions.length).toBe(1);

        var fulfilled = unlocker.popFulfilledUnlockConditions();
        expect(fulfilled.length).toBe(1);
        expect(fulfilled[0]).toBe('test');
        expect(unlocker._fulfilledConditions.length).toBe(0);

        unlocker.commitUnlock('test');
        expect(unlocker.unlocks['test']).toBe(true);
        expect(unlocker.saveState.unlocksInOrder[0]).toBe('test');
    });
    
    it('loads from empty storage', function() {
        var unlocker = new GJS.Unlocker({
            needCommitUnlocks: false,
            conditions: [testUnlockCondition()]
        });
        
        var saver = new GJS.StateSaver({
            savedObjects: [unlocker]
        });
        
        var storage = testStorage();
        
        saver.loadFrom(storage);
        expect(unlocker.unlocks['test']).toBe(false);
        expect(unlocker.saveState.unlocksInOrder.length).toBe(0);
    });

    it('loads from storage with unlocks', function() {
        var unlockerA = new GJS.Unlocker({
            needCommitUnlocks: false,
            conditions: [testUnlockCondition()]
        });
        unlockerA.commitUnlock('test');
        
        var saverA = new GJS.StateSaver({
            savedObjects: [unlockerA]
        });
        
        var storage = testStorage();
        
        saverA.saveTo(storage);
        
        var unlockerB = new GJS.Unlocker({
            needCommitUnlocks: false,
            conditions: [testUnlockCondition()]
        });
        
        var saverB = new GJS.StateSaver({
            savedObjects: [unlockerB]
        });
        
        saverB.loadFrom(storage);
        expect(unlockerB.unlocks['test']).toBe(true);
        expect(unlockerB.saveState.unlocksInOrder[0]).toBe('test');
    });
});