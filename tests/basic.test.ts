import { Component, World } from "../ecstatic";

describe("Basic ECStatic Test Suite", () => {
    it("should have default components", () => {
        const world = new World();
        const Component1 = Component({ componentData: 1 });
        const entity = world.spawn([Component1()]);
        expect(entity);
    });

    it("should add two numbers correctly", () => {
        expect(1 + 1).toBe(2);
    });
});
