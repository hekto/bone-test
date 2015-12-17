"use strict";

// --- Cockpit Gadgets primitives:
// - Label
// - Control
// - Indicator

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

        this.gadgets    = {};
        this.indicators = [];
        this.controls   = [];
        this.gauges     = [];
        this.power      = false;

        this.mesh = Cockpit.meshes[ name ].clone();

        this.mesh.skeleton.bones.forEach( bone => {

            const arr = bone.name.split( '.' );
            let type = arr.shift();

            if ( type === 'base' ) return;

            if ( type === 'gauge' && [ 'analog', 'digital', 'fake' ].indexOf( arr[ 0 ] ) !== -1 ) {
                if ( arr[ 1 ] === 'speed'    ) type += `-${arr.shift()}-1`;
                if ( arr[ 1 ] === 'throttle' ) type += `-${arr.shift()}-2`;
                if ( arr[ 1 ] === 'fuel'     ) type += `-${arr.shift()}-3`;
            }

            let gadget;

            if      ( type === 'switch' ) gadget = new Cockpit.Switch( arr.shift() );
            else if ( type === 'led'    ) gadget = new Cockpit.Led   ( arr.shift() );
            else if ( type === 'button' ) gadget = new Cockpit.Button( arr.shift() );
            else if ( type === 'label'  ) gadget = new Cockpit.Label ( arr.shift(), arr.shift(), arr.shift() );

            else if ( type === 'gauge-analog-1' ) gadget = new Cockpit.Analog1( arr.shift() );
            else if ( type === 'gauge-analog-2' ) gadget = new Cockpit.Analog2( arr.shift() );
            else if ( type === 'gauge-analog-3' ) gadget = new Cockpit.Analog3( arr.shift() );

            else if ( type === 'gauge-digital-1' ) gadget = new Cockpit.Digital1( arr.shift() );
            else if ( type === 'gauge-digital-2' ) gadget = new Cockpit.Digital2( arr.shift() );
            else if ( type === 'gauge-digital-3' ) gadget = new Cockpit.Digital3( arr.shift() );

            else if ( type === 'gauge-fake-1' ) gadget = new Cockpit.Fake1( arr.shift() );
            else if ( type === 'gauge-fake-2' ) gadget = new Cockpit.Fake2( arr.shift() );
            else if ( type === 'gauge-fake-3' ) gadget = new Cockpit.Fake3( arr.shift() );


            else {
                console.log( 'skipping', type, arr );
                return;
            }
            this.addGadget( bone, type, gadget );

            // debug moving camera above
            // if ( type === 'gauge-analog-1' ) {
            //     gadget.mesh.updateMatrixWorld();
            //     const pos = gadget.mesh.localToWorld( gadget.mesh.position.clone() );
            //     /* global camera, controls */
            //     camera.position.set( 0, 0.1, 0 );
            //     controls.update();
            //     controls.panLeft( -pos.x );
            //     controls.panUp  ( -pos.z );
            // }

        } );

    }
    addGadget( bone, type, gadget ) {

        if ( !this.gadgets[ type ] ) this.gadgets[ type ] = {};
        this.gadgets[ type ][ gadget.name ] = gadget;
        bone.add( gadget.mesh );

        if ( gadget instanceof Cockpit.Indicator ) this.indicators.push( gadget );
        if ( gadget instanceof Cockpit.Control   ) this.controls  .push( gadget );
        if ( gadget instanceof Cockpit.Gauge     ) this.gauges    .push( gadget );

        gadget.parent = this;

    }
    turnOn() {

        const duration = 1000;
        const start    = Date.now();

        this.mesh.preRender = () => {

            const delta = ( Date.now() - start ) / duration;

            this.power = true;
            this.controls.forEach( control => { if ( control.state && !control.power ) control.toggle( true ); } );
            if ( delta > 1.0 ) {
                this.mesh.preRender = null;
                this.indicators.forEach( indicator => indicator.falseState( indicator.state ) );
                return;
            }

            let dark = false;
            if      ( delta < 0.05 ) dark = true;
            else if ( delta < 0.10 ) dark = false;
            else if ( delta < 0.30 ) dark = true;
            else if ( delta < 0.35 ) dark = false;
            else if ( delta < 0.40 ) dark = true;
            else if ( delta < 0.45 ) dark = false;
            else if ( delta < 0.95 ) dark = true;

            this.indicators.forEach( indicator => indicator.setFade( dark ? 0 : 1 ) );
        };

        this.power = true;
    }
    turnOff() {
        this.power = false;

        const duration = 500;
        const start    = Date.now();

        this.mesh.preRender = () => {

            const delta = Date.now() - start;
            if ( delta > duration ) {
                this.mesh.preRender = null;
                this.indicators.forEach( indicator => indicator.toggle( false ) );
                return;
            }
            this.indicators.forEach( indicator => indicator.setFade( delta / duration ) );
            this.gauges.forEach( gauge => gauge.set( 0 ) );
        };

    }
};

Cockpit.Gadget = class extends EventDispatcher {

    constructor( name, mesh ) {

        super();
        this.name = name;
        this.mesh = mesh.clone();
        this.power = false;

        this.mesh.userData.gadget = this;

    }
    dispatch( type, event ) {

        if ( this.power || ( this.parent && this.parent.power ) )
            super.dispatch( type, event );

    }
};

Cockpit.Indicator = class extends Cockpit.Gadget {};
Cockpit.Control   = class extends Cockpit.Gadget {};
Cockpit.Gauge     = class extends Cockpit.Gadget {

    constructor( name, meshName ) {

        super( name, meshName );
        // inertia
        this.unitDuration = 1000; // millis to move from min to max.

        this.value = 0;
        this.displayValue = 0;

        this.setFrom = 0;
        this.setWhen = Date.now();
        // inertia end
    }

    set( value ) {

        if ( this.value === value ) return;

        this.setWhen = Date.now();
        this.setFrom = this.displayValue;


        this.value = value;

        // 0 is needle up
        // c is from down to 0

        if ( this.timer ) clearInterval( this.timer );
        this.timer = setInterval( () => {
            // TODO: preRender.

            let delta = ( Date.now() - this.setWhen ) / this.unitDuration;
            if ( value < this.displayValue )
                delta = -delta;

            this.displayValue = this.setFrom + delta;
            if ( ( delta < 0 && this.displayValue < value ) ||
                 ( delta > 0 && this.displayValue > value ) ) {
                this.displayValue = value;
                clearTimeout( this.timer );
                this.timer = null;
            }
            this.update( this.displayValue );

        }, 16 );

    }

};

Cockpit.Switch = class extends Cockpit.Control {

    constructor( name ) {

        super( name, Cockpit.meshes.switch, true );

        this.rotation = this.mesh.skeleton.bones[ 0 ].rotation;
        this.toggle( false );

    }
    toggle( state ) {

        this.state = state === undefined ? !this.state : !!state;
        this.rotation.x = this.state ? -Math.PI / 6 : Math.PI / 6;

        this.dispatch( 'change', this.state );

    }

};

Cockpit.Button = class extends Cockpit.Control {

    constructor( name ) {

        super( name, Cockpit.meshes.button );

        this.position = this.mesh.skeleton.bones[ 0 ].position;
        this.toggle( false );

    }
    toggle( state ) {
        this.state = state === undefined ? !this.state : !!state;
        this.position.y = this.state ? -0.002 : 0;
        this.dispatch( 'change', this.state );
    }

};

Cockpit.Led = class extends Cockpit.Indicator {

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
    setFade( fade ) {

        if ( !this.state ) return;
        this.lightMaterial.color.copy( Cockpit.ledColors.on ).lerp( Cockpit.ledColors.off, fade );

    }
    falseState( state ) {
        this.lightMaterial.color.copy( Cockpit.ledColors[ state ? 'on' : 'off' ] );
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
        textureMaterial.color.setRGB( 1,1,1 ); // DEBUG

    }
    makeTexture( size, keyword, fgColor, bgColor ) {

        const canvas  = document.createElement( 'canvas' );

        let scaleX = 1;
        if ( size === 'large' ) {
            canvas.height = 256;
            canvas.width  = 1024;
            scaleX = 1 / ( Cockpit.labelWidth.large * canvas.height / canvas.width );
        }
        if ( size === 'small' ) {
            canvas.height = 256;
            canvas.width  = 512;
            scaleX = 1 / ( Cockpit.labelWidth.small * canvas.height / canvas.width );
        }

        const ctx     = canvas.getContext( '2d' );
        const texture = new THREE.Texture( canvas );

        //texture.magFilter = THREE.NearestFilter;
        //texture.minFilter = THREE.NearestFilter;

        const text = Cockpit.labels[ keyword ] || keyword;
        ctx.font = `bold ${Math.round( canvas.height * 0.8 )}px arial`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';

        ctx.strokeStyle = '#000';
        ctx.lineJoin = 'round';
        ctx.lineWidth = Math.round( canvas.height / 10 );


        ctx.fillStyle = bgColor;
        ctx.fillRect( 0,0, canvas.width, canvas.height );

        ctx.fillStyle = fgColor;
        ctx.save();
        ctx.scale( scaleX, 1 );
        ctx.beginPath();
        ctx.strokeText( text, canvas.width / 2 / scaleX ,canvas.height / 2 );
        ctx.fillText  ( text, canvas.width / 2 / scaleX ,canvas.height / 2 );
        ctx.restore();

        texture.needsUpdate = true;
        return texture;

    }

};

Cockpit.makeGlass = function( material ) {
    material.transparent = true;
    material.opacity = 0.2;
};

Cockpit.Analog = class extends Cockpit.Gauge {

    constructor( name, meshName ) {

        super( name, Cockpit.meshes[ meshName ] );

        this.rotation = this.mesh.skeleton.bones[ 0 ].rotation;
        this.mesh.material = this.mesh.material.clone();
        const textureMaterial = this.mesh.material.materials.find( material => material.name.match( /^texture/ ) );
        textureMaterial.color.setRGB( 1,1,1 ); // DEBUG
        textureMaterial.map = this.makeTexture();

        this.mesh.material.materials
            .filter( material => material.name.match( /^glass/ ) )
            .forEach( Cockpit.makeGlass );

        this.update( 0 );

    }
    update( value ) {
        const full      = Math.PI * 2;
        const c         = full * 1.5 / 13;
        const start     = Math.PI - c;
        this.rotation.z = start - value * ( full - ( c * 2 ) );
    }
    makeTexture() {

        this.ticks   = [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 ];
        this.between = 4;
        this.bg      = 'black';
        this.fg      = 'white';
        this.numbers = '#fff';
        this.marks   = '#fff';

        const canvas  = document.createElement( 'canvas' );
        canvas.width  = 1024;
        canvas.height = 1024;
        const ctx     = canvas.getContext( '2d' );
        const texture = new THREE.Texture( canvas );

        const unit = canvas.height / 64;


        //texture.magFilter = THREE.NearestFilter;
        //texture.minFilter = THREE.NearestFilter;
        texture.needsUpdate = true;

        // ctx.clearRect( 0,0, canvas.width, canvas.height );

        ctx.strokeStyle = this.marks;
        ctx.fillStyle   = this.marks;

        ctx.font = `bold ${Math.round( unit * 5 )}px arial`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        // ctx.shadowColor = '#333';
        // ctx.shadowBlur = unit * 0;
        // ctx.shadowOffsetX = unit * 0.2;
        // ctx.shadowOffsetY = unit * 0.2;


        let i, N, angle;
        const c = 1.5 / 13;
        const r = ( 1 - ( 2 * c ) );
        const pad = Math.round( unit * 0.2 );
        const cx  = canvas.width / 2;
        const cy  = canvas.height / 2;
        const rad = cx - pad;
        const rad2 = rad - unit * 1.5;
        const rad3 = rad2 - unit * 2;
        const rad4 = rad3 - unit * 3;

        let x, y, x2, y2;

        ctx.beginPath();

        for ( i = 0, N = ( ( this.ticks.length - 1 ) * ( this.between + 1 ) ) + 1; i < N; i++ ) {

            if ( i % ( this.between + 1 ) === 0 )
                continue;

            angle = ( c + ( i / ( N - 1 ) ) * r ) * Math.PI * 2;

            x  = cx + rad  * Math.sin( angle );
            y  = cy + rad  * Math.cos( angle );
            x2 = cx + rad2 * Math.sin( angle );
            y2 = cy + rad2 * Math.cos( angle );

            ctx.moveTo( x, y );
            ctx.lineTo( x2, y2 );

        }
        ctx.lineWidth = 0.5 * unit;
        ctx.stroke();


        ctx.beginPath();
        for ( i = 0, N = this.ticks.length; i < N; i++ ) {

            angle = ( c + ( i / ( N - 1 ) ) * r ) * Math.PI * 2;

            x  = cx + rad  * Math.sin( angle );
            y  = cy + rad  * Math.cos( angle );

            x2 = cx + rad3 * Math.sin( angle );
            y2 = cy + rad3 * Math.cos( angle );

            ctx.moveTo( x, y );
            ctx.lineTo( x2, y2 );

        }
        ctx.lineWidth = unit;
        ctx.stroke();


        ctx.lineWidth = unit;
        ctx.fillStyle   = this.numbers;
        for ( i = 0, N = this.ticks.length; i < N; i++ ) {

            angle = ( c + ( i / ( N - 1 ) ) * r ) * Math.PI * 2;

            x = cx - rad4 * Math.sin( angle );
            y = cy + rad4 * Math.cos( angle );

            //ctx.strokeText( '' + this.ticks[ i ], x, y + 7 );
            ctx.fillText( '' + this.ticks[ i ], x, y + 7 );

        }

        return texture;

    }
};

Cockpit.Digital = class extends Cockpit.Gauge {

    constructor( name, meshName ) {

        super( name, Cockpit.meshes[ meshName ] );

        this.mesh.material = this.mesh.material.clone();
        const textureMaterial = this.mesh.material.materials.find( material => material.name.match( /^texture/ ) );
        textureMaterial.color.setRGB( 1,1,1 ); // DEBUG
        textureMaterial.map = this.makeTexture();

        this.update( 0 );

        this.mesh.material.materials
            .filter( material => material.name.match( /^glass/ ) )
            .forEach( Cockpit.makeGlass );
    }
    update( value ) {

        value = Math.floor( value * 10 );
        if ( value === this.lastValue )
            return;
        this.lastValue = value;

        this.texture.needsUpdate = true;

        const ctx  = this.canvas.getContext( '2d' );
        const unit = this.canvas.width / 29;

        ctx.clearRect( 0,0, this.canvas.width, this.canvas.height );

        ctx.fillStyle   = '#0ff';

        for ( let i = 0; i < value; i++ ) {
            const x1 = i * unit * 3;
            ctx.fillRect( x1, 0, unit * 2, this.canvas.height );
        }


    }
    makeTexture() {

        this.canvas  = document.createElement( 'canvas' );
        this.canvas.width  = 256;
        this.canvas.height = 1;
        this.texture = new THREE.Texture( this.canvas );

        //this.texture.magFilter = THREE.NearestFilter;
        //this.texture.minFilter = THREE.NearestFilter;


        return this.texture;

    }
};

Cockpit.Fake = class extends Cockpit.Gauge {

    constructor( name, meshName ) {

        super( name, Cockpit.meshes[ meshName ] );

        this.mesh.material = this.mesh.material.clone();
        const textureMaterial = this.mesh.material.materials.find( material => material.name.match( /^texture/ ) );
        textureMaterial.color.setRGB( 1,1,1 ); // DEBUG
        textureMaterial.map = this.makeTexture();

        this.update( 0 );

        this.mesh.material.materials
            .filter( material => material.name.match( /^glass/ ) )
            .forEach( Cockpit.makeGlass );
    }
    update( value ) {

        if ( value === this.lastValue )
            return;
        this.lastValue = value;

        this.texture.needsUpdate = true;

        const ctx  = this.canvas.getContext( '2d' );
        const unit = this.canvas.height / 64;


        //texture.magFilter = THREE.NearestFilter;
        //texture.minFilter = THREE.NearestFilter;

        ctx.clearRect( 0,0, this.canvas.width, this.canvas.height );

        ctx.strokeStyle = this.marks;
        ctx.fillStyle   = this.marks;

        ctx.font = `bold ${Math.round( unit * 5 )}px arial`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        // ctx.shadowColor = '#333';
        // ctx.shadowBlur = unit * 0;
        // ctx.shadowOffsetX = unit * 0.2;
        // ctx.shadowOffsetY = unit * 0.2;


        let i, N, angle;
        const c = 1.5 / 13;
        const r = ( 1 - ( 2 * c ) );
        const pad = Math.round( unit * 0.2 );
        const cx  = this.canvas.width / 2;
        const cy  = this.canvas.height / 2;
        const rad = cx - pad;
        const rad2 = rad - unit * 1.5;
        const rad3 = rad2 - unit * 2;
        const rad4 = rad3 - unit * 3;
        const rad5 = rad4 - unit * 3;

        let x, y, x2, y2, x3, y3;

        ctx.beginPath();

        for ( i = 0, N = ( ( this.ticks.length - 1 ) * ( this.between + 1 ) ) + 1; i < N; i++ ) {

            if ( i % ( this.between + 1 ) === 0 )
                continue;

            angle = ( c + ( i / ( N - 1 ) ) * r ) * Math.PI * 2;

            x  = cx + rad  * Math.sin( angle );
            y  = cy + rad  * Math.cos( angle );
            x2 = cx + rad2 * Math.sin( angle );
            y2 = cy + rad2 * Math.cos( angle );

            ctx.moveTo( x, y );
            ctx.lineTo( x2, y2 );

        }
        ctx.lineWidth = 0.5 * unit;
        ctx.stroke();


        ctx.beginPath();
        for ( i = 0, N = this.ticks.length; i < N; i++ ) {

            angle = ( c + ( i / ( N - 1 ) ) * r ) * Math.PI * 2;

            x  = cx + rad  * Math.sin( angle );
            y  = cy + rad  * Math.cos( angle );

            x2 = cx + rad3 * Math.sin( angle );
            y2 = cy + rad3 * Math.cos( angle );

            ctx.moveTo( x, y );
            ctx.lineTo( x2, y2 );

        }
        ctx.lineWidth = unit;
        ctx.stroke();


        ctx.lineWidth = unit;
        ctx.fillStyle   = this.numbers;
        for ( i = 0, N = this.ticks.length; i < N; i++ ) {

            angle = ( c + ( i / ( N - 1 ) ) * r ) * Math.PI * 2;

            x = cx - rad4 * Math.sin( angle );
            y = cy + rad4 * Math.cos( angle );

            //ctx.strokeText( '' + this.ticks[ i ], x, y + 7 );
            ctx.fillText( '' + this.ticks[ i ], x, y + 7 );

        }

        const val = c + ( value / ( 1 + ( 2.6 * c ) ) );

        x  = cx + rad2 * Math.sin( ( +val ) * -Math.PI * 2 );
        y  = cy + rad2 * Math.cos( ( +val ) * -Math.PI * 2 );
        x2 = cx + rad5 * Math.sin( ( +val + 0.005 ) * -Math.PI * 2 );
        y2 = cy + rad5 * Math.cos( ( +val + 0.005 ) * -Math.PI * 2 );
        x3 = cx + rad5 * Math.sin( ( +val - 0.005 ) * -Math.PI * 2 );
        y3 = cy + rad5 * Math.cos( ( +val - 0.005 ) * -Math.PI * 2 );

        ctx.beginPath();
        ctx.moveTo( cx, cy );
        ctx.lineTo( x2, y2 );
        ctx.lineTo( x, y );
        ctx.lineTo( x3, y3 );
        ctx.closePath();

        ctx.lineWidth = unit;

        ctx.fillStyle = ctx.strokeStyle = 'rgba( 64,64,64, 0.2 )';
        ctx.stroke();
        ctx.fill();

        ctx.lineWidth = 3;
        ctx.fillStyle = ctx.strokeStyle = this.needle;
        ctx.stroke();
        ctx.fill();

        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc( cx, cy, unit * 3, 0, 2 * Math.PI );
        ctx.fill();



    }
    makeTexture() {

        this.ticks   = [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 ];
        this.between = 4;
        this.bg      = 'black';
        this.fg      = 'white';
        this.numbers = '#fff';
        this.marks   = '#fff';
        this.needle  = '#fff';

        this.canvas  = document.createElement( 'canvas' );
        this.canvas.width  = 1024;
        this.canvas.height = 1024;
        this.texture = new THREE.Texture( this.canvas );

        return this.texture;

    }
};


Cockpit.Analog1 = class extends Cockpit.Analog { constructor( name ) { super( name, 'analog-a1' ); } };
Cockpit.Analog2 = class extends Cockpit.Analog { constructor( name ) { super( name, 'analog-a2' ); } };
Cockpit.Analog3 = class extends Cockpit.Analog { constructor( name ) { super( name, 'analog-a3' ); } };

Cockpit.Digital1 = class extends Cockpit.Digital { constructor( name ) { super( name, 'digital-b1' ); } };
Cockpit.Digital2 = class extends Cockpit.Digital { constructor( name ) { super( name, 'digital-b2' ); } };
Cockpit.Digital3 = class extends Cockpit.Digital { constructor( name ) { super( name, 'digital-b3' ); } };

Cockpit.Fake1 = class extends Cockpit.Fake { constructor( name ) { super( name, 'fake-c1' ); } };
Cockpit.Fake2 = class extends Cockpit.Fake { constructor( name ) { super( name, 'fake-c2' ); } };
Cockpit.Fake3 = class extends Cockpit.Fake { constructor( name ) { super( name, 'fake-c3' ); } };
