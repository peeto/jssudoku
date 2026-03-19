/**
 *
 * A simple sudoku solver written in JavaScript
 * for Carl Petersen
 *
 */

/**
 * A single cell in the sudoku grid
 */
function sudokuCell( row, col, value = 0 ) {
    // row & column are 0 indexed, value is 1-9 or 0 for empty
    this.row = parseInt( row );
    this.col = parseInt( col );
    // cellnumber is 0-80 for the computer
    this.cellnumber = (this.row * 9) + this.col;
    // 3x3 group is 0-8, top left is 0, top middle is 1, etc
    this.cellgroup = (parseInt( this.row / 3 ) * 3) + parseInt( this.col / 3 );
    // value is 0 for empty, or 1-9
    this.value = parseInt( value );
    // candidates is an array of possible values for this cell, 0-9 with 0 as a placeholder for empty
    this.candidates = [];

    // set candidates to all possible values if the cell is empty, or just the value if it's not
    this.setCandidatesForValue = function() {
        this.candidates = this.value ? [0, this.value] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    }

    // set the value of the cell and update candidates accordingly
    this.setValue = function( value ) {
        this.value = parseInt( value );
        this.setCandidatesForValue();
    }

    // remove a candidate value from the cell's candidates array
    this.removeCandidate = function( value ) {
        var index = this.candidates.indexOf( parseInt( value ) );
        if ( index > 0 ) {
            this.candidates.splice( index, 1 );
        }
    }

    // initialize candidates based on the initial value
    this.setCandidatesForValue();

    return this;
}

/**
 * The main sudoku object, which contains the grid and methods to manipulate it
 */
function Sudoku( id ) {
    var sudoku = this;

    // id is the id of the HTML container element where the sudoku will be rendered
    this.id = String(id);
    this.container = document.getElementById( sudoku.id );

    // cells is an array of 81 sudokuCell objects, indexed by cellnumber
    this.generateCells = function() {
        var cells = [];
        for ( var row = 0; row < 9; row++ ) {
            for ( var col = 0; col < 9; col++ ) {
                // create a new sudokuCell for each row and column and add it to the cells array
                cells.push( new sudokuCell( row, col ) );
            }
        }
        return cells;
    }

    // reset candidates for all cells to their initial state based on their current value
    this.resetCandidates = function() {
        for ( var i = 0; i < 81; i++ ) {
            sudoku.cells[i].setCandidatesForValue();
        }
    }

    // rebuild candidates for all cells based on the current values in the grid
    this.rebuildCandidates = async function() {
        // this was horrible, any value change can affect all the candidates in the grid,
        // so we have to reset all candidates
        sudoku.resetCandidates();

        for ( var i = 0; i < 81; i++ ) {
            var cell = sudoku.cells[i];
            if ( cell.value ) {
                for ( var j = 0; j < 81; j++ ) {
                    var c = sudoku.cells[j];
                    if ( c.cellnumber != cell.cellnumber ) {
                        // the 3 rules to sudoku: no duplicate values in the same row, column, or 3x3 group
                        if ( c.row == cell.row || c.col == cell.col || 
                                c.cellgroup == cell.cellgroup ) {
                            c.removeCandidate( cell.value );
                        }
                    }
                }
            }
        }
    }

    // find a cell by its row and column
    this.findCell = function( row, col ) {
        return sudoku.cells[ (parseInt(row) * 9) + parseInt(col) ];
    }

    // find a cell by its cellnumber
    this.getCell = function( cellnumber ) {
        return sudoku.cells[ parseInt(cellnumber) ];
    }

    // set the value of a cell and update the grid accordingly
    this.setValue = async function( cell, value ) {
        cell.setValue( parseInt(value) );

        // yuk
        await sudoku.rebuildCandidates();

        // yay
        await sudoku.draw();
    }

    // try solve the sudoku by filling in any cells that have only one candidate left
    this.solve = async function() {
        var progress = false;
        for ( var i = 0; i < 81; i++ ) {
            var cell = sudoku.cells[i];
            if ( cell.value == 0 && cell.candidates.length == 2 ) {
                sudoku.setValue( cell, cell.candidates[1] );
                progress = true;
            }
        }
        return progress;
    }

    // keep solving until no more progress can be made
    this.solveAll = async function() {
        // this is cheeky, solve() returns false when it can't make any more progress, so we can just keep calling it until it returns false
        while( await sudoku.solve() );
    }

    // draw the sudoku grid in the container element
    this.draw = async function() {
        this.container.innerHTML = '';

        var cellnumber = 0;
        var table = document.createElement( 'table' );
        for (var row = 0; row < 9; row++) {
            var tr = table.insertRow();
            for (var col = 0; col < 9; col++) {
                var cell = sudoku.findCell( row, col );

                var td = tr.insertCell();

                td.style.margin = '0px';
                td.style.padding = '0px';
                if (col == 0 || col == 3 || col == 6) {
                    td.style.borderLeft = '5px solid black';
                } else {
                    td.style.borderLeft = '1px solid gray';
                }
                if (col == 2 || col == 5 || col == 8) {
                    td.style.borderRight = '5px solid black';
                } else {
                    td.style.borderRight = '1px solid gray';
                }

                if (row == 0 || row == 3 || row == 6) {
                    td.style.borderTop = '5px solid black';
                } else {
                    td.style.borderTop = '1px solid gray';
                }
                if (row == 2 || row == 5 || row == 8) {
                    td.style.borderBottom = '5px solid black';
                } else {
                    td.style.borderBottom = '1px solid gray';
                }

                var select = document.createElement( 'select' );
                select.setAttribute( 'data-cellnumber', cellnumber );
                if ( cell.value == 0) {
                    select.style.backgroundColor = 'lightgray';
                }


                for (var i = 0; i <= 9; i++) {
                    if (cell.candidates.indexOf( i ) != -1) {
                        var option = document.createElement( 'option' );
                        option.value = i;
                        option.text = i == 0 ? '?' : i;
                        if ( cell.value == i ) {
                            option.selected = true;
                        }
                        select.appendChild( option );
                    }
                }

                select.onchange = function(e) {
                    var cellnumber = parseInt( e.target.getAttribute( 'data-cellnumber' ) );
                    var cell = sudoku.getCell( cellnumber );
                    var newValue = parseInt(e.target.value);
                    sudoku.setValue(cell, newValue);
                };

                td.appendChild( select );
                cellnumber++;
            }
        }

        var div = document.createElement('div');

        var helpButton = document.createElement( 'button' );
        helpButton.style.margin = '4px';
        helpButton.innerHTML = 'Try help';
        helpButton.onclick = function() {
            sudoku.solve();
        }

        var solveButton = document.createElement( 'button' );
        solveButton.style.margin = '4px';
        solveButton.innerHTML = 'Try solve';
        solveButton.onclick = function() {
            sudoku.solveAll();
        }

        div.appendChild( table );
        div.appendChild( helpButton );
        div.appendChild( solveButton );

        this.container.appendChild (div);
    }

    // initialize the cells and draw the grid
    sudoku.cells = sudoku.generateCells();
    sudoku.draw();

    return sudoku;
}
