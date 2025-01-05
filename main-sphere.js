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


var globePointsLL = [[-90,0],[90,0]];
for (var la = -80;la<90;la+=10){
    for (var lo = -180; lo<180; lo+=10){
        globePointsLL.push([la,lo]);
    }
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

    for (var ii=0;ii<globePoints3d.length;ii++){
        var ll = globePointsLL[ii];
        var globePoint = globePoints3d[ii];

        var cxsxCameraRotation = [Math.cos(cameraRotation), Math.sin(cameraRotation)];

        var transformedPoint = [
            globePoint[0]*cxsxCameraRotation[0] + globePoint[2]*cxsxCameraRotation[1],
            globePoint[1],
            globePoint[2]*cxsxCameraRotation[0] - globePoint[0]*cxsxCameraRotation[1]
        ];

        if (transformedPoint[2]>0){
            var projectedPoint = [
                canvasHalfsize[0]*(1+ transformedPoint[0]/(transformedPoint[2]*canvasHalfFov[0])) ,
                canvasHalfsize[1]*(1+ transformedPoint[1]/(transformedPoint[2]*canvasHalfFov[1]))
            ];
    
    
            ctx.fillRect(projectedPoint[0]-5,projectedPoint[1]-5,10,10);
    
            ctx.strokeText(`(${ll[0]},${ll[1]})`, projectedPoint[0], projectedPoint[1]);
        }
    }
    //TODO render lines between points.
}


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



var cameraRotation = 0; //TODO store as matrix/quaternion...

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

        if (currentKeyPresses.up){
            cameraRotation = (cameraRotation+0.01)%(Math.PI*2);
        }
    }


    ctx.fillStyle = "#aaa";
    ctx.fillRect(0, 0, canvas_width, canvas_height);

    ctx.fillStyle = "#faa";
    ctx.strokeStyle = "#000";

    drawGlobe();
}