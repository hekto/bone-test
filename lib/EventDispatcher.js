/**
 * modified from https://github.com/mrdoob/eventdispatcher.js by github/hekto
 * es2015 + .on .off
 */

"use strict";
const EventDispatcher = class { // eslint-disable-line no-redeclare

    apply( object ) {

        object.addEventListener    = EventDispatcher.prototype.addEventListener;
        object.hasEventListener    = EventDispatcher.prototype.hasEventListener;
        object.removeEventListener = EventDispatcher.prototype.removeEventListener;
        object.dispatchEvent       = EventDispatcher.prototype.dispatchEvent;

    }

    on( type, listener ) {

        if ( this._listeners === undefined ) this._listeners = {};
        const listeners = this._listeners;

        if ( listeners[ type ] === undefined )
            listeners[ type ] = [];

        if ( listeners[ type ].indexOf( listener ) === - 1 )
            listeners[ type ].push( listener );

    }

    hasEventListener( type, listener ) {

        if ( this._listeners === undefined ) return false;
        const listeners = this._listeners;
        if ( listeners[ type ] !== undefined && listeners[ type ].indexOf( listener ) !== - 1 )
            return true;

        return false;

    }

    off( type, listener ) {

        if ( this._listeners === undefined ) {
            console.error( 'No such listener for', type );
            return;
        }

        const listeners = this._listeners;
        const listenerArray = listeners[ type ];

        if ( listenerArray === undefined ) {
            console.error( 'No such listener for', type );
            return;
        }

        const index = listenerArray.indexOf( listener );
        if ( index !== - 1 )
            listenerArray.splice( index, 1 );
        else
            console.error( 'No such listener for', type );

        if ( listenerArray.length === 0 )
            delete listeners[ type ];

    }

    dispatch ( type, event ) {

        if ( this._listeners === undefined ) return;

        const listeners = this._listeners;
        const listenerArray = listeners[ type ];

        if ( listenerArray === undefined )
            return;

        // event.target = this;

        const array = [];
        const length = listenerArray.length;

        for ( let i = 0; i < length; i ++ )
            array[ i ] = listenerArray[ i ];

        for ( let i = 0; i < length; i ++ )
            array[ i ].call( this, event );

    }

};
window.EventDispatcher = EventDispatcher;
