class CountdownTimer {
  constructor(container, startTime, endTime, options = {}) {
    this.times = ["day", "hour", "min", "sec"];
    this.selectors = {
      day: ".countdown-timer-day",
      hour: ".countdown-timer-hour",
      min: ".countdown-timer-minute",
      sec: ".countdown-timer-sec",
    };
    this.MS_IN_SEC = 1000;
    this.MS_IN_MIN = 60 * this.MS_IN_SEC;
    this.MS_IN_HRS = 60 * this.MS_IN_MIN;
    this.MS_IN_DAY = 24 * this.MS_IN_HRS;

    this.container = container;
    this.startTime = startTime;
    this.savedStartTime = startTime;
    this.endTime = endTime;
    this.options = Object.assign(
      {},
      {
        type: "evergreen",
        duration: "every_month",
        addZeroPrefix: true,
        loop: false,
        callback: () => {},
      },
      options
    );

    this.intervalTime = 1000;
    this.timer = null;
    this.domNodes = window.queryDomNodes ? window.queryDomNodes(this.selectors, container) : {};

    this.init();
  }

  init() {
    this.targetTime = new Date(this.endTime).getTime();
    this.start();
  }

  start() {
    this.timer = setInterval(() => {
      if (this.startTime > this.targetTime) this.stop();
      else this.update();
    }, this.intervalTime);

    this.container.style.removeProperty("opacity");
  }

  update() {
    const timeData = this.format(this.targetTime - this.startTime);
    this.times.forEach((time) => {
      if (this.domNodes[time]) {
        this.domNodes[time].textContent = this.addZeroPrefix(timeData[time]);
      }
    });
    this.startTime += this.intervalTime;
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
    this.options.callback();
  }

  addZeroPrefix(num) {
    if (this.options.addZeroPrefix && num < 10) {
      return `0${num}`;
    }
    return num.toString();
  }

  format(ms) {
    if (ms < 0) ms = 0;
    return {
      day: Math.floor(ms / this.MS_IN_DAY),
      hour: Math.floor((ms % this.MS_IN_DAY) / this.MS_IN_HRS),
      min: Math.floor((ms % this.MS_IN_HRS) / this.MS_IN_MIN),
      sec: Math.floor((ms % this.MS_IN_MIN) / this.MS_IN_SEC),
    };
  }
}

if (!customElements.get("m-countdown-timer")) {
  class MCountdownTimer extends HTMLElement {
    constructor() {
      super();
    }

    connectedCallback() {
      const time = this.dataset.time;
      if (!time) return;
      const endTime = Date.parse(time.split(" ").join("T"));
      if (endTime) {
        new CountdownTimer(this, Date.now(), endTime, { type: this.dataset.type, duration: this.dataset.duration });

        if (endTime > Date.now()) {
          this.classList.remove("hidden");
          this.classList.remove("m:hidden");
        }
      }
    }
  }

  customElements.define("m-countdown-timer", MCountdownTimer);
}
