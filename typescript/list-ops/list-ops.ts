type Node<T> = null | {
  value: T;
  prev: Node<T>;
  next: Node<T>;
};

class MultiIterable<T> {
  #leftRoot: Node<T> = null;
  #rightRoot: Node<T> = null;

  initialized = false;

  init() {
    if (this.initialized) return;

    let prev = this.#leftRoot;
    for (const value of this.iterable) {
      if (!prev) {
        prev = this.#leftRoot = {
          value,
          prev: null,
          next: null,
        };
      } else {
        prev.next = {
          value,
          prev,
          next: null,
        };
        prev = prev.next;
      }
    }
    this.#rightRoot = prev;

    this.initialized = true;
  }

  get leftRoot() {
    if (!this.initialized) this.init();
    return this.#leftRoot;
  }
  get rightRoot() {
    if (!this.initialized) this.init();
    return this.#rightRoot;
  }

  constructor(public iterable: Iterable<T> = []) {}

  *forward() {
    let node = this.leftRoot;
    while (true) {
      if (!node) break;
      yield node.value;
      node = node.next;
    }
  }

  *reverse() {
    let node = this.rightRoot;
    while (true) {
      if (!node) break;
      yield node.value;
      node = node.prev;
    }
  }
}

export class List<T> implements Iterable<T> {
  #multiIterable: MultiIterable<T>;

  constructor(items: Iterable<T> = []) {
    this.#multiIterable = new MultiIterable(items);
  }

  [Symbol.iterator]() {
    return this.#multiIterable.forward()
  }

  static create<U = any>(...items: U[]) {
    return new List(items);
  }

  static fromGenerator<U>(generatorFn: () => Generator<U>): List<U> {
    const iterable = { [Symbol.iterator]: generatorFn };
    return new List(iterable);
  }

  forEach(iteratee: (x: T) => void) {
    for (const item of this) {
      iteratee(item);
    }
  }

  length(): number {
    let length = 0;
    for (const _ of this) length++;
    return length;
  }

  append(other: List<T>): List<T> {
    const self = this;
    return List.fromGenerator<T>(function* () {
      yield* self;
      yield* other;
    });
  }

  concat(others: List<List<T>>): List<T> {
    const self = this;
    return List.fromGenerator<T>(function* () {
      yield* self;
      for (const other of others)
        yield* other;
    });
  }

  map<U>(mapper: (x: T) => U): List<U> {
    const self = this;
    return List.fromGenerator<U>(function* () {
      for (const item of self)
        yield mapper(item);
    });
  }

  filter<U extends T = T>(predicate: (x: U) => boolean): List<T> {
    const self = this;
    return List.fromGenerator<T>(function* () {
      for (const item of self)
        if (predicate(item as U))
          yield item;
    });
  }

  foldl<U, V extends T = T>(folder: (acc: U, next: V) => U, init: U): U {
    let acc = init;
    for (const item of this.#multiIterable.forward())
      acc = folder(acc, item as V);
    return acc;
  }

  foldr<U, V extends T = T>(folder: (acc: U, next: V) => U, init: U): U {
    let acc = init;
    for (const item of this.#multiIterable.reverse())
      acc = folder(acc, item as V);
    return acc;
  }

  reverse(): List<T> {
    return new List(this.#multiIterable.reverse());
  }
}
