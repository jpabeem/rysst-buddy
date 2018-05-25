require('./web');
require('./scheduler')

const axios = require('axios');
const Bot = require('node-telegram-bot-api');
const emoji = require('node-emoji');
const event = require('./event.js');
const rimraf = require('rimraf');
const {
    MyScrumTeamJob
} = require('./myscrumteam.js');


const token = process.env.TOKEN;
const bot = new Bot(token, {
    polling: true
});
const myScrumTeamJob = new MyScrumTeamJob();

console.log('Bot server started...');
console.log(`Debug mode enabled: ${process.env.DEBUG_MODE}`);
/*
    Listen to Telegram user events.
*/
bot.onText(/\/start$/, (msg, match) => {
    // 'msg' is the received Message from Telegram
    // 'match' is the result of executing the regexp above on the text content
    // of the message

    const chatId = msg.chat.id;
    const help = emoji.get("question");
    // send back the matched "whatever" to the chat
    bot.sendMessage(chatId, `Welcome! Enjoy your usage of RysstBuddy.\nNeed help${help} Try the /help command.`);
});

bot.onText(/\/overview$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const camera = emoji.get("camera");
    const image = await (myScrumTeamJob.getMyScrumTeamOverview(msg));
    bot.sendMessage(chatId, `Puppeteer event! ${camera}`);
    bot.sendPhoto(msg.chat.id, image);
});

bot.onText(/\/check$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const info = emoji.get("information_source");

    let openHours = await (myScrumTeamJob.checkMyScrumTeamHours(msg));

    if (openHours === 1) {
        bot.sendMessage(chatId, `${info} You have ${openHours} open workday in MyScrumTeam for this week.`);
    } else if (openHours > 1) {
        bot.sendMessage(chatId, `${info} You have ${openHours} open workdays in MyScrumTeam for this week.`);
    } else {
        bot.sendMessage(chatId, `${info} You have no open workdays in MyScrumTeam for this week.`);
    }
});

bot.onText(/\/sprint$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const camera = emoji.get("camera");
    const imagePath = await (myScrumTeamJob.getMyScrumTeamSprintHours(msg));
    bot.sendMessage(chatId, `Puppeteer event! ${camera}`);
    bot.sendPhoto(msg.chat.id, imagePath);
});

bot.onText(/\/planning ?(.+)?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const options = ['day', 'week', 'month', '', undefined];
    match.filter((m) => {
        m !== undefined
    });
    console.log("planning: " + match);
    console.log(match.length);
    console.log(match)
    let planningOption = match[0].split(" ").length >= 2 ? match[1].split(" ")[0] : 'week';
    let planningAmount = match[0].split(" ").length > 2 ? match[0].split(" ")[2] : 0;
    console.log(planningAmount);
    console.log("Planning option: " + planningOption);
    console.log("Planning option: " + planningAmount);
    console.log(options.includes(planningOption));

    bot.sendChatAction(chatId, 'typing');

    if (!options.includes(planningOption)) {
        unsupportedParameterError(chatId, planningOption, 'Try <code>/planning</code>, <code>/planning day</code>, <code>/planning week</code> or <code>/planning month</code>');
        return;
    }

    if (planningAmount === undefined) {
        planningAmount = 0;
    } else if (!(planningAmount >= -9 && planningAmount <= 9)) {
        unsupportedParameterError(chatId, planningAmount, 'Try values between <code>-9</code> and <code>9</code>');
        return;
    }

    const imagePath = await (myScrumTeamJob.getMyScrumTeamSprintPlanning(msg, planningOption, planningAmount));
    bot.sendMessage(chatId, `Puppeteer event!`);
    bot.sendChatAction(chatId, 'upload_photo');
    bot.sendPhoto(chatId, imagePath);
});

function unsupportedParameterError(chatId, parameter, suggestion) {
    const error = emoji.get("no_entry");
    let message = `${error} Unsupported parameter: <b>${parameter}</b>`;
    if (suggestion !== undefined) {
        message += `\n${suggestion}`;
    }
    bot.sendMessage(chatId, message, {
        parse_mode: "HTML"
    });
}

if (Boolean(process.env.DEBUG_MODE) === true) {
    bot.on('message', (msg) => {
        const chatId = msg.chat.id;
        bot.sendMessage(chatId, 'Received your message:' + JSON.stringify(msg.from));
    });
}

/*
    Listen to emitted events.
*/
event.emitter.on('puppeteerEvent', async (update) => {
    console.log("Puppeteer event fired!");
});

event.emitter.on('weeklyCleanupEvent', async () => {
    // clear the ./screenshots folder completely
    rimraf('./screenshots/*', () => {
        console.log("Screenshot folder cleared.");
    });
});

event.emitter.on('weeklyUpdateEvent', async (update) => {
    let updates = await fetchMyScrumTeamUpdates();
    message += updates;
    tellOurChannel(message);
});