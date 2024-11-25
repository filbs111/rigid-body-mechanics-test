# purpose

want to learn how to write decent "physics" for games.

possibly rigid body mechanics, but at least robust collision system for player vs environment

want to put such a system into 3-sphere game (where the world exists on a 3D manifold curved space, equivalent to points on a 4D hypersphere.)

can consider A) 2D, B) 2D manifold/surface of 2-sphere, C) 3D, D) 3D manifold/surface of 3-sphere - see how B relates to A, apply this to C to get D.

# parts of a collision and response system

1) broad phase - narrowing down collisions between objects (or parts of a level)

2) narrow phase detection of collisions

3) response/resolution (applying impulses etc).

## 1 broad phase

eg grid, octree, Bounding Volumne Hierarchy (BVH)

2D, 3D can use 2D, 3D grids/BVH/tree. For 2,3-sphere surfaces, can use 3D or 4D grid or BVH, or projected 2,3-cube grids.

## 2 narrow phase

more precise collision detection.

initially can attempt to solve just for whether objects are intersecting. Detection of exact collision condition for correct response and avoidance of tunneling is a problem for later.


## 3 response

something about manifold generation (note here manifold maybe is different meaning to previous)


## minimum viable system for game.

sliding collision between static level geometry and simple player geometry (eg convex hull)

no tunneling though level geometry 



# references


randy gaul:
https://code.tutsplus.com/how-to-create-a-custom-2d-physics-engine-the-basics-and-impulse-resolution--gamedev-6331t
https://code.tutsplus.com/how-to-create-a-custom-2d-physics-engine-the-core-engine--gamedev-7493t
https://code.tutsplus.com/how-to-create-a-custom-2d-physics-engine-friction-scene-and-jump-table--gamedev-7756t
https://code.tutsplus.com/how-to-create-a-custom-2d-physics-engine-oriented-rigid-bodies--gamedev-8032t

separating axis convex polyhedra
includes gauss map optimisation
https://ia800501.us.archive.org/34/items/GDC2013Gregorius/GDC2013-Gregorius.pdf OR https://archive.org/details/GDC2013Gregorius

contact creation
https://steamcdn-a.akamaihd.net/apps/valve/2015/DirkGregorius_Contacts.pdf


convex hulls. probably don't need this (guess can just create using blender or whatever, doesn't have to be at run time)
https://raw.githubusercontent.com/RandyGaul/randygaul.github.io/gh-pages/assets/QuickHull.pdf