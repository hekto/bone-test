"use strict";

const superstatic = require( 'superstatic' );
const connect     = require( 'connect' );

const app = connect().use( superstatic() );

app.listen( 8080, function () {
    console.log( 'Server started. http://localhost:8080/' );
} );
