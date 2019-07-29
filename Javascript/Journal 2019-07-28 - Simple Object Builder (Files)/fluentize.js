function fluentize(proto) {
  return function fluentize(method) {
    const name = method.name || 'fn';
    // Hack around not being able to easily set arbitrary names.
    return {
      [name](...args) {
        // Create a new object if a method is called directly from proto.
        const self =
          this === proto
            ? Object.create(proto)
            : this;

        const result = method(self, ...args);
        if (result === undefined) return self;
        return result;
      },
    }[name];
  }
}

module.exports = fluentize;
