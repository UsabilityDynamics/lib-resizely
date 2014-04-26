/**
 * Resizely UDX Client
 *
 * @author potanin@UD
 */
define( 'resizely', [ 'jquery', 'udx.utility.imagesloaded' ], function Reizely( jq, imagesLoaded ) {
  console.debug( 'resizely', 'loaded' );

  var settings = {
    tag: 'data-src',
    // Override to set a manual screen width
    sw: screen.width,
    sh: screen.height, /** Override to set a manual screen height */
    d: 'resize.ly', /** Change the domain that resize.ly is using (for debugging) */
    dpr: ( 'devicePixelRatio' in window ? devicePixelRatio : '1' ), /** Override to set a manual DPR */
    debug: false, /** Enable debug mode to see extra console messages */
    bp: 250, /** Set the breakpoints for images */
    minbp: 500, /** Set the minimum breakpoint for images */
    fp: null, /** Try to force premium status on an image */
    fu: null, /** Force Resize.ly to rerender the image on each request */
    fw: null /** Force Resize.ly to watermark the image on render */
  };

  /**
   * Base64 Encoding Method
   *
   * @license Public Domain
   * Based on public domain code by Tyler Akins <http://rumkin.com/>
   * Original code at http://rumkin.com/tools/compression/base64.php
   */
  function base64Encode( data ) {
    // console.debug( 'resizely', 'base64Encode' );

    var out = "", c1, c2, c3, e1, e2, e3, e4, i, tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789*!~";

    for( i = 0; i < data.length; ) {
      c1 = data.charCodeAt( i++ );
      c2 = data.charCodeAt( i++ );
      c3 = data.charCodeAt( i++ );
      e1 = c1 >> 2;
      e2 = ( ( c1 & 3 ) << 4 ) + ( c2 >> 4 );
      e3 = ( ( c2 & 15 ) << 2 ) + ( c3 >> 6 );
      e4 = c3 & 63;
      if( isNaN( c2 ) ) {
        e3 = e4 = 64;
      } else if( isNaN( c3 ) ) {
        e4 = 64;
      }
      out += tab.charAt( e1 ) + tab.charAt( e2 ) + tab.charAt( e3 ) + tab.charAt( e4 );
    }

    return out;
  }

  /**
   * RC4 symmetric cipher encryption/decryption
   *
   * https://gist.github.com/2185197
   *
   * @license Public Domain
   * @param {string} key - secret key for encryption/decryption
   * @param {string} str - string to be encrypted/decrypted
   * @return {string}
   */
  function generateRc4( key, str ) {
    // console.debug( 'resizely', 'rc4' );

    var i, y, s = [], j = 0, x, res = '';
    for( i = 0; i < 256; i++ ) {
      s[ i ] = i;
    }
    for( i = 0; i < 256; i++ ) {
      j = ( j + s[ i ] + key.charCodeAt( i % key.length ) ) % 256;
      x = s[ i ];
      s[ i ] = s[ j ];
      s[ j ] = x;
    }
    i = 0;
    j = 0;
    for( y = 0; y < str.length; y++ ) {
      i = ( i + 1 ) % 256;
      j = ( j + s[ i ] ) % 256;
      x = s[ i ];
      s[ i ] = s[ j ];
      s[ j ] = x;
      res += String.fromCharCode( str.charCodeAt( y ) ^ s[ ( s[ i ] + s[ j ] ) % 256 ] );
    }
    return res;
  }

  /**
   * This function takes the '_img' attribute for all images and uses it to call out to resize.ly to properly
   * size the other images
   *
   * @param {int} i Counter
   * @param {object} e Image element as discovered by jQuery
   */
  function changeSrc( i, e ) {
    console.debug( 'resizely', 'changeSrc', i, e );

    /** Init Vars */
    var $e = $( e );
    var x = settings.sw + 'x' + settings.sh + ',' + settings.dpr;
    var o = window.location.protocol + '//' + window.location.host;
    var p = window.location.pathname;
    var newSrc;
    var ew = 0;
    var eh = 0;
    var src = $e.attr( settings.tag );
    var dw = $e.attr( 'data-width' );
    var dh = $e.attr( 'data-height' );

    /**
     *
     * @param data
     */
    function onImageLoad( data ) {
      console.debug( 'resizely', 'onImageLoad' );

      /** If our image is the transparent dot, we should just bail */
      if( $e.attr( 'src' ) !== transparentPlaceholder ) {
        return;
      }

      /** Get our calculated widths */
      ew = $e.width();
      eh = $e.height();

      /** Debug */
      if( settings.debug ) {
        console.debug( 'resizely', '==== Image: ' + $e.attr( settings.tag ) );
        console.debug( 'resizely', 'Calculated dimensions: ' + ew + ' x ' + eh + ' on ' + x );
      }

      /** If the height and width are only 1px, then we know that we need to try setting the width inline */
      if( ( ew === 1 && eh === 1 ) || ( !ew && !eh ) ) {

        if( settings.debug ) {
          console.debug( 'resizely', 'Could not determine dimensions. Setting manual width.' );
        }

        $e.attr( '_style', $e.attr( 'style' ) );
        $e.attr( 'style', ( typeof $e.attr( '_style' ) !== 'undefined' ? $e.attr( '_style' ).toString() : '' ) + 'width: 100% !important;' );

        /** We do one final assignment, and that's it */
        ew = $e.width();

        /** Now restore it */
        $e.attr( 'style', ( typeof $e.attr( '_style' ) === 'undefined' ? '' : $e.attr( '_style' ) ) );
        $e.removeAttr( '_style' );

        /** Get rid of our height determination */
        eh = 0;
      }

      /** Ok, if the height and width are equal, change the width to some arbitrary number between 10 and 100 */
      if( ew === eh ) {

        /** Backup the width, set the width, and check to see if width and height are still equal */
        $e.attr( '_style', $e.attr( 'style' ) );
        $e.attr( 'style', ( typeof $e.attr( '_style' ) !== 'undefined' ? $e.attr( '_style' ).toString() : '' ) + 'width: ' + Math.floor( Math.random() * ( 100 - 10 + 1 ) + 10 ).toString() + 'px !important;' );

        /** Setup our test variables */
        var tw = $e.width(), th = $e.height();

        /** Restore the old widths */
        $e.attr( 'style', ( typeof $e.attr( '_style' ) === 'undefined' ? '' : $e.attr( '_style' ) ) );
        $e.removeAttr( '_style' );

        /** Ok, so they're equal - this is probably an auto-height element, however, check defined styles or attributes first */
        if( tw === th && !$e.attr( 'height' ) ) {
          eh = 0;
        }
      }

      /** Ok, now we should check our breakpoints and see if we should be using them */
      if( ew >= settings.minbp ) {

        /** Ok, round up to the nearest breakpoint */
        var oew = ew;
        ew = ew - ( ew % settings.bp ) + settings.bp;

        /** Now if we have a height, calculate the new height */
        if( eh ) {
          eh = Math.round( eh * ( ew / oew ) );
        }

      }

      /** Ok, lets see if we have data-width or data-height defined */
      if( dw ) {

        if( settings.debug ) {
          console.debug( 'resizely', 'Manual dimensions found for width.' );
        }

        ew = dw;
      }

      if( dh ) {
        if( settings.debug ) {
          console.debug( 'resizely', 'Manual dimensions found for height.' );
        }
        eh = dh;
      }

      /** Debug */
      if( settings.debug ) {
        console.debug( 'resizely', 'New Dimensions: ' + ew + "x" + eh );
      }

      /** Update the image source */
      if( src && !( src.substring( 0, 5 ) === 'http:' || src.substring( 0, 6 ) === 'https:' ) ) {
        if( src.substring( 0, 1 ) === '/' ) {
          src = o + src;
        } else {
          src = o + p.substring( 0, p.lastIndexOf( '/' ) + 1 ) + src;
        }
      }

      /** Set a low width/height */
      $e.attr( '_style', $e.attr( 'style' ) );
      $e.attr( 'style', ( typeof $e.attr( '_style' ) !== 'undefined' ? $e.attr( '_style' ).toString() : '' ) + 'width: 1px !important; height: 1px !important;' );

      /** Generate the new src */
      newSrc = window.location.protocol + '//' + settings.d + '/' + ( ew ? ew : '' ) + 'x' + ( eh ? eh : '' ) + '/' + src + '?x=' + base64Encode( generateRc4( 'rly', x ) );

      /** Now, see if we have any additional parameters */
      if( typeof settings.fp === 'boolean' ) {
        newSrc = newSrc + '&force_premium=' + ( settings.fp ? '1' : '0' );
      }

      if( typeof settings.fu === 'boolean' ) {
        newSrc = newSrc + '&force_update=' + ( settings.fu ? '1' : '0' );
      }

      if( typeof settings.fw === 'boolean' ) {
        newSrc = newSrc + '&force_watermark=' + ( settings.fw ? '1' : '0' );
      }

      /** Listen for the image loaded event, and restore the button when it comes */
      imagesLoaded( e, function() {
        console.debug( 'resizely', 'imagesLoaded', 'again..' );
        $e.attr( 'style', ( typeof $e.attr( '_style' ) === 'undefined' ? '' : $e.attr( '_style' ) ) );
        $e.removeAttr( '_style' );
      } );

      /** Change the attribute */
      $e.attr( 'src', newSrc );

    }

    /** We can't find a width or a height, we should replace the image to find its width */
    var transparentPlaceholder = window.location.protocol + '//' + settings.d + '/img/transparent_dot.png';

    if( settings.debug ) {
      transparentPlaceholder = window.location.protocol + '//' + settings.d + '/img/transparent_red_dot.png';
    }

    /** Listen for the image loaded event */
    imagesLoaded( e, onImageLoad );

    /** Change our attribute */
    $e.attr( 'src', transparentPlaceholder );

    // Remove initial tag.
    if( settings.tag !== 'src' ) {
      $e.removeAttr( settings.tag );
    }

    /** Return this */
    return this;

  }

  /**
   * Execute on DOM Ready.
   *
   */
  return function domnReady() {
    console.debug( 'resizely', 'domnReady' );

    if( 'function' !== typeof imagesLoaded ) {
      return console.error( 'imagesLoaded not a function.' );
    }

    if( 'function' !== typeof jQuery ) {
      return console.error( 'jQuery is not available.' );
    }

    settings.tag = 'data-src';

    jQuery( 'img[data-src]:visible', this ).each( changeSrc );

    return this;

  }

});

