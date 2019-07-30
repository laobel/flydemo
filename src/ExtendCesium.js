/**
 * Created by XBC on 2017/7/12.
 */
var SimplyRoam = (function() {
    function _(viewer, options) {
        if (!Cesium.defined(viewer)) {
            throw new Cesium.DeveloperError("viewer is required!");
        }

        this._viewer = viewer;
        this._ellipsoid = this._viewer.scene.globe.ellipsoid;

        this._viewer.scene.globe.depthTestAgainstTerrain = true;

        this.trackTargets=[];

        this.routes=[];


        this._tempLineOptions = Cesium.defined(options) && Cesium.defined(options.tempLineOptions) ? options.tempLineOptions : {};

    }

    _.prototype.getTrackTargetById = function(id) {
        var trackTarget = undefined;
        for (var key in this.trackTargets) {
            if (this.trackTargets[key].id === id) {
                trackTargets = this.trackTargets[key];
                break;
            }
        }

        return trackTarget;
    };
    _.prototype.removeRoute=function(id) {
        var route;
        if(Cesium.defined(id)){
            for (var i=0;i< this.routes.length;i++) {
                route=this.routes[i];
                if(route.id===id){
                    this._viewer.entities.remove(route.line);
                    this._viewer.entities.remove(route.icon);

                    this.routes.splice(i,1);

                    break;
                }
            }
        }else {
            for (var key in this.routes) {
                route=this.trackTargets[key];
                if(Cesium.defined(route)){
                    this._viewer.entities.remove(route.line);
                    this._viewer.entities.remove(route.icon);
                }
            }
        }

    };

    _.prototype.removeTrackTarget=function(id) {
        var trackTarget;
        if(Cesium.defined(id)){
            for (var i=0;i< this.trackTargets.length;i++) {
                trackTarget=this.trackTargets[i];
                if(trackTarget.id===id){
                    this._viewer.entities.remove(trackTarget.line);
                    this._viewer.entities.remove(trackTarget.icon);
                    this._viewer.entities.remove(trackTarget.track);

                    this.trackTargets.splice(i,1);

                    break;
                }
            }
        }else {
            for (var key in this.trackTargets) {
                trackTarget=this.trackTargets[key];
                if(Cesium.defined(trackTarget)){
                    this._viewer.entities.remove(trackTarget.line);
                    this._viewer.entities.remove(trackTarget.icon);
                    this._viewer.entities.remove(trackTarget.track);
                }
            }
        }

    };

    var trackTargetDefaultOptions = {
        id : undefined,
        name : "",
        icon : {
            model : {
                uri: './img/Cesium_Air.gltf',
                minimumPixelSize : 64,
                maximumScale : 20000
            }
        },
        line : {
            polyline : {
                material : new Cesium.PolylineGlowMaterialProperty({
                    glowPower : 0.1,
                    color : Cesium.Color.YELLOW
                }),
                width : 10
            }
        },
        track : {
            show : true,
            point : {
                pixelSize : 10,
                color : Cesium.Color.RED
            },
        }
    };
    _.TrackTarget=(function() {
        function _(simplyRoam,options,positions) {
            if (!Cesium.defined(simplyRoam)) {
                throw new Cesium.DeveloperError("simplyRoam is required!");
            }

            this._options = copyOptions(options, trackTargetDefaultOptions);

            this.id = generateUUID('movingTrack');

            this._simplyRoam = simplyRoam;

            this.path =[];

            this.points=[];
            this.icon = undefined;
            this.line = undefined;
            this.track = undefined;

            this.sampledPositionProperty = new Cesium.SampledPositionProperty();
            this.start = Cesium.defined(this._options.start) ? (Cesium.defined(this._initDate(this._options.start))?Cesium.JulianDate.fromDate(this._initDate(this._options.start)): Cesium.JulianDate.fromDate(new Date())): Cesium.JulianDate.fromDate(new Date());

            this.stop = Cesium.defined(this._options.stop) ? (Cesium.defined(this._initDate(this._options.stop))?Cesium.JulianDate.fromDate(this._initDate(this._options.stop)): Cesium.JulianDate.addSeconds(this.start, 3600000000, new Cesium.JulianDate())) : Cesium.JulianDate.addSeconds(this.start, 3600000000, new Cesium.JulianDate());

            this._initLine();

            this._simplyRoam.trackTargets.push(this);
        }

        _.prototype._initDate=function(str) {
            var arr=str.split(',');
            var year=parseInt(arr[0]);
            var month=parseInt(arr[1]);
            var day=parseInt(arr[2]);
            var hours=parseInt(arr[3]);
            var minutes=parseInt(arr[4]);
            var seconds=parseInt(arr[5]);

            return new Date(year,month,day,hours,minutes,seconds);
        };

        _.prototype._andPoint=function (position,value,index) {
            var point=this._simplyRoam._viewer.entities.add({
                name : value,
                position : position,
                billboard : {
                    verticalOrigin : Cesium.VerticalOrigin.BOTTOM,
                    scale : 0.2,
                    image : './img/poi.png'
                },
                label : {
                    text : value,
                    font : '10pt monospace',
                    horizontalOrigin : Cesium.HorizontalOrigin.CENTER,
                    pixelOffset : new Cesium.Cartesian2(0, -30),
                    fillColor : Cesium.Color.BLACK,
                    outlineColor : Cesium.Color.BLACK,
                    showBackground : true,
                    backgroundColor : new Cesium.Color(0.9, 0.9, 0.9, 0.7),
                    backgroundPadding : new Cesium.Cartesian2(4, 3)
                }
            });

            if(Cesium.defined(index)){
                this.path.splice(index,0,position);
                this.points.splice(index,0,point);
            }else {
                this.path.push(position);
                this.points.push(point);
            }

            return point;
        };

        _.prototype.removePoint=function(index){
            this.path.splice(index,1);
            this._simplyRoam._viewer.entities.remove(this.points[index]);
            this.points.splice(index,1);
        };

        _.prototype._initLine = function() {
            if (!Cesium.defined(this._options.line)) {
                return;
            }
            this._options.line.id = this.id + "_line";

            var that = this;
            var positionCBP = function() {
                return that.path;
            };
            this._options.line.polyline.positions = new Cesium.CallbackProperty(positionCBP, false);

            this.line = this._simplyRoam._viewer.entities.add(this._options.line);
        };

        _.prototype._initTrack = function() {
            if (!Cesium.defined(this._options.track)) {
                return;
            }
            this._options.track.id = this.id + "_track";

            this._options.track.availability = new Cesium.TimeIntervalCollection([new Cesium.TimeInterval({
                start : this.start,
                stop : this.stop
            })]);

            this._options.track.position = this.sampledPositionProperty;
            this._options.track.orientation = new Cesium.VelocityOrientationProperty(this.sampledPositionProperty);

            this.track = this._simplyRoam._viewer.entities.add(this._options.track);
        };

        _.prototype.addPositonsWithTime=function(positions,callback) {
            if (!Cesium.defined(positions)) {
                throw new Cesium.DeveloperError("positions is required!");
            }

            if (this.path.length <= 1) {
                this.path=[];
            }
            var postionArr=[];
            var timeArr=[];

            for(var i=0;i<positions.length;i++){
                postionArr.push(new Cesium.Cartesian3.fromDegrees(Number(positions[i].coordinate.x),Number(positions[i].coordinate.y),Number(positions[i].coordinate.z)));
                timeArr.push(new Cesium.JulianDate.fromDate(this._initDate(positions[i].time)));


                this._andPoint(Cesium.Cartesian3.fromDegrees(Number(positions[i].coordinate.x),Number(positions[i].coordinate.y),Number(positions[i].coordinate.z)),positions[i].id);


            }

            this.sampledPositionProperty.addSamples(timeArr,postionArr);

            if(Cesium.defined(callback)){
                callback();
            }
        };

        _.prototype.playBack = function(tracked,multiplier) {
            //this.icon.show = false;

            var endPosition = this.sampledPositionProperty.getValue(this.stop, new Cesium.Cartesian3());
            if (!Cesium.defined(endPosition) || !endPosition.equals(this.path[this.path.length - 1])) {
                this.sampledPositionProperty.addSample(this.stop, new Cesium.Cartesian3(this.path[this.path.length - 1].x,this.path[this.path.length - 1].y,this.path[this.path.length - 1].z));
                if(!Cesium.defined(this.track)){
                    this._initTrack();
                }
            }

            if (Cesium.defined(this._simplyRoam._viewer.timeline)) {
                this._simplyRoam._viewer.timeline.zoomTo(this.start, this.stop);
            }

            //Make sure viewer is at the desired time.
            this._simplyRoam._viewer.clock.startTime = this.start.clone();
            this._simplyRoam._viewer.clock.stopTime = this.stop.clone();
            this._simplyRoam._viewer.clock.currentTime = this.start.clone();
            this._simplyRoam._viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP; //Loop at the end
            this._simplyRoam._viewer.clock.multiplier = Cesium.defined(multiplier)? multiplier:1;

            if(tracked){
                this._simplyRoam._viewer.trackedEntity=this.track;
            }
        };
        _.prototype.destroy=function() {
            this._simplyRoam._viewer.entities.remove(this.line);
            this._simplyRoam._viewer.entities.remove(this.icon);
            this._simplyRoam._viewer.entities.remove(this.track);

            for(var i=0;i<this.points.length;i++){
                this._simplyRoam._viewer.entities.remove(this.points[i]);
            }

            return undefined;
        };

        return _;
    })();


    var routesOptions={
        id : undefined,
        name : "",
        icon : {
            model : {
                /*uri: './img/Cesium_Air.gltf',*/
                uri: './img/Cesium_Air.gltf',
                minimumPixelSize : 64,
                maximumScale : 20000
            }
        },
        line:{
            polyline : {
                width : 5,
                material : Cesium.Color.RED
            }
        }

    };
    _.Routes=(function () {
        function _(simplyRoam) {
            if (!Cesium.defined(simplyRoam)) {
                throw new Cesium.DeveloperError("simplyRoam is required!");
            }

            this._options = routesOptions;

            this.id = generateUUID('movingRoute');

            this._simplyRoam = simplyRoam;

            this.icon=undefined;
            this._position=undefined;
            this._paths=[];
            this._orientation=undefined;
            this.line=undefined;

            this._simplyRoam.routes.push(this);
        }

        _.prototype._initIcon=function () {
            if(!Cesium.defined(this._position)){
                return;
            }

            if (!Cesium.defined(this._options.icon)) {
                return;
            }
            this._options.icon.id = this.id + "_icon";

            this._options.icon.orientation = this._orientation;

            var that = this;
            var positionCBP = function() {
                return that._position;
            };

            this._options.icon.position=new Cesium.CallbackProperty(positionCBP, false);
            this._options.icon.orientation = this._orientation;

            this.icon = this._simplyRoam._viewer.entities.add(this._options.icon);
        };

        _.prototype._initLine=function () {
            if (!Cesium.defined(this._options.line)) {
                return;
            }

            this._options.line.id = this.id + "_line";

            var that = this;
            var positionCBP = function() {
                return that._paths;
            };

            this._options.line.polyline.positions = new Cesium.CallbackProperty(positionCBP, false);

            this.line=this._simplyRoam._viewer.entities.add(this._options.line);
        };

        _.prototype.addPoint=function (position,orientation) {
            if (!Cesium.defined(position)) {
                throw new Cesium.DeveloperError("position is required!");
            }

            this._position=position;
            var lastPosition=this._paths[this._paths.length-1];

            if(Cesium.defined(lastPosition)){
                if(lastPosition.x!==position.x || lastPosition.y!==position.y || lastPosition.z!==position.z){
                    this._paths.push(position);
                }
            }else {
                this._paths.push(position);
            }


            if(!Cesium.defined(this.icon)){
                this._initIcon();
            }
            if(!Cesium.defined(this.line)){
                this._initLine();
            }

            if(Cesium.defined(orientation)){
                this.icon.orientation=orientation;
            }else {
                var heading = Cesium.Math.toRadians(315);
                var pitch = 0;
                var roll = 0;
                var hpr = new Cesium.HeadingPitchRoll(heading, pitch, roll);
                this.icon.orientation = Cesium.Transforms.headingPitchRollQuaternion(this._paths[this._paths.length - 1], hpr);
            }
        };

        _.prototype.zoomTo=function () {
            this._simplyRoam._viewer.zoomTo(this.line);
        };

        _.prototype.tracked=function (value) {
            if(!value){
                this._simplyRoam._viewer.trackedEntity=undefined;
            }else {
                this._simplyRoam._viewer.trackedEntity=route.icon;
            }
        };

        _.prototype.deleteLine=function () {
            this._simplyRoam._viewer.entities.remove(this.line);
            this.line=undefined;
        };

        _.prototype.deleteIcon=function () {
            this._simplyRoam._viewer.entities.remove(this.icon);
            this.icon=undefined;
        };

        _.prototype.lineShow=function (value) {
            this.line.show=value;
        };

        _.prototype.iconShow=function (value) {
            this.icon.show=value;
        };

        _.prototype.destroy=function() {
            this.icon=undefined;
            this._position=undefined;
            this._paths=[];
            this._orientation=undefined;
            this.line=undefined;
            this._simplyRoam.removeRoute(this.id);

            return undefined;
        };

        return _;
    })();

    return _;
})();


function copyOptions(options, defaultOptions) {
    var newOptions = {}, option;
    for (option in defaultOptions) {
        if (typeof defaultOptions[option] === "object") {
            if (defaultOptions[option] instanceof Array) {
                newOptions[option] = defaultOptions[option];
            } else {
                if (newOptions[option] === undefined) {
                    newOptions[option] = {};
                }
                newOptions[option] = copyOptions(defaultOptions[option], newOptions[option]);
            }
        } else {
            newOptions[option] = defaultOptions[option];
        }
    }

    for (option in options) {
        if (typeof options[option] === "object") {
            if (options[option] instanceof Array) {
                newOptions[option] = options[option];
            } else {
                if (newOptions[option] === undefined) {
                    newOptions[option] = {};
                }
                newOptions[option] = copyOptions(options[option], newOptions[option]);
            }
        } else {
            newOptions[option] = options[option];
        }
    }
    return newOptions;
}

function clone(from, to) {
    if (from === null || typeof from !== "object") {
        return from;
    }
    if (from.constructor !== Object && from.constructor !== Array) {
        return from;
    }
    if (from.constructor === Date || from.constructor === RegExp || from.constructor === Function ||
        from.constructor === String || from.constructor === Number || from.constructor === Boolean) {
        return new from.constructor(from);
    }

    to = to || new from.constructor();

    for (var name in from) {
        to[name] = typeof to[name] === "undefined" ? clone(from[name], null) : to[name];
    }

    return to;
}

//生成唯一ID
function generateUUID(str) {
    var d = new Date().getTime();
    var uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx.";
    uuid = uuid.replace(/[xy]/g, function(c) {
        var r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
    return uuid + str;
}

