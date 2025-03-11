"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.World = exports.EntityRef = void 0;
exports.Component = Component;
var EntityRef = /** @class */ (function () {
    function EntityRef(parent, idx, gen) {
        this.world = new WeakRef(parent);
        this.idx = idx;
        this.gen = gen;
    }
    EntityRef.prototype.despawn = function () {
        var parent = this.world.deref();
        if (parent) {
            parent.despawn(this);
        }
    };
    EntityRef.prototype.add = function () {
        var components = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            components[_i] = arguments[_i];
        }
        var parent = this.world.deref();
        if (parent) {
            parent.addComponentsToEntity(this, components);
        }
    };
    EntityRef.prototype.remove = function () {
        var componentConstructors = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            componentConstructors[_i] = arguments[_i];
        }
        var parent = this.world.deref();
        if (parent) {
            parent.removeComponentsFromEntity(this, componentConstructors);
        }
    };
    return EntityRef;
}());
exports.EntityRef = EntityRef;
var World = /** @class */ (function () {
    function World() {
        this.rows = new Map();
        this.entitiesCount = 0;
        this.freeIdxs = [];
        // even gens are entities that do exist, odd gens are entities that don't
        this.entityGenerations = [];
    }
    World.prototype.spawn = function (components) {
        var _a;
        var idx = (_a = this.freeIdxs.pop()) !== null && _a !== void 0 ? _a : this.entitiesCount;
        if (!this.entityGenerations[idx]) {
            this.entityGenerations[idx] = 0;
        }
        else {
            this.entityGenerations[idx] += 1;
        }
        var gen = this.entityGenerations[idx];
        var entity = new EntityRef(this, idx, gen);
        this.addComponentsToEntity(entity, components);
        this.entitiesCount += 1;
        return entity;
    };
    World.prototype.despawn = function (entity) {
        this.entityGenerations[entity.idx] += 1;
        this.freeIdxs.push(entity.idx);
        this.entitiesCount -= 1;
    };
    World.prototype.addComponentsToEntity = function (entity, components) {
        if (entity.gen !== this.entityGenerations[entity.idx]) {
            return false;
        }
        for (var _i = 0, components_1 = components; _i < components_1.length; _i++) {
            var component = components_1[_i];
            var componentConstructor = component.constructor;
            if (!this.rows.has(componentConstructor)) {
                this.rows.set(componentConstructor, []);
            }
            this.rows.get(componentConstructor)[entity.idx] = component;
        }
        return true;
    };
    World.prototype.removeComponentsFromEntity = function (entity, componentConstructors) {
        if (entity.gen < this.entityGenerations[entity.idx]) {
            return false;
        }
        for (var _i = 0, componentConstructors_1 = componentConstructors; _i < componentConstructors_1.length; _i++) {
            var componentConstructor = componentConstructors_1[_i];
            var componentRow = this.rows.get(componentConstructor);
            if (componentRow) {
                componentRow[entity.idx] = undefined;
            }
        }
        return true;
    };
    World.prototype.query = function (componentConstructors, 
    // technically unsound, but why would you want to manually specify the generic
    returnEntities) {
        if (returnEntities === void 0) { returnEntities = false; }
        var queryResults = [];
        var entities = [];
        entityLoop: for (var i = 0; i < this.entityGenerations.length; i++) {
            var components = [];
            // odd gens are entities that do not exist
            if (this.entityGenerations[i] % 2 === 1)
                continue entityLoop;
            for (var _i = 0, componentConstructors_2 = componentConstructors; _i < componentConstructors_2.length; _i++) {
                var componentConstructor = componentConstructors_2[_i];
                var componentRow = this.rows.get(componentConstructor);
                if (componentRow === null || componentRow === void 0 ? void 0 : componentRow[i]) {
                    components.push(componentRow[i]);
                }
                else {
                    continue entityLoop;
                }
            }
            queryResults.push(components);
            if (returnEntities) {
                entities.push(new EntityRef(this, i, this.entityGenerations[i]));
            }
        }
        // these are "as any"ed because the ts compiler cant infer anything for some reason
        if (returnEntities) {
            return [queryResults, entities];
        }
        else {
            return queryResults;
        }
    };
    return World;
}());
exports.World = World;
function Component(defaultData) {
    function ComponentConstructor(data) {
        var _newTarget = this && this instanceof ComponentConstructor ? this.constructor : void 0;
        if (!_newTarget) {
            var componentInstance = new ComponentConstructor(__assign(__assign({}, defaultData), data));
            return componentInstance;
        }
        Object.assign(this, data);
        return;
    }
    return ComponentConstructor;
}
