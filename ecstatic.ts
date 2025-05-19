/**
 * A reference to an entity in its owning world.
 * May be invalid.
 */
export class EntityRef {
    readonly idx: number;
    readonly gen: number;
    readonly world: WeakRef<World>;
    constructor(parent: World, idx: number, gen: number) {
        this.world = new WeakRef(parent);
        this.idx = idx;
        this.gen = gen;
    }
    /**
     * Despawns the entity
     */
    despawn() {
        let parent = this.world.deref();
        if (parent) {
            parent.despawn(this);
        }
    }
    /**
     * Adds components to the entity
     * @param components An array of the constructors of the components to add
     * @returns Whether the components were successfully added or not
     */
    add<T extends Component<any>[]>(...components: T): boolean {
        let parent = this.world.deref();
        if (parent) {
            parent.addComponentsToEntity(this, components);
        }
        return !!parent;
    }
    /**
     * Removes components from the entity
     * @param componentConstructors An array of the constructors of the components to remove
     * @returns Whether the components were successfully removed or not
     */
    remove<T extends Component<any>[]>(
        ...componentConstructors: ComponentConstructor<T>[]
    ): boolean {
        let parent = this.world.deref();
        if (parent) {
            return parent.removeComponentsFromEntity(
                this,
                componentConstructors,
            );
        }
        return false;
    }
    /**
     * Checks if the entity has the given components
     * @param componentConstructors An array of the constructors of the components to check for
     * @returns If the entity has the given components
     */
    has<T extends ComponentConstructor<any>[]>(
        ...componentConstructors: T
    ): boolean {
        let parent = this.world.deref();
        if (parent) {
            return parent.entityHasComponents(this, componentConstructors);
        }
        return false;
    }
    /**
     * Gets the components of the entity
	 * @param componentConstructors An array of the constructors of the components to get
	 * @returns The components of the entity, or null if the components don't exist for this entity
	 */
    get<T extends Component<any>[]>(
        ...componentConstructors: { [I in keyof T]: ComponentConstructor<T[I]> }
    ): T | null {
        let parent = this.world.deref();
        if (parent) {
            return parent.getComponentsInEntity(this, componentConstructors);
        }
        return null;
    }
}

/**
 * The base managing class of an ECS; contains entities.
 */
export class World {
    private rows = new Map<
        ComponentConstructor<any>,
        (Component<any> | undefined)[]
    >();
    private entitiesCount = 0;
    private freeIdxs: number[] = [];
    // even gens are entities that do exist, odd gens are entities that don't
    private entityGenerations: number[] = [];

    /**
     * Spawns an entity with the given components
     * @param components An array of component instances to add to the entity
     * @returns A reference to the entity
     */
    spawn<T extends Component<any>[]>(components: T): EntityRef {
        const idx = this.freeIdxs.pop() ?? this.entitiesCount;
        if (!this.entityGenerations[idx]) {
            this.entityGenerations[idx] = 0;
        } else {
            this.entityGenerations[idx] += 1;
        }
        const gen = this.entityGenerations[idx];
        const entity = new EntityRef(this, idx, gen);

        this.addComponentsToEntity(entity, components);

        this.entitiesCount += 1;
        return entity;
    }
    /**
     * Despawns an entity given an entity reference
     * @param entity a reference to the entity
     */
    despawn(entity: EntityRef) {
        this.entityGenerations[entity.idx] += 1;
        this.freeIdxs.push(entity.idx);
        this.entitiesCount -= 1;
    }
    /**
     * Checks if an entity reference is valid
     * @param entity a reference to the entity
     * @returns Whether the entity reference is valid or not
     */
    entityRefIsValid(entity: EntityRef): boolean {
        return entity.gen === this.entityGenerations[entity.idx];
    }
    /**
     * Adds components to an entity
     * @param entity a reference to the entity
     * @param components an array of component instances to add to the entity
     * @returns Whether the components were successfully added or not
     */
    addComponentsToEntity<T extends Component<any>[]>(
        entity: EntityRef,
        components: T,
    ): boolean {
        if (!this.entityRefIsValid(entity)) return false;

        for (const component of components) {
            const componentConstructor =
                component.constructor as ComponentConstructor<T>;
            if (!this.rows.has(componentConstructor)) {
                this.rows.set(componentConstructor, []);
            }
            this.rows.get(componentConstructor)![entity.idx] = component;
        }
        return true;
    }
    /**
     * Removes components from an entity
     * @param entity a reference to the entity
     * @param componentConstructors an array of the constructors of the components to remove
     * @returns Whether the components were successfully removed or not
     */
    removeComponentsFromEntity<T extends ComponentConstructor<any>[]>(
        entity: EntityRef,
        componentConstructors: { [I in keyof T]: T[I] },
    ): boolean {
        if (!this.entityRefIsValid(entity)) return false;
        for (const componentConstructor of componentConstructors) {
            let componentRow = this.rows.get(componentConstructor);
            if (componentRow) {
                componentRow[entity.idx] = undefined;
            }
        }
        return true;
    }
    /**
     * Checks if an entity has the given components
     * @param entity a reference to the entity
     * @param componentConstructors an array of the constructors of the components to check for
     * @returns If the entity has the given components
     */
    entityHasComponents<T extends ComponentConstructor<any>[]>(
        entity: EntityRef,
        componentConstructors: { [I in keyof T]: T[I] },
    ): boolean {
        if (!this.entityRefIsValid(entity)) return false;
        for (const componentConstructor of componentConstructors) {
            let componentRow = this.rows.get(componentConstructor);
            if (!componentRow || !componentRow[entity.idx]) {
                return false;
            }
        }
        return true;
    }
	/**
	 * Gets the components of an entity
	 * @param entity a reference to the entity
	 * @param componentConstructors an array of the constructors of the components to get
	 * @returns The components of the entity, or null if the entity reference is invalid
	 */
    getComponentsInEntity<T extends Component<any>[]>(
        entity: EntityRef,
        componentConstructors: { [I in keyof T]: ComponentConstructor<T[I]> },
    ): T | null {
        if (!this.entityRefIsValid(entity)) return null;
        let components: Component<any>[] = [];
        for (const componentConstructor of componentConstructors) {
            let componentRow = this.rows.get(componentConstructor);
            if (componentRow?.[entity.idx]) {
                components.push(componentRow[entity.idx]!);
            } else {
                return null;
            }
        }
        return components as T;
    }
    /**
     * Queries the world for entities with the given components
     * @param componentConstructors An array of the constructors of the components to query for
     * @param returnEntities Whether to return a 2-tuple of references to the entities in addition to the components
     * @returns An array of the components of the entities that match the query
     */
    query<T extends Component<any>[], ReturnEntities extends boolean = false>(
        componentConstructors: {
            [I in keyof T]: ComponentConstructor<T[I]>;
        },
        // technically unsound, but why would you want to manually specify the generic
        returnEntities: ReturnEntities = false as ReturnEntities,
    ): ReturnEntities extends false
        ? { [I in keyof T]: T[I] }
        : { [I in keyof T]: [T[I], EntityRef] } {
        let queryResults: ReturnType<World["query"]> = [];
        entityLoop: for (let i = 0; i < this.entityGenerations.length; i++) {
            let components: Component<any>[] = [];
            // odd gens are entities that do not exist
            if (this.entityGenerations[i] % 2 === 1) continue entityLoop;
            for (const componentConstructor of componentConstructors) {
                let componentRow = this.rows.get(componentConstructor);
                if (componentRow?.[i]) {
                    components.push(componentRow[i]!);
                } else {
                    continue entityLoop;
                }
            }

            if (returnEntities) {
                queryResults.push([
                    components,
                    new EntityRef(this, i, this.entityGenerations[i]),
                ]);
            } else {
                queryResults.push(components as any);
            }
        }
        // these are "as any"ed because the ts compiler
        // is useless: https://github.com/microsoft/TypeScript/issues/33912
        return queryResults as any;
    }
}

/**
 * A component instance, basically just a mutable object
 */
export type Component<T extends { [key: string]: any }> = {
    [K in keyof T]: T[K];
};
/**
 * A constructor for a component.
 * Just call this function to create a `Component` instance.
 * You may or may not need to pass in data to the constructor,
 * depending on whether the component has a default or not.
 */
export type ComponentConstructor<T extends { [key: string]: any }> = (
    data?: T,
) => Component<T>;

/**
 * Creates a component constructor
 * @param defaultData (optional) The default data for the component
 * @returns A component constructor
 */
export function Component<T extends { [key: string]: any }>(): (
    data: T,
) => Component<T>;
export function Component<T extends { [key: string]: any }>(
    defaultData: T,
): (data?: Partial<T>) => Component<T>;
export function Component<T extends { [key: string]: any } = {}>(defaultData?: {
    [key: string]: string;
}): ComponentConstructor<Component<T>> {
    function ComponentConstructor(): Component<{}>;
    function ComponentConstructor<T extends {}>(data: T): Component<T>;
    function ComponentConstructor<T extends {}>(
        this: Component<T>,
        data: T,
    ): void;
    function ComponentConstructor<T extends {}>(this: Component<T>, data?: T) {
        if (!new.target) {
            const componentInstance: Component<T> =
                new (ComponentConstructor as any as {
                    new (data: T): Component<T>;
                })({
                    ...defaultData,
                    ...data,
                } as T);
            return componentInstance;
        }
        Object.assign(this, data);
        return;
    }
    return ComponentConstructor;
}

const world = new World();
const Pos = Component({ x: 0, y: 0 });
const Rot = Component({ angle: 0 });

world.spawn([Pos({ x: 10, y: 20 }), Rot({ angle: 0 })]);
console.log(world.query([Pos, Rot]));
