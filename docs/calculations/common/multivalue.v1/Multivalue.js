// @ts-check

import takeFirstBy from '../takeFirstBy.js';
import MultivalueElement from './MultivalueElement.js';

/**
 * @template T
 */
export default class Multivalue {
  /**
   * @template T
   * @param {T} value
   * @param {string[]} tags
   * @returns Multivalue<T>
   */
  static of(value, tags = []) {
    return new Multivalue([MultivalueElement.of(value, tags)]);
  }

  /**
   * @template T
   * @param {MultivalueElement<T>[]} elements
   * @returns Multivalue<T>
   */
  static ofElements(elements) {
    return new Multivalue(elements);
  }

  /**
   * @param {MultivalueElement<T>[]} elements
   */
  constructor(elements) {
    this.elements = [...elements];
  }

  /**
   * @template R
   * @param {(value: T) => R} fn
   */
  map(fn) {
    return Multivalue.ofElements(
      this.elements.map(
        element => element.map(fn)
      )
    )
  }

  /**
   * @template R
   * @param {(value: T) => Multivalue<R>} fn
   * @returns {Multivalue<R>}
   */
  flatMap(fn) {
    /** @type {MultivalueElement<R>[]} */
    const nextElements = [];

    for (const prevElement of this.elements) {
      const result = fn(prevElement.value);

      for (const resultElement of result.elements) {
        nextElements.push(
          MultivalueElement.of(
            resultElement.value,
            [...prevElement.tags, ...resultElement.tags]
          )
        );
      }
    }

    return Multivalue.ofElements(nextElements);
  }

  /**
   * Gets the first-most element as determined by the provided comparator.
   * @param {(a: MultivalueElement<T>, b: MultivalueElement<T>) => number} comparator
   */
  getElement(comparator) {
    return takeFirstBy(
      this.elements,
      comparator
    );
  }

  /**
   * Gets the value of the first-most element as determined by the provided comparator.
   * @param {(a: MultivalueElement<T>, b: MultivalueElement<T>) => number} comparator
   */
  getValue(comparator) {
    return this.getElement(comparator).value;
  }

  /**
   * Gets all the elements, as ordered by the provided comparator.
   * @param {(a: MultivalueElement<T>, b: MultivalueElement<T>) => number} comparator
   */
  getAllElements(comparator) {
    return this.elements.slice().sort(comparator);
  }

  /**
   * Gets the values of all the elements, with those elements ordered by the provided comparator.
   * @param {(a: MultivalueElement<T>, b: MultivalueElement<T>) => number} comparator
   */
  getAllValues(comparator) {
    return this.getAllElements(comparator).map(element => element.value);
  }

  /**
   * Keeps certain values and tags them with the given tags.
   * This is just a prefab of both `.getElement()` and `MultivalueElement.addTag()`.
   * @param {Record<string, (a: MultivalueElement<T>, b: MultivalueElement<T>) => number>} comparatorsByTag
   */
  keepByAndTag(comparatorsByTag) {
    const keys = Object.keys(comparatorsByTag);
    const keptElements = [];

    for (const key of keys) {
      const comparator = comparatorsByTag[key];

      keptElements.push(
        this.getElement(comparator).addTag(key)
      );
    }

    return Multivalue.ofElements(keptElements);
  }
}
