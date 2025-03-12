# ecstatic
ecstatic is designed to be an ECS library for JS/TS that priorizes developer experience and the joy of game development above anything else. It is designed to be easy to learn and to use while not compromising on speed and flexibility. In fact, you can learn the whole library in just 5 minutes: just take a look below ⬇️
## Kitchen Sink / Guide
```ts
import { World, Component } from "@hydrogenmacro/ecstatic";

// A world stores all of your entities and components.
const world = new World();

// Component constructors are declared with a function call.
// The generic represents the fields of your component.
const Name: ComponentConstructor = Component<{ name: string }>();
// You can pass a default as well:
const Position = Component<{ x: number, y: number }>({ x: 0, y: 0 });
// Or you can pass nothing at all as well, if you just want a marker component for things like singleton entites:
const ThingMarker = Component();
const Rotation = Component<{ rot: number }>({ rot: 0 });

// To spawn entities, World.spawn can be used.
// To create the components, simply just call the constructors declared above!
const entity1: EntityRef = world.spawn([
  Name({ name: "Bob" }),
  // remember, we passed a default when making the Position component above,
  // so we don't *need* to specify anything here:
  Position(),  
]);

// Note that spawning returns an EntityRef
const entity2: EntityRef = world.spawn([
  Name({ name: "Sally" }),
  Position({ x: 100 }), // If the component has a default, you can further override specific fields!
  ThingMarker()
]);

// Now, to query the entities from the world, you can just pass the *constructors* of the components to World.query:
for (const [position, name] of
  world.query([Position, Name]) // don't call `Position()` nor `Name()`, just pass the actual functions themselves! 
) { 
  // You can think of position and name as { x: number, y: number } and { name: string } respectively;
  // they're basically just objects
  position.x += 5;
  position.y += 10;

  console.log(name.name); // logs "Bob" and then "Sally"
}

// To add/update or remove components from an entity:
entity1.add(ThingMarker(), Rotation({ rot: 40 })); // entity1 now additionally has the ThingMarker and Rotation components
entity2.add(Position({ y: 40 })) // adding a component completely replaces the old component
// so the Position component changed from { x: 100, y: 0 } to { x: 0, y: 40 }

entity1.remove(ThingMarker, Position) // pass the *constructors* of the component to remove them from the entity

// To despawn an entity:
entity1.despawn();
// Since world.spawn just returns a *reference* to the entity,
// entity1 is now an invalid reference. Calling entity1.add or entity1.remove does nothing now.

// To query for entitiyRefs:
const [components, entityRefs] = world.query([Position, Name], true) // pass `true` for the second argument to get a 2-tuple
for (let i = 0; i < components.length; i++) {
  const [position, name] = components[i];
  const entity: EntityRef = entityRefs[i];
}

// For bundles, just use normal functions!
const ThingBundle = (x: number, y: number) => [Position({ x, y }), Rotation({ rot: 30 }), ThingMarker()];
world.spawn([...ThingBundle(10, 10), Name({ name: "Sam" }))];

```
## Installation
```sh
npm i @hydrogenmacro/ecstatic
```
You can also use this in the browser easily:
```js
import { World, Component } from "https://cdn.jsdelivr.net/npm/@hydrogenmacro/ecstatic/ecstatic.js/+esm";
```
Or you can just copy and paste this into a file manually; it's just [one typescript file](ecstatic.ts)!

## Performance
TODO: adding benchmark comparisons

`World` internally uses a 2d array based slot map, so with JIT vectorization and cache locality, it should be fast enough for most applications.
If you're picking between two libraries, just remember that premature optimization is the root of all evil, so more times than not, just choose whichever library you like the most!

## Todo
 - [ ] Archetypes
 - [ ] EntityRef.has()
 - [ ] Inline docs
 - [ ] Serialization

## Credits
The API and concepts were inspired by the Rust libraries [hecs](https://github.com/Ralith/hecs) and [bevy_ecs](https://docs.rs/bevy_ecs/latest/bevy_ecs/).
