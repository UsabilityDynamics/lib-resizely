/**
 * Resize.ly jQuery Plugin
 * jQuery plugin that makes your images Retina and responsive when coupled
 * with the dynamic image delivery service Resize.ly
 * @copyright 2013 Resize.ly
 * @link https://github.com/UsabilityDynamics/resizely-jquery
 * @includes imagesLoaded v3.0.4
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

/**
 * imagesLoaded PACKAGED v3.0.4
 * JavaScript is all like "You images are done yet or what?"
 * @link http://desandro.github.io/imagesloaded/
 * @author David DeSandro
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */


if( typeof jQuery === 'function' ) {
  (function( $ ) {
    'use strict';

    /**
     * Setup our settings variable
     *
     */
    var s = {
        tag: 'data-src',
        sw: screen.width, /** Override to set a manual screen width */
        sh: screen.height, /** Override to set a manual screen height */
        d: 'resize.ly', /** Change the domain that resize.ly is using (for debugging) */
        dpr: ( 'devicePixelRatio' in window ? devicePixelRatio : '1' ), /** Override to set a manual DPR */
        dbg: false, /** Enable debug mode to see extra console messages */
        bp: 250, /** Set the breakpoints for images */
        minbp: 500, /** Set the minimum breakpoint for images */
        fp: null, /** Try to force premium status on an image */
        fu: null, /** Force Resize.ly to rerender the image on each request */
        fw: null /** Force Resize.ly to watermark the image on render */
      },

      /**
       *
       * Setup our methods
       */
      f = {
        /**
         * Base64 Encoding Method
         * @license Public Domain
         * Based on public domain code by Tyler Akins <http://rumkin.com/>
         * Original code at http://rumkin.com/tools/compression/base64.php
         */
        base64_encode: function( data ) {
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
        },

        /**
         * RC4 symmetric cipher encryption/decryption
         * https://gist.github.com/2185197
         * @license Public Domain
         * @param {string} key - secret key for encryption/decryption
         * @param {string} str - string to be encrypted/decrypted
         * @return {string}
         */
        rc4: function( key, str ) {
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
        },

        /**
         * This function takes the '_img' attribute for all images and uses it to call out to resize.ly to properly
         * size the other images
         * @param {int} i Counter
         * @param {object} e Image element as discovered by jQuery
         */
        changeSrc: function( i, e ) {

          /** Init Vars */
          var $e = $( e ), src = $e.attr( s.tag ), x = s.sw + 'x' + s.sh + ',' + s.dpr, o = window.location.protocol + '//' + window.location.host, p = window.location.pathname, newSrc, ew = 0, eh = 0, dw = $e.attr( 'data-width' ), dh = $e.attr( 'data-height' );

          /** We can't find a width or a height, we should replace the image to find its width */
          var transparent_img = window.location.protocol + '//' + s.d + '/img/transparent_dot.png';
          if( s.dbg ) {
            transparent_img = window.location.protocol + '//' + s.d + '/img/transparent_red_dot.png';
          }

          /** Listen for the image loaded event */
          imagesLoaded( e, function() {

            /** If our image is the transparent dot, we should just bail */
            if( $e.attr( 'src' ) != transparent_img ) {
              return;
            }

            /** Get our calculated widths */
            ew = $e.width(), eh = $e.height();

            /** Debug */
            if( s.dbg ) {
              console.log( '==== Image: ' + $e.attr( s.tag ) );
              console.log( 'Calculated dimensions: ' + ew + ' x ' + eh + ' on ' + x );
            }

            /** If the height and width are only 1px, then we know that we need to try setting the width inline */
            if( ( ew === 1 && eh === 1 ) || ( !ew && !eh ) ) {
              if( s.dbg ) {
                console.log( 'Could not determine dimensions. Setting manual width.' );
              }
              $e.attr( '_style', $e.attr( 'style' ) );
              $e.attr( 'style', ( typeof $e.attr( '_style' ) != 'undefined' ? $e.attr( '_style' ).toString() : '' ) + 'width: 100% !important;' );
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
              $e.attr( 'style', ( typeof $e.attr( '_style' ) != 'undefined' ? $e.attr( '_style' ).toString() : '' ) + 'width: ' + Math.floor( Math.random() * ( 100 - 10 + 1 ) + 10 ).toString() + 'px !important;' );
              /** Setup our test variables */
              var tw = $e.width(), th = $e.height();
              /** Restore the old widths */
              $e.attr( 'style', ( typeof $e.attr( '_style' ) === 'undefined' ? '' : $e.attr( '_style' ) ) );
              $e.removeAttr( '_style' );
              if( tw === th ) {
                /** Ok, so they're equal - this is probably an auto-height element, however, check defined styles or attributes first */
                if( !$e.attr( 'height' ) ) {
                  eh = 0;
                }
              }
            }

            /** Ok, now we should check our breakpoints and see if we should be using them */
            if( ew >= s.minbp ) {
              /** Ok, round up to the nearest breakpoint */
              var oew = ew;
              ew = ew - ( ew % s.bp ) + s.bp;
              /** Now if we have a height, calculate the new height */
              if( eh ) {
                eh = Math.round( eh * ( ew / oew ) );
              }
            }

            /** Ok, lets see if we have data-width or data-height defined */
            if( dw ) {
              if( s.dbg ) {
                console.log( 'Manual dimensions found for width.' );
              }
              ew = dw;
            }

            if( dh ) {
              if( s.dbg ) {
                console.log( 'Manual dimensions found for height.' );
              }
              eh = dh;
            }

            /** Debug */
            if( s.dbg ) {
              console.log( 'New Dimensions: ' + ew + "x" + eh );
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
            $e.attr( 'style', ( typeof $e.attr( '_style' ) != 'undefined' ? $e.attr( '_style' ).toString() : '' ) + 'width: 1px !important; height: 1px !important;' );

            /** Generate the new src */
            newSrc = window.location.protocol + '//' + s.d + '/' + ( ew ? ew : '' ) + 'x' + ( eh ? eh : '' ) + '/' + src + '?x=' + f.base64_encode( f.rc4( 'rly', x ) );

            /** Now, see if we have any additional parameters */
            if( typeof s.fp === 'boolean' ) {
              newSrc = newSrc + '&force_premium=' + ( s.fp ? '1' : '0' );
            }
            if( typeof s.fu === 'boolean' ) {
              newSrc = newSrc + '&force_update=' + ( s.fu ? '1' : '0' );
            }
            if( typeof s.fw === 'boolean' ) {
              newSrc = newSrc + '&force_watermark=' + ( s.fw ? '1' : '0' );
            }

            /** Listen for the image loaded event, and restore the button when it comes */
            imagesLoaded( e, function() {
              /** Restore the width */
              $e.attr( 'style', ( typeof $e.attr( '_style' ) === 'undefined' ? '' : $e.attr( '_style' ) ) );
              $e.removeAttr( '_style' );
            } );

            /** Change the attribute */
            $e.attr( 'src', newSrc );

          } );

          /** Change our attribute */
          $e.attr( 'src', transparent_img );

          /** Return this */
          return this;

        },

        /**
         * This function inits the plugin when called on a DOM element
         */
        init: function( o ) {
          s = $.extend( s, o );
          return this.each( f.changeSrc );
        }

      };

    /**
     * Our plugin definition
     * @param {object|string} func An object for plugin initiation, or a string to call a specific function
     */
    $.fn.resizely = function( func ) {

      //console.log( arguments );

      /** We're seeing if we need to call a function, or do our initiation */

      if( f[ func ] ) {
        return f[ func ].apply( this, Array.prototype.slice.call( arguments, 1 ) );
      } else if( typeof func === 'object' || !func ) {
        return f.init.apply( this, arguments );
      } else {
        $.error( 'Function \'' + func + '\' does not exist on jQuery.resizely' );
      }

    };

  })( jQuery );
} else {
  if( typeof console.error === 'function' ) console.error( 'Oops! Looks like jQuery was not included before bringing in the Resize.ly jQuery plugin.' );
}

