//simple no rotation 2D mechanics.
//inspired by reading 1st randy gaul article

var canvas = document.getElementById("myCanvas");
var canvas_width = 600;
var canvas_height = 500;
canvas.width = canvas_width;
canvas.height = canvas_height;
var ctx = canvas.getContext("2d");

var currentTime = null;
var physStepTime = 3;   //phys step every 3 ms.
var physTimeToCatchUp = 0;
var maxIterationsPerDraw = 10;
var friction_mu = 0.1;   //coefficient of friction. for now just have same for all object (pairs), and static, sliding friction same
                            //NOTE does not handle this being zero!
var standardCor = 0.5;
var physicsObjects = [];

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
            [-halfEdges[0], halfEdges[1]],
            [-halfEdges[0], -halfEdges[1]]
        ];
        theObject.edges = [
            {dir:[1,0], howFar:halfEdges[0]},    //unit normal direction, displacement of face along this direction from shape centre.
            {dir:[-1,0],  howFar:halfEdges[0]},
            {dir:[0,1],  howFar:halfEdges[1]},
            {dir:[0,-1],  howFar:halfEdges[1]}
        ];
    }
    //TODO similar for explicit convex hull (not rect) - construct directions from points.

    physicsObjects.push(theObject);
}

addPhysicsObject({
    position: [200,100],
    rotation: -0.2,
    velocity: [0.3,1],
    objType: "rect",
    sideHalfEdges: [20,30],
    cor: standardCor,
    invDensity: 1,
    fillStyle: "red"
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

for (var ii=0;ii<10;ii++){
    addPhysicsObject({
        position: [50,20+50*ii],
        velocity: [0,0],
        rotation: 0,
        //objType: "rect",
        //sideHalfEdges: [20,20],
        objType: "circle",
        radius: 25,
        cor: standardCor,
        invDensity: 1,
        fillStyle: `rgba(32, 45, ${ii*25}, 255)`
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


function effectiveCor(object1, object2){
    return Math.min(object1.cor, object2.cor); //TODO does this make sense?
}

//NOTE could generalise circles and rectangles to rounded boxes
function processPossibleCollisionCircleCircle(object1, object2){

    //same as rectangle collision. TODO generalise this?

    var positionDifference = [
        object1.position[0] - object2.position[0],
        object1.position[1] - object2.position[1]
    ];
    var velocityDifference = [
        object1.velocity[0] - object2.velocity[0],
        object1.velocity[1] - object2.velocity[1]
    ];

    var separationSq = positionDifference[0]*positionDifference[0] + positionDifference[1]*positionDifference[1];
    var totalRad = object1.radius + object2.radius;
    var touchingDistanceSq = totalRad * totalRad;

    if (separationSq < touchingDistanceSq){
        //colliding
        var cor = effectiveCor(object1, object2);

        var displacementDotVelocityDifference = positionDifference[0]*velocityDifference[0] + positionDifference[1]*velocityDifference[1]

        if (displacementDotVelocityDifference<0){
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
            var speedDifferenceAlongNormal = contactNormal[0]*velocityDifference[0] + contactNormal[1]*velocityDifference[1];
            var velocityInTangentDirection = [
                velocityDifference[0] - speedDifferenceAlongNormal*contactNormal[0],
                velocityDifference[1] - speedDifferenceAlongNormal*contactNormal[1]
            ];
            var speedDifferenceInTangentDirection = Math.sqrt(
                    velocityInTangentDirection[0]*velocityInTangentDirection[0] + 
                    velocityInTangentDirection[1]*velocityInTangentDirection[1]);

            var fractionToRemove = Math.min(1, Math.abs(speedDifferenceAlongNormal)*friction_mu/speedDifferenceInTangentDirection);
                //is abs required? TODO handle speed=zero

            var velocityToRemoveInTangentDirection = velocityInTangentDirection.map(x=>x*fractionToRemove);

            object1.velocity[0]-=velocityToRemoveInTangentDirection[0]*object1.invMass/totalInvMass;
            object1.velocity[1]-=velocityToRemoveInTangentDirection[1]*object1.invMass/totalInvMass;
            object2.velocity[0]+=velocityToRemoveInTangentDirection[0]*object2.invMass/totalInvMass;
            object2.velocity[1]+=velocityToRemoveInTangentDirection[1]*object2.invMass/totalInvMass;

            function updateSpeedForObject(theObject){
                var velInMovingFrame = [
                    theObject.velocity[0]- cOfMVelocity[0],
                    theObject.velocity[1]- cOfMVelocity[1]
                ];
    
                var mulltiplier1 = (velInMovingFrame[0]*positionDifference[0] + velInMovingFrame[1]*positionDifference[1])
                        /separationSq;
    
                var velInMovingFrameComponentAlongReactionNormal = 
                    [positionDifference[0]*mulltiplier1, positionDifference[1]*mulltiplier1];
    
                var perpendicularPart = [
                    velInMovingFrame[0] - velInMovingFrameComponentAlongReactionNormal[0],
                    velInMovingFrame[1] - velInMovingFrameComponentAlongReactionNormal[1],
                ];
    
                //TODO formulate using impulses instead?
                theObject.velocity = [
                    cOfMVelocity[0] + perpendicularPart[0] - cor * velInMovingFrameComponentAlongReactionNormal[0],
                    cOfMVelocity[1] + perpendicularPart[1] - cor * velInMovingFrameComponentAlongReactionNormal[1],
                ];
            }
            
        }
    }
}

function processPossibleCollisionCircleRectangle(circle, rect){

    var object1 = rect;
    var object2 = circle;
    var cor = effectiveCor(object1, object2);

    var positionDifference = [
        object1.position[0] - object2.position[0],
        object1.position[1] - object2.position[1]
    ];

    var cxsx = [Math.cos(rect.rotation), Math.sin(rect.rotation)];
    var positionDifferenceInRotatedFrame = [
        cxsx[0] * positionDifference[0] + cxsx[1] * positionDifference[1],
        cxsx[0] * positionDifference[1] - cxsx[1] * positionDifference[0],
    ];

    var positionSigns = positionDifferenceInRotatedFrame.map(x=> x/(Math.abs(x)+0.0000000001));  //NOTE hack to handle zeros

    var velocityDifference = [
        object1.velocity[0] - object2.velocity[0],
        object1.velocity[1] - object2.velocity[1]
    ];

    //calculate penetration vector / vector of minimum movement to separate shapes
    var absPosDifference = positionDifferenceInRotatedFrame.map(Math.abs);
    var penForAxes = [
        absPosDifference[0] - rect.sideHalfEdges[0],
        absPosDifference[1] - rect.sideHalfEdges[1],
    ];

    if (penForAxes[0]<0 && penForAxes[1]<0){    //deeper than circle radius (colliding)
        if (penForAxes[0]<penForAxes[1]){
            doCollision([0, penForAxes[1]*positionSigns[1]]); //comment to debug more common case (ensure this doesn't happen)
        }else{
            doCollision([penForAxes[0]*positionSigns[0], 0]);
        }
    }else{
        var pointOnCircle = penForAxes.map(x=>Math.max(x,0));
        var radSq = pointOnCircle[0]*pointOnCircle[0] + pointOnCircle[1]*pointOnCircle[1];
        if (radSq < circle.radius * circle.radius){
            //colliding. penetration/move apart vector is pointOnCircle, with signs from positionDifference.

            var signedPointOnCircle = [
                pointOnCircle[0] * positionSigns[0], 
                pointOnCircle[1] * positionSigns[1]
            ];

            //doCollision(signedPointOnCircle.map(x=>-x));
              
            var rad = signedPointOnCircle[0]*signedPointOnCircle[0] + signedPointOnCircle[1]*signedPointOnCircle[1];
            rad = Math.sqrt(rad);
            var signedPointOnCircleWithCircleRadius = signedPointOnCircle.map(x=> x*circle.radius/rad);
            var vectorToSeparate = [
                -signedPointOnCircleWithCircleRadius[0] + signedPointOnCircle[0],
                -signedPointOnCircleWithCircleRadius[1] + signedPointOnCircle[1]
            ];
            doCollision(vectorToSeparate);
            
        }  //else is not colliding
    }

    function doCollision(pentetrationVectorInRotatedFrame){
        
        var pentetrationVector = [
            cxsx[0] * pentetrationVectorInRotatedFrame[0] - cxsx[1] * pentetrationVectorInRotatedFrame[1],
            cxsx[0] * pentetrationVectorInRotatedFrame[1] + cxsx[1] * pentetrationVectorInRotatedFrame[0],
        ];

        //move shapes apart by this vector
        var totalInvMass = object1.invMass + object2.invMass;
        object1.position[0] -= object1.invMass/totalInvMass * pentetrationVector[0];
        object1.position[1] -= object1.invMass/totalInvMass * pentetrationVector[1];
        object2.position[0] += object2.invMass/totalInvMass * pentetrationVector[0];
        object2.position[1] += object2.invMass/totalInvMass * pentetrationVector[1];

        var dotVecWithPenVec = velocityDifference[0]*pentetrationVector[0] + velocityDifference[1]*pentetrationVector[1];
        if (dotVecWithPenVec<0){return;}
        

        //impart impulse along this direction
        var separationSq = pentetrationVector[0]*pentetrationVector[0] + pentetrationVector[1]*pentetrationVector[1];

        var cOfMVelocity = [
            (object1.velocity[0]*object2.invMass + object2.velocity[0]*object1.invMass)/(object1.invMass+ object2.invMass),
            (object1.velocity[1]*object2.invMass + object2.velocity[1]*object1.invMass)/(object1.invMass+ object2.invMass)
            ];
            
        //NOTE This is a copy paste from circle-circle collision. positionDifference is swapped out for pentetrationVector. TODO dedupe!

        updateSpeedForObject(object1);
        updateSpeedForObject(object2);



        //friction
        //this is a copy paste of CircleCircle code, but with pentetrationVector instead of positionDifference
        var currentSeparation = Math.sqrt(separationSq);
        var contactNormal = pentetrationVector.map(x=>x/currentSeparation);
        var speedDifferenceAlongNormal = contactNormal[0]*velocityDifference[0] + contactNormal[1]*velocityDifference[1];
        var velocityInTangentDirection = [
            velocityDifference[0] - speedDifferenceAlongNormal*contactNormal[0],
            velocityDifference[1] - speedDifferenceAlongNormal*contactNormal[1]
        ];
        var speedDifferenceInTangentDirection = Math.sqrt(
                velocityInTangentDirection[0]*velocityInTangentDirection[0] + 
                velocityInTangentDirection[1]*velocityInTangentDirection[1]);

        var fractionToRemove = Math.min(1, Math.abs(speedDifferenceAlongNormal)*friction_mu/speedDifferenceInTangentDirection);
            //is abs required? TODO handle speed=zero

        var velocityToRemoveInTangentDirection = velocityInTangentDirection.map(x=>x*fractionToRemove);

        object1.velocity[0]-=velocityToRemoveInTangentDirection[0]*object1.invMass/totalInvMass;
        object1.velocity[1]-=velocityToRemoveInTangentDirection[1]*object1.invMass/totalInvMass;
        object2.velocity[0]+=velocityToRemoveInTangentDirection[0]*object2.invMass/totalInvMass;
        object2.velocity[1]+=velocityToRemoveInTangentDirection[1]*object2.invMass/totalInvMass;



        function updateSpeedForObject(theObject){
            var velInMovingFrame = [
                theObject.velocity[0]- cOfMVelocity[0],
                theObject.velocity[1]- cOfMVelocity[1]
            ];

            var mulltiplier1 = (velInMovingFrame[0]*pentetrationVector[0] + velInMovingFrame[1]*pentetrationVector[1])
                    /separationSq;

            var velInMovingFrameComponentAlongReactionNormal = 
                [pentetrationVector[0]*mulltiplier1, pentetrationVector[1]*mulltiplier1];

            var perpendicularPart = [
                velInMovingFrame[0] - velInMovingFrameComponentAlongReactionNormal[0],
                velInMovingFrame[1] - velInMovingFrameComponentAlongReactionNormal[1],
            ];

            //TODO formulate using impulses instead?
            theObject.velocity = [
                cOfMVelocity[0] + perpendicularPart[0] - cor * velInMovingFrameComponentAlongReactionNormal[0],
                cOfMVelocity[1] + perpendicularPart[1] - cor * velInMovingFrameComponentAlongReactionNormal[1],
            ];
        }

    }
}

function processPossibleCollisionChullChull(chull1, chull2){

    var object1 = chull1;
    var object2 = chull2;

    var velocityDifference = [
        object1.velocity[0] - object2.velocity[0],
        object1.velocity[1] - object2.velocity[1]
    ];

    var leastPenetration = Number.MAX_VALUE;
    var penNormal = [0,0];

    processPointsForEdges(chull1, chull2);
    penNormal = penNormal.map(x=>-x);
    processPointsForEdges(chull2, chull1);

    if (leastPenetration>0 && leastPenetration != Number.MAX_VALUE){
        //do collision
        //console.log("TODO collision");
        doCollision(penNormal.map(x=>x*leastPenetration));
    }

    function processPointsForEdges(chullForPoints, chullForEdges){
        
        var edges = chullForEdges.edges;
        var cxsxEdges = [Math.cos(chullForEdges.rotation), Math.sin(chullForEdges.rotation)];

        //transform points into frame of other shape
        var rotationDifference = (chullForPoints.rotation - chullForEdges.rotation); //sign?
        
        var cxsxDifference = [Math.cos(rotationDifference), Math.sin(rotationDifference)];

        var positionDifference = [
            chullForPoints.position[0] - chullForEdges.position[0],
            chullForPoints.position[1] - chullForEdges.position[1]
        ];
        var rotatedPositionDifference = [
            (positionDifference[0]*cxsxEdges[0] + positionDifference[1]*cxsxEdges[1]),
            (positionDifference[1]*cxsxEdges[0] - positionDifference[0]*cxsxEdges[1])
        ]

        var transformedPoints = chullForPoints.points.map(p=>[
            (p[0]*cxsxDifference[0] + p[1]*cxsxDifference[1])+rotatedPositionDifference[0],
            (p[1]*cxsxDifference[0] - p[0]*cxsxDifference[1])+rotatedPositionDifference[1]
        ]);

        for (var ii=0;ii<edges.length;ii++){
            var edge = edges[ii];
            var edgedir = edge.dir;
            var leastFarInThisDirection = Number.MAX_VALUE;
            for (var jj=0;jj<transformedPoints.length;jj++){
                //find transformed point that is least far in this direction.
                var point = transformedPoints[jj];
                var distInEdgeDir = point[0]*edgedir[0] + point[1]*edgedir[1];
                leastFarInThisDirection = Math.min(leastFarInThisDirection, distInEdgeDir);
            }

            var penetration = edge.howFar - leastFarInThisDirection;

            if (penetration<leastPenetration){
                leastPenetration = penetration;
                penNormal = [   //get pen normal in world frame
                    cxsxEdges[0]*edgedir[0] - cxsxEdges[1]*edgedir[1],
                    cxsxEdges[0]*edgedir[1] + cxsxEdges[1]*edgedir[0]
                ]
            }
        }
    }

    function doCollision(pentetrationVector){
        //mostly copy/paste from elsewhere
        var cor = effectiveCor(object1, object2);

        //move shapes apart by this vector
        var totalInvMass = object1.invMass + object2.invMass;
        object1.position[0] -= object1.invMass/totalInvMass * pentetrationVector[0];
        object1.position[1] -= object1.invMass/totalInvMass * pentetrationVector[1];
        object2.position[0] += object2.invMass/totalInvMass * pentetrationVector[0];
        object2.position[1] += object2.invMass/totalInvMass * pentetrationVector[1];

        var dotVecWithPenVec = velocityDifference[0]*pentetrationVector[0] + velocityDifference[1]*pentetrationVector[1];
        if (dotVecWithPenVec<0){return;}

        //impart impulse along this direction
        var separationSq = pentetrationVector[0]*pentetrationVector[0] + pentetrationVector[1]*pentetrationVector[1];

        var cOfMVelocity = [
            (object1.velocity[0]*object2.invMass + object2.velocity[0]*object1.invMass)/(object1.invMass+ object2.invMass),
            (object1.velocity[1]*object2.invMass + object2.velocity[1]*object1.invMass)/(object1.invMass+ object2.invMass)
            ];
            
        //NOTE This is a copy paste from circle-circle collision. positionDifference is swapped out for pentetrationVector. TODO dedupe!

        updateSpeedForObject(object1);
        updateSpeedForObject(object2);

        //friction
        //this is a copy paste of CircleCircle code, but with pentetrationVector instead of positionDifference
        var currentSeparation = Math.sqrt(separationSq);
        var contactNormal = pentetrationVector.map(x=>x/currentSeparation);
        var speedDifferenceAlongNormal = contactNormal[0]*velocityDifference[0] + contactNormal[1]*velocityDifference[1];
        var velocityInTangentDirection = [
            velocityDifference[0] - speedDifferenceAlongNormal*contactNormal[0],
            velocityDifference[1] - speedDifferenceAlongNormal*contactNormal[1]
        ];
        var speedDifferenceInTangentDirection = Math.sqrt(
                velocityInTangentDirection[0]*velocityInTangentDirection[0] + 
                velocityInTangentDirection[1]*velocityInTangentDirection[1]);

        var fractionToRemove = Math.min(1, Math.abs(speedDifferenceAlongNormal)*friction_mu/speedDifferenceInTangentDirection);
            //is abs required? TODO handle speed=zero

        var velocityToRemoveInTangentDirection = velocityInTangentDirection.map(x=>x*fractionToRemove);

        object1.velocity[0]-=velocityToRemoveInTangentDirection[0]*object1.invMass/totalInvMass;
        object1.velocity[1]-=velocityToRemoveInTangentDirection[1]*object1.invMass/totalInvMass;
        object2.velocity[0]+=velocityToRemoveInTangentDirection[0]*object2.invMass/totalInvMass;
        object2.velocity[1]+=velocityToRemoveInTangentDirection[1]*object2.invMass/totalInvMass;



        function updateSpeedForObject(theObject){
            var velInMovingFrame = [
                theObject.velocity[0]- cOfMVelocity[0],
                theObject.velocity[1]- cOfMVelocity[1]
            ];

            var mulltiplier1 = (velInMovingFrame[0]*pentetrationVector[0] + velInMovingFrame[1]*pentetrationVector[1])
                    /separationSq;

            var velInMovingFrameComponentAlongReactionNormal = 
                [pentetrationVector[0]*mulltiplier1, pentetrationVector[1]*mulltiplier1];

            var perpendicularPart = [
                velInMovingFrame[0] - velInMovingFrameComponentAlongReactionNormal[0],
                velInMovingFrame[1] - velInMovingFrameComponentAlongReactionNormal[1],
            ];

            //TODO formulate using impulses instead?
            theObject.velocity = [
                cOfMVelocity[0] + perpendicularPart[0] - cor * velInMovingFrameComponentAlongReactionNormal[0],
                cOfMVelocity[1] + perpendicularPart[1] - cor * velInMovingFrameComponentAlongReactionNormal[1],
            ];
        }

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
        return processPossibleCollisionCircleRectangle(object1, object2);
    }
    if ( (object2.objType == "circle") && (object1.objType == "rect")){
        return processPossibleCollisionCircleRectangle(object2, object1);
    }

    processPossibleCollisionRectRect(object1, object2);
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
    console.log("will do " + iterationsToCatchUp + " iterations" );

    while (iterationsToCatchUp > 0){
        iterationsToCatchUp-=1;

        //move objects
        physicsObjects.forEach((x) => {
            x.position[0] += x.velocity[0];
            x.position[1] += x.velocity[1];
        });

        //collide with level box.
        physicsObjects.forEach((x) => {

            if (x.objType == "rect"){
                //select collision method using if. this could be neater - could have a collision 
                // method defined for each object type (interface, implementation...)

                var cxsx = [Math.cos(x.rotation), Math.sin(x.rotation)].map(Math.abs);

                var rotatedShapeBounds = [
                    x.sideHalfEdges[0]*cxsx[0] + x.sideHalfEdges[1]*cxsx[1],
                    x.sideHalfEdges[1]*cxsx[0] + x.sideHalfEdges[0]*cxsx[1]
                ];

                if (x.position[0]< rotatedShapeBounds[0] && x.velocity[0] <0 ){
                    x.position[0]= rotatedShapeBounds[0];
                    x.velocity[0]=-x.velocity[0]*x.cor;
                }
                if (x.position[1] < rotatedShapeBounds[1] && x.velocity[1] <0 ){
                    x.position[1]= rotatedShapeBounds[1];
                    x.velocity[1]=-x.velocity[1]*x.cor;
                }
                if (x.position[0]> canvas_width -rotatedShapeBounds[0] && x.velocity[0] >0 ){
                    x.position[0]= canvas_width -rotatedShapeBounds[0];
                    x.velocity[0]= -x.velocity[0]*x.cor;
                }
                if (x.position[1]> canvas_height -rotatedShapeBounds[1] && x.velocity[1] >0 ){
                    x.position[1]= canvas_height -rotatedShapeBounds[1];
                    x.velocity[1]= -x.velocity[1]*x.cor;
                }
            }else if (x.objType == "circle"){
                if (x.position[0]< x.radius && x.velocity[0] <0 ){
                    x.position[0]= x.radius;
                    x.velocity[0]=-x.velocity[0]*x.cor;
                }
                if (x.position[1] < x.radius && x.velocity[1] <0 ){
                    x.position[1]= x.radius;
                    x.velocity[1]=-x.velocity[1]*x.cor;
                }
                if (x.position[0]> canvas_width -x.radius && x.velocity[0] >0 ){
                    x.position[0]= canvas_width -x.radius;
                    x.velocity[0]= -x.velocity[0]*x.cor;
                }
                if (x.position[1]> canvas_height -x.radius && x.velocity[1] >0 ){
                    x.position[1]= canvas_height -x.radius;
                    x.velocity[1]= -x.velocity[1]*x.cor;
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
        physicsObjects.forEach((x) => {
            if (x.invDensity!=0){
                x.velocity[1]+=0.01;
            }
        });
    }
    
    //update display
    //ctx.clearRect(0, 0, canvas_width, canvas_height);

    ctx.fillStyle = "#aaa";
    ctx.fillRect(0, 0, canvas_width, canvas_height);

    physicsObjects.forEach((x) => {
        ctx.fillStyle = x.fillStyle;

        //TODO render method per object.
        if (x.objType == "rect"){
            //rotated rectangle
            //apparently it is possible to rotate the canvas context and use regular fillRect, strokeRect for this.
            //TODO just use general poly drawing for this, since rotating the context is ridiculous!
            
            var cxsx = [Math.cos(x.rotation), Math.sin(x.rotation)];
            var positionInRotatedFrame = [
                x.position[0]*cxsx[0] + x.position[1]*cxsx[1],
                x.position[1]*cxsx[0] - x.position[0]*cxsx[1],
            ];

            ctx.rotate(x.rotation);
            ctx.fillRect(
                positionInRotatedFrame[0] - x.sideHalfEdges[0],
                positionInRotatedFrame[1] - x.sideHalfEdges[1],
                2*x.sideHalfEdges[0],
                2*x.sideHalfEdges[1]
                );
            ctx.strokeRect(
                positionInRotatedFrame[0] - x.sideHalfEdges[0],
                positionInRotatedFrame[1] - x.sideHalfEdges[1],
                2*x.sideHalfEdges[0],
                2*x.sideHalfEdges[1]
                );
            ctx.rotate(-x.rotation);

        }else if (x.objType == "circle"){
            ctx.beginPath();
            ctx.arc(x.position[0], x.position[1], x.radius, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
        }
    });
}

