"use strict";

let camera, controls, scene, renderer, light;
const meshes = {};

const raycaster = new THREE.Raycaster();
const mouse     = new THREE.Vector2();

function onClick( event ) {

    mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

    raycaster.setFromCamera( mouse, camera );

    const intersects = raycaster.intersectObjects( scene.children, true );
    if ( intersects.length === 0 )
        return;

    const object = intersects[ 0 ].object;
    if ( object.name === 'switch' ) {
        object.skeleton.bones[ 0 ].rotation.x = -object.skeleton.bones[ 0 ].rotation.x;
    }

}

window.addEventListener( 'click', onClick, false );

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
    camera.position.set( 0, 0.3, 0.3 );

    controls = new THREE.OrbitControls( camera );
    controls.damping = 0.2;
    controls.addEventListener( 'change', render );

    scene = new THREE.Scene();
    camera.lookAt( scene );

    light = new THREE.AmbientLight( 0x888888 );
    scene.add( light );


    light = new THREE.DirectionalLight( 0xffffff, 1 );
    light.castShadow = true;
    light.shadowDarkness = 0.9;

    light.position.z = -0.04;
    light.position.x = 0.2;
    light.position.y = 0.1;

    light.target.position.set( 0,0,0 );

    light.shadowCameraNear = 0.01;
    light.shadowCameraFar = 1;
    light.shadowCameraFov = 50;
    light.shadowMapWidth = 1024;
    light.shadowMapHeight = 1024;
    const rad = 0.15;

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

    function doneLoading() {
        scene.add( meshes.dashboard );

        meshes.dashboard.skeleton.bones.forEach( bone => {

            if ( bone.name.split( '.' ).indexOf( 'switch' ) !== -1 ) {
                const aSwitch = meshes.switch.clone();
                bone.add( aSwitch );
                aSwitch.skeleton.bones[ 0 ].rotation.x = Math.PI / 6;
            }
        } );

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



    load( 'dashboard' );
    load( 'switch' );

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
