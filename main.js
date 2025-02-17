//simple no rotation 2D mechanics.
//inspired by reading 1st randy gaul article

var canvas = document.getElementById("myCanvas");
var canvas_width = 800;
var canvas_height = 800;
canvas.width = canvas_width;
canvas.height = canvas_height;
var ctx = canvas.getContext("2d");

var currentTime = null;
var physStepTime = 3;   //phys step every 3 ms.
var physTimeToCatchUp = 0;
var maxIterationsPerDraw = 10;
var friction_mu = 0.1;   //coefficient of friction. for now just have same for all object (pairs), and static, sliding friction same
                            //NOTE does not handle this being zero!
var standardCor = 0.05;
var physicsObjects = [];

var contactPositionsToDraw = [];

//TODO use classes ! 
function addPhysicsObject(theObject){
    var objArea = theObject.objType == "rect" ? (theObject.sideHalfEdges[0] * theObject.sideHalfEdges[1]) : Math.PI * theObject.radius * theObject.radius;
    theObject.invMass = theObject.invDensity / objArea;

    if (theObject.objType == "rect"){
        //set variables for convex hull collision
        var halfEdges = theObject.sideHalfEdges;
        theObject.points = [
            halfEdges,
            [halfEdges[0], -halfEdges[1]],
            [-halfEdges[0], -halfEdges[1]],
            [-halfEdges[0], halfEdges[1]]
        ];
        theObject.edges = [
            {dir:[0,1],  howFar:halfEdges[1]},
            {dir:[1,0], howFar:halfEdges[0]},    //unit normal direction, displacement of face along this direction from shape centre.
            {dir:[0,-1],  howFar:halfEdges[1]},
            {dir:[-1,0],  howFar:halfEdges[0]}
        ];
    }

    //similar for explicit convex hull - construct directions from points. (note this logic could be used to gen edges for rect too)
    if (theObject.objType == "chull"){
        var edges = [];
        var points = theObject.points;
        var lastpoint = points[points.length-1];
        for (var ii=0;ii<points.length;ii++){
            var point = points[ii];
            var differenceVec = vectorDifference(point, lastpoint);
            var differenceLen = vectorLength(differenceVec);
            var normal = [-differenceVec[1],differenceVec[0]].map(x=>x/differenceLen);
            edges.push({
                dir: normal,
                howFar: dotProd(normal, point)
            }); 

            lastpoint = point;
        }
        theObject.edges=edges;
    }

    if (theObject.radius){
        theObject.radsq = theObject.radius*theObject.radius;
    }

    switch(theObject.objType) {
        case "chull":
            theObject.invMomentOfInertia = theObject.invMass/(theObject.radsq);   //TODO calculate properly
            break;
        case "circle":
            theObject.invMomentOfInertia = theObject.invMass/(theObject.radsq);   //TODO choose something sensible for this (disc? ball? suspect want 1/r^3, or 1/r^4...)
            break;
        default:
            theObject.invMomentOfInertia = theObject.invMass*3/(theObject.sideHalfEdges[0]*theObject.sideHalfEdges[0] + theObject.sideHalfEdges[1]*theObject.sideHalfEdges[1]);
                //TODO check / use correct multiplier for rectanglar plate
        }

    theObject.angVel = 0;

    physicsObjects.push(theObject);
}

addPhysicsObject({
    position: [200,100],
    rotation: -0.2+Math.PI,
    velocity: [0.3,1],
    radius:20,  //a cheat to get mass calculation (TODO calc mass for general convex shape)
    objType: "chull",
    points: [[-20,-20], [-20,20], [25,3], [25,-3]],
    cor: standardCor,
    invDensity: 1,
    fillStyle: "white"
});

addPhysicsObject({
    position: [210,30],
    velocity: [0.3,1],
    rotation: 0,
    objType: "rect",
    sideHalfEdges: [20,25],
    cor: standardCor,
    invDensity: 1,
    fillStyle: "green"
});
addPhysicsObject({
    position: [100,100],
    velocity: [0,0],
    rotation: 0,
    objType: "rect",
    sideHalfEdges: [10,10],
    cor: standardCor,
    invDensity:1,
    fillStyle: "magenta"
});
addPhysicsObject({
    position: [250,300],
    velocity: [0,0],
    rotation: 0.1,
    objType: "rect",
    sideHalfEdges: [140,25],
    cor: standardCor,
    invDensity: 0,
    fillStyle: "black"
});
addPhysicsObject({
    position: [600,540],
    velocity: [0,0],
    rotation: 0.1,
    radius:160,
    objType: "circle",
    cor: standardCor,
    invDensity: 0,
    fillStyle: "#444"
});

addPhysicsObject({
    position: [600,340],
    velocity: [0,0],
    rotation: 0.1,
    objType: "rect",
    sideHalfEdges: [50,10],
    cor: standardCor,
    invDensity: 1,
    fillStyle: "olive"
});


for (var ii=0;ii<10;ii++){
    addPhysicsObject({
        position: [50,20+50*ii],
        velocity: [0,0],
        rotation: 0,    //Math.random()*60,
        objType: "rect",
        sideHalfEdges: [15,15],
        //objType: "circle",
        //radius: 25,
        cor: standardCor,
        invDensity: 1,
        fillStyle: `rgba(60, 90, ${50+ii*20}, 255)`
    });
}

//CIRCLES
addPhysicsObject({
    position: [400,50],
    velocity: [-1,0],
    rotation: 0,
    objType: "circle",
    radius: 40,
    cor: standardCor,
    invDensity: 1,
    fillStyle: "purple"
});
addPhysicsObject({
    position: [300,50],
    velocity: [1,0],
    rotation: 0,
    objType: "circle",
    radius: 50,
    cor: standardCor,
    invDensity: 1,
    fillStyle: "cyan"
});
addPhysicsObject({
    position: [200,50],
    velocity: [0,-0.5],
    rotation: 0,
    objType: "circle",
    radius: 20,
    cor: standardCor,
    invDensity: 1,
    fillStyle: "orange"
});
addPhysicsObject({
    position: [450,50],
    velocity: [-0.5,0],
    rotation: 0,
    objType: "circle",
    radius: 10,
    cor: standardCor,
    invDensity: 1,
    fillStyle: "brown"
});
addPhysicsObject({
    position: [400,50],
    velocity: [-0.5,0],
    radius:20,  //a cheat to get mass calculation (TODO calc mass for general convex shape)
    rotation: 0.3,
    objType: "chull",
    points: [[-40,-40], [-40,40], [10,40], [40,10], [40,-40]],
    //points: [[-40,-40], [-40,40], [40,-40]],  //triangle
    cor: standardCor,
    invDensity: 1,
    fillStyle: "pink"
});


function effectiveCor(object1, object2){
    return Math.min(object1.cor, object2.cor); //TODO does this make sense?
}

//NOTE could generalise circles and rectangles to rounded boxes
function processPossibleCollisionCircleCircle(object1, object2){

    //same as rectangle collision. TODO generalise this?

    var positionDifference = vectorDifference(object1.position, object2.position);
    var velocityDifference = vectorDifference(object1.velocity, object2.velocity);

    var separationSq = vectorLengthSq(positionDifference);
    var totalRad = object1.radius + object2.radius;
    var touchingDistanceSq = totalRad * totalRad;

    if (separationSq < touchingDistanceSq){
        //colliding
        var cor = effectiveCor(object1, object2);

        if (dotProd(positionDifference, velocityDifference)<0){
            //approaching

            //TODO reflect velocity in this direction, retain other component
            var cOfMVelocity = [
                (object1.velocity[0]*object2.invMass + object2.velocity[0]*object1.invMass)/(object1.invMass+ object2.invMass),
                (object1.velocity[1]*object2.invMass + object2.velocity[1]*object1.invMass)/(object1.invMass+ object2.invMass)
                ];
                //^^ is this needed? or just velocity along separation?

                //for each object, subtract centre of mass velocity to get velocity in frame travelling at centre of mass velocity
                //in this frame, for each object, retain component perpendicular to displacement (=reaction force) direction
                //and multiply the other part by negative coefficient of resitution.
                //add the centre of mass velocity back.
                //TODO reformulate for efficiency? (removal of square roots etc)

            //move objects apart!
            //should move distance separation-totalrad 
            var totalInvMass = object1.invMass + object2.invMass;
            var currentSeparation = Math.sqrt(separationSq);
            var scaleUpFactor = (totalRad/currentSeparation) -1;
            var vecToMoveTotal = positionDifference.map(x=>x*scaleUpFactor);

            object1.position[0]+=(object1.invMass/totalInvMass)*vecToMoveTotal[0];
            object1.position[1]+=(object1.invMass/totalInvMass)*vecToMoveTotal[1];
            object2.position[0]-=(object2.invMass/totalInvMass)*vecToMoveTotal[0];
            object2.position[1]-=(object2.invMass/totalInvMass)*vecToMoveTotal[1];


            updateSpeedForObject(object1);
            updateSpeedForObject(object2);


            //friction.
            //find speed change in direction of penetration/separation (same for circle-circle))
            //multiply by coefficient of friction mu to get max speed change for friction
            //find speed difference component in tangent direction (normal to normal)
            //negate this speed up to the max speed change.

            // for "normal" is contact normal = reaction force direction
            //speed difference along normal = vel dot normal
            //velocity in tangent direction = vel - (vel dot normal)*normal

            var contactNormal = positionDifference.map(x=>x/currentSeparation);
            var speedDifferenceAlongNormal = dotProd(contactNormal, velocityDifference);
            var velocityInTangentDirection = [
                velocityDifference[0] - speedDifferenceAlongNormal*contactNormal[0],
                velocityDifference[1] - speedDifferenceAlongNormal*contactNormal[1]
            ];

            //x-product -> signed
            var speedDifferenceInTangentDirection = 
                velocityInTangentDirection[0]*contactNormal[1]-
                velocityInTangentDirection[1]*contactNormal[0];

            speedDifferenceInTangentDirection += object1.angVel * object1.radius + object2.angVel * object2.radius;

            var normalImpulse = speedDifferenceAlongNormal*(1+cor)/totalInvMass;

            var effectiveInvMassForTangentDirection = totalInvMass + object1.invMomentOfInertia*object1.radsq + object2.invMomentOfInertia*object2.radsq;
            var impulseRequiredToStop = speedDifferenceInTangentDirection/effectiveInvMassForTangentDirection;

            var frictionImpulse = impulseRequiredToStop*Math.min(1, friction_mu* Math.abs(normalImpulse/impulseRequiredToStop));

            object1.velocity[0]+=contactNormal[1]*frictionImpulse*object1.invMass;
            object1.velocity[1]-=contactNormal[0]*frictionImpulse*object1.invMass;
            object2.velocity[0]-=contactNormal[1]*frictionImpulse*object2.invMass;
            object2.velocity[1]+=contactNormal[0]*frictionImpulse*object2.invMass;

            //impact of torque. TODO check signs?
            object1.angVel-= frictionImpulse*object1.invMomentOfInertia*object1.radius;
            object2.angVel-= frictionImpulse*object2.invMomentOfInertia*object2.radius;

            function updateSpeedForObject(theObject){
                var velInMovingFrame = vectorDifference(theObject.velocity, cOfMVelocity);
    
                var mulltiplier1 = dotProd(velInMovingFrame, positionDifference)/separationSq;
    
                var velInMovingFrameComponentAlongReactionNormal = 
                    [positionDifference[0]*mulltiplier1, positionDifference[1]*mulltiplier1];
    
                var perpendicularPart = vectorDifference(velInMovingFrame, velInMovingFrameComponentAlongReactionNormal);
    
                //TODO formulate using impulses instead?
                theObject.velocity = [
                    cOfMVelocity[0] + perpendicularPart[0] - cor * velInMovingFrameComponentAlongReactionNormal[0],
                    cOfMVelocity[1] + perpendicularPart[1] - cor * velInMovingFrameComponentAlongReactionNormal[1],
                ];
            }
            
        }
    }
}

function processPossibleCollisionCircleChull(circle, chull){
    //suspect way to do this is:
    //find penetration for all edges vs circle centre. if least pen of centre vs convex is more than 0, take edge of least penetration.
    //if least penetration is < circle rad, not penetrating
    //otherwise, consider the closest edge, collide with edge or vertex at either end

    var object1 = circle;
    var object2 = chull;
    var cor = effectiveCor(object1, object2);
    var positionDifference = vectorDifference(object1.position, object2.position);
    var velocityDifference = vectorDifference(object1.velocity, object2.velocity);

    var cxsx = [Math.cos(chull.rotation), Math.sin(chull.rotation)];
    var positionDifferenceInRotatedFrame = [
        cxsx[0] * positionDifference[0] + cxsx[1] * positionDifference[1],
        cxsx[0] * positionDifference[1] - cxsx[1] * positionDifference[0],
    ];

    var edges = chull.edges;
    var leastPenetration = Number.MAX_VALUE;
    var collidingEdgeIdx;

    for (var ii=0;ii<edges.length;ii++){
        var edge = edges[ii];
        var edgedir = edge.dir;
        
        distInEdgeDir = dotProd(positionDifferenceInRotatedFrame, edgedir);
        
        var penetration = circle.radius + edge.howFar - distInEdgeDir;

        if (penetration<leastPenetration){
            leastPenetration = penetration;
            penNormal = edgedir;
            collidingEdgeIdx = ii;
        }
    }
    //currently this is like collision of point with convex hull with edges moved outward by sphere radius, without curved corners.
    //therefore will be obviously wrong for large spheres collising with convex shape corners. but the result looks OK.
    //TODO handle corner collision properly

    if (leastPenetration>0){
        if (leastPenetration>circle.radius){
            doCollision(penNormal.map(x=>-x*leastPenetration), positionDifferenceInRotatedFrame); //circle centre is inside convex shape
                //take contact point to be centre of circle, which goes to surface of convex shape at limit of this if condition.
            return;
        }

        var endPoint = chull.points[collidingEdgeIdx];
        var startPoint = chull.points[(collidingEdgeIdx+chull.points.length-1)%chull.points.length];  //because js % is strange

        var alongEdgeVec = vectorDifference(endPoint, startPoint);  //TODO store edge vec instead of recalculating?
        var alongEdgeVecLenSq = vectorLengthSq(alongEdgeVec);
        var pointRelativeToStartPoint = vectorDifference(positionDifferenceInRotatedFrame, startPoint); //in rotated frame
        var pointRelativeToEndPoint = vectorDifference(positionDifferenceInRotatedFrame, endPoint);
        var fractionAlongEdge = dotProd(pointRelativeToStartPoint, alongEdgeVec)/alongEdgeVecLenSq;

        //console.log(fractionAlongEdge);

        if (fractionAlongEdge<0){
            var pointRelativeToStartPointLenSq = vectorLengthSq(pointRelativeToStartPoint);

            if (pointRelativeToStartPointLenSq < circle.radsq){
                var distFromVert = Math.sqrt(pointRelativeToStartPointLenSq);
                var penetration = circle.radius - distFromVert;
                var multiplier = penetration/distFromVert;
                //console.log("x");
                doCollision(pointRelativeToStartPoint.map(x=>-multiplier*x), startPoint);
                    //sign here is not obvious - switch it and doesn't break!
            }
            return;
        }
      
        if(fractionAlongEdge>1){
            var pointRelativeToEndPointLenSq = vectorLengthSq(pointRelativeToEndPoint);

            if (pointRelativeToEndPointLenSq < circle.radsq){
                var distFromVert = Math.sqrt(pointRelativeToEndPointLenSq);
                var penetration = circle.radius - distFromVert;
                var multiplier = penetration/distFromVert;
                //console.log("xx");
                doCollision(pointRelativeToEndPoint.map(x=>-multiplier*x), endPoint);
                    //sign here is not obvious - switch it and doesn't break!
            }
            return;
        }

        var contactPoint = [
            fractionAlongEdge*endPoint[0] + (1-fractionAlongEdge)*startPoint[0],
            fractionAlongEdge*endPoint[1] + (1-fractionAlongEdge)*startPoint[1]
        ];
        doCollision(penNormal.map(x=>-x*leastPenetration), contactPoint);
    }

    //copypaste of circle-rect!
    function doCollision(penetrationVectorInRotatedFrame, contactPointInRotatedFrame){
        
        //TODO take contact point into account to apply torque, friction etc

        var contactPositionInWorldFrame = [
            chull.position[0] + contactPointInRotatedFrame[0]*cxsx[0] - contactPointInRotatedFrame[1]*cxsx[1],
            chull.position[1] + contactPointInRotatedFrame[1]*cxsx[0] + contactPointInRotatedFrame[0]*cxsx[1]
        ];

        contactPositionsToDraw.push(contactPositionInWorldFrame);    //TODO rotate, transform it!

        var penetrationVector = [
            cxsx[0] * penetrationVectorInRotatedFrame[0] - cxsx[1] * penetrationVectorInRotatedFrame[1],
            cxsx[0] * penetrationVectorInRotatedFrame[1] + cxsx[1] * penetrationVectorInRotatedFrame[0],
        ];

        //move shapes apart by this vector
        var totalInvMass = object1.invMass + object2.invMass;
        object1.position[0] -= object1.invMass/totalInvMass * penetrationVector[0];
        object1.position[1] -= object1.invMass/totalInvMass * penetrationVector[1];
        object2.position[0] += object2.invMass/totalInvMass * penetrationVector[0];
        object2.position[1] += object2.invMass/totalInvMass * penetrationVector[1];

        if (dotProd(velocityDifference, penetrationVector)<0){return;}

        //impart impulse along this direction
        var separationSq = vectorLengthSq(penetrationVector);
            
        //NOTE This is a copy paste from circle-circle collision. positionDifference is swapped out for penetrationVector. TODO dedupe!

  //      updateSpeedForObject(object1);
   //     updateSpeedForObject(object2);
            //TODO do above correctly using impulse (off centre impulse won't cause as much velocity change of shape centres)

        
        //friction
        //this is a copy paste of CircleCircle code, but with penetrationVector instead of positionDifference
        var currentSeparation = Math.sqrt(separationSq);
        var contactNormal = penetrationVector.map(x=>x/currentSeparation);

        var speedDifferenceAlongNormal = dotProd(contactNormal, velocityDifference);

        var velocityInTangentDirection = [
            velocityDifference[0] - speedDifferenceAlongNormal*contactNormal[0],
            velocityDifference[1] - speedDifferenceAlongNormal*contactNormal[1]
        ];
        var speedDifferenceInTangentDirection = vectorLength(velocityInTangentDirection);

        var fractionToRemove = Math.min(1, Math.abs(speedDifferenceAlongNormal)*friction_mu/speedDifferenceInTangentDirection);
            //is abs required?
        if (isNaN(fractionToRemove)){
            console.log("fractionToRemove is NaN!");
            fractionToRemove=0; //TODO how to avoid this check? - just add some small amount to speedDifferenceInTangentDirection?
        }

        var velocityToRemoveInTangentDirection = velocityInTangentDirection.map(x=>x*fractionToRemove);

        //TODO add component of invmass due off-centre force causing rotation
        object1.velocity[0]-=velocityToRemoveInTangentDirection[0]*object1.invMass/totalInvMass;
        object1.velocity[1]-=velocityToRemoveInTangentDirection[1]*object1.invMass/totalInvMass;
        object2.velocity[0]+=velocityToRemoveInTangentDirection[0]*object2.invMass/totalInvMass;
        object2.velocity[1]+=velocityToRemoveInTangentDirection[1]*object2.invMass/totalInvMass;



        //apply torque to shape due to reaction impulse (not friction). this shoudn't affect circle since contact to circle centre
        //is parallel to impulse direction
        var tangentVectorInRotatedFrame = [penetrationVectorInRotatedFrame[1],-penetrationVectorInRotatedFrame[0]].map(x=>x/currentSeparation);
        var leverDistance = dotProd(tangentVectorInRotatedFrame, contactPointInRotatedFrame);

        var rotationalInvMass = chull.invMomentOfInertia*(leverDistance*leverDistance);
        var effectiveInvMass = totalInvMass + rotationalInvMass;
        var speedChangeToApply = (1+chull.cor)*speedDifferenceAlongNormal;

        var normalImpulse = speedChangeToApply/effectiveInvMass;


        circle.velocity[0]-= circle.invMass * normalImpulse * contactNormal[0];
        circle.velocity[1]-= circle.invMass * normalImpulse * contactNormal[1];

        chull.velocity[0]+= chull.invMass * normalImpulse * contactNormal[0];
        chull.velocity[1]+= chull.invMass * normalImpulse * contactNormal[1];

        chull.angVel+= leverDistance*normalImpulse*chull.invMomentOfInertia;

        
        //TODO apply torque due to friction...
        //TODO factor in effect of contact point speed due to application of friction.
    }
}

function processPossibleCollisionChullChull(chull1, chull2){

    var object1 = chull1;
    var object2 = chull2;

    var velocityDifference = vectorDifference(object1.velocity, object2.velocity);
    var leastPenetration = Number.MAX_VALUE;
    var penNormal = [0,0];
    var contactPoint;

    processPointsForEdges(chull1, chull2);
    penNormal = penNormal.map(x=>-x);
    processPointsForEdges(chull2, chull1);

    if (leastPenetration>0 && leastPenetration != Number.MAX_VALUE){
        if (contactPoint){  //TODO does this happen and why
            doCollision(penNormal.map(x=>x*leastPenetration), contactPoint);
        }
    }

    function processPointsForEdges(chullForPoints, chullForEdges){
        
        var edges = chullForEdges.edges;
        var cxsxEdges = [Math.cos(chullForEdges.rotation), Math.sin(chullForEdges.rotation)];

        //transform points into frame of other shape
        var rotationDifference = -(chullForPoints.rotation - chullForEdges.rotation); //sign?
        var cxsxDifference = [Math.cos(rotationDifference), Math.sin(rotationDifference)];
        var positionDifference = vectorDifference(chullForPoints.position, chullForEdges.position);
        var rotatedPositionDifference = [
            (positionDifference[0]*cxsxEdges[0] + positionDifference[1]*cxsxEdges[1]),
            (positionDifference[1]*cxsxEdges[0] - positionDifference[0]*cxsxEdges[1])
        ];

        var transformedPoints = chullForPoints.points.map(p=>[
            (p[0]*cxsxDifference[0] + p[1]*cxsxDifference[1])+rotatedPositionDifference[0],
            (p[1]*cxsxDifference[0] - p[0]*cxsxDifference[1])+rotatedPositionDifference[1]
        ]);

        for (var ii=0;ii<edges.length;ii++){
            var edge = edges[ii];
            var edgedir = edge.dir;
            var leastFarInThisDirection = Number.MAX_VALUE;
            var pickedPoint;
            for (var jj=0;jj<transformedPoints.length;jj++){
                //find transformed point that is least far in this direction.
                var point = transformedPoints[jj];
                var distInEdgeDir = dotProd(point, edgedir);
                if (distInEdgeDir<leastFarInThisDirection){
                    leastFarInThisDirection = distInEdgeDir;
                    pickedPoint = point;
                }
            }

            var penetration = edge.howFar - leastFarInThisDirection;

            if (penetration<leastPenetration){
                leastPenetration = penetration;
                penNormal = [   //get pen normal in world frame
                    cxsxEdges[0]*edgedir[0] - cxsxEdges[1]*edgedir[1],
                    cxsxEdges[0]*edgedir[1] + cxsxEdges[1]*edgedir[0]
                ]
                if (pickedPoint){   //does this ever happen? why?
                    contactPoint = [
                        chullForEdges.position[0] + cxsxEdges[0]*pickedPoint[0] - cxsxEdges[1]*pickedPoint[1],
                        chullForEdges.position[1] + cxsxEdges[0]*pickedPoint[1] + cxsxEdges[1]*pickedPoint[0]
                    ];
                }
            }
        }
    }

    function doCollision(penetrationVector, contactPositionInWorldFrame){
            //TODO pass in contact position in frame of object for efficiency?

        contactPositionsToDraw.push(contactPositionInWorldFrame);

        //mostly copy/paste from elsewhere
        var cor = effectiveCor(object1, object2);

        //move shapes apart by this vector
        var totalInvMass = object1.invMass + object2.invMass;
        object1.position[0] -= object1.invMass/totalInvMass * penetrationVector[0];
        object1.position[1] -= object1.invMass/totalInvMass * penetrationVector[1];
        object2.position[0] += object2.invMass/totalInvMass * penetrationVector[0];
        object2.position[1] += object2.invMass/totalInvMass * penetrationVector[1];

        var dotVecWithPenVec = dotProd(velocityDifference, penetrationVector);
        if (dotVecWithPenVec<0){return;}

        //impart impulse along this direction
        var separationSq = vectorLengthSq(penetrationVector);
        
        //NOTE This is a copy paste from circle-circle collision. positionDifference is swapped out for penetrationVector. TODO dedupe!

        //friction
        //this is a copy paste of CircleCircle code, but with penetrationVector instead of positionDifference
        var currentSeparation = Math.sqrt(separationSq);
        var contactNormal = penetrationVector.map(x=>x/currentSeparation);
        var speedDifferenceAlongNormal = dotProd(contactNormal, velocityDifference);

        var velocityInTangentDirection = [
            velocityDifference[0] - speedDifferenceAlongNormal*contactNormal[0],
            velocityDifference[1] - speedDifferenceAlongNormal*contactNormal[1]
        ];
        var speedDifferenceInTangentDirection = vectorLength(velocityInTangentDirection);

        var fractionToRemove = Math.min(1, Math.abs(speedDifferenceAlongNormal)*friction_mu/speedDifferenceInTangentDirection);
            //is abs required?
        if (isNaN(fractionToRemove)){
            console.log("fractionToRemove is NaN!");
            fractionToRemove=0; //TODO how to avoid this check? - just add some small amount to speedDifferenceInTangentDirection?
        }

        var velocityToRemoveInTangentDirection = velocityInTangentDirection.map(x=>x*fractionToRemove);

        object1.velocity[0]-=velocityToRemoveInTangentDirection[0]*object1.invMass/totalInvMass;
        object1.velocity[1]-=velocityToRemoveInTangentDirection[1]*object1.invMass/totalInvMass;
        object2.velocity[0]+=velocityToRemoveInTangentDirection[0]*object2.invMass/totalInvMass;
        object2.velocity[1]+=velocityToRemoveInTangentDirection[1]*object2.invMass/totalInvMass;


        //apply torque to shape due to reaction impulse (not friction).
        var tangentVector = [contactNormal[1],-contactNormal[0]];

        var toContactFromShape1 = vectorDifference(contactPositionInWorldFrame, object1.position);
        var toContactFromShape2 = vectorDifference(contactPositionInWorldFrame, object2.position);

        var leverDistance1 = dotProd(tangentVector, toContactFromShape1);
        var leverDistance2 = dotProd(tangentVector, toContactFromShape2);

        var rotationalInvMass = object1.invMomentOfInertia*leverDistance1*leverDistance1 
                                + object2.invMomentOfInertia*leverDistance2*leverDistance2;
        var effectiveInvMass = totalInvMass + rotationalInvMass;
        var speedChangeToApply = (1+cor)*speedDifferenceAlongNormal;

        var normalImpulse = speedChangeToApply/effectiveInvMass;    //TODO actually use this here for change to centre of mass velocities


        object1.velocity[0]-= object1.invMass * normalImpulse * contactNormal[0];
        object1.velocity[1]-= object1.invMass * normalImpulse * contactNormal[1];

        object2.velocity[0]+= object2.invMass * normalImpulse * contactNormal[0];
        object2.velocity[1]+= object2.invMass * normalImpulse * contactNormal[1];


        object1.angVel-= leverDistance1*normalImpulse*object1.invMomentOfInertia;
        object2.angVel+= leverDistance2*normalImpulse*object2.invMomentOfInertia;

        //TODO apply torque due to friction...
        //TODO factor in effect of contact point speed due to application of friction.
    }
}

function processPossibleCollisionRectRect(object1, object2){
    //process using convex hull routine.
    //dedicated rect-rect routine might be slightly more efficient, but outcome should be same.
    processPossibleCollisionChullChull(object1, object2);
}

function processPossibleCollision(object1, object2){

    if ( (object1.objType == "circle") && (object2.objType == "circle")){
        return processPossibleCollisionCircleCircle(object1, object2);
    }

    if ( (object1.objType == "circle") && (object2.objType == "rect")){
        return processPossibleCollisionCircleChull(object1, object2);
    }
    if ( (object2.objType == "circle") && (object1.objType == "rect")){
        return processPossibleCollisionCircleChull(object2, object1);
    }

    //TODO remove this, since chull chull will apply.
    if ( (object1.objType == "rect") && (object2.objType == "rect")){
        return processPossibleCollisionRectRect(object1, object2);
    }

    if ( (object1.objType == "circle") && (object2.objType == "chull")){
        return processPossibleCollisionCircleChull(object1, object2);
    }
    if ( (object2.objType == "circle") && (object1.objType == "chull")){
        return processPossibleCollisionCircleChull(object2, object1);
    }

    if ( (object1.objType != "circle") && (object2.objType != "circle")){
        processPossibleCollisionChullChull(object1, object2);
    }
}


var isPlaying = true;

document.getElementById("playButton").addEventListener("click", evt => {
    isPlaying = true;
});
document.getElementById("pauseButton").addEventListener("click", evt => {
    isPlaying = false;
});
document.getElementById("stepButton").addEventListener("click", evt => {
    physTimeToCatchUp+= physStepTime;
});

var currentKeyPresses={
    left:false,
    right:false,
    up:false,
    down:false
};

document.addEventListener("keydown", e => {
    switch (e.keyCode) {
        case 37:
            currentKeyPresses.left=true;
            break;
        case 38:
            currentKeyPresses.up=true;
            break;
        case 39:
            currentKeyPresses.right=true;
            break;
        case 40:
            currentKeyPresses.down=true;
            break;
    }
});
document.addEventListener("keyup", e => {
    switch (e.keyCode) {
        case 37:
            currentKeyPresses.left=false;
            break;
        case 38:
            currentKeyPresses.up=false;
            break;
        case 39:
            currentKeyPresses.right=false;
            break;
        case 40:
            currentKeyPresses.down=false;
            break;
    }
});


//for stepping physics engine.
currentTime = window.performance.now();
console.log("initial time = " + currentTime);
requestAnimationFrame(updateAndRender);


//render callback.
//don't bother with interpolation
function updateAndRender(timestamp){
    requestAnimationFrame(updateAndRender);

    var timeDifference = timestamp - currentTime;
    currentTime = timestamp;
    //console.log("elapsed time: " + timeDifference);


    if (isPlaying){
        physTimeToCatchUp += timeDifference;
    }

    var iterationsToCatchUp = Math.floor(physTimeToCatchUp/physStepTime);

    physTimeToCatchUp-=iterationsToCatchUp*physStepTime;

    //cap iterations
    if (iterationsToCatchUp>maxIterationsPerDraw){
        iterationsToCatchUp=maxIterationsPerDraw;
        physTimeToCatchUp=0;
    }
    //console.log("will do " + iterationsToCatchUp + " iterations" );

    contactPositionsToDraw=[];

    while (iterationsToCatchUp > 0){
        iterationsToCatchUp-=1;
        
        //move objects
        physicsObjects.forEach((x) => {
            x.position[0] += x.velocity[0];
            x.position[1] += x.velocity[1];
        });

        //rotate objects
        physicsObjects.forEach((x) => {
            x.rotation = (x.rotation+x.angVel) % (Math.PI *2);
        });

        //collide with level box.
        physicsObjects.forEach((x) => {
            if (x.objType == "circle"){
                if (x.position[0]< x.radius && x.velocity[0] <0 ){
                    x.position[0]= x.radius;
                    levelCollideFrictionForCircle(1, -1);
                }
                if (x.position[1] < x.radius && x.velocity[1] <0 ){ //ceiling
                    x.position[1]= x.radius;
                    levelCollideFrictionForCircle(0, 1);
                }
                if (x.position[0]> canvas_width -x.radius && x.velocity[0] >0 ){
                    x.position[0]= canvas_width -x.radius;
                    levelCollideFrictionForCircle(1, 1);
                }
                if (x.position[1]> canvas_height -x.radius && x.velocity[1] >0 ){       //floor
                    x.position[1]= canvas_height -x.radius;
                    levelCollideFrictionForCircle(0, -1);
                }

                function levelCollideFrictionForCircle(frictionDimensionIndex, sign){
                    var normalDimension = 1-frictionDimensionIndex;
                    var velchange = -(1+x.cor)*x.velocity[normalDimension];
                    x.velocity[normalDimension]+=velchange;

                    var surfaceVelocity = x.velocity[frictionDimensionIndex] + sign*x.radius*x.angVel;
                    //apply implulse up to limit determined by coefficient of friction, that will change surface veclocity to zero.
                    
                    var effectiveInvMass = x.invMass + x.invMomentOfInertia*x.radsq;  //AFAIK this part is good.
                    var impulseRequiredToStop = surfaceVelocity/effectiveInvMass;

                    if (impulseRequiredToStop!=0){
                        var normalImpulse = velchange/x.invMass;
                        var frictionImpulse = impulseRequiredToStop * Math.min( 1 , friction_mu*Math.abs(normalImpulse/impulseRequiredToStop));
                        //var frictionImpulse = impulseRequiredToStop;    //sticky (infinite mu)

                        x.velocity[frictionDimensionIndex]-= frictionImpulse*x.invMass;
                        x.angVel -= sign*frictionImpulse*x.invMomentOfInertia*x.radius;
                    }
                }

            }else{  // chull or rect
                var cxsx = [Math.cos(x.rotation), Math.sin(x.rotation)];
                var transformedPoints = x.points.map(p =>
                    [
                        p[0]*cxsx[0] - p[1]*cxsx[1]+ x.position[0],   //TODO include rotation
                        p[1]*cxsx[0] + p[0]*cxsx[1]+ x.position[1]
                    ]
                );

                var minx=transformedPoints.map(x=>x[0]).reduce((a,b) => Math.min(a,b), Number.MAX_VALUE);
                var miny=transformedPoints.map(x=>x[1]).reduce((a,b) => Math.min(a,b), Number.MAX_VALUE);
                var maxx=transformedPoints.map(x=>x[0]).reduce((a,b) => Math.max(a,b), Number.MIN_VALUE);
                var maxy=transformedPoints.map(x=>x[1]).reduce((a,b) => Math.max(a,b), Number.MIN_VALUE);

                if (minx<0){
                    x.position[0]-=minx;
                    collideWithWall([-1,0],0);
                }

                //ceiling
                if (miny<0){
                    x.position[1]-=miny;
                    collideWithWall([0,-1],0);
                }


                if (maxx> canvas_width){
                    x.position[0]-= maxx-canvas_width;
                    collideWithWall([1,0],canvas_width);
                }

                // //floor
                if (maxy>canvas_height){
                     x.position[1]-= maxy-canvas_height;
                     collideWithWall([0,1],canvas_height);
                }

                function collideWithWall(wallOutwardNormal, wallDistanceFromOriginInNormalDirection){

                    var tangentDirection = [wallOutwardNormal[1],-wallOutwardNormal[0]];

                    //find which point, (if any), is colliding.
                    var maxDepthInWall = Number.MIN_VALUE;
                    var selectedPoint = -1;
                    for (var ii=0;ii<x.points.length;ii++){
                        var currentTransformedPoint =transformedPoints[ii];
                        var leverDistance = dotProd(tangentDirection, vectorDifference(currentTransformedPoint, x.position ));
                        var pointTowardsWallSpeed = dotProd(x.velocity, wallOutwardNormal) + leverDistance*x.angVel;
                        var distanceInWallDirection = dotProd(wallOutwardNormal, currentTransformedPoint);
                        if (distanceInWallDirection>maxDepthInWall && pointTowardsWallSpeed>0){
                            maxDepthInWall = distanceInWallDirection;
                            selectedPoint = ii;
                        }
                    }

                    if (maxDepthInWall>wallDistanceFromOriginInNormalDirection && selectedPoint!=-1){
                        //apply impulse appropriate for no friction.
                        var transformedPoint = transformedPoints[selectedPoint];
                        var leverDistance = dotProd(tangentDirection, vectorDifference(transformedPoint, x.position ));
                        var pointTowardsWallSpeed = dotProd(x.velocity, wallOutwardNormal) + leverDistance*x.angVel;
                            //TODO save this result from earlier? 
                        var speedChangeToApply = (1+x.cor)*pointTowardsWallSpeed;

                        var rotationalInvMass = x.invMomentOfInertia*(leverDistance*leverDistance);
                        var effectiveInvMass = x.invMass + rotationalInvMass;
                        var normalImpulse = speedChangeToApply/effectiveInvMass;

                        //console.log({transformedPoint,pointTowardsWallSpeed,speedChangeToApply,effectiveInvMass,normalImpulse});

                        x.velocity[0]-= x.invMass * normalImpulse * wallOutwardNormal[0];
                        x.velocity[1]-= x.invMass * normalImpulse * wallOutwardNormal[1];

                        //apply torque
                        x.angVel-= leverDistance*normalImpulse*x.invMomentOfInertia;
                    }

                }

            }
            
        });

        //collide with other objects
        //just do in order. this may cause problems if 3+ objects colliding together.
        for (var ii=1;ii<physicsObjects.length;ii++){
            for (var jj=0;jj<ii;jj++){
                processPossibleCollision(physicsObjects[ii], physicsObjects[jj]);
            }
        }

        //apply gravity.
        //var gravDirection = (0.0005*timestamp) % (2*Math.PI);
        var gravDirection=Math.PI/2;
        var gravStrength = 0.005;
        physicsObjects.forEach((x) => {
            if (x.invDensity!=0){
                x.velocity[0]+=gravStrength*Math.cos(gravDirection);
                x.velocity[1]+=gravStrength*Math.sin(gravDirection);
            }
        });


        //apply controls
        var controlledObject = physicsObjects[0];
        var thrust = 0.02;
        if (currentKeyPresses.up){
            controlledObject.velocity[0] += thrust*Math.cos(controlledObject.rotation);
            controlledObject.velocity[1] += thrust*Math.sin(controlledObject.rotation);
        }
        if (currentKeyPresses.left){
            controlledObject.angVel -= 0.001;
        }
        if (currentKeyPresses.right){
            controlledObject.angVel += 0.001;
        }
        controlledObject.angVel*=0.95;
        controlledObject.velocity[0]*=0.999;
        controlledObject.velocity[1]*=0.999;

    }
    
    //update display
    //ctx.clearRect(0, 0, canvas_width, canvas_height);

    ctx.fillStyle = "#aaa";
    ctx.fillRect(0, 0, canvas_width, canvas_height);

    physicsObjects.forEach((x, idx) => {
        ctx.fillStyle = x.fillStyle;

        //TODO render method per object.
        if (x.objType == "circle"){
            ctx.beginPath();
            ctx.arc(x.position[0], x.position[1], x.radius, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();

            //line to show rotation.
            ctx.beginPath();
            ctx.moveTo(x.position[0], x.position[1]);
            ctx.lineTo(x.position[0]+x.radius*Math.sin(x.rotation),x.position[1]-x.radius*Math.cos(x.rotation));
            ctx.closePath();
            ctx.stroke();
        }else if (x.objType == "chull" || x.objType == "rect"){
            var cxsx = [Math.cos(x.rotation), Math.sin(x.rotation)];
            var transformedPoints = x.points.map(p =>
                [
                    p[0]*cxsx[0] - p[1]*cxsx[1]+ x.position[0],   //TODO include rotation
                    p[1]*cxsx[0] + p[0]*cxsx[1] + x.position[1]
                ]
            );
            
            ctx.beginPath();
            var point = transformedPoints[transformedPoints.length-1];
            ctx.moveTo(point[0],point[1]);
            for (var ii=0;ii<transformedPoints.length;ii++){
                point = transformedPoints[ii];
                ctx.lineTo(point[0],point[1]);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }

        ctx.strokeText(idx, x.position[0], x.position[1]);
    });

    ctx.strokeStyle = "black";
    ctx.fillStyle = "#f00";
    contactPositionsToDraw.forEach((contactPosition)=>{
        ctx.fillRect(contactPosition[0]-5,contactPosition[1]-5,10,10);
        ctx.strokeRect(contactPosition[0]-5,contactPosition[1]-5,10,10);
    });
}

function vectorLength(vec1){
    return Math.sqrt(vectorLengthSq(vec1));
}
function vectorLengthSq(vec1){
    return dotProd(vec1, vec1);
}
function dotProd(vec1, vec2){
    return vec1[0]*vec2[0] + vec1[1]*vec2[1];
}
function vectorDifference(vec1, vec2){
    return [vec1[0]-vec2[0], vec1[1]-vec2[1]];
}