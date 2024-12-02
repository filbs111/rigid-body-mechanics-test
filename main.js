//simple no rotation 2D mechanics.
//inspired by reading 1st randy gaul article

var canvas = document.getElementById("myCanvas");
var ctx = canvas.getContext("2d");

var currentTime = null;
var physStepTime = 3;   //phys step every 3 ms.
var physTimeToCatchUp = 0;

var physicsObjects = [];

//TODO use classes ! 
function addPhysicsObject(theObject){
    var objArea = theObject.objType == "rect" ? (theObject.sideHalfEdges[0] * theObject.sideHalfEdges[1]) : Math.PI * theObject.radius * theObject.radius;
    theObject.invMass = theObject.invDensity / objArea;
    physicsObjects.push(theObject);
}

addPhysicsObject({
    position: [200,100],
    velocity: [0.3,1],
    objType: "rect",
    sideHalfEdges: [20,30],
    cor: 0.6,
    invDensity: 1,
    fillStyle: "red"
});
addPhysicsObject({
    position: [210,30],
    velocity: [0.3,1],
    objType: "rect",
    sideHalfEdges: [20,25],
    cor: 0.6,
    invDensity: 1,
    fillStyle: "green"
});
addPhysicsObject({
    position: [100,100],
    velocity: [0,0],
    objType: "rect",
    sideHalfEdges: [10,10],
    cor: 0.6,
    invDensity:1,
    fillStyle: "magenta"
});
addPhysicsObject({
    position: [300,300],
    velocity: [0,0],
    objType: "rect",
    sideHalfEdges: [40,40],
    cor: 0.6,
    invDensity: 0,
    fillStyle: "black"
});

for (var ii=0;ii<10;ii++){
    addPhysicsObject({
        position: [50,20+40*ii],
        velocity: [0,0],
        //objType: "rect",
        //sideHalfEdges: [20,20],
        objType: "circle",
        radius: 15,
        cor: 0.6,
        invDensity: 1,
        fillStyle: `rgba(32, 45, ${ii*25}, 255)`
    });
}

//CIRCLES
addPhysicsObject({
    position: [400,50],
    velocity: [-1,0],
    objType: "circle",
    radius: 40,
    cor: 0.6,
    invDensity: 1,
    fillStyle: "purple"
});
addPhysicsObject({
    position: [200,50],
    velocity: [1,0],
    objType: "circle",
    radius: 50,
    cor: 0.6,
    invDensity: 1,
    fillStyle: "cyan"
});
addPhysicsObject({
    position: [200,50],
    velocity: [0,-0.5],
    objType: "circle",
    radius: 20,
    cor: 0.6,
    invDensity: 1,
    fillStyle: "orange"
});
addPhysicsObject({
    position: [450,50],
    velocity: [-0.5,0],
    objType: "circle",
    radius: 10,
    cor: 0.6,
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

                //TODO move objects apart!

            updateSpeedForObject(object1);
            updateSpeedForObject(object2);

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
    var positionSigns = positionDifference.map(x=> x/(Math.abs(x)+0.0000000001));  //NOTE hack to handle zeros

    var velocityDifference = [
        object1.velocity[0] - object2.velocity[0],
        object1.velocity[1] - object2.velocity[1]
    ];

    //calculate penetration vector / vector of minimum movement to separate shapes
    var absPosDifference = positionDifference.map(Math.abs);
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

    function doCollision(pentetrationVector){
        
        var dotVecWithPenVec = velocityDifference[0]*pentetrationVector[0] + velocityDifference[1]*pentetrationVector[1];
        if (dotVecWithPenVec<0){return;}
        
        //move shapes apart by this vector
        var totalInvMass = object1.invMass + object2.invMass;
        object1.position[0] -= object1.invMass/totalInvMass * pentetrationVector[0];
        object1.position[1] -= object1.invMass/totalInvMass * pentetrationVector[1];
        object2.position[0] += object2.invMass/totalInvMass * pentetrationVector[0];
        object2.position[1] += object2.invMass/totalInvMass * pentetrationVector[1];


        //impart impulse along this direction
        var separationSq = pentetrationVector[0]*pentetrationVector[0] + pentetrationVector[1]*pentetrationVector[1];

        var cOfMVelocity = [
            (object1.velocity[0]*object2.invMass + object2.velocity[0]*object1.invMass)/(object1.invMass+ object2.invMass),
            (object1.velocity[1]*object2.invMass + object2.velocity[1]*object1.invMass)/(object1.invMass+ object2.invMass)
            ];
            
        //NOTE This is a copy paste from circle-circle collision. positionDifference is swapped out for pentetrationVector. TODO dedupe!

        updateSpeedForObject(object1);
        updateSpeedForObject(object2);

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
    var totalHalfLengths = [
        object1.sideHalfEdges[0] + object2.sideHalfEdges[0], 
        object1.sideHalfEdges[1] + object2.sideHalfEdges[1]
    ];

    //initially just detect collision, trade velocities (correct if masses are same)
    //TODO make correct for correct masses, use cOR

    var positionDifference = [
        object1.position[0] - object2.position[0],
        object1.position[1] - object2.position[1]
    ];
    var velocityDifference = [
        object1.velocity[0] - object2.velocity[0],
        object1.velocity[1] - object2.velocity[1]
    ];

    var separation = [
        Math.abs(positionDifference[0]) - totalHalfLengths[0],
        Math.abs(positionDifference[1]) - totalHalfLengths[1]
    ];

    if (separation[0]<0 && separation[1]<0){
        //is colliding
        var cor = effectiveCor(object1, object2);
        var totalInvMass = object1.invMass + object2.invMass;

        if (separation[0]>separation[1]){
            //momentum = m1v1 + m1v2. centre of mass speed = (m1v1+m2v2)/(m1+m2)
            // = (v1/m2 + v2/m1)/(1/m1 + 1/m2)
            if (positionDifference[0]*velocityDifference[0]<0){
                var cOfMSpeed = (object1.velocity[0]*object2.invMass + object2.velocity[0]*object1.invMass)/(object1.invMass+ object2.invMass);
                object1.velocity[0] = (1+cor)* cOfMSpeed - cor*object1.velocity[0];
                object2.velocity[0] = (1+cor)* cOfMSpeed - cor*object2.velocity[0];

                //move objects apart
                if (positionDifference[0]>0){
                    object1.position[0]-= separation[0] * object1.invMass/totalInvMass;
                    object2.position[0]+= separation[0] * object2.invMass/totalInvMass;
                }else{
                    object1.position[0]+= separation[0] * object1.invMass/totalInvMass;
                    object2.position[0]-= separation[0] * object2.invMass/totalInvMass;
                }
            }
        }else{
            if (positionDifference[1]*velocityDifference[1]<0){
                var cOfMSpeed = (object1.velocity[1]*object2.invMass + object2.velocity[1]*object1.invMass)/(object1.invMass+ object2.invMass);
                object1.velocity[1] = (1+cor)* cOfMSpeed - cor*object1.velocity[1];
                object2.velocity[1] = (1+cor)* cOfMSpeed - cor*object2.velocity[1];
            }

             //move objects apart
             if (positionDifference[1]>0){
                object1.position[1]-= separation[1] * object1.invMass/totalInvMass;
                object2.position[1]+= separation[1] * object2.invMass/totalInvMass;
            }else{
                object1.position[1]+= separation[1] * object1.invMass/totalInvMass;
                object2.position[1]-= separation[1] * object2.invMass/totalInvMass;
            }


        }

    }
};


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

    physTimeToCatchUp += timeDifference;

    //TODO cap iterations.
    while (physTimeToCatchUp > 0){
        physTimeToCatchUp-=physStepTime;

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

                if (x.position[0]< x.sideHalfEdges[0] && x.velocity[0] <0 ){
                    x.position[0]= x.sideHalfEdges[0];
                    x.velocity[0]=-x.velocity[0]*x.cor;
                }
                if (x.position[1] < x.sideHalfEdges[1] && x.velocity[1] <0 ){
                    x.position[1]= x.sideHalfEdges[1];
                    x.velocity[1]=-x.velocity[1]*x.cor;
                }
                if (x.position[0]> 500 -x.sideHalfEdges[0] && x.velocity[0] >0 ){
                    x.position[0]= 500 -x.sideHalfEdges[0];
                    x.velocity[0]= -x.velocity[0]*x.cor;
                }
                if (x.position[1]> 500 -x.sideHalfEdges[1] && x.velocity[1] >0 ){
                    x.position[1]= 500 -x.sideHalfEdges[1];
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
                if (x.position[0]> 500 -x.radius && x.velocity[0] >0 ){
                    x.position[0]= 500 -x.radius;
                    x.velocity[0]= -x.velocity[0]*x.cor;
                }
                if (x.position[1]> 500 -x.radius && x.velocity[1] >0 ){
                    x.position[1]= 500 -x.radius;
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
    ctx.clearRect(0, 0, 500, 500);
    physicsObjects.forEach((x) => {
        ctx.fillStyle = x.fillStyle;

        //TODO render method per object.
        if (x.objType == "rect"){
            ctx.fillRect(
                x.position[0] - x.sideHalfEdges[0],
                x.position[1] - x.sideHalfEdges[1],
                2*x.sideHalfEdges[0],
                2*x.sideHalfEdges[1]
                );
        }else if (x.objType == "circle"){
            ctx.beginPath();
            ctx.arc(x.position[0], x.position[1], x.radius, 0, 2 * Math.PI);
            ctx.fill();
        }
    });
}

