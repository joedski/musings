Journal 2020-03-10 - Simple Promise Queue
========

I saw something like this being implemented elsewhere and wondered if there was a simpler way to do it than manually tracking active things?

I think this should work, but haven't tested it.

As an aside: PromiseQueue sounds like a Harry Potter character.

```js
class PromiseQueue {
  #pending;
  #parallelism;
  #queue;

  constructor(parallelism) {
    this.#pending = new Set();
    this.#parallelism = 1;
    this.#queue = [];
  }

  enqueue(op) {
    return new Promise((resolve, reject) => {
      this.#queue.push({
        op,
        resolve,
        reject,
      });
      this.dequeue();
    });
  }

  dequeue() {
    if (this.#pending.size >= this.#parallelism) {
      return;
    }

    const nextOp = this.#queue.shift();

    const promise = nextOp.op().then(
      res => {
        this.#pending.delete(promise);
        this.dequeue();
        nextOp.resolve(res);
      },
      error => {
        this.#pending.delete(promise);
        this.dequeue();
        nextOp.reject(res);
      },
    );

    this.#pending.add(promise);
  }

  get inProgress() {
    return this.#pending.size > 0;
  }
}
```
