"use strict";

let camera, controls, scene, renderer, light;
const meshes = {};

const raycaster = new THREE.Raycaster();
const mouse     = new THREE.Vector2();

let dashboard;
let pressed;

function start() {

    Object.keys( meshes ).forEach( key => Cockpit.addMesh( key, meshes[ key ] ) );

    dashboard = new Cockpit.Dashboard( 'dashboard' );

    scene.add( dashboard.mesh );

    function setAllGauges( value ) {
        Object.keys( dashboard.gauges ).forEach( key => {
            const gauge = dashboard.gauges[ key ];
            gauge.set( value );
        } );
    }

    let gaugeMin = 0;
    let gaugeMax = 1;

    setTimeout( () => {
        setAllGauges( 1 );
    }, 500 );
    let value = gaugeMax;
    setInterval( function() {

        if ( !dashboard.power ) return;
        value = value === gaugeMax ? gaugeMin : gaugeMax;
        setAllGauges( value );

    }, 2000 );

    Object.keys( dashboard.gadgets.switch ).forEach( key => {
        const gadget = dashboard.gadgets.switch[ key ];
        const led = dashboard.gadgets.led[ gadget.name ];
        if ( led ) gadget.on( 'change', function( state ) { led.toggle( state ); } );

        if ( gadget.name === 'onoff' ) {
            gadget.power = true;
            dashboard.power = true; // dbg mess here
            gadget.toggle( true );
            gadget.on( 'change', state => { if ( state ) dashboard.turnOn(); else dashboard.turnOff(); } );
        }

    } );

    Object.keys( dashboard.gadgets.button ).forEach( key => {
        const gadget = dashboard.gadgets.button[ key ];
        gadget.on( 'change', state => {
            if ( state ) {
                if ( gadget.name === 'drone' ) gaugeMin = 0;
                if ( gadget.name === 'panic' ) gaugeMin = 0.25;
                if ( gadget.name === 'a'     ) gaugeMax = 0.75;
                if ( gadget.name === 'b'     ) gaugeMax = 1;
            }
            pressed = state ? gadget : null;
        } );
    } );

}


function getObjectUnderPoint( vec2 ) {

    vec2 = vec2.clone();

    vec2.x =   ( vec2.x / window.innerWidth  ) * 2 - 1;
    vec2.y = - ( vec2.y / window.innerHeight ) * 2 + 1;

    raycaster.setFromCamera( vec2, camera );

    const intersects = raycaster.intersectObjects( scene.children, true );
    if ( intersects.length === 0 )
        return;

    return intersects[ 0 ].object;

}


function onMouseDown( event ) {

    mouse.x = event.clientX;
    mouse.y = event.clientY;

    const object = getObjectUnderPoint( mouse );

    if ( !object )
        return;

    if ( object.name === 'button' ) object.userData.gadget.toggle( true );

}

function onMouseUp( event ) {


    // ignore drag
    if ( mouse.x !== event.clientX || mouse.y !== event.clientY ) {

        if ( pressed ) {
            pressed.toggle( false );
            pressed = null;
        }

        return;
    }

    const object = getObjectUnderPoint( mouse );
    if ( !object ) return;
    if      ( object.name === 'switch' ) object.userData.gadget.toggle();
    else if ( object.name === 'button' ) object.userData.gadget.toggle( false );

}


window.addEventListener( 'mousedown' , onMouseDown , false );
window.addEventListener( 'mouseup'   , onMouseUp   , false );

const canvas = document.createElement( 'canvas' );
canvas.width = 512;
canvas.height = 512;

const ctx = canvas.getContext( '2d' );
ctx.fillStyle = '#ff0';

const canvasTexture = new THREE.Texture( canvas );
canvasTexture.needsUpdate = true;

function animate() {

    window.requestAnimationFrame( animate );

    controls.update();
    render();

}

function makeMaterial( spec, offset ) {

    const material = spec.shading === 'phong' ? new THREE.MeshPhongMaterial() : new THREE.MeshLambertMaterial();
    material.name = spec.DbgName;
    material.color.setRGB    ( spec.colorDiffuse [ 0 ], spec.colorDiffuse [ 1 ], spec.colorDiffuse [ 2 ] );
    material.emissive.setRGB ( spec.colorEmissive[ 0 ], spec.colorEmissive[ 1 ], spec.colorEmissive[ 2 ] );
    material.specular.setRGB ( spec.colorSpecular[ 0 ], spec.colorSpecular[ 1 ], spec.colorSpecular[ 2 ] );

    material.transparent = spec.transparent;
    material.opacity     = spec.opacity;
    material.shininess   = spec.specularCoef;

    if ( offset ) {
        material.polygonOffset = true;
        material.polygonOffsetFactor = 0.01;
        material.polygonOffsetUnits = -0.01;
    }

    material.blending = THREE[ spec.blending ];
    if ( spec.DbgName.match( 'flat' ) )
        material.shading = THREE.FlatShading;
    if ( spec.DbgName.match( 'skin' ) )
        material.skinning = true;

    return material;
}

function setupLight() {
    light = new THREE.AmbientLight( 0xcccccc );
    scene.add( light );

    light = new THREE.DirectionalLight( 0xffffff, 1 );
    light.castShadow = true;
    light.shadowDarkness = 0.9;

    light.position.z = -0.04;
    light.position.x = 0.6;
    light.position.y = 0.2;

    light.target.position.set( 0,0,0 );

    light.shadowCameraNear = 0.01;
    light.shadowCameraFar  = 2;
    light.shadowCameraFov  = 50;
    light.shadowMapWidth   = 1024;
    light.shadowMapHeight  = 1024;

    const rad = 0.4;

    light.shadowCameraLeft   = -rad;
    light.shadowCameraRight  =  rad;
    light.shadowCameraTop    =  rad;
    light.shadowCameraBottom = -rad;

    scene.add( light );

}

function init() {

    camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.0001, 100000 );
    camera.position.set( 0, 0.5, 0.5 );

    controls = new THREE.OrbitControls( camera );
    controls.damping = 0.2;
    controls.addEventListener( 'change', render );

    scene = new THREE.Scene();
    camera.lookAt( scene );

    // camera.position.set( 0,0.2,0 );
    // controls.panLeft( -0.2 );

    setupLight();

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.setClearColor( new THREE.Color( '#000' ) );

    document.body.appendChild( renderer.domElement );

    window.addEventListener( 'resize', onWindowResize, false );

}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
    render();

}

function render() {

    // const angle = Date.now() * 0.001;
    // const len = 0.2;
    // light.position.x = Math.cos( angle ) * len;
    // light.position.y = Math.sin( angle ) * len;
    // light.position.z = Math.sin( angle ) * len;
    // // light.position.y = 0.06;
    // light.position.setLength( 0.3 );

    scene.children.filter( c => c.preRender ).forEach( c => c.preRender() );
    renderer.render( scene, camera );

}

const loader = new THREE.ObjectLoader();

let total = 0;
let loaded = 0;

function load( name ) {
    total++;

    loader.load( `3d-models/${name}.three.json`, ( dataScene ) => {

        const dataMesh = dataScene.children[ 0 ];
        const geo = dataMesh.geometry;

        const materials = geo.matRef.map( ( spec ) => makeMaterial( spec, name !== 'dashboard' ) );
        const material = new THREE.MeshFaceMaterial( materials );

        let mesh;

        mesh = geo.bones.length === 0 ?
            new THREE.Mesh( geo, material ) :
            new THREE.SkinnedMesh( geo, material );

        mesh.castShadow = true;
        mesh.receiveShadow = true;

        meshes[ name ] = mesh;
        mesh.name = name;

        loaded++;
        if ( loaded === total )
            start();
    } );

}

init();
animate();

load( 'dashboard'   );
load( 'switch'      );
load( 'led'         );
load( 'button'      );
load( 'label-large' );
load( 'label-small' );
load( 'analog-a1'      );
load( 'analog-a2'      );
load( 'analog-a3'      );
load( 'digital-b1'     );
load( 'digital-b2'     );
load( 'digital-b3'     );
load( 'fake-c1'        );
load( 'fake-c2'        );
load( 'fake-c3'        );
