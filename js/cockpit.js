"use strict";

window.Cockpit = window.Cockpit || {};

Cockpit.meshes = {};

Cockpit.ledColors = {
    on  : new THREE.Color( '#009900' ),
    off : new THREE.Color( '#003300' )
};

Cockpit.labels = {
    'label-1' : 'GUNS',
    'label-2' : 'POWER',
    'on'      : 'ON',
    'off'     : 'OFF'
};

Cockpit.labelWidth = {
    large: 5,
    small: 2
};


Cockpit.addMesh = function( name, mesh ) {

    Cockpit.meshes[ name ] = mesh;

};

Cockpit.Dashboard = class {

    constructor( name ) {

        this.gadgets = {};

        this.mesh = Cockpit.meshes[ name ];

        this.mesh.skeleton.bones.forEach( bone => {

            const arr = bone.name.split( '.' );
            const type = arr.shift();

            if ( type === 'base' ) return;

            let gadget;

            if      ( type === 'switch' ) gadget = new Cockpit.Switch( arr.shift() );
            else if ( type === 'led'    ) gadget = new Cockpit.Led   ( arr.shift() );
            else if ( type === 'button' ) gadget = new Cockpit.Button( arr.shift() );
            else if ( type === 'label'  ) gadget = new Cockpit.Label( arr.shift(), arr.shift(), arr.shift() );
            else {
                console.log( 'skipping', type, arr );
                return;
            }


            this.addGadget( bone, type, gadget );



            // let makeTexture = false;
            // if ( type === 'label' ) {
            //     makeTexture = true;
            //     type = type + '-' + arr.shift();
            // }

            // const name = arr.shift();

            // if ( Object.keys( objects ).indexOf( type ) === -1 ) {
            //     if ( type !== 'base' )
            //         console.log( 'skipping', type );
            //     return;
            // }

            // const ref = meshes[ type ];
            // const object = ref.clone();
            // object.material = object.material.clone(); // only the dynamic ones?
            // if ( makeTexture ) {
            //     object.material.materials.forEach( ( material ) => {
            //         if ( material.name.match( /texture/ ) ) {
            //             material.map = textureMaker.drawLabel( type, `#${arr.shift()}`, material.color.getStyle(), name );
            //         }
            //     } );
            // }
            // bone.add( object );
            // objects[ type ][ name ] = object;
            // // aSwitch.skeleton.bones[ 0 ].rotation.x = Math.PI / 6;

        } );



    }
    addGadget( bone, type, gadget ) {

        if ( !this.gadgets[ type ] ) this.gadgets[ type ] = {};
        this.gadgets[ type ][ gadget.name ] = gadget;
        bone.add( gadget.mesh );

    }

};

Cockpit.Gadget = class extends EventDispatcher {

    constructor( name, mesh ) {

        super();
        this.name = name;
        this.mesh = mesh.clone();

        this.mesh.userData.gadget = this;

    }

};


Cockpit.Switch = class extends Cockpit.Gadget  {

    constructor( name ) {

        super( name, Cockpit.meshes.switch );

        this.rotation = this.mesh.skeleton.bones[ 0 ].rotation;
        this.toggle( false );

    }
    toggle( state ) {

        this.state = state === undefined ? !this.state : !!state;
        this.rotation.x = this.state ? -Math.PI / 6 : Math.PI / 6;

        this.dispatch( 'change', this.state );

    }

};

Cockpit.Button = class extends Cockpit.Gadget {

    constructor( name ) {

        super( name, Cockpit.meshes.button );

        this.position = this.mesh.skeleton.bones[ 0 ].position;
        this.toggle( false );

    }
    toggle( state ) {
        this.state = state === undefined ? !this.state : !!state;
        this.position.y = this.state ? -0.005 : 0;
        this.dispatch( 'change', this.state );
    }

};

Cockpit.Led = class extends Cockpit.Gadget {

    constructor( name ) {

        super( name, Cockpit.meshes.led );

        this.mesh.material = this.mesh.material.clone();
        this.lightMaterial = this.mesh.material.materials.find( material => material.name.match( /^light/ ) );
        this.toggle( false );

    }
    toggle( state ) {
        this.state = state === undefined ? !this.state : !!state;
        this.lightMaterial.color.copy( Cockpit.ledColors[ this.state ? 'on' : 'off' ] );
    }

};

Cockpit._labelIndex = 0;
Cockpit.Label = class extends Cockpit.Gadget {

    constructor( size, keyword, textColorHex ) {

        const meshName = 'label-' + size;

        super( 'label-' + Cockpit._labelIndex++, Cockpit.meshes[ meshName ] );

        this.mesh.material = this.mesh.material.clone();

        const textureMaterial = this.mesh.material.materials.find( material => material.name.match( /^texture/ ) );
        textureMaterial.map = this.makeTexture( size, keyword, '#' + textColorHex, textureMaterial.color.getStyle() );

    }
    makeTexture( size, keyword, fgColor, bgColor ) {

        const canvas  = document.createElement( 'canvas' );
        canvas.width  = 512;
        canvas.height = 512;
        const ctx     = canvas.getContext( '2d' );
        const texture = new THREE.Texture( canvas );

        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        // texture.minFilter = THREE.LinearFilter;

        const widthRatio = Cockpit.labelWidth[ size ];

        // document.body.appendChild( canvas );

        const text = Cockpit.labels[ keyword ] || keyword;
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
        ctx.scale( 1 / widthRatio, 1 );
        ctx.beginPath();
        ctx.strokeText( text, widthRatio * canvas.width / 2 ,canvas.height / 2 );
        ctx.fillText( text, widthRatio * canvas.width / 2 ,canvas.height / 2 );
        ctx.restore();

        texture.needsUpdate = true;
        return texture;

    }

};
