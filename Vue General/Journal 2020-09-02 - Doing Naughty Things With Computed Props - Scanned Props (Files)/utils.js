exports.WeakMap2D = class WeakMap2D {
  constructor() {
    this.root = new WeakMap();
  }

  get(a, b) {
    const aCache = this.root.get(a);
    if (aCache == null) {
      return aCache;
    }
    return aCache.get(b);
  }

  set(a, b, value) {
    if (!this.root.has(a)) {
      this.root.set(a, new WeakMap());
    }

    return this.root.get(a).set(b, value);
  }
}
