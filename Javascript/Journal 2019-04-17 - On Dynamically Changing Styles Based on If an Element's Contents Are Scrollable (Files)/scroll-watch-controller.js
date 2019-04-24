class ScrollWatchController {
  constructor(el, handler, options = {}) {
    if (! el) {
      throw new Error('ScrollWatchController must receive a target element');
    }

    if (! handler) {
      throw new Error('ScrollWatchController must receive a handler to call on scroll props changes')
    }

    this.el = el;
    this.handler = handler;
    this.options = {
      scheduleImmediately: true,
      checkImmediately: false,
      ...options,
    };
    this.animationFrameId = null;
    this.elAttrs = {
      scrollTop: 0,
      scrollBottom: 0,
      scrollHeight: 0,
      clientHeight: 0,
    };

    this.schedule = () => this.schedule();
    this.el.addEventListener('scroll', this.schedule);
    window.addEventListener('resize', this.schedule);

    if (this.options.checkImmediately) {
      this.check();
    }
    else if (this.options.scheduleImmediately) {
      this.schedule();
    }
  }

  destroy() {
    if (this.animationFrameId) {
      window.cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.el.removeEventListener('scroll', this.schedule);
    window.removeEventListener('resize', this.schedule);
  }

  schedule() {
    if (this.animationFrameId == null) {
      this.animationFrameId = window.requestAnimationFrame(() => {
        this.animationFrameId = null;
        this.check();
      });
    }
  }

  check() {
    const nextAttrs = {
      scrollTop: this.el.scrollTop,
      scrollHeight: this.el.scrollHeight,
      clientHeight: this.el.clientHeight,
      scrollBottom: 0,
    };

    nextAttrs.scrollBottom = nextAttrs.scrollHeight - nextAttrs.clientHeight - nextAttrs.scrollTop;

    const didChange = (
      nextAttrs.scrollTop !== this.elAttrs.scrollTop
      || nextAttrs.scrollHeight !== this.elAttrs.scrollHeight
      || nextAttrs.clientHeight !== this.elAttrs.clientHeight
    );

    if (didChange) {
      this.handler(nextAttrs, this.elAttrs);
      Object.assign(this.elAttrs, nextAttrs);
    }
  }
}
