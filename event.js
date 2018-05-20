const EventEmitter = require('events');

class MyEmitter extends EventEmitter {}

const myEmitter = new MyEmitter();

let Event = module.exports = {
    emitter: myEmitter
}