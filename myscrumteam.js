const puppeteer = require("puppeteer");
const util = require('util');
const event = require("./event.js");

class MyScrumTeamJob {
  constructor() {
    this.username = process.env.MYSCRUMTEAM_USERNAME;
    this.password = process.env.MYSCRUMTEAM_PASSWORD;
  }

  /**
   * Make a call to the MyScrum.team website
   * and return an overview (dashboard) of the authenticated user.
   *
   * @param {any} message
   * @returns {string}
   */
  async getMyScrumTeamOverview(message) {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--disable-setuid-sandbox',
        '--no-sandbox'
      ]
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36');
    const date = new Date().getTime();
    const messageFromId = message.from.id;
    const screenshotPath = `./screenshots/${messageFromId}-${date}.png`;

    await this.logInToMyScrumTeam(browser, page);

    await page.screenshot({
      path: screenshotPath,
      fullPage: true
    });
    event.emitter.emit("puppeteerEvent");
    await browser.close();
    return screenshotPath;
  }

  /**
   * Make a call to the MyScrum.team website
   * and return the sprintplanning of the current week to the authenticated user.
   *
   * @param {any} message
   * @returns {string}
   */
  async getMyScrumTeamSprintPlanning(message, planningOption, planningAmount) {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--disable-setuid-sandbox',
        '--no-sandbox'
      ]
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36');
    const date = new Date().getTime();
    const DAY_SELECTOR = ".fc-agendaDay-button.fc-corner-right";
    const MONTH_SELECTOR = ".fc-month-button.fc-corner-left";
    const PREVIOUS_SELECTOR = ".fc-prev-button";
    const NEXT_SELECTOR = ".fc-next-button";
    const messageFromId = message.from.id;
    const screenshotPath = `./screenshots/${messageFromId}-${date}.png`;

    await this.logInToMyScrumTeam(browser, page, 'https://myscrum.team/en/planning/overview');
    await page.waitFor(500);
    process.on("unhandledRejection", (reason, p) => {
      console.error("Unhandled Rejection at: Promise", p, "reason:", reason);
      browser.close();
    });

    switch (planningOption) {
      case "day":
        await page.click(DAY_SELECTOR);
        await page.waitFor(500);
        break;
      case "month":
        await page.click(MONTH_SELECTOR);
        await page.waitFor(500);
        break;
      default:
        break;
    }

    for (let i = 0; i < Math.abs(planningAmount); i++) {
      if (planningAmount > 0) {
        await page.click(NEXT_SELECTOR);
        await page.waitFor(500);
      } else {
        await page.click(PREVIOUS_SELECTOR);
        await page.waitFor(500);
      }
    }

    await this.injectRysstBuddy(page);

    await page.screenshot({
      path: screenshotPath,
      fullPage: true
    });
    event.emitter.emit("puppeteerEvent");
    await browser.close();
    return screenshotPath;
  }

  /**
   * Make a call to the MyScrum.team website
   * and return the sprint hours for the team of the authenticated user.
   *
   * @param {any} message
   * @returns {string}
   */
  async getMyScrumTeamSprintHours(message) {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--disable-setuid-sandbox',
        '--no-sandbox'
      ]
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36');
    const date = new Date().getTime();
    const messageFromId = message.from.id;
    const screenshotPath = `./screenshots/${messageFromId}-${date}.png`;

    await this.logInToMyScrumTeam(browser, page, 'https://myscrum.team/en/');

    await this.screenshotDOMElement(
      screenshotPath,
      page,
      "div.bg-blue-lighter"
    );
    return screenshotPath;
  }

  /**
   * Make a call to the MyScrum.team website
   * and check the open workdays of the authenticated user.
   *
   * @param {any} message
   * @returns {string}
   */
  async checkMyScrumTeamHours(chatId) {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--disable-setuid-sandbox',
        '--no-sandbox'
      ]
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36');
    await this.logInToMyScrumTeam(browser, page);
    await page.goto('https://myscrum.team/nl/planning/overview', {
      waitUntil: "networkidle0"
    });

    return this.getPlannedHours(page);
  }

  async getPlannedHours(page) {
    const uncheckedColor = 'rgb(230, 145, 56)';

    let content = await page.evaluate(() => {
      const elements = [...document.querySelectorAll('.fc-time-grid-event')];
      return elements.map(el => el.style.backgroundColor.trim());
    });

    content.forEach(el => {
      console.log(el === uncheckedColor);
    });

    let uncheckedAmount = content.reduce((total, current) => {
      return current === uncheckedColor ? total += 1 : total;
    }, 0);

    return uncheckedAmount;
  }

  async checkAlreadyEntered(planningDay) {
    const browser = await puppeteer.launch({
      headless: false,
      args: [
        '--disable-setuid-sandbox',
        '--no-sandbox'
      ]
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36');

    await this.logInToMyScrumTeam(browser, page);
    await page.goto('https://myscrum.team/nl/planning/overview', {
      waitUntil: "networkidle0"
    });

    const NEXT_SELECTOR = ".fc-next-button";
    const MARKED_COLORS = ['rgb(88, 168, 61)', 'rgb(230, 145, 56)'];

    page.on('console', msg => {
      for (let i = 0; i < msg.args.length; ++i)
        console.log(`${i}: ${msg.args[i]}`);
    });

    // find the index
    let index = undefined;
    let attempts = 0;
    while (index === undefined && attempts < 5) {
      index = await page.evaluate((planningDay) => {
        let elements = [...document.querySelectorAll('td')];
        console.log(elements.filter(el => el.dataset.date === planningDay)[0]);
        if (elements.filter(el => el.dataset.date === planningDay).length > 0) {
          return elements.filter(el => el.dataset.date === planningDay)[0].cellIndex;
        } else {
          return undefined;
        }
      }, planningDay);

      // switch to next week
      if (index === undefined) {
        await page.click(NEXT_SELECTOR);
        await page.waitFor(500);
        attempts++;
      }
    }

    if (index === undefined) {
      return;
    }

    console.log(index, attempts);

    // find the TD
    let alreadyEntered = await page.evaluate((index, MARKED_COLORS) => {
      let elements = [...document.querySelectorAll('td:not([class])')];
      let plannedMoments = elements[index - 1].querySelectorAll(".fc-event-container:not(.fc-helper-container)");
      console.log(plannedMoments[0].children);
      let bool = false;

      [...plannedMoments[0].children].map(c => {
        if (MARKED_COLORS.includes(c.style.backgroundColor)) {
          bool = true;
        }
        console.log("contains color", MARKED_COLORS.includes(c.style.backgroundColor));
      });

      // return elements[index - 1];
      return bool;
      // return false;
    }, index, MARKED_COLORS);

    return alreadyEntered;
  }

  async planWorkingDay(chatId, planningDay) {
    const browser = await puppeteer.launch({
      headless: false,
      args: [
        '--disable-setuid-sandbox',
        '--no-sandbox'
      ]
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36');

    const NEXT_SELECTOR = ".fc-next-button";
    const MARKED_COLORS = ['rgb(88, 168, 61)', 'rgb(230, 145, 56)'];

    await this.logInToMyScrumTeam(browser, page);
    await page.goto('https://myscrum.team/nl/planning/overview', {
      waitUntil: "networkidle0"
    });

    // plan working day here
    let index = undefined;
    let attempts = 0;
    while (index === undefined && attempts < 5) {
      index = await page.evaluate((planningDay) => {
        let elements = [...document.querySelectorAll('td')];
        console.log(elements.filter(el => el.dataset.date === planningDay)[0]);
        if (elements.filter(el => el.dataset.date === planningDay).length > 0) {
          return elements.filter(el => el.dataset.date === planningDay)[0].cellIndex;
        } else {
          return undefined;
        }
      }, planningDay);

      // switch to next week
      if (index === undefined) {
        await page.click(NEXT_SELECTOR);
        await page.waitFor(500);
        attempts++;
      }
    }

    if (index === undefined) {
      return;
    }

    console.log(index, attempts);

    // find the TD and click on it
    let alreadyEntered = await page.evaluate((index, MARKED_COLORS) => {
      let elements = [...document.querySelectorAll('td:not([class])')];
      let plannedMoments = [...elements[index - 1].querySelectorAll(".fc-event-container:not(.fc-helper-container)")];
      console.log("click", plannedMoments);
      plannedMoments.click();

    }, index,);
  }

  async markWorkingDayAsWorked(chatId) {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--disable-setuid-sandbox',
        '--no-sandbox'
      ]
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36');
    const date = new Date().getTime();
    const screenshotPath = `./screenshots/${chatId}-${date}.png`;

    let workDayMarkedAsDone = '';

    await this.logInToMyScrumTeam(browser, page);
    await page.goto('https://myscrum.team/nl/planning/overview', {
      waitUntil: "networkidle0"
    });

    try {
      let selector = 'a';
      await page.$$eval(selector, anchors => {
        const uncheckedColor = 'rgb(230, 145, 56)';
        anchors.map(anchor => {
          if (anchor.style.backgroundColor === uncheckedColor) {
            anchor.click();
            return;
          }
        })
      });

      // modify the planned work item to 'worked'
      await page.waitForSelector('#event-status');
      await page.select('select#event-status', '1');

      // save
      await page.evaluate(() => {
        const SAVE_BUTTON_SELECTOR = '#modal > div > div > div.modal-footer > button.btn.btn-primary.btn-shadow.ripple.confirm';
        document.querySelector(SAVE_BUTTON_SELECTOR).click();
      });

      await page.waitForSelector('body > div.sweet-alert.showSweetAlert.visible > div.sa-button-container > div > button');

      // confirm save
      await page.evaluate(() => {
        const CONFIRM_SAVE_CHANGES_SELECTOR = 'body > div.sweet-alert.showSweetAlert.visible > div.sa-button-container > div > button';
        document.querySelector(CONFIRM_SAVE_CHANGES_SELECTOR).click();
      });

      // get information on work day (date & time)
      let content = await page.evaluate(() => {
        let elements = [...document.querySelectorAll('input')];
        return elements.filter(el => el.className === 'input__field')
          .map(e => e.value.trim());
      });

      let date, fromTime, toTime;
      [date, fromTime, toTime] = content;

      workDayMarkedAsDone = `${date} (${fromTime} - ${toTime})`;
    } catch (exception) {
      console.log(exception);
    }

    return workDayMarkedAsDone;
  }

  /**
   * Inject the name 'RysstBuddy' into the DOM of the page where the name of the employee is located.
   * Used as a watermark in several different methods, to denote the screenshot was taken by a bot.
   * 
   * @param {Page} page
   */
  async injectRysstBuddy(page) {
    await page.evaluate(() => {
      let dom = document.querySelector('body > div.app.header-blue.layout-fixed-header > div.sidebar-panel.offscreen-left.ps-container > nav > ul > li.menu-profile > div > span');
      dom.innerHTML = "RysstBuddy";
    });
  }

  /**
   * Login to MyScrum.team.
   *
   * @param {Browser} browser
   * @param {Page} page
   */
  async logInToMyScrumTeam(browser, page, url = 'https://myscrum.team') {
    const USERNAME_SELECTOR = "#username";
    const PASSWORD_SELECTOR = "#password";
    const BUTTON_SELECTOR =
      "body > div.app.signin.v2.usersession > div > div.card.bg-white.no-border > div > form > button";

    page.setViewport({
      width: 1280,
      height: 720
    });

    await page.goto(url, {
      waitUntil: "domcontentloaded"
    });

    await page.waitForSelector(USERNAME_SELECTOR);
    await page.type(USERNAME_SELECTOR, this.username);

    await page.waitForSelector(PASSWORD_SELECTOR);
    await page.type(PASSWORD_SELECTOR, this.password);

    await page.click(BUTTON_SELECTOR);

    await page.waitForNavigation();
  }

  /**
   * Make a screenshot of a given DOM element.
   *
   * @param {any} message
   * @param {any} selector
   * @param {number} [padding=0]
   */
  async screenshotDOMElement(screenshotPath, page, selector, padding = 0) {
    const rect = await page.evaluate(selector => {
      const element = document.querySelector(selector);
      const {
        x,
        y,
        width,
        height
      } = element.getBoundingClientRect();
      return {
        left: x,
        top: y,
        width,
        height,
        id: element.id
      };
    }, selector);

    await page.screenshot({
      path: screenshotPath,
      clip: {
        x: rect.left - padding,
        y: rect.top - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2
      }
    });
    return screenshotPath;
  }
}

module.exports = {
  MyScrumTeamJob
};