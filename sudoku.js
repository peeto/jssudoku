/**
 *
 * A simple sudoku solver written in JavaScript
 * for Carl Petersen
 *
 */



/**
 * A single cell in the sudoku grid
 */
function sudokuCell(row, col, value = 0, logging = false) {
    this.logging = !!logging;
    // row & column are 0 indexed, value is 1-9 or 0 for empty
    this.row = parseInt(row);
    this.col = parseInt(col);
    // cellnumber is 0-80 for the computer
    this.cellnumber = (this.row * 9) + this.col;
    // 3x3 group is 0-8, top left is 0, top middle is 1, etc
    this.cellgroup = (parseInt(this.row / 3) * 3) + parseInt(this.col / 3);
    // value is 0 for empty, or 1-9
    this.value = parseInt(value);
    // candidates is an array of possible values for this cell, 0-9 with 0 as a placeholder for empty
    this.candidates = [];

    // set candidates to all possible values if the cell is empty, or just the value if it's not
    this.setCandidatesForValue = function () {
        this.candidates = this.value ? [0, this.value] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    }

    // set the value of the cell and update candidates accordingly
    this.setValue = function (value) {
        this.value = parseInt(value);
        this.setCandidatesForValue();
    }

    // remove a candidate value from the cell's candidates array
    this.removeCandidate = function (value) {
        var index = this.candidates.indexOf(parseInt(value));
        if (index > 0) {
            this.candidates.splice(index, 1);
        }
    }

    // does cell have no candidates
    this.isCellBroken = function () {
        return this.value == 0 && this.candidates.length == 1;
    }

    // initialize candidates based on the initial value
    this.setCandidatesForValue();

    return this;
}


/**
 * The main sudoku object, which contains the grid and methods to manipulate it
 */
function Sudoku(id, logging = false) {
    this.logging = !!logging;
    this.cells = [];
    var sudoku = this;

    // id is the id of the HTML container element where the sudoku will be rendered
    this.id = String(id);
    this.container = document.getElementById(this.id);

    // cells is an array of 81 sudokuCell objects, indexed by cellnumber
    this.generateCells = function () {
        if (sudoku.logging) console.groupCollapsed('Generating cells');
        var cells = [];
        for (var row = 0; row < 9; row++) {
            for (var col = 0; col < 9; col++) {
                // create a new sudokuCell for each row and column and add it to the cells array
                var newcell = new sudokuCell(row, col, 0, sudoku.logging);
                if (sudoku.logging) console.log('Generating cell ' + newcell.cellnumber + ' row ' + row + ' column ' + col + ' cellgroup ' + newcell.cellgroup);
                cells.push(newcell);
            }
        }
        if (sudoku.logging) console.groupEnd();
        return cells;
    }

    // reset candidates for all cells to their initial state based on their current value
    this.resetCandidates = function () {
        for (var i = 0; i < 81; i++) {
            sudoku.cells[i].setCandidatesForValue();
        }
    }

    // rebuild candidates for all cells based on the current values in the grid
    this.rebuildCandidates = function () {
        // this was horrible, any value change can affect all the candidates in the grid,
        // so we have to reset all candidates
        if (sudoku.logging) console.groupCollapsed('Rebuilding candidates');

        sudoku.resetCandidates();

        for (var i = 0; i < 81; i++) {
            var cell = sudoku.getCell(i);
            if (!cell.value) {
                continue;
            }

            for (var j = 0; j < 81; j++) {
                var c = sudoku.getCell(j);
                if (c.cellnumber == cell.cellnumber) {
                    continue;
                }

                if (sudoku.isCellPeer(c, cell)) {
                    if (sudoku.logging) console.log('Removing candidate ' + cell.value + ' from cell ' + c.cellnumber + ' because of a shared row, column, or box with cell ' + cell.cellnumber);
                    c.removeCandidate(cell.value);
                }
            }
        }
        if (sudoku.logging) console.groupEnd();
    }

    // find a cell by its row and column
    this.findCell = function (row, col) {
        return sudoku.cells[(parseInt(row) * 9) + parseInt(col)];
    }

    // find a cell by its cellnumber
    this.getCell = function (cellnumber) {
        return sudoku.cells[parseInt(cellnumber)];
    }

    // set the value of a cell and update the grid accordingly
    this.setValue = function (cell, value) {
        if (sudoku.logging) console.log('Setting value of cell ' + cell.cellnumber + ' to ' + value);
        cell.setValue(parseInt(value));

        // yuk
        sudoku.rebuildCandidates();
    }

    // determine whether two cells share a row, column, or box, regardless of whether they are filled
    this.isCellPeer = function (cell1, cell2) {
        return cell1.row == cell2.row || cell1.col == cell2.col || cell1.cellgroup == cell2.cellgroup;
    }

    // the 3 rules to sudoku: no duplicate values in the same row, column, or 3x3 group
    this.isCellCollision = function (cell1, cell2) {
        return cell1.value != 0 && cell2.value != 0 && sudoku.isCellPeer(cell1, cell2);
    }

    this.isPuzzleBroken = function () {
        return false;
    }

    this.bruteSolve = function () {
        return sudoku.solveAll();
    }

    // try solve the sudoku by resolving the full board and redrawing the UI
    this.solve = function () {
        var solved = sudoku.solveAll();
        if (solved) {
            sudoku.draw();
        }
        return solved;
    }

    // solve the puzzle using constraint propagation and backtracking
    this.solveAll = function () {
        var initialValues = [];
        for (var i = 0; i < 81; i++) {
            initialValues.push(sudoku.cells[i].value);
        }

        var solveBoard = function (values) {
            var board = values.slice();
            var emptyCells = [];

            for (var index = 0; index < 81; index++) {
                if (board[index] === 0) {
                    emptyCells.push(index);
                }
            }

            if (emptyCells.length === 0) {
                return board;
            }

            var progress = true;
            while (progress) {
                progress = false;
                var updated = false;

                for (var i = 0; i < emptyCells.length; i++) {
                    var cellIndex = emptyCells[i];
                    if (board[cellIndex] !== 0) {
                        continue;
                    }

                    var row = Math.floor(cellIndex / 9);
                    var col = cellIndex % 9;
                    var boxRow = Math.floor(row / 3) * 3;
                    var boxCol = Math.floor(col / 3) * 3;
                    var usedValues = {};

                    for (var r = 0; r < 9; r++) {
                        var rowValue = board[(row * 9) + r];
                        if (rowValue !== 0) {
                            usedValues[rowValue] = true;
                        }
                    }

                    for (var c = 0; c < 9; c++) {
                        var colValue = board[(c * 9) + col];
                        if (colValue !== 0) {
                            usedValues[colValue] = true;
                        }
                    }

                    for (var br = boxRow; br < boxRow + 3; br++) {
                        for (var bc = boxCol; bc < boxCol + 3; bc++) {
                            var boxValue = board[(br * 9) + bc];
                            if (boxValue !== 0) {
                                usedValues[boxValue] = true;
                            }
                        }
                    }

                    var candidates = [];
                    for (var value = 1; value <= 9; value++) {
                        if (!usedValues[value]) {
                            candidates.push(value);
                        }
                    }

                    if (candidates.length === 0) {
                        return null;
                    }

                    if (candidates.length === 1) {
                        board[cellIndex] = candidates[0];
                        updated = true;
                        progress = true;
                    }
                }

                if (updated) {
                    emptyCells = [];
                    for (var cell = 0; cell < 81; cell++) {
                        if (board[cell] === 0) {
                            emptyCells.push(cell);
                        }
                    }
                }
            }

            var remainingEmptyCells = [];
            for (var cellIndex = 0; cellIndex < 81; cellIndex++) {
                if (board[cellIndex] === 0) {
                    remainingEmptyCells.push(cellIndex);
                }
            }

            if (remainingEmptyCells.length === 0) {
                return board;
            }

            var bestCell = -1;
            var bestCandidates = null;
            for (var candidateIndex = 0; candidateIndex < remainingEmptyCells.length; candidateIndex++) {
                var currentIndex = remainingEmptyCells[candidateIndex];
                var row = Math.floor(currentIndex / 9);
                var col = currentIndex % 9;
                var boxRow = Math.floor(row / 3) * 3;
                var boxCol = Math.floor(col / 3) * 3;
                var usedValues = {};

                for (var r = 0; r < 9; r++) {
                    var rowValue = board[(row * 9) + r];
                    if (rowValue !== 0) {
                        usedValues[rowValue] = true;
                    }
                }

                for (var c = 0; c < 9; c++) {
                    var colValue = board[(c * 9) + col];
                    if (colValue !== 0) {
                        usedValues[colValue] = true;
                    }
                }

                for (var br = boxRow; br < boxRow + 3; br++) {
                    for (var bc = boxCol; bc < boxCol + 3; bc++) {
                        var boxValue = board[(br * 9) + bc];
                        if (boxValue !== 0) {
                            usedValues[boxValue] = true;
                        }
                    }
                }

                var candidates = [];
                for (var value = 1; value <= 9; value++) {
                    if (!usedValues[value]) {
                        candidates.push(value);
                    }
                }

                if (candidates.length === 0) {
                    return null;
                }

                if (bestCell === -1 || candidates.length < bestCandidates.length) {
                    bestCell = currentIndex;
                    bestCandidates = candidates;
                }
            }

            for (var candidateIndex = 0; candidateIndex < bestCandidates.length; candidateIndex++) {
                var nextBoard = board.slice();
                nextBoard[bestCell] = bestCandidates[candidateIndex];
                var solvedBoard = solveBoard(nextBoard);
                if (solvedBoard) {
                    return solvedBoard;
                }
            }

            return null;
        };

        var solvedBoard = solveBoard(initialValues);
        if (!solvedBoard) {
            return false;
        }

        for (var i = 0; i < 81; i++) {
            sudoku.setValue(sudoku.cells[i], solvedBoard[i]);
        }

        sudoku.draw();
        return true;
    }

    this.loadExample = function (url = 'puzzles/example.json') {
        return fetch(url)
            .then(function (response) {
                if (!response.ok) {
                    throw new Error('Unable to load example puzzle');
                }
                return response.json();
            })
            .then(function (data) {
                for (var i = 0; i < 81; i++) {
                    var cell = sudoku.cells[i];
                    sudoku.setValue(cell, 0);
                }

                var clues = Array.isArray(data.clues) ? data.clues : [];
                if (clues.length === 0 && Array.isArray(data.values) && data.values.length === 81) {
                    clues = data.values.map(function (value, index) {
                        return value ? { cell: index, value: value } : null;
                    }).filter(Boolean);
                }

                for (var j = 0; j < clues.length; j++) {
                    var clue = clues[j];
                    if (clue && clue.cell !== undefined && clue.value !== undefined) {
                        var clueCell = sudoku.cells[parseInt(clue.cell)];
                        if (clueCell) {
                            sudoku.setValue(clueCell, parseInt(clue.value));
                        }
                    }
                }

                sudoku.draw();
                return data;
            })
            .catch(function (error) {
                console.error(error);
                return null;
            });
    }

    // draw the sudoku grid in the container element
    this.draw = function () {
        if (sudoku.logging) console.groupCollapsed('Drawing Sudoku');
        this.container.innerHTML = '';

        var cellnumber = 0;
        var table = document.createElement('table');
        for (var row = 0; row < 9; row++) {
            var tr = table.insertRow();
            for (var col = 0; col < 9; col++) {
                var cell = sudoku.findCell(row, col);
                if (sudoku.logging) console.log('Drawing cell ' + cell.cellnumber + ' with value ' + cell.value);

                var td = tr.insertCell();

                if (row == 0 || row == 3 || row == 6) {
                    td.className = 'top' + (col == 0 || col == 3 || col == 6 ? 'left' : (col == 1 || col == 4 || col == 7 ? 'center' : 'right'));
                } else if (row == 1 || row == 4 || row == 7) {
                    td.className = 'middle' + (col == 0 || col == 3 || col == 6 ? 'left' : (col == 1 || col == 4 || col == 7 ? 'center' : 'right'));
                } else {
                    td.className = 'bottom' + (col == 0 || col == 3 || col == 6 ? 'left' : (col == 1 || col == 4 || col == 7 ? 'center' : 'right'));
                }

                var select = document.createElement('select');
                select.setAttribute('data-cellnumber', cellnumber);
                if (cell.value == 0) {
                    select.className = 'empty';
                } else {
                    select.className = 'hasvalue';
                }

                for (var i = 0; i <= 9; i++) {
                    if (cell.candidates.indexOf(i) != -1) {
                        var option = document.createElement('option');
                        option.value = i;
                        option.text = i == 0 ? '?' : i;
                        if (cell.value == i) {
                            option.selected = true;
                        }
                        select.appendChild(option);
                    }
                }

                select.onchange = function (e) {
                    var cellnumber = parseInt(e.target.getAttribute('data-cellnumber'));
                    var cell = sudoku.getCell(cellnumber);
                    var newValue = parseInt(e.target.value);
                    sudoku.setValue(cell, newValue);

                    sudoku.draw();

                };

                td.appendChild(select);
                cellnumber++;
            }
        }

        var div = document.createElement('div');
        div.className = 'jssudoku';

        var exampleButton = document.createElement('button');
        exampleButton.innerHTML = 'Load Example';
        exampleButton.onclick = function () {
            sudoku.loadExample();
        }

        var solveButton = document.createElement('button');
        solveButton.innerHTML = 'Solve';
        solveButton.onclick = function () {
            sudoku.solve();
        }

        div.appendChild(table);
        div.appendChild(exampleButton);
        div.appendChild(solveButton);

        this.container.appendChild(div);
        if (sudoku.logging) console.groupEnd();
    }

    // initialize the cells and draw the grid
    this.cells = sudoku.generateCells();
    this.draw();

    return sudoku;
}
