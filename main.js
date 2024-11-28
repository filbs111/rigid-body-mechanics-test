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
addPhysicsObject({
    position: [350,300],
    velocity: [-1,0],
    objType: "circle",
    radius: 40,
    cor: 0.6,
    invDensity: 1,
    fillStyle: "blue"
});

function processPossibleCollision(object1, object2){

    //temp -no collision for circles yet
    if ( (object1.objType == "circle") || (object2.objType == "circle")){
        return;
    }

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
        var effectiveCorR = Math.min(object1.cor, object2.cor); //TODO does this make sense?

        if (separation[0]>separation[1]){
            //momentum = m1v1 + m1v2. centre of mass speed = (m1v1+m2v2)/(m1+m2)
            // = (v1/m2 + v2/m1)/(1/m1 + 1/m2)
            if (positionDifference[0]*velocityDifference[0]<0){
                var cOfMSpeed = (object1.velocity[0]*object2.invMass + object2.velocity[0]*object1.invMass)/(object1.invMass+ object2.invMass);
                object1.velocity[0] = (1+effectiveCorR)* cOfMSpeed - effectiveCorR*object1.velocity[0];
                object2.velocity[0] = (1+effectiveCorR)* cOfMSpeed - effectiveCorR*object2.velocity[0];
            }
        }else{
            if (positionDifference[1]*velocityDifference[1]<0){
                var cOfMSpeed = (object1.velocity[1]*object2.invMass + object2.velocity[1]*object1.invMass)/(object1.invMass+ object2.invMass);
                object1.velocity[1] = (1+effectiveCorR)* cOfMSpeed - effectiveCorR*object1.velocity[1];
                object2.velocity[1] = (1+effectiveCorR)* cOfMSpeed - effectiveCorR*object2.velocity[1];
            }
        }

    }
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

