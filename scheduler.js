const event = require('./event.js');
const schedule = require('node-schedule');

/*
    Schedule a weekly message on Saturday @ 8 PM (20:00).
*/
let weeklyMessage = schedule.scheduleJob('00 18:00 * * 6', () => {
  event.emitter.emit('weeklyUpdateEvent');
});

/*
    Schedule a weekly cleanup event on Sunday @ 10 PM (22:00).
    This event clears the 'screenshots' directory.
*/
let weeklyCleanup = schedule.scheduleJob('00 22 * * 7', () => {
  event.emitter.emit('weeklyCleanupEvent');
});