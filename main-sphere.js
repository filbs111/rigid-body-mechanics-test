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


var spaceshipPoints = [[-20,-20], [-20,20], [25,3], [25,-3]];   //triangular spaceship copied from 2d version
//rotate x,y
spaceshipPoints = spaceshipPoints.map( pp => [pp[1],-pp[0]]);

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

    var cameraMat = glMatrix.mat3.fromQuat(glMatrix.mat3.create(), cameraRotation);

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

function drawSpaceship(cameraQuat, objectQuat, objectColor){
    //TODO take orientation as input.
    ctx.strokeStyle = objectColor;

    
    var conjugated = glMatrix.quat.conjugate(glMatrix.quat.create(), objectQuat);
    var relativeQuat = glMatrix.quat.multiply(glMatrix.quat.create(), conjugated, cameraQuat);
    //var relativeQuat = glMatrix.quat.multiply(glMatrix.quat.create(), cameraQuat, conjugated);    //this works fine too!

    var viewMat = glMatrix.mat3.fromQuat(glMatrix.mat3.create(), relativeQuat);

    //take 2d points to be shape projected onto plane (so looks just the same on screen)
    //TODO? store 3d points so can simply rotate.
    //more efficient solution might be to generate some special rotation/projection matrix, but unnecessary.
    var projected3dpoints = spaceshipPoints.map(pp => {
        var pp3 = [pp[0],pp[1],100];
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
    //TODO don't draw when pp[2] is -ve (maybe should create edge list and check start, end points, draw
    //only if poth +ve pp[2]
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



var cameraRotation = glMatrix.quat.create(); 
var otherObjectRotation = glMatrix.quat.create();

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

        var quatToRotate = glMatrix.quat.fromEuler(glMatrix.quat.create(), -0.1*upness ,0.1*leftness,0.1*spinness);

            //note this version of glmatrix is very strange/verbose/confusing. perhaps for performance reasons. TODO wrap to make more readable? use older? write own?
        glMatrix.quat.multiply(cameraRotation, quatToRotate, cameraRotation);
        //cameraRotation.multiply(quatToRotate);  //TODO make into OO style?
    }


    ctx.fillStyle = "#aaa";
    ctx.fillRect(0, 0, canvas_width, canvas_height);

    drawGlobe();

    drawSpaceship(cameraRotation,cameraRotation,"#0fa");    //player spaceship
    drawSpaceship(cameraRotation,otherObjectRotation,"#fa0");
}