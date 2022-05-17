// Javascript module for the panorama viewer. Leverages ThreeJS.

import * as THREE from 'three';

var scene;
var camera;
var renderer;
var sphere;

var isMouseDown = false;
var lat = 0, lng = 0;
var phi;
var theta;
var onMouseDownX = 0, onMouseDownY = 0;
var onMouseDownLat = 0, onMouseDownLng = 0;

var width;
var height;

let canvas;

var raycaster;
var pointer;    // Mouse position

var pointsOfInterest = [];
var hoveredPoint;

var selectedPoint;

var dotNetRef;  // Reference to the dotnet component

var loader;     // Texture loader

// Permissions for points of interest:
var allowPoiSelect = true;
var allowPoiCreate = true;
var allowPoiRemove = true;

// Add event listenters:
document.addEventListener('mousedown', onDocumentMouseDown, false);
document.addEventListener('mousemove', onDocumentMouseMove, false);
document.addEventListener('mouseup', onDocumentMouseUp, false);
document.addEventListener('mousewheel', onDocumentMouseWheel, false);
document.addEventListener('pointermove', onPointerMove, false);
document.addEventListener('poimouseover', onPoiMouseOver, false);
document.addEventListener('poimouseout', onPoiMouseOut, false);
document.addEventListener('click', onClick, false);
document.addEventListener('dblclick', onDblClick, false);

window.addEventListener('resize', onResize);

/**
 * Initialize the scene and global variables. 
 */
export function init(panorama, poiPermissions) {
    // Set permissions:
    allowPoiSelect = poiPermissions.select;
    allowPoiCreate = poiPermissions.create;
    allowPoiRemove = poiPermissions.remove;

    // Create texture loader:
    loader = new THREE.TextureLoader();
    loader.crossOrigin = '';    //  Allow cross-origin loading

    // Get canvas element:
    canvas = document.getElementById("canvas");

    // Create a new scene:
    scene = new THREE.Scene();
    width = canvas.parentElement.clientWidth;
    height = canvas.parentElement.clientHeight;

    raycaster = new THREE.Raycaster();
    pointer = new THREE.Vector2();

    // Create camera:
    var fov = 50;                   // Field of view
    var aspect = width / height;    // Aspect ratio
    var near = 0.0000001;           // Front clipping plane
    var far = 1000;                 // Back clipping plane
    camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.z = 0;
    camera.target = new THREE.Vector3(0, 0, 0);

    // Create a new WebGLRenderer object:
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(width, height);

    canvas.appendChild(renderer.domElement);  // Add renderer to the page

    // Initial panorama image:
    var material = new THREE.MeshBasicMaterial({
        map: loader.load(panorama.dataUri)
    });

    // Panorama sphere:
    var radius = 20;
    var widthSegments = 100;
    var heightSegments = 100;
    var geometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments);

    geometry.applyMatrix4(new THREE.Matrix4().makeScale(-1, 1, 1));  // Invert the sphere to see inside it
    sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);
}


/**
 * Resize the viewer in the event the window gets resized.
 * */
function onResize() {
    const xWidth = canvas.parentElement.clientWidth;
    const xHeight = canvas.parentElement.clientHeight;
    camera.aspect = xWidth / xHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(xWidth, xHeight);
}

/**
 * Render and animate the panorama sphere.
 */
export function animate() {
    raycaster.setFromCamera(pointer, camera);

    var currentPoint = pointsOfInterest.find(poi => raycaster.intersectObject(poi, true).length > 0);

    //  Check to see if the cursor is hovering over a point of interest:
    if (currentPoint != null && hoveredPoint == null) {
        //  If so, fire the mouseover event:
        hoveredPoint = currentPoint;
        document.getElementById("canvas").dispatchEvent(new CustomEvent("poimouseover", {
            bubbles: true,
            detail: { index: pointsOfInterest.indexOf(hoveredPoint) }
        }));
        hoveredPoint.material.size = 30;
        canvas.style.cursor = "pointer";

    }
    //  Otherwise, check to see if the cursor is leaving a point of interest:
    else if (hoveredPoint != currentPoint) {
        //  If so, fire the mouseout event:
        document.getElementById("canvas").dispatchEvent(new CustomEvent("poimouseout", {
            bubbles: true
        }));
        if (hoveredPoint != selectedPoint) {
            hoveredPoint.material.size = 20;
        }
        canvas.style.cursor = "default";
        hoveredPoint = null;
    }

    requestAnimationFrame(animate);         // Keep calling the animate function

    lat = Math.max(-85, Math.min(85, lat)); //  Keeps camera oriented
    phi = THREE.Math.degToRad(90 - lat);    //  Polar angle in radians from the y (up) axis
    theta = THREE.Math.degToRad(lng);       //  Equator angle in radians around the y (up) axis

    //  Buncha math I don't pretend to understand:
    camera.target.x = 500 * Math.sin(phi) * Math.cos(theta);
    camera.target.y = 500 * Math.cos(phi);
    camera.target.z = 500 * Math.sin(phi) * Math.sin(theta);

    camera.lookAt(camera.target);

    renderer.render(scene, camera);
}

/**
 * Load a new image into the panorama viewer.
 */
export function loadPanorama(panorama) {
    clearPointsOfInterest();
    loader.load(panorama.dataUri, (tex) => sphere.material.map = tex);
    sphere.material.map.needsUpdate = true;
}

/**
 * Add a point of interest. If an index is specified, write the point of interest to the corresponding
 * position in the array, overwriting any existing point. Otherwise, add it to the end of the array.
 * @param {any} poi - The point of interest to add.
 * @param {any} index - The index at which to add the point of interest to the array (default is null).
 */
export function addPointOfInterest(poi, index = null) {
    var position = new THREE.Float32BufferAttribute(poi.position, 3);

    var pointGeometry = new THREE.BufferGeometry();
    pointGeometry.addAttribute('position', position);

    var texture = new THREE.TextureLoader().load('_content/PanoramaViewer/assets/disc.png');

    var pointMaterial = new THREE.PointsMaterial({ size: 20, transparent: true, map: texture, sizeAttenuation: false });
    pointMaterial.color.setHSL(1.0, 1.0, 1.0);
    var pointOfInterest = new THREE.Points(pointGeometry, pointMaterial);

    if (index = null) {
        pointsOfInterest[index] = pointOfInterest;
    }
    else {
        pointsOfInterest.push(pointOfInterest);
    }

    scene.add(pointOfInterest);
}

/**
 * Remove the point of interest at the given index in the array. If the splice flag is specified, remove the
 * point and shrink the array accordingly. Otherwise, simply set the array position to null.
 * @param {any} index - The index of the point of interest to remove.
 * @param {any} splice - Whether to reduce the size of the array (default is true).
 */
export function removePointOfInterest(index, splice = true) {
    var pointToRemove = pointsOfInterest[index];
    if (splice) {
        pointsOfInterest.splice(index, 1);
    }
    else {
        pointsOfInterest[index] = null;
    }
    scene.remove(pointToRemove);
}

/**
 * Refresh the points of interest array from a given input array. Create any that exist in the source but
 * not in the target. Remove any that exist in the target but not in the source.
 * @param {any} pois - An array of points of interest to refresh from.
 */
export function refreshPointsOfInterest(pois) {
    for (var i = 0; i < Math.max(pois.length, pointsOfInterest.length); i++) {
        if (pointsOfInterest[i] == null) {
            //  Add point of interest
            addPointOfInterest(pois[i], i);
        }
        else if (pois[i] == null) {
            //  Remove POI
            removePointOfInterest(i, false);
        }
    }

    if (pointsOfInterest.length > pois.length) {
        pointsOfInterest.length = pois.length;
    }
}

/**
 * Remove all points of interest from the scene and clear the array.
 * */
function clearPointsOfInterest() {
    pointsOfInterest.forEach(poi => scene.remove(poi));
    pointsOfInterest.length = 0;
}

/**
 * Handle the 'click' event.
 */
function onClick(event) {
    if (event.target.localName == "canvas" && allowPoiSelect == true) {
        //  Select:
        if (hoveredPoint != null && selectedPoint != hoveredPoint) {
            if (selectedPoint != null) {
                // Deselect the current point:
                selectedPoint.material.size = 20;
            }
            selectedPoint = hoveredPoint;
            selectedPoint.material.size = 30;
            dotNetRef.invokeMethodAsync("OnPoiSelected", pointsOfInterest.indexOf(selectedPoint));
        }
        //  Deselect:
        else if (hoveredPoint != null && selectedPoint == hoveredPoint) {
            selectedPoint.material.size = 20;
            selectedPoint = null;
            dotNetRef.invokeMethodAsync("OnPoiSelected", -1);
        }
    }
}

/**
 * Handle the 'dblclick' event.
 */
function onDblClick(event) {
    if (event.target.localName == "canvas") {
        if (hoveredPoint == null && allowPoiCreate == true) {
            //  Cast a ray at the cursor's current position:
            var ray = new THREE.Raycaster();
            ray.setFromCamera(pointer, camera);

            //  Get the point at which it intersects the pano sphere:
            var intersection = ray.intersectObject(sphere, true);
            var intersectionPoint = intersection[0].point;

            //  Create a POI object:
            var pointOfInterest = {
                id: pointsOfInterest.length + 1,
                position: intersectionPoint.toArray()
            }

            //  Add it to the scene:
            addPointOfInterest(pointOfInterest);

            //  Fire create event to dotnet component:
            dotNetRef.invokeMethodAsync("OnPoiCreated", pointOfInterest);
        }
        else if (hoveredPoint != null && allowPoiRemove == true) {
            //  Deselect if selected:
            if (hoveredPoint == selectedPoint) {
                selectedPoint = null;
                dotNetRef.invokeMethodAsync("OnPoiSelected", -1);
            }

            //  Find the point's index:
            var index = pointsOfInterest.indexOf(hoveredPoint);

            //  Remove the point:
            removePointOfInterest(index);

            //  Fire delete method to dotnet component:
            dotNetRef.invokeMethodAsync("OnPoiRemoved", index);
        }
    }
}

/**
 * Handle the 'poimouseover' event.
 */
function onPoiMouseOver(event) {
    dotNetRef.invokeMethodAsync("OnPoiMouseOver", event.detail.index);
}

/**
 * Handle the 'poimouseout' event.
 */
function onPoiMouseOut() {
    dotNetRef.invokeMethodAsync("OnPoiMouseOut", -1);
}

/**
 * Handle the 'pointermove' event.
 */
function onPointerMove(event) {
    pointer.x = ((event.clientX - canvas.offsetLeft) / width) * 2 - 1;
    pointer.y = - ((event.clientY - canvas.offsetTop) / height) * 2 + 1;
}

/**
 * Handle the 'mousedown' event (record the lat/lng position of the click).
 */
function onDocumentMouseDown(event) {
    isMouseDown = event.target.localName == "canvas";
    onMouseDownX = event.clientX;
    onMouseDownY = event.clientY;
    onMouseDownLat = lat;
    onMouseDownLng = lng;
}

/**
 * Handle the 'mouseup' event. 
 */
function onDocumentMouseUp(event) {
    isMouseDown = false;
}

/**
 * Handle the 'mousemove' event.
 */
function onDocumentMouseMove(event) {
    if (isMouseDown) {
        var factor = 0.025 + (camera.fov - 15) * 0.00125
        lat = (event.clientY - onMouseDownY) * factor + onMouseDownLat;
        lng = -(event.clientX - onMouseDownX) * factor + onMouseDownLng;
    }
}

/**
 * Handle the 'mousewheel' event. 
 */
function onDocumentMouseWheel(event) {
    if (event.wheelDeltaY) {                    // WebKit
        camera.fov -= event.wheelDeltaY * 0.05;
    } else if (event.wheelDelta) {              // Opera / Explorer 9
        camera.fov -= event.wheelDelta * 0.05;
    } else if (event.detail) {                  // Firefox
        camera.fov += event.detail * 1.0;
    }
    if (camera.fov > 75) { camera.fov = 75; }   //  Zoom out max
    if (camera.fov < 15) { camera.fov = 15; }   //  Zoom in max
    camera.updateProjectionMatrix();
}

/**
 * Create a reference to the dotnet component (invoked from dotnet).
 * @param {any} dotNetRef - The dotnet component to reference.
 */
export function getDotNetRef(ref) {
    dotNetRef = ref;
}