

var value=0;
var d=100;

function test(start,stop) {
    var dd=(stop-start)/d;
    if(Math.abs(stop-start)>180){
        dd=(360-Math.abs(stop-start))/d;
        if(stop<start){
            value=value+dd>360?(value+dd)-360:value+dd;
        }else {
            value=value-dd<0?360+(value-dd):value-dd;
        }
    }else {
        value=value+dd;
    }
}

value=350;
for(var i=0;i<250;i++){
    test(350,50);
    console.log(value)
}