// Scenery and formation spacing expand together; hero bodies and contact reach
// keep their original size. These are visual dimensions, not combat modifiers.
export const ARENA_SCALE=1.25;
export const ARENA_BOUNDS=Object.freeze({x:7.7*ARENA_SCALE,z:4.7*ARENA_SCALE});
export const ARENA_FLOOR=Object.freeze({width:19*ARENA_SCALE,depth:13*ARENA_SCALE});
export const clampArena=(x,z)=>[
 Math.max(-ARENA_BOUNDS.x,Math.min(ARENA_BOUNDS.x,x)),
 Math.max(-ARENA_BOUNDS.z,Math.min(ARENA_BOUNDS.z,z))
];
