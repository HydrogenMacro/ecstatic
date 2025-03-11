export class EntityRef {
	idx: number;
	gen: number;
	world: WeakRef<World>;
	constructor(parent: World, idx: number, gen: number) {
		this.world = new WeakRef(parent);
		this.idx = idx;
		this.gen = gen;
	}
	despawn() {
		let parent = this.world.deref();
		if (parent) {
			parent.despawn(this);
		}
	}
	add<T extends Component<any>[]>(...components: T) {
		let parent = this.world.deref();
		if (parent) {
			parent.addComponentsToEntity(this, components);
		}
	}
	remove<T extends Component<any>[]>(
		...componentConstructors: {
			[I in keyof T]: (data: any) => T[I];
		}
	) {
		let parent = this.world.deref();
		if (parent) {
			parent.removeComponentsFromEntity(this, componentConstructors);
		}
	}
}

export class World {
	rows = new Map<ComponentConstructor<any>, (Component<any> | undefined)[]>();
	entitiesCount = 0;
	freeIdxs: number[] = [];
	// even gens are entities that do exist, odd gens are entities that don't
	entityGenerations: number[] = [];
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
	despawn(entity: EntityRef) {
		this.entityGenerations[entity.idx] += 1;
		this.freeIdxs.push(entity.idx);
		this.entitiesCount -= 1;
	}
	addComponentsToEntity<T extends Component<any>[]>(
		entity: EntityRef,
		components: T,
	): boolean {
		if (entity.gen !== this.entityGenerations[entity.idx]) {
			return false;
		}
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
	removeComponentsFromEntity<T extends ComponentConstructor<any>[]>(
		entity: EntityRef,
		componentConstructors: { [I in keyof T]: T[I] },
	): boolean {
		if (entity.gen < this.entityGenerations[entity.idx]) {
			return false;
		}
		for (const componentConstructor of componentConstructors) {
			let componentRow = this.rows.get(componentConstructor);
			if (componentRow) {
				componentRow[entity.idx] = undefined;
			}
		}
		return true;
	}
	query<
		T extends ComponentConstructor<any>[],
		ReturnEntities extends boolean = false,
	>(
		componentConstructors: {
			[I in keyof T]: T[I];
		},
		// technically unsound, but why would you want to manually specify the generic
		returnEntities: ReturnEntities = false as ReturnEntities,
	): ReturnEntities extends false
		? { [I in keyof T]: T[I] }[]
		: [{ [I in keyof T]: T[I] }[], EntityRef[] & { length: T["length"] }] {
		let queryResults: { [I in keyof T]: T[I] }[] = [];
		let entities: EntityRef[] = [];
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
			queryResults.push(components as { [I in keyof T]: T[I] });
			if (returnEntities) {
				entities.push(new EntityRef(this, i, this.entityGenerations[i]));
			}
		}
		// these are "as any"ed because the ts compiler cant infer anything for some reason
		if (returnEntities) {
			return [queryResults, entities] as any;
		} else {
			return queryResults as any;
		}
	}
}

export type Component<T extends {}> = { [K in keyof T]: T[K] };
export type ComponentConstructor<T extends Component<T>> = (data?: object) => T;

// I am sincerely sorry to whoever gazes their eyes upon this hell
export function Component(): () => Component<{}>;
export function Component<T extends object>(): (data: T) => Component<T>;
export function Component<T extends object>(
	defaultData: T,
): (data?: Partial<T>) => Component<T>;
export function Component<T extends object = {}>(
	defaultData?: object,
): ComponentConstructor<Component<T>> {
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
