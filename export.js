#!/usr/bin/env node
"use strict";

const BLENDER_PATHS = [
    '/Applications/Blender/blender.app/Contents/MacOS/blender',
    'C:/Program Files/Blender/blender.exe',
];

const CONFIG = 'config.json';
const SCRIPT = 'blender-export.py';

let blender;

const fs       = require( 'fs' );
const execFile = require( 'child_process' ).execFile;

function fileExists( filePath ) {

    try { return fs.statSync( filePath ).isFile(); }
    catch ( err ) { return false; }

}

function initConfig() {

    console.log( 'Looking for Blender executable...' );

    const path = BLENDER_PATHS.find( p => fileExists( p ) );

    if ( !path ) {
        console.log( 'Blender not found...' );
        throw new Error( 'no found' );
    }

    fs.writeFileSync( CONFIG, JSON.stringify( path ) );
}

function init() {

    if ( !fileExists( CONFIG ) ) {
        initConfig();
    }
    blender = JSON.parse( fs.readFileSync( CONFIG ) );

    if ( !fileExists( blender ) ) {
        fs.unlinkSync( CONFIG );
        init();
    }

}

init();
console.log( 'Blender at', blender );
const blends = process.argv.slice( 2 );

blends.forEach( () => process.stdout.write( '\u00b7' ) );
process.stdout.write( '\r' );

const errors = [];

blends.forEach( ( blend, index ) => {

    const target = blend.replace( /.blend$/, '.three.json' );

    execFile( blender, [ blend, '--background', '--python', SCRIPT, '--', target ],
              ( error, stdout, stderr ) => {

                  const move  = index > 0 ? `\x1b[${index}C` : '';
                  const col   = error ? '\x1b[0;31m' : '\x1b[0;32m';
                  const mark  = error ? '\u2718'     : '\u2714';
                  const reset = '\x1b[0m';
                  const hide = `\r\x1b[${blends.length}C`;

                  process.stdout.write( `\r${move}${col}${mark}${reset}${hide}` );

                  if ( error )
                      errors.push( { blend: blend, error: error, stdout: stdout, stderr: stderr  } );

              } );

} );

process.on( 'exit', () => {
    console.log( '\r' );
    if ( errors.length === 0 ) {
        console.log( 'Done!' );
        return;
    }
    errors.forEach( error => {
        console.log( 'File:', error.blend );
        console.log( 'Command:', error.error.cmd );
        console.log( 'Stdout:\n' + error.stdout );
        // console.log( 'Stderr:\n' + error.stderr );
    } );

} );
