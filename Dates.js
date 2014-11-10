/**
 * A date polyfill to recreate keyboard events of input[type="date"] cross-browser
 */
( function () {

  var Dates = {

    enteredNumber: "",
    finishedTyping: true,

    /**
     * Start your engines
     */
    init: function () {
      // Exit if browser already natively supports input[type="date"]
      if ( this.dateSupport() ) return false;

      // Get all date fields, and all forms on the page
      var fields = this.getFields(),
        forms = this.getForms();

      // Begin
      this.registerListeners( fields );
      this.registerFormListeners( forms );
      this.setupValues( fields );
    },

    /**
     * Return all input fields with a type of date
     * @return {Array} The fields
     */
    getFields: function () {
      var fields = document.querySelectorAll( "input[type=\"date\"]" );
      return fields;
    },

    /**
     * Return all forms on the page
     * @return {Array} The forms
     */
    getForms: function () {
      var i, forms = document.querySelectorAll( "form" ),
        registeredForms = [];

      for ( i = forms.length - 1; i >= 0; i-- ) {
        if ( forms[ i ].querySelector( "input[type=\"date\"]" ) ) {
          registeredForms.push( forms[ i ] );
        }
      }

      return registeredForms;
    },

    /**
     * Setup listeners on each date input
     * @param  {Array} fields  The fields to polyfill
     */
    registerListeners: function ( fields ) {

      var act, i, self = this;

      // Loop through the fields
      for ( i = fields.length - 1; i >= 0; i-- ) {
        /* jshint loopfunc: true */
        act = fields[ i ];

        // Register the listeners on each one
        act.addEventListener( "click", function ( evt ) {
          self.focusAction( evt, self );
        } );
        act.addEventListener( "focus", function ( evt ) {
          self.focusAction( evt, self );
        } );
        act.addEventListener( "keydown", function ( evt ) {
          self.beforeAction( evt, self );
        } );
        act.addEventListener( "keyup", function ( evt ) {
          self.afterAction( evt, self );
        } );
        act.addEventListener( "blur", function ( evt ) {
          self.blurAction( evt, self );
        } );
      }

    },

    /**
     * Setup listeners on each form
     * @param  {Array} forms   The forms
     */
    registerFormListeners: function ( forms ) {
      var act, i, self = this;

      // Loop through the forms
      for ( i = forms.length - 1; i >= 0; i-- ) {
        /* jshint loopfunc: true */
        act = forms[ i ];

        // Register the listeners on each one
        act.addEventListener( "submit", function ( evt ) {
          // On submit, convert dates for storage in database
          self.convertFormDates( evt, self );
        } );
      }
    },

    /**
     * Check dates are valid, and if so, convert to yyyy-mm-dd format
     * for submission to the database.
     *
     * @param  {Object} evt  The event object
     * @param  {Object} self The Dates object
     *
     * @return {Bool}        True continues with the form submit. False stops the submission
     */
    convertFormDates: function ( evt, self ) {
      var act, i, valid, fields,
        reg = /(0[1-9]|[12][0-9]|3[01])[\/](0[1-9]|1[012])[\/](19|20)\d\d/; // Matches dd/mm/yyyy

      evt = evt || window.event;

      // Only check the fields within this form
      fields = evt.target.querySelectorAll( "input[type=\"date\"]" );

      // Loop through the fields
      for ( i = fields.length - 1; i >= 0; i-- ) {
        act = fields[ i ];

        // Does value match a vald date, or the placeholder if not required
        valid = ( act.value.match( reg ) || ( act.getAttribute( "required" ) || act.value == 'dd/mm/yyyy' ) );

        // If form data is not valid, exit
        if ( !valid ) {
          evt.preventDefault();
          return false;
        }

        // Parse dates
        self.parseDate( act );
      }

      return true;
    },

    /**
     * Convert field value to yyyy-mm-dd for submission
     * @param  {String} act The date
     */
    parseDate: function ( act ) {
      var dd = act.value.split( "/" );

      act.value = dd[ 2 ] + "-" + dd[ 1 ] + "-" + dd[ 0 ];
    },

    /**
     * On focus, get the caret position and highlight the relevant
     * portion of the date value
     *
     * @param  {Object} evt  The event object
     * @param  {Obejct} self The Dates object
     */
    focusAction: function ( evt, self ) {
      var act, pos;

      evt = evt || window.event;
      act = evt.target;

      pos = self.getCaretPosition( act );

      if ( pos >= 0 && pos < 3 ) {
        self.setCaretPosition( act, 0, 2 );
      } else if ( pos >= 3 && pos < 6 ) {
        self.setCaretPosition( act, 3, 5 );
      } else if ( pos >= 6 ) {
        self.setCaretPosition( act, 6, 10 );
      }
    },

    /**
     * Check the key being pressed to perform the correct actions
     *
     * @param  {Object} evt  The event object
     * @param  {Obejct} self The Dates object
     *
     * @return {Bool}        True/false, allow propagation of keypress
     */
    beforeAction: function ( evt, self ) {
      var k, act, pos,
        arrowKeys = [ 37, 38, 39, 40 ],
        numberKeys = [ 48, 49, 50, 51, 52, 53, 54, 55, 56, 57 ],
        controlKeys = [ 9, 13, 27, 16, 17, 18, 20, 144, 224, 224, 91, 92, 93 ];

      evt = evt || window.event;
      k = evt.which || evt.keyCode;
      act = evt.target;

      // Get the position of the caret
      pos = self.getCaretPosition( act );

      // Allow keypresses with modifier keys to continue as normal
      if ( controlKeys.indexOf( k ) > -1 || evt.shiftKey || evt.ctrlKey || evt.altKey || evt.metaKey ) {
        return true;
      }

      // If an arrow key is pressed, move the selection in the correct direction
      if ( arrowKeys.indexOf( k ) > -1 ) {
        evt.preventDefault();
        self.movePosition( act, pos, k, self );
        return false;
      }

      // If a number key is pressed, update the selected portion of the field with that number
      if ( numberKeys.indexOf( k ) > -1 ) {
        evt.preventDefault();
        self.enterNumber( act, pos, k, self );
        return false;
      }

      // If backspace is pressed, remove the relavant portion of the field
      if ( k === 8 ) {
        evt.preventDefault();
        self.removeNumber( act, pos, k, self );
        return false;
      }

      // Return false on all other keypresses, to prevent invalid characters being entered
      evt.preventDefault();
      return false;
    },

    /**
     * Check the value in the field, and set the field as valid or invalid
     *
     * @param  {Object} evt  The event object
     * @param  {Obejct} self The Dates object
     */
    afterAction: function ( evt, self ) {
      var k, act, reg, valid;

      evt = evt || window.event;
      k = evt.which || evt.keyCode;
      act = evt.target;

      // Check if the date format is valid, or matches the placeholder if not required
      reg = /(0[1-9]|[12][0-9]|3[01])[\/](0[1-9]|1[012])[\/](19|20)\d\d/;
      valid = ( act.value.match( reg ) || ( act.getAttribute( "required" ) || act.value == 'dd/mm/yyyy' ) );

      // If format valid, check the validity of the date itself
      if ( valid ) {
        var date = act.value,
          d = parseInt( date.substring( 0, 2 ), 10 ),
          m = parseInt( date.substring( 3, 5 ), 10 ),
          y = parseInt( date.substring( 6, 10 ), 10 );

        date = new Date( y, m, d );
        valid = !( isNaN( date.getTime() ) );
      }

      // Set valid or invalid accordingly
      if ( !valid ) {
        self.setInvalid( act );
      } else {
        self.setValid( act );
      }
    },

    /**
     * Update the relevant portion of the field with the entered number
     * @param  {HTMLElement} act  The field being modified
     * @param  {Int}         pos  The position of the caret
     * @param  {Int}         k    The key being pressed (Should be the number to enter)
     * @param  {Object}      self The Dates Object
     */
    enterNumber: function ( act, pos, k, self ) {

      // Chain enterNumber events, e.g. allow 01 and 31
      var typed = String.fromCharCode( k ) || "0";
      self.enteredNumber = self.enteredNumber + typed;

      // Set day month or year based on position of caret
      if ( pos >= 0 && pos < 3 ) {
        self.setDay( act, pos, k, self );
      } else if ( pos >= 3 && pos < 6 ) {
        self.setMonth( act, pos, k, self );
      } else if ( pos >= 6 ) {
        self.setYear( act, pos, k, self );
      }

      // After two seconds, clear the entered number to stop chaining
      setTimeout( function () {
        self.enteredNumber = "";
      }, 2000 );
    },

    /**
     * Replace the relevant portion of the field with the placeholder
     * @param  {HTMLElement} act  The field being modified
     * @param  {Int}         pos  The position of the caret
     * @param  {Int}         k    The key being pressed (Should be backspace)
     * @param  {Object}      self The Dates Object
     */
    removeNumber: function ( act, pos, k, self ) {
      // Check the position, update accordingly
      if ( pos >= 0 && pos < 3 ) {
        self.enteredNumber = "00";
        self.setDay( act, pos, k, self );
      } else if ( pos >= 3 && pos < 6 ) {
        self.enteredNumber = "00";
        self.setMonth( act, pos, k, self );
      } else if ( pos >= 6 ) {
        self.enteredNumber = "0000";
        self.setYear( act, pos, k, self );
      }

      // Reset the entered number to stop chaining
      self.enteredNumber = "";
    },

    /**
     * Set the day
     * @param  {HTMLElement} act  The field being modified
     * @param  {Int}         pos  The position of the caret
     * @param  {Int}         k    The key being pressed (Should be a number)
     * @param  {Object}      self The Dates Object
     */
    setDay: function ( act, pos, k, self ) {
      var dd = act.value.split( "/" ),
        num = self.enteredNumber;

      // Grab the date, and replace the day with the entered number
      if ( num.length < 2 ) {
        dd[ 0 ] = "0" + num;
      } else {
        dd[ 0 ] = num;
      }

      // Replace the field value with the full date
      act.value = dd.join( "/" );

      // Once two digits have been entered, move the selection to the next section
      if ( self.enteredNumber.length == 2 && parseInt( num, 10 ) > 0 ) {
        self.enteredNumber = "";
        self.setCaretPosition( act, 3, 5 );
      } else {
        self.setCaretPosition( act, 0, 2 );
      }
    },

    /**
     * Set the month
     * @param  {HTMLElement} act  The field being modified
     * @param  {Int}         pos  The position of the caret
     * @param  {Int}         k    The key being pressed (Should be a number)
     * @param  {Object}      self The Dates Object
     */
    setMonth: function ( act, pos, k, self ) {
      var dd = act.value.split( "/" ),
        num = self.enteredNumber;

      // Grab the date, and replace the month with the entered number
      if ( num.length < 2 ) {
        dd[ 1 ] = "0" + num;
      } else {
        dd[ 1 ] = num;
      }

      // Replace the field value with the full date
      act.value = dd.join( "/" );

      // Once two digits have been entered, move the selection to the next section
      if ( self.enteredNumber.length == 2 && parseInt( num, 10 ) > 0 ) {
        self.enteredNumber = "";
        self.setCaretPosition( act, 6, 10 );
      } else {
        self.setCaretPosition( act, 3, 5 );
      }
    },

    /**
     * Set the year
     * @param  {HTMLElement} act  The field being modified
     * @param  {Int}         pos  The position of the caret
     * @param  {Int}         k    The key being pressed (Should be a number)
     * @param  {Object}      self The Dates Object
     */
    setYear: function ( act, pos, k, self ) {
      var dd = act.value.split( "/" ),
        num = self.enteredNumber;

      // Grab the year, and replace the month with the entered number
      if ( num.length < 2 ) {
        dd[ 2 ] = "000" + num;
      } else if ( num.length < 3 ) {
        dd[ 2 ] = "00" + num;
      } else if ( num.length < 4 ) {
        dd[ 2 ] = "0" + num;
      } else {
        dd[ 2 ] = num;
      }

      // Replace the field value with the full date
      act.value = dd.join( "/" );

      // Once two digits have been entered, move the selection to the next section
      if ( self.enteredNumber.length == 4 && parseInt( num, 10 ) > 0 ) {
        self.enteredNumber = "";
        self.setCaretPosition( act, 6, 10 );
      } else {
        self.setCaretPosition( act, 6, 10 );
      }
    },

    /**
     * Move between or modify sections of the date, based on the arrow key pressed
     * @param  {HTMLElement} act  The field being modified
     * @param  {Int}         pos  The position of the caret
     * @param  {Int}         k    The key being pressed (Should be up/down/left/right)
     * @param  {Object}      self The Dates Object
     */
    movePosition: function ( act, pos, k, self ) {
      // Left keypress, move selection left
      if ( k == 37 ) {
        self.moveLeft( act, pos, self );
      }

      // Right keypress, move selection right
      if ( k == 39 ) {
        self.moveRight( act, pos, self );
      }

      // Up keypress, increase value of section
      if ( k == 38 ) {
        self.increaseValue( act, pos, self );
      }

      // Down keypress, decrease value of selection
      if ( k == 40 ) {
        self.decreaseValue( act, pos, self );
      }
    },

    /**
     * Move the caret position to the left
     * @param  {HTMLElement} act  The field being modified
     * @param  {Int}         pos  The position of the caret
     * @param  {Object}      self The Dates Object
     */
    moveLeft: function ( act, pos, self ) {
      if ( pos >= 0 && pos < 3 ) {
        self.setCaretPosition( act, 0, 2 );
      } else if ( pos >= 3 && pos < 6 ) {
        self.setCaretPosition( act, 0, 2 );
      } else if ( pos >= 6 ) {
        self.setCaretPosition( act, 3, 5 );
      }
    },

    /**
     * Move the caret position to the right
     * @param  {HTMLElement} act  The field being modified
     * @param  {Int}         pos  The position of the caret
     * @param  {Object}      self The Dates Object
     */
    moveRight: function ( act, pos, self ) {
      if ( pos >= 0 && pos < 3 ) {
        self.setCaretPosition( act, 3, 5 );
      } else if ( pos >= 3 && pos < 6 ) {
        self.setCaretPosition( act, 6, 10 );
      } else if ( pos >= 5 ) {
        self.setCaretPosition( act, 6, 10 );
      }
    },

    /**
     * Get the position of the caret, and increase day, month or year appropriately
     * @param  {HTMLElement} act  The field being modified
     * @param  {Int}         pos  The position of the caret
     * @param  {Object}      self The Dates Object
     */
    increaseValue: function ( act, pos, self ) {
      if ( pos >= 0 && pos < 3 ) {
        self.adjustDay( act, 1, self );
      } else if ( pos >= 3 && pos < 6 ) {
        self.adjustMonth( act, 1, self );
      } else if ( pos >= 5 ) {
        self.adjustYear( act, 1, self );
      }
    },

    /**
     * Get the position of the caret, and increase day, month or year appropriately
     * @param  {HTMLElement} act  The field being modified
     * @param  {Int}         pos  The position of the caret
     * @param  {Object}      self The Dates Object
     */
    decreaseValue: function ( act, pos, self ) {
      if ( pos >= 0 && pos < 3 ) {
        self.adjustDay( act, -1, self );
      } else if ( pos >= 3 && pos < 6 ) {
        self.adjustMonth( act, -1, self );
      } else if ( pos >= 5 ) {
        self.adjustYear( act, -1, self );
      }
    },

    /**
     * Increase the day, cascading to month and year as appropriate base on date
     * @param  {HTMLElement} act          The field being modified
     * @param  {Int}         adjustment   The amount to adjust by
     * @param  {Object}      self         The Dates object
     * @param  {Bool}        setCaret     Whether or not to reset the caret position
     *                                    after processing
     */
    adjustDay: function ( act, adjustment, self, setCaret ) {
      var date = act.value,
        d = parseInt( date.substring( 0, 2 ), 10 ),
        m = parseInt( date.substring( 3, 5 ), 10 ),
        y = parseInt( date.substring( 6, 10 ), 10 ),
        dd, maxd = 31,
        mind = 1,
        pd = 31;

      // Check number of days in month
      if ( [ 4, 6, 9, 11 ].indexOf( m ) > -1 ) {
        // Apr, Jun, Sep, Nov
        maxd = 30;
      }

      // Feb
      if ( m === 2 ) {
        if ( y % 4 === 0 ) {
          // Leap Year
          maxd = 29;
        } else {
          // Non-leap year
          maxd = 28;
        }
      }

      // March
      if ( m === 3 ) {
        if ( y % 4 === 0 ) {
          // Leap Year
          pd = 29;
        } else {
          // Non-leap year
          pd = 28;
        }
      }

      if ( [ 5, 7, 10, 12 ].indexOf( m ) > -1 ) {
        // May, Jul, Oct, Dec
        pd = 30;
      }
      // End days-in-month check

      // Set the caret position by default
      if ( typeof setCaret === "undefined" )
        setCaret = true;

      // Adjust the day
      d = d + adjustment;

      // Increase month if necessary
      if ( d > maxd ) {
        d = 1;
        self.adjustMonth( act, 1, self, false );
      }

      // Decrease month if necessary
      if ( d < mind ) {
        d = pd;
        self.adjustMonth( act, -1, self, false );
      }

      // Grab the date
      date = act.value;

      // Add leading zeroes
      if ( d < 10 ) {
        dd = "0" + d.toString();
      } else {
        dd = d.toString();
      }

      // Update the field's value
      act.value = dd + date.substring( 2 );

      // Set caret position (if required)
      if ( setCaret )
        self.setCaretPosition( act, 0, 2 );
    },

    /**
     * Increase the month, cascading to year as appropriate base on date
     * @param  {HTMLElement} act          The field being modified
     * @param  {Int}         adjustment   The amount to adjust by
     * @param  {Object}      self         The Dates object
     * @param  {Bool}        setCaret     Whether or not to reset the caret position
     *                                    after processing
     */
    adjustMonth: function ( act, adjustment, self, setCaret ) {
      var date = act.value,
        m = parseInt( date.substring( 3, 5 ), 10 ),
        mm;

      // Set the caret position by default
      if ( typeof setCaret === "undefined" )
        setCaret = true;

      // Adjust the month
      m = m + adjustment;

      // Increase year if required
      if ( m > 12 ) {
        m = 1;
        self.adjustYear( act, 1, self, false );
      }

      // Decrease year if required
      if ( m < 1 ) {
        m = 12;
        self.adjustYear( act, -1, self, false );
      }

      // Grab the date
      date = act.value;

      // Add leading zeroes
      if ( m < 10 ) {
        mm = "0" + m.toString();
      } else {
        mm = m.toString();
      }

      // Update the field's value
      act.value = date.substring( 0, 2 ) + "/" + mm + date.substring( 5 );

      // Set caret position (if required)
      if ( setCaret )
        self.setCaretPosition( act, 3, 5 );
    },

    /**
     * Increase the year
     * @param  {HTMLElement} act          The field being modified
     * @param  {Int}         adjustment   The amount to adjust by
     * @param  {Object}      self         The Dates object
     * @param  {Bool}        setCaret     Whether or not to reset the caret position
     *                                    after processing
     */
    adjustYear: function ( act, adjustment, self, setCaret ) {
      var date = act.value,
        y = parseInt( date.substring( 6, 10 ), 10 );

      // Set the caret position by default
      if ( typeof setCaret === "undefined" )
        setCaret = true;

      // Adjust the year
      y = y + adjustment;

      // Update the field's value
      act.value = date.substring( 0, 6 ) + y;

      // Set caret position (if required)
      if ( setCaret )
        self.setCaretPosition( act, 6, 10 );
    },

    // Function performed on blur. (Not currently used)
    blurAction: function ( evt, self ) {
      var act, pos;

      evt = evt || window.event;
      act = evt.target;

      pos = self.getCaretPosition( act );
    },

    /**
     * Set the field to be invalid
     * @param {HTMLElement} field The field
     */
    setInvalid: function ( field ) {
      field.setCustomValidity( "Invalid field." );
    },

    /**
     * Set the field to be valid
     * @param {HTMLElement} field The field
     */
    setValid: function ( field ) {
      field.setCustomValidity( "" );
    },

    /**
     * Set initial values for fields
     * @param  {Array} fields The fields
     */
    setupValues: function ( fields ) {
      var i, act;

      // Loop through the fields
      for ( i = fields.length - 1; i >= 0; i-- ) {
        act = fields[ i ];

        if ( act.value && this.isValidDate( act.value ) ) {
          // If date is valid, convert it
          this.convertDate( act );
        } else {
          // if date is invalid, display the placeholder
          act.value = "dd/mm/yyyy";
        }
      }
    },

    /**
     * Convert date from yyyy-mm-dd to dd/mm/yyyy
     * @param  {[type]} field [description]
     * @return {[type]}       [description]
     */
    convertDate: function ( field ) {
      var val, d, m, y;

      val = field.value.split( "-" );
      y = val[ 0 ];
      m = val[ 1 ];
      d = val[ 2 ];

      field.value = d + "/" + m + "/" + y;
    },

    /**
     * Check if date is valid
     * @param  {String}  value The date
     * @return {Boolean}       Valid/invalid
     */
    isValidDate: function ( value ) {
      var reg = /(19|20)\d\d[-](0[1-9]|1[012])[-](0[1-9]|[12][0-9]|3[01])/;
      return value.match( reg );
    },

    /**
     * Get the position of the caret
     * @param  {HTMLElement} field The field to take action on
     * @return {Int}               The position of the caret
     */
    getCaretPosition: function ( field ) {
      // Initialize
      var iCaretPos = 0;

      // IE Support
      if ( document.selection ) {

        // Set focus on the element
        field.focus();

        // To get cursor position, get empty selection range
        var oSel = document.selection.createRange();

        // Move selection start to 0 position
        oSel.moveStart( "character", -field.value.length );

        // The caret position is selection length
        iCaretPos = oSel.text.length;
      }

      // Firefox support
      else if ( field.selectionStart || field.selectionStart == "0" )
        iCaretPos = field.selectionStart;

      // Return results
      return ( iCaretPos );
    },

    /**
     * Set the caret position to a given selection start and end
     * @param {HTMLElement} field The field
     * @param {Int}         start The start position
     * @param {Int}         end   The end position
     */
    setCaretPosition: function ( field, start, end ) {
      // Initialize
      start = typeof start !== "undefined" ? start : 0;
      end = typeof end !== "undefined" ? end : field.value.length;

      // Set start and end, cross-browser
      if ( field.createTextRange ) {
        var selRange = field.createTextRange();
        selRange.collapse( true );
        selRange.moveStart( "character", start );
        selRange.moveEnd( "character", end - start );
        selRange.select();
      } else if ( field.setSelectionRange ) {
        field.setSelectionRange( start, end );
      } else if ( field.selectionStart ) {
        field.selectionStart = start;
        field.selectionEnd = end;
      }

      // Return the focus to the field
      field.focus();
    },

    /**
     * Check if the bowser supports date inputs
     * @return {[type]} [description]
     */
    dateSupport: function () {
      var input = document.createElement( "input" ),
        notADateValue = "not-a-date";

      // Set attribute type="date"
      input.setAttribute( "type", "date" );

      // Update the value with a non-date value
      input.setAttribute( "value", notADateValue );

      // If the browser supports date inputs, it will have modified the
      // non-date value, usually replacing it with a placeholder
      return ( input.value !== notADateValue );
    }

  };
} )();