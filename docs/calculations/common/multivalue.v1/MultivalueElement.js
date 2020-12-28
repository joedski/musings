// @ts-check

/**
 * @template T
 */
export default class MultivalueElement {
  /**
   * @template T
   * @param {T} value
   * @param {string[]} tags
   */
  static of(value, tags = []) {
    return new MultivalueElement(value, tags);
  }

  /**
   * @param {T} value
   * @param {string[]} tags
   */
  constructor(value, tags) {
    this.value = value;
    this.tags = [...tags];
  }

  /**
   * @template R
   * @param {(value: T) => R} mapValue
   * @param {(tags: string[]) => string[]} [mapTags]
   */
  map(mapValue, mapTags = (tags) => tags) {
    return MultivalueElement.of(
      mapValue(this.value),
      mapTags(this.tags)
    );
  }

  /**
   * Create a new Element with an additional tag.
   * @param {string} addedTag
   */
  addTag(addedTag) {
    return MultivalueElement.of(this.value, [...this.tags, addedTag]);
  }
}
