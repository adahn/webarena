/**
* Copyright (C) 2013 Adam Rzepka
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

goog.require('goog.testing.jsunit');
goog.require('network.Synchronizer');
goog.require('network.Snapshot');

function testResetParams() {
    var sync = new network.Synchronizer();
    assertThrows("When set to WRITE, snapshot mustn't be provided",
                 function () {
                     sync.reset(network.Synchronizer.Mode.WRITE, new network.Snapshot());
                 });
    assertThrows("When set to READ, snapshot must be provided",
                 function () {
                     sync.reset(network.Synchronizer.Mode.READ, null);
                 });
    assertNotThrows("When set to WRITE, snapshot mustn't be provided",
                    function () {
                        sync.reset(network.Synchronizer.Mode.WRITE, null);
                    });
    assertNotThrows("When set to READ, snapshot must be provided",
                    function () {
                        sync.reset(network.Synchronizer.Mode.READ, new network.Snapshot());
                    });

}

function testWrite() {
    var sync = new network.Synchronizer();
    assertEquals("Returns the same value during writing", 1, sync.synchronize(1));
}

function testRead() {
    var sync = new network.Synchronizer();
    sync.reset(network.Synchronizer.Mode.WRITE);
    sync.synchronize(1);
    sync.reset(network.Synchronizer.Mode.READ, sync.snapshot_);
    assertEquals("Returns previously written value", 1, sync.synchronize(2));
}

function testObject() {
    function Mock() {
        this.a = 1;
        this.b = 2;
    }

    Mock.prototype.getId = function () {
        return 0;
    };
    
    Mock.prototype.getType = function () {
        return 0;
    };

    Mock.prototype.synchronize = function (synchronizer) {
        this.a = synchronizer.synchronize(this.a);
        this.b = synchronizer.synchronize(this.b);
    };

    var mock = new Mock();
    
    var sync = new network.Synchronizer();
    sync.reset(network.Synchronizer.Mode.WRITE);
    sync.synchronize(mock);
    sync.reset(network.Synchronizer.Mode.READ, sync.snapshot_);
    mock.a = 2;
    mock.b = 3;
    mock = sync.synchronize(mock);
    assertEquals("Restores previously written value", 1, mock.a);
    assertEquals("Restores previously written value", 2, mock.b);
}

function testNestedObjects() {
    function MockA() {
        this.id = 0;
        this.a = 1;
        this.b = 2;
    }

    MockA.prototype.getId = function () {
        return this.id;
    };

    MockA.prototype.setId = function (id) {
        this.id = id;
    };
    
    MockA.prototype.getType = function () {
        return 0;
    };

    MockA.prototype.synchronize = function (synchronizer) {
        this.a = synchronizer.synchronize(this.a);
        this.b = synchronizer.synchronize(this.b);
    };

    function MockB() {
        this.c = 'a';
        this.obj = new MockA();
        this.obj2 = new MockA();
        this.obj2.id = 1;
        this.obj2.a = 3;
        this.obj2.b = 4;
        this.d = 'b';
    }

    MockB.prototype.getId = function () {
        return 2;
    };
    
    MockB.prototype.getType = function () {
        return 1;
    };

    MockB.prototype.synchronize = function (synchronizer) {
        this.c = synchronizer.synchronize(this.c);
        this.obj = synchronizer.synchronize(this.obj);
        this.obj2 = synchronizer.synchronize(this.obj2);
        this.d = synchronizer.synchronize(this.d);
    };

    var mock = new MockB();
    
    var sync = new network.Synchronizer();
    network.Synchronizer.constructors_ = [];
    network.Synchronizer.registerConstructor(0, function () {
        return new MockA();
    });
    sync.reset(network.Synchronizer.Mode.WRITE);
    sync.synchronize(mock);
    sync.reset(network.Synchronizer.Mode.READ, sync.snapshot_);
    mock.obj.a = 2;
    mock.obj.b = 3;
    mock.c = 'c';
    mock.d = 'd';
    mock.obj2 = null;
    mock = sync.synchronize(mock);
    assertEquals("Restores previously written value", 1, mock.obj.a);
    assertEquals("Restores previously written value", 2, mock.obj.b);
    assertEquals("Restores previously written value", 'a', mock.c);
    assertEquals("Restores previously written value", 3, mock.obj2.a);
    assertEquals("Restores previously written value", 4, mock.obj2.b);
    assertEquals("Restores previously written value", 'b', mock.d);
}

function testNestedObjectCreation() {
    function MockA() {
        this.id = 0;
        this.a = 1;
        this.b = 2;
    }

    MockA.prototype.getId = function () {
        return this.id;
    };

    MockA.prototype.setId = function (id) {
        this.id = id;
    };
    
    MockA.prototype.getType = function () {
        return 0;
    };

    MockA.prototype.synchronize = function (synchronizer) {
        this.a = synchronizer.synchronize(this.a);
        this.b = synchronizer.synchronize(this.b);
    };

    function MockB() {
        this.id = 1;
        this.c = 'a';
        this.obj = new MockA();
        this.obj2 = null;
    }

    MockB.prototype.getId = function () {
        return this.id;
    };

    MockB.prototype.setId = function (id) {
        this.id = id;
    };
    
    MockB.prototype.getType = function () {
        return 1;
    };

    MockB.prototype.synchronize = function (synchronizer) {
        this.c = synchronizer.synchronize(this.c);
        this.obj = synchronizer.synchronize(this.obj);
        this.obj2 = synchronizer.synchronize(this.obj2);
    };

    var mock = new MockB();
    
    var sync = new network.Synchronizer();
    network.Synchronizer.registerConstructor(0, function () {
        return new MockA();
    });
    var destroyed = false;
    network.Synchronizer.registerDestructor(0, function (obj) {
        destroyed = true;
    });
    sync.reset(network.Synchronizer.Mode.WRITE);
    sync.synchronize(mock);
    mock.obj.a = 2;
    mock.obj.b = 3;
    mock.c = 'b';
    mock.obj = null;
    mock.obj2 = new MockA();
    sync.reset(network.Synchronizer.Mode.READ, sync.snapshot_);
    mock = sync.synchronize(mock);
    assertNotNullNorUndefined("Creates new object if null", mock.obj);
    assertTrue("Destroys object if necessary", mock.obj2 === null);
    assertTrue("Calls destructor function", destroyed);
    assertEquals("Restores previously written value 1", 1, mock.obj.a);
    assertEquals("Restores previously written value 2", 2, mock.obj.b);
    assertEquals("Restores previously written value a", 'a', mock.c);
}

function testArrays() {
    function Mock() {
        this.a = 1;
        this.b = [2, 3];
    }

    Mock.prototype.getId = function () {
        return 0;
    };
    
    Mock.prototype.getType = function () {
        return 0;
    };

    Mock.prototype.synchronize = function (synchronizer) {
        this.a = synchronizer.synchronize(this.a);
        this.b = synchronizer.synchronize(this.b);
    };

    var mock = new Mock();
    
    var sync = new network.Synchronizer();
    sync.reset(network.Synchronizer.Mode.WRITE);
    sync.synchronize(mock);
    sync.reset(network.Synchronizer.Mode.READ, sync.snapshot_);
    mock.a = 2;
    mock.b = [4];
    mock = sync.synchronize(mock);
    assertEquals("Restores previously written value", 1, mock.a);
    assertEquals("Table length check", 2, mock.b.length);
    assertEquals("Restores previously written value", 2, mock.b[0]);
    assertEquals("Restores previously written value", 3, mock.b[1]);
    sync.reset(network.Synchronizer.Mode.READ, sync.snapshot_);
    mock.b = [4,5,6];
    mock = sync.synchronize(mock);
    assertEquals("Restores previously written value", 2, mock.b.length);
    assertEquals("Table length check", 2, mock.b[0]);
    assertEquals("Restores previously written value", 3, mock.b[1]);
};

function testObjectsInArray() {
    var id = 0;
    function MockA() {
        this.id = id++;
        this.a = 1;
        this.b = 2;
    }

    MockA.prototype.getId = function () {
        return this.id;
    };
    MockA.prototype.setId = function (id) {
        this.id = id;
    };    
    MockA.prototype.getType = function () {
        return 0;
    };
    MockA.prototype.synchronize = function (synchronizer) {
        this.a = synchronizer.synchronize(this.a);
        this.b = synchronizer.synchronize(this.b);
    };
    function MockB() {
        this.id = id++;
        this.a = [new MockA(), new MockA()];
        this.a[0].a = 3;
    }
    MockB.prototype.getId = function () {
        return this.id;
    };    
    MockB.prototype.getType = function () {
        return 1;
    };
    MockB.prototype.synchronize = function (synchronizer) {
        this.a = synchronizer.synchronize(this.a);
    };

    var mock = new MockB();
    
    var sync = new network.Synchronizer();
    network.Synchronizer.constructors_ = [];
    network.Synchronizer.destructors_ = [];
    network.Synchronizer.registerConstructor(0, function () {
        return new MockA();
    });
    var destroyed = false;
    network.Synchronizer.registerDestructor(0, function (obj) {
        destroyed = true;
    });
    sync.reset(network.Synchronizer.Mode.WRITE);
    sync.synchronize(mock);
    sync.reset(network.Synchronizer.Mode.READ, sync.snapshot_);
    mock.a[0].a = 2;
    mock.a[1].b = 3;
    mock = sync.synchronize(mock);
    assertEquals("Restores previously written value", 3, mock.a[0].a);
    assertEquals("Restores previously written value", 2, mock.a[1].b);
    sync.reset(network.Synchronizer.Mode.READ, sync.snapshot_);
    mock.a.push(new MockA());
    mock = sync.synchronize(mock);
    assertEquals("Check array length", 2, mock.a.length);
    assertTrue("Calls destructor", destroyed);
    sync.reset(network.Synchronizer.Mode.READ, sync.snapshot_);
    mock.a.length = 1;
    mock = sync.synchronize(mock);
    assertEquals("Check array length", 2, mock.a.length);
}