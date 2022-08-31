export class List<T> implements Iterable<T> {
  #forward: Iterable<T>
  #reverse: Iterable<T>;

  [Symbol.iterator]() {
    return this.#forward[Symbol.iterator]()
  }
  reverseIterable() {
    return this.#reverse
  }

  constructor(forward: Iterable<T> = [], reverse?: Iterable<T>) {
    this.#forward = forward
    this.#reverse = reverse ?? invert(forward)
  }

  static create<U = any>(...items: U[]) {
    return new List(items)
  }

  forEach(iteratee: (x: T) => void) {
    for (const item of this.#forward) iteratee(item)
  }

  length(): number {
    let length = 0
    for (const _ of this.#forward) length++
    return length
  }

  append(other: List<T>): List<T> {
    const self = this
    return new List(
      fromGenerator(function* () {
        yield* self
        yield* other
      }),
      fromGenerator(function* () {
        yield* other.reverseIterable()
        yield* self.reverseIterable()
      })
    )
  }

  concat(others: List<List<T>>): List<T> {
    const self = this
    return new List(
      fromGenerator(function* () {
        yield* self
        for (const other of others) yield* other
      }),
      fromGenerator(function* () {
        for (const other of others.reverseIterable())
          yield* other.reverseIterable()
        yield* self.reverseIterable()
      })
    )
  }

  map<U>(mapper: (x: T) => U): List<U> {
    const self = this
    return new List<U>(
      fromGenerator(function* () {
        for (const item of self.#forward) yield mapper(item)
      })
    )
  }

  filter<U extends T = T>(predicate: (x: U) => boolean): List<T> {
    const self = this
    return new List(
      fromGenerator(function* () {
        for (const item of self.#forward) if (predicate(item as U)) yield item
      })
    )
  }

  foldl<U, V extends T = T>(folder: (acc: U, next: V) => U, init: U): U {
    let acc = init
    for (const item of this.#forward) acc = folder(acc, item as V)
    return acc
  }

  foldr<U, V extends T = T>(folder: (acc: U, next: V) => U, init: U): U {
    let acc = init
    for (const item of this.#reverse) acc = folder(acc, item as V)
    return acc
  }

  reverse(): List<T> {
    return new List(this.#reverse, this.#forward)
  }
}

function invert<T>(iterable: Iterable<T>): Iterable<T> {
  type ListNode<T> = null | {
    item: T
    next: ListNode<T>
  }

  let list: ListNode<T> = null

  return fromGenerator(function* () {
    if (!list) {
      for (const item of iterable) {
        list = {
          item,
          next: list,
        }
      }
    }

    let it = list
    while (true) {
      if (!it) break
      yield it.item
      it = it.next
    }
  })
}

function fromGenerator<T>(generator: () => Generator<T>): Iterable<T> {
  return { [Symbol.iterator]: generator }
}
