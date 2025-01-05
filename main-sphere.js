var canvas = document.getElementById("myCanvas");
var canvas_width = 800;
var canvas_height = 800;
canvas.width = canvas_width;
canvas.height = canvas_height;
var ctx = canvas.getContext("2d");


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

        var transformedPoint = globePoint;  //TODO rotate

        if (transformedPoint[2]>0){
            var projectedPoint = [
                canvasHalfsize[0]*(1+ globePoint[0]/(globePoint[2]*canvasHalfFov[0])) ,
                canvasHalfsize[1]*(1+ globePoint[1]/(globePoint[2]*canvasHalfFov[1]))
            ];
    
    
            ctx.fillRect(projectedPoint[0]-5,projectedPoint[1]-5,10,10);
    
            ctx.strokeText(`(${ll[0]},${ll[1]})`, projectedPoint[0], projectedPoint[1]);
        }
    }
    //TODO render lines between points.
}


requestAnimationFrame(updateAndRender);

function updateAndRender(timestamp){
    requestAnimationFrame(updateAndRender);

    ctx.fillStyle = "#aaa";
    ctx.fillRect(0, 0, canvas_width, canvas_height);

    ctx.fillStyle = "#faa";
    ctx.strokeStyle = "#000";

    drawGlobe();
}