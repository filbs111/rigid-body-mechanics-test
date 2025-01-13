var canvas = document.getElementById("myCanvas");
var canvas_width = 900;
var canvas_height = 900;
canvas.width = canvas_width;
canvas.height = canvas_height;
var ctx = canvas.getContext("2d");

var currentTime = null;
var physStepTime = 3;   //phys step every 3 ms.
var physTimeToCatchUp = 0;
var maxIterationsPerDraw = 10;

function glMatVec3from2dPoint(inputVec, zVal){
    return glMatrix.vec3.fromValues(inputVec[0], inputVec[1], zVal);
}

function createShapeData(inputPoints){
    //rotate x,y
    var points = inputPoints.map( pp => [pp[1],-pp[0]].map(xx => xx*0.007));
    //find point furthest from 0,0 to determine bounding circle size
    var boundingCircleRad = Math.sqrt(Math.max.apply(null,points.map(x=>x[0]*x[0]+x[1]*x[1])));

    var edgeNormals = [];
    var previousPoint = glMatVec3from2dPoint(points[points.length-1],1);
    for (var ii=0;ii<points.length; ii++){
        var currentPoint = glMatVec3from2dPoint(points[ii], 1);

        var edgeNormalDirection = glMatrix.vec3.cross(glMatrix.vec3.create(), previousPoint, currentPoint);
        edgeNormals.push(edgeNormalDirection);
            //NOTE not yet normalised. unnecessary for simple which side of plane testing

        //NOTE this calculation might be done more efficiently using custom maths because know that 
        //zvals input always zero so some terms may cancel.
        //partial custom code:
        /*var difference = [
            currentPoint[0] - previousPoint[0],
            currentPoint[1] - previousPoint[1],
        ];
        var unprojectedEdgeNormal = [difference[1], -difference[0]];    //TODO normalise?
        var unprojectedEdgeNormalDotWithPoint = 
            unprojectedEdgeNormal[0]*currentPoint[0]+
            unprojectedEdgeNormal[1]*currentPoint[1];
        */
        
        previousPoint = currentPoint;
    }

    return {
        points,
        boundingCircleRad,
        boundingCircleAngle: Math.atan(boundingCircleRad),
        edgeNormals
    };
}

var spaceshipShape = createShapeData([[-20,-20], [-20,20], [25,3], [25,-3]]);   //triangular spaceship copied from 2d version
var asteroidShape = createShapeData([[-25,-20], [-20,20], [10,20], [20,0], [20,-20]]);

function createObject(shape){
    return {
        shape,
        quat: glMatrix.quat.create(),
        simpleMechanics: {
            angVel:0,
            localVelocity:[0,0]
        },
        properMechanics: {
            momentum: glMatrix.vec3.create(),     //(angular momentum) in world frame, conserved
            invMass: [0.1,0.1,1]   //moment of inertia tensor diag matrix components
                                    //sum of point masses times distance from origin in each direction, inverted
        }
    }
}

var playerObject = createObject(spaceshipShape);
var otherObject = createObject(asteroidShape);

var globePointsLL = [[-90,0],[90,0]];
for (var la = -80;la<90;la+=10){
    for (var lo = -180; lo<180; lo+=10){
        globePointsLL.push([la,lo]);
    }
}
var globeEdges = [];
//note lines of latitude project to straight lines so don't have to be in so many bits
for (var lo = -180, xx=0; lo<180; lo+=10, xx++){
    globeEdges.push([0,2+xx]);          //lines of latitude touching poles
    globeEdges.push([1,578+xx]);    //16*36+2
}
for (var la = -80, xx=0;la<80;la+=10, xx++){
    for (var lo = -180, yy=0; lo<180; lo+=10, yy++){
        globeEdges.push([2+36*xx+yy,2+36*(xx+1)+yy]); //lines of latitude
    }
}
for (var la = -80, xx=0;la<90;la+=10, xx++){
    for (var lo = -180, yy=0; lo<170; lo+=10, yy++){
        globeEdges.push([2+36*xx+yy,2+36*xx+yy+1]); //lines of latitude
    }
    globeEdges.push([2+36*xx,2+36*xx+35]);
}

var globePoints3d = globePointsLL.map(ll => {
    var lat = ll[0]*Math.PI/180;
    var lon = ll[1]*Math.PI/180;
    return [Math.cos(lat)*Math.cos(lon), Math.sin(lat), Math.cos(lat)*Math.sin(lon)];
});

var canvasHalfsize = [canvas.width/2, canvas.height/2];
var canvasHalfFov = [2,2];  //centre top of screen is atan(2) from centre

function drawGlobe(){
    //for current world orientation,
    //render lat, long points

    var cameraMat = glMatrix.mat3.fromQuat(glMatrix.mat3.create(), playerObject.quat);

    var transformedPoints = globePoints3d.map( globePoint=> {
        var globePointVec = glMatrix.vec3.create();
        globePointVec[0] = globePoint[0];
        globePointVec[1] = globePoint[1];
        globePointVec[2] = globePoint[2];

        return glMatrix.vec3.transformMat3(glMatrix.vec3.create(), globePointVec, cameraMat);
    });

    ctx.fillStyle = "#faa";
    ctx.strokeStyle = "#000";

    for (var ii=0;ii<globePoints3d.length;ii++){
        var ll = globePointsLL[ii];

        var transformedPoint = transformedPoints[ii];

        if (transformedPoint[2]>0){
            var projectedPoint = [
                canvasHalfsize[0]*(1+ transformedPoint[0]/(transformedPoint[2]*canvasHalfFov[0])) ,
                canvasHalfsize[1]*(1+ transformedPoint[1]/(transformedPoint[2]*canvasHalfFov[1]))
            ];
    
            ctx.fillRect(projectedPoint[0]-5,projectedPoint[1]-5,10,10);
    
            ctx.strokeText(`(${ll[0]},${ll[1]})`, projectedPoint[0], projectedPoint[1]);
        }
    }

    ctx.strokeStyle = "#fff";

    for (var ii=0;ii<globeEdges.length;ii++){

        var globeEdge = globeEdges[ii];
        var transformedPointFrom = transformedPoints[globeEdge[0]];
        var transformedPointTo = transformedPoints[globeEdge[1]];

        if (transformedPointFrom[2]>0 && transformedPointTo[2]>0){
            var projectedPointFrom = [
                canvasHalfsize[0]*(1+ transformedPointFrom[0]/(transformedPointFrom[2]*canvasHalfFov[0])) ,
                canvasHalfsize[1]*(1+ transformedPointFrom[1]/(transformedPointFrom[2]*canvasHalfFov[1]))
            ];
            var projectedPointTo = [
                canvasHalfsize[0]*(1+ transformedPointTo[0]/(transformedPointTo[2]*canvasHalfFov[0])) ,
                canvasHalfsize[1]*(1+ transformedPointTo[1]/(transformedPointTo[2]*canvasHalfFov[1]))
            ];
    
            ctx.beginPath();
            ctx.moveTo(projectedPointFrom[0], projectedPointFrom[1]);
            ctx.lineTo(projectedPointTo[0], projectedPointTo[1]);
            ctx.stroke();
        }
    }
}

function drawObjectByPoints(cameraQuat, objectToDraw, objectColor){
    ctx.strokeStyle = objectColor;
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    
    var conjugated = glMatrix.quat.conjugate(glMatrix.quat.create(), objectToDraw.quat);
    var relativeQuat = glMatrix.quat.multiply(glMatrix.quat.create(), cameraQuat, conjugated);
    var viewMat = glMatrix.mat3.fromQuat(glMatrix.mat3.create(), relativeQuat);

    //take 2d points to be shape projected onto plane (so looks just the same on screen)
    //TODO? store 3d points so can simply rotate.
    //more efficient solution might be to generate some special rotation/projection matrix, but unnecessary.
    var projected3dpoints = objectToDraw.shape.points.map(pp => {
        var pp3 = [pp[0],pp[1],1];
        var length = Math.sqrt(pp3[0]*pp3[0] + pp3[1]*pp3[1] + pp3[2]*pp3[2]);
        return pp3.map(cc => cc/length);
    });

    var rotatedPoints = projected3dpoints.map(pp => 
        glMatrix.vec3.transformMat3(glMatrix.vec3.create(), pp, viewMat)
    );

    var pointsOnScreen = rotatedPoints.map(pp => [
            canvasHalfsize[0]* (1+ pp[0]/(pp[2]*canvasHalfFov[0])),
            canvasHalfsize[1]* (1+ pp[1]/(pp[2]*canvasHalfFov[1])),
            pp[2]>0
        ]
    );

    ctx.beginPath();
    var point = pointsOnScreen[pointsOnScreen.length-1];
    var lastPointPositive = point[2];

    ctx.moveTo(point[0], point[1]);
    for (var ii=0;ii<pointsOnScreen.length;ii++){
        point = pointsOnScreen[ii];
        if (lastPointPositive && point[2]){
            ctx.lineTo(point[0], point[1]);
        }else{
            ctx.moveTo(point[0], point[1]); //assume that lines positive and negative points are outside view
        }
        lastPointPositive=point[2];
    }
    ctx.stroke();
    ctx.fill();
    //TODO don't draw when pp[2] is -ve (maybe should create edge list and check start, end points, draw
    //only if poth +ve pp[2]
}

function drawBoundingCircle(cameraQuat, objectToDrawCircleFor, sphereColor){
    //note sphereRadius is circle radius before projection onto sphere towards sphere centre.
    //TODO dedupe code with object drawing

    var objectQuat = objectToDrawCircleFor.quat;
    var circleRadius = objectToDrawCircleFor.shape.boundingCircleRad;

    ctx.strokeStyle = sphereColor;
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    
    var conjugated = glMatrix.quat.conjugate(glMatrix.quat.create(), objectQuat);
    var relativeQuat = glMatrix.quat.multiply(glMatrix.quat.create(), cameraQuat, conjugated);
    var viewMat = glMatrix.mat3.fromQuat(glMatrix.mat3.create(), relativeQuat);

    var projected3dpoints=[];
    for (var ii=0;ii<32;ii++){
        var ang = Math.PI*ii/16;
        var pp3 = [Math.cos(ang),Math.sin(ang),1/circleRadius];
        var length = Math.sqrt(pp3[0]*pp3[0] + pp3[1]*pp3[1] + pp3[2]*pp3[2]);
        projected3dpoints.push(pp3.map(cc => cc/length));
    }

    var rotatedPoints = projected3dpoints.map(pp => 
        glMatrix.vec3.transformMat3(glMatrix.vec3.create(), pp, viewMat)
    );

    var pointsOnScreen = rotatedPoints.map(pp => [
            canvasHalfsize[0]* (1+ pp[0]/(pp[2]*canvasHalfFov[0])),
            canvasHalfsize[1]* (1+ pp[1]/(pp[2]*canvasHalfFov[1])),
            pp[2]>0
        ]
    );

    ctx.beginPath();
    var point = pointsOnScreen[pointsOnScreen.length-1];
    var lastPointPositive = point[2];

    ctx.moveTo(point[0], point[1]);
    for (var ii=0;ii<pointsOnScreen.length;ii++){
        point = pointsOnScreen[ii];
        if (lastPointPositive && point[2]){
            ctx.lineTo(point[0], point[1]);
        }else{
            ctx.moveTo(point[0], point[1]); //assume that lines positive and negative points are outside view
        }
        lastPointPositive=point[2];
    }
    ctx.stroke();
    ctx.fill();
}


var currentKeyPresses={
    left:false,
    right:false,
    up:false,
    down:false,
    caretleft:false,
    caretright:false
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
        case 188:
            currentKeyPresses.caretleft=true;
            break;
        case 190:
            currentKeyPresses.caretright=true;
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
        case 188:
            currentKeyPresses.caretleft=false;
            break;
        case 190:
            currentKeyPresses.caretright=false;
            break;
    }
});

//for stepping physics engine.
currentTime = window.performance.now();
console.log("initial time = " + currentTime);
requestAnimationFrame(updateAndRender);

function updateAndRender(timestamp){
    requestAnimationFrame(updateAndRender);

    var timeDifference = timestamp - currentTime;
    currentTime = timestamp;

    physTimeToCatchUp += timeDifference;

    var iterationsToCatchUp = Math.floor(physTimeToCatchUp/physStepTime);

    physTimeToCatchUp-=iterationsToCatchUp*physStepTime;

    //cap iterations
    if (iterationsToCatchUp>maxIterationsPerDraw){
        iterationsToCatchUp=maxIterationsPerDraw;
        physTimeToCatchUp=0;
    }

    while (iterationsToCatchUp > 0){
        iterationsToCatchUp-=1;

        var upness = (currentKeyPresses.up ? 1:0) - (currentKeyPresses.down ? 1:0);
        var leftness = (currentKeyPresses.left ? 1:0) - (currentKeyPresses.right ? 1:0);
        var spinness = (currentKeyPresses.caretleft ? 1:0) - (currentKeyPresses.caretright ? 1:0);

        var physicsModel = document.getElementById("physicsSelection").value;

        switch (physicsModel){
            case "off":
                //basic no physics, direct object rotation
                var quatToRotate = glMatrix.quat.fromEuler(glMatrix.quat.create(), -0.1*upness ,0.1*leftness,0.1*spinness);

                //note this version of glmatrix is very strange/verbose/confusing. perhaps for performance reasons. TODO wrap to make more readable? use older? write own?
                glMatrix.quat.multiply(playerObject.quat, quatToRotate, playerObject.quat);
                break;
            case "basic1":
                //basic physics - works like simple flat space - scalar angular of velocity and local 2d velocity with no coupling
                // guess equivalent to "proper physics" where object much smaller than world sphere, (and? with equal principal axes - eg square not rectangle)
                // likely works about same as "proper physics" when there is any damping to object "local" angular velocity (ie not damping to its "speed")

                //basic1
                //"local" rotation is still under direct control (button press turns at constant rate)
                //what seems like "linear" motion of object has momentum. no coupling between "local" rotation and this.
                playerObject.simpleMechanics.angVel = 0.01*spinness;
                updatePhysicsBasic();
                break;
            case "basic2":
                //like basic but "local" angular velocity instead of direct rotation. still uncoupled to other rotation ("speed")
                playerObject.simpleMechanics.angVel+= 0.0001*spinness;
                updatePhysicsBasic();
                break;
            case "proper":
                //proper physics - basically 3d rotation.

                //angular momentum in world frame is conserved.
                var relativeMat = glMatrix.mat3.fromQuat(glMatrix.mat3.create(), playerObject.quat);
                var relativeMatInverse = glMatrix.mat3.invert(glMatrix.mat3.create(),relativeMat);
                    //NOTE creating both for rotation back and forth is inefficient, but not sure how to otherwise with lib

                //convert to object frame
                var localFrameMomentum = glMatrix.vec3.transformMat3(glMatrix.vec3.create(), 
                    playerObject.properMechanics.momentum, relativeMat);

                //add angular momentum using inputs
                var momentumToAdd = glMatrix.vec3.fromValues(-0.01*upness ,0.01*leftness,0.005*spinness);
                glMatrix.vec3.add(localFrameMomentum, localFrameMomentum, momentumToAdd);

                //update world frame angular momentum
                playerObject.properMechanics.momentum = glMatrix.vec3.transformMat3(
                    playerObject.properMechanics.momentum,
                    localFrameMomentum,
                    relativeMatInverse);

                //convert local angular momentum to local angular velocity
                //TODO use appropriate moment of inertia
                //var multiplier = glMatrix.vec3.fromValues(0.1,0.1,1); //guess... this gets something like basic
                var multiplier = glMatrix.vec3.fromValues(0.05,0.1,1); //this gets tennis raquet effect

                var localAngularVelocity = glMatrix.vec3.multiply(glMatrix.vec3.create(), 
                    multiplier,
                    localFrameMomentum);

                //apply rotation
                var quatToRotate = glMatrix.quat.fromEuler(glMatrix.quat.create(), 
                    localAngularVelocity[0], localAngularVelocity[1], localAngularVelocity[2]);

                glMatrix.quat.multiply(playerObject.quat, quatToRotate, playerObject.quat);

                console.log({
                    relativeMat,
                    relativeMatInverse,
                    localFrameMomentum,
                    momentumToAdd,
                    localAngularVelocity
                });

                break;
        }

        function updatePhysicsBasic(){
            var localVelocity = playerObject.simpleMechanics.localVelocity;
            localVelocity[0]+=-0.001*upness;
            localVelocity[1]-=-0.001*leftness;

            var turnAng = playerObject.simpleMechanics.angVel;
            var sinacosa = [Math.sin(turnAng), Math.cos(turnAng)];
            var quatToRotate = glMatrix.quat.fromEuler(glMatrix.quat.create(), localVelocity[0], localVelocity[1], turnAng*180/Math.PI);
            
            var tmp = localVelocity[0]*sinacosa[1] - localVelocity[1]*sinacosa[0];
            localVelocity[1] = localVelocity[1]*sinacosa[1] + localVelocity[0]*sinacosa[0];
            localVelocity[0] = tmp;
            
            glMatrix.quat.multiply(playerObject.quat, quatToRotate, playerObject.quat);
        }
    }


    ctx.fillStyle = "#aaa";
    ctx.fillRect(0, 0, canvas_width, canvas_height);

    drawGlobe();

    var angleBetweenPoints = angleBetweenPositionsFromQuats(playerObject.quat,otherObject.quat);
    console.log(angleBetweenPoints);
    var boundingCircleColor = angleBetweenPoints > playerObject.shape.boundingCircleAngle+otherObject.shape.boundingCircleAngle ? "#0af" : "#f00";

    drawBoundingCircle(playerObject.quat,playerObject,boundingCircleColor);
    drawBoundingCircle(playerObject.quat,otherObject,boundingCircleColor);

    var objectsAreOverlappingResult = objectsAreOverlapping(playerObject, otherObject);
    var objectsDrawColor= objectsAreOverlappingResult? "#f11": "#0fa";

    drawObjectByPoints(playerObject.quat,playerObject,objectsDrawColor);    //player spaceship
    drawObjectByPoints(playerObject.quat,otherObject,objectsDrawColor);
}

document.getElementById("dropSpaceshipButton").addEventListener("click", evt => {
    glMatrix.quat.copy(otherObject.quat, playerObject.quat);
});

function angleBetweenPositionsFromQuats(quat_a,quat_b){
    var unrotatedVec = glMatrix.vec3.fromValues(0,0,1);

    var quat_a_conjugated = glMatrix.quat.conjugate(glMatrix.quat.create(), quat_a);
    var quat_b_conjugated = glMatrix.quat.conjugate(glMatrix.quat.create(), quat_b);
        //this is ugly! can it be done more nicely within glmatrix? by storing conjugated quat instead, 
        //perhaps swapping quat multiplications elsewhere?

    var vec_a = glMatrix.vec3.transformQuat(glMatrix.vec3.create(), unrotatedVec, quat_a_conjugated);
    var vec_b = glMatrix.vec3.transformQuat(glMatrix.vec3.create(), unrotatedVec, quat_b_conjugated);

    return glMatrix.vec3.angle(vec_a, vec_b);
}

function objectsAreOverlapping(objectA, objectB){
    return objectHasPointInsideOtherObject(objectA, objectB) || objectHasPointInsideOtherObject(objectB, objectA);
}

function objectHasPointInsideOtherObject(objectForPoints, otherObject){
    //get points of objectB in frame of objectA 
    // each edge of objectA determines a plane through it and sphere origin.
    // a point of objectB is inside objectB if it is inside all these planes.
        
    //calculate relative SO3
    var conjugated = glMatrix.quat.conjugate(glMatrix.quat.create(), objectForPoints.quat);
    var relativeQuat = glMatrix.quat.multiply(glMatrix.quat.create(), otherObject.quat, conjugated);
    var relativeMat = glMatrix.mat3.fromQuat(glMatrix.mat3.create(), relativeQuat);

    var transformedPoints = objectForPoints.shape.points
        .map(point => glMatrix.vec3.fromValues(point[0],point[1],1) )  //TODO precalc
        .map(point => glMatrix.vec3.transformMat3(glMatrix.vec3.create(), point, relativeMat));
    
    var pointsInsideResults = transformedPoints.map(pointIsInsideObject);

    return anyArrayElementTrue(pointsInsideResults);

    function pointIsInsideObject(point){
        if (point[2]<0) {return false;}
            //because all objects are projected from 2d, restricted to hemisphere.
            //this is in practice pointless/wasteful check when combined with bounding sphere intersection test
            //and objects small

        return !anyArrayElementTrue(otherObject.shape.edgeNormals.map(pointOutsideEdgePlane));

        function pointOutsideEdgePlane(norm){
            return norm[0]*point[0] + norm[1]*point[1] + norm[2]*point[2] > 0;    //dot prod
        }
    }
}

function anyArrayElementTrue(someArray){
    return someArray.reduce((aggregate, current)=> aggregate || current, false);
}