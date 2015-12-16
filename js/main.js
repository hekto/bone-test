"use strict";

let camera, controls, scene, renderer, light;
const meshes = {};

const raycaster = new THREE.Raycaster();
const mouse     = new THREE.Vector2();

let pressed;

const texts = {
    'label-1': 'GUNS',
    'label-2': 'POWER',
    'on': 'ON',
    'off': 'OFF'
};

class TextureMaker {

    constructor() {

        this.xyRatio = {
            'label-large' : 0.2,
            'label-small' : 0.5
        };

    }

    drawLabel( type, fgColor, bgColor, keyword ) {

        const canvas  = document.createElement( 'canvas' );
        canvas.width  = 512;
        canvas.height = 512;
        const ctx     = canvas.getContext( '2d' );
        const texture = new THREE.Texture( canvas );

        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        // texture.minFilter = THREE.LinearFilter;

        const xyRatio = this.xyRatio[ type ];

        // document.body.appendChild( canvas );

        const text = texts[ keyword ] || keyword;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';

        ctx.strokeStyle = '#000';
        ctx.lineWidth = 64;

        ctx.font = `bold ${Math.round( canvas.height * 0.8 )}px arial`;

        ctx.fillStyle = bgColor;
        ctx.fillRect( 0,0, canvas.width, canvas.height );

        //ctx.clearRect( 0, 0, 512, 512 );
        ctx.fillStyle = fgColor;
        ctx.save();
        ctx.scale( xyRatio, 1 );
        ctx.beginPath();
        ctx.strokeText( text, canvas.width / ( 2 * xyRatio ) ,canvas.height / 2 );
        ctx.fillText( text, canvas.width / ( 2 * xyRatio ) ,canvas.height / 2 );
        ctx.restore();

        texture.needsUpdate = true;
        return texture;


    }

}

const textureMaker = new TextureMaker();

const objects = { switch        : {},
                  led           : {},
                  button        : {},
                  'label-small' : {},
                  'label-large' : {}
                };

const colors = {
    on  : new THREE.Color( '#009900' ),
    off : new THREE.Color( '#003300' )
};

function toggleButton( object, state ) {

    state = !!state;

    const pos = object.skeleton.bones[ 0 ].position;
    pos.y = state ? -0.005 : 0;

    if ( state )
        pressed = object;

}


function toggleLed( name, state ) {

    const led = objects.led[ name ];
    if ( !led ) return;

    state = state ? 'on' : 'off';

    led.material.materials.some( material => {
        if ( material.name.match( /^light/ ) ) {
            material.color.copy( colors[ state ] );
            return true;
        }
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
    if ( object.name === 'button' ) {

        toggleButton( object, true );

        // rot.x = -rot.x;
        // const switchName = object.parent.name.substring( 7 );
        // toggleLed( switchName, rot.x < 0 );
    }


}

function onMouseUp( event ) {

    if ( pressed ) {
        toggleButton( pressed );
        pressed = null;
    }

    // ignore drag
    if ( mouse.x !== event.clientX || mouse.y !== event.clientY )
        return;

    const object = getObjectUnderPoint( mouse );
    if ( object.name === 'switch' ) {

        const rot = object.skeleton.bones[ 0 ].rotation;

        rot.x = -rot.x;
        const switchName = object.parent.name.substring( 7 );
        toggleLed( switchName, rot.x < 0 );
        return;

    }
    if ( object.name === 'button' )
        toggleButton( object, false );

}


window.addEventListener( 'mousedown', onMouseDown, false );
window.addEventListener( 'mouseup', onMouseUp, false );

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

function makeMaterial( spec ) {

    const material = spec.shading === 'phong' ? new THREE.MeshPhongMaterial() : new THREE.MeshLambertMaterial();
    material.name = spec.DbgName;
    material.color.setRGB    ( spec.colorDiffuse [ 0 ], spec.colorDiffuse [ 1 ], spec.colorDiffuse [ 2 ] );
    material.emissive.setRGB ( spec.colorEmissive[ 0 ], spec.colorEmissive[ 1 ], spec.colorEmissive[ 2 ] );
    material.specular.setRGB ( spec.colorSpecular[ 0 ], spec.colorSpecular[ 1 ], spec.colorSpecular[ 2 ] );
    material.blending = THREE[ spec.blending ];
    if ( spec.DbgName.match( 'flat' ) )
        material.shading = THREE.FlatShading;
    if ( spec.DbgName.match( 'skin' ) )
        material.skinning = true;

    return material;
}


function init() {

    camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.0001, 100000 );
    camera.position.set( 0, 0.5, 0.5 );

    controls = new THREE.OrbitControls( camera );
    controls.damping = 0.2;
    controls.addEventListener( 'change', render );

    scene = new THREE.Scene();
    camera.lookAt( scene );

    // // label debugging
    // camera.position.set( 0, 0.1, 0 );
    // controls.panLeft( -0.22 );

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

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.setClearColor( new THREE.Color( '#000' ) );

    document.body.appendChild( renderer.domElement );

    window.addEventListener( 'resize', onWindowResize, false );

    function initObjects() {

        Object.keys( objects.switch ).forEach( key => {
            const s = objects.switch[ key ];
            s.skeleton.bones[ 0 ].rotation.x = Math.PI / 6;
        } );

        Object.keys( objects.led ).forEach( name => toggleLed( name, false ) );

    }

    function doneLoading() {
        scene.add( meshes.dashboard );

        meshes.dashboard.skeleton.bones.forEach( bone => {

            const arr = bone.name.split( '.' );
            let type = arr.shift();

            let makeTexture = false;
            if ( type === 'label' ) {
                makeTexture = true;
                type = type + '-' + arr.shift();
            }

            const name = arr.shift();

            if ( Object.keys( objects ).indexOf( type ) === -1 ) {
                if ( type !== 'base' )
                    console.log( 'skipping', type );
                return;
            }

            const ref = meshes[ type ];
            const object = ref.clone();
            object.material = object.material.clone(); // only the dynamic ones?
            if ( makeTexture ) {
                object.material.materials.forEach( ( material ) => {
                    if ( material.name.match( /texture/ ) ) {
                        material.map = textureMaker.drawLabel( type, `#${arr.shift()}`, material.color.getStyle(), name );
                    }
                } );
            }
            bone.add( object );
            objects[ type ][ name ] = object;
            // aSwitch.skeleton.bones[ 0 ].rotation.x = Math.PI / 6;

        } );

        initObjects();

    }

    const loader = new THREE.ObjectLoader();

    let total = 0;
    let loaded = 0;

    function load( name ) {
        total++;

        loader.load( `${name}.three.json`, ( dataScene ) => {

            const dataMesh = dataScene.children[ 0 ];
            const geo = dataMesh.geometry;

            const materials = geo.matRef.map( makeMaterial );
            const material = new THREE.MeshFaceMaterial( materials );

            let mesh;

            if( geo.bones.length === 0 ) {
                mesh = new THREE.Mesh( geo, material );
            }
            else {

                mesh = new THREE.SkinnedMesh( geo, material );

            }
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            meshes[ name ] = mesh;
            mesh.name = name;

            loaded++;
            if ( loaded === total )
                doneLoading();
        } );

    }



    load( 'dashboard'   );
    load( 'switch'      );
    load( 'led'         );
    load( 'button'      );
    load( 'label-large' );
    load( 'label-small' );

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

    renderer.render( scene, camera );

}

init();
animate();
