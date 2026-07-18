const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

async function main() {
function createMockElement(tagName) {
  return {
    tagName: tagName.toUpperCase(),
    children: [],
    className: '',
    innerHTML: '',
    value: '',
    selected: false,
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    insertRow() {
      const row = createMockElement('tr');
      row.insertCell = function () {
        const cell = createMockElement('td');
        cell.appendChild = function (child) {
          this.children.push(child);
          return child;
        };
        return cell;
      };
      return row;
    },
    insertCell() {
      const cell = createMockElement('td');
      return cell;
    },
    setAttribute(name, value) {
      this[name] = value;
    },
    addEventListener() {},
    onclick() {}
  };
}

function createDocument() {
  const container = createMockElement('div');
  return {
    getElementById(id) {
      if (id === 'sudoku1') {
        return container;
      }
      return createMockElement('div');
    },
    createElement(tagName) {
      return createMockElement(tagName);
    }
  };
}

const source = fs.readFileSync(path.join(__dirname, '..', 'sudoku.js'), 'utf8');
const context = {
  document: createDocument(),
  console: {
    log() {},
    error() {},
    groupCollapsed() {},
    groupEnd() {}
  },
  window: {},
  setTimeout,
  clearTimeout,
  fetch: async function () {
    return {
      ok: true,
      json: async function () {
        return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'puzzles', 'example.json'), 'utf8'));
      }
    };
  }
};

vm.createContext(context);
vm.runInContext(source, context);

const sudoku = new context.Sudoku('sudoku1', false);
const peerCheck = new context.Sudoku('sudoku1', false);
peerCheck.setValue(peerCheck.getCell(0), 1);
assert.strictEqual(peerCheck.getCell(1).candidates.indexOf(1), -1, 'Expected empty peers to lose a placed value as a candidate');

await sudoku.loadExample();

assert.strictEqual(sudoku.getCell(1).value, 2, 'Expected the second cell to load the value from the JSON puzzle');
assert.strictEqual(sudoku.getCell(0).value, 0, 'Expected empty cells to remain empty when loaded from the JSON puzzle');
assert.strictEqual(sudoku.getCell(5).value, 7, 'Expected the clue list to populate the requested cell');
assert.ok(sudoku.container.children.length > 0, 'Expected the board to be redrawn after loading the example');
assert.strictEqual(sudoku.solve(), true, 'Expected the helper solver to make progress on the example puzzle');
assert.ok(sudoku.getCell(0).value > 0, 'Expected the helper solver to fill a valid cell');
console.log('Sudoku example loader test passed');
}

main().catch(function (error) {
  console.error(error);
  process.exit(1);
});
