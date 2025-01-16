import OutlineEntry from "./OutlineEntry.js";

export default class Outline {
  static DEFAULTS = {
    selectors: ["h1", "h2", "h3", "h4", "h5", "h6"],
    itemClassName: "outline-item",
    rootClassName: "outline-content",
  };
 
  #config = {};

  // The flat array of items in the outline.
  #items;

  /**
   * Creates a new outline from the given props.
   * @param {Object} [props={}] - Configuration options for the outline.
   * @param {Array<string>} [props.selectors=["h1", "h2", "h3", "h4", "h5", "h6"]] - CSS selectors for elements to include in the outline. These can be any valid CSS selector. The order given determins the hierarchy of the outline.
   * @param {string} [props.itemClassName="outline-item"] - CSS class name to apply to each outline item.
   * @param {string} [props.rootClassName="outline-content"] - CSS class name to apply to the root element of the outline.
   * @example
   * const outline = new Outline({
   *   selectors: ["h1", "h2", "h3"],
   *   itemClassName: "my-outline-item",
   *   rootClassName: "my-outline-content"
   * });
   */
  constructor(props) {
    this.#config = {...Outline.DEFAULTS, ...props};
    this.#items = [];
  }


  /**
   * Builds an outline from the provided DOM node using the configured selectors.
   * 
   * @param {Node} node - The DOM node to build the outline from.
   * @param {boolean} [flattened=false] - Whether to return a flat list of items or a nested structure.
   * @returns {Array|Object} The outline items as a flat array if `flattened` is true, otherwise as a nested structure.
   * 
   * @example
   * const outline = new Outline();
   * const node = document.querySelector('.content');
   * const items = outline.build(node, true); // Returns a flat list of outline items.
   * const nestedItems = outline.build(node); // Returns a nested outline structure.
   */

  build(node, flattened=false) {
    let selectors = this.#config.selectors;

    // Take a comma separated string of html selectors
    const elems = [...node.querySelectorAll(selectors.join(","))];

    // Process all headings with anchor links and styling
    this.#items = elems.map((elem) => {
      const header = elem.children[0];
      const label = header.textContent;
      if (!elem.id)
        // If there isn't an ID, we need to make one.
        elem.id = label
          .replace(/[-’/`~!#*$@_%+=.,^&(){}[\]|;:”<>?\\]/g, "")
          .replace(/\s+/g, "-")
          .toLowerCase();

      // Find our indentation level
      let level = -1;
      for (let i = 0; i < selectors.length; i++) {
        if (elem.matches(selectors[i])) {
          level = i + 1;
          break;
        }
      }

      return new OutlineEntry(label, elem.id, level);
    });
    return flattened ? this.#items : Outline.nestChildren(this.#items); 
  }

  /**
   * Nests children based on their level into other outlines.
   * @param {Array<Outline>} items
   * @returns {Array<Outline>} Array of top level outline objects. The array itself is the outline tree.
   */
  static nestChildren(items) {
    const root = new OutlineEntry();
    let parent = root;
    let prevOutline = null;

    items.map((outline) => {
      const level = outline.level;
      let prevLevel = prevOutline ? prevOutline.level : 1;

      // Case: We are looking at a top level outline
      if (!prevOutline || level == 1) {
        parent = root;
        parent.children.push(outline); // We don't adopt here because these are top level outlines

        prevOutline = outline;
        return;
      }

      // Case: The item is at the same level as the previous
      if (parent && level == prevLevel) {
        parent.adopt(outline);

        prevOutline = outline;
        return;
      }

      // Case: The item is at a deeper level and should be nested into the previous outline
      if (parent && level > prevLevel) {
        parent = prevOutline;
        parent.adopt(outline);

        prevOutline = outline;
        return;
      }

      // Case: The item is at a shallower level and should be nested into the last outline that would be its parent
      if (level < prevLevel) {
        // We need to find the correct parent, so go backwards until we are at the right level.
        while (parent && level <= parent.level) {
          parent = parent.parent;
        }
        if (parent)
          parent.adopt(outline);

        prevOutline = outline;
        return;
      }

      return;
    });

    return root.children;
  }

  /**
   * Creates a treeNode from the outlines as a set of nested unordered lists.
   * @returns {DomElement} Single unordered list node as a treeNode.
   */
  toNodeTree() {
    let outlines = this.getNested(this.#items);

    // Create our root list node and add some styling
    const root = document.createElement("ul");
    root.setAttribute("class", this.#config.rootClassName);

    // This is our recursive function to nest the lists
    // It takes the children array of an outline and wraps it in an unordered list while checking for grandchildren.
    // It also converts the children to list items and adds them to the parent list.
    let recNestLists = (outlines) => {
      const list = document.createElement("ul");
      list.setAttribute("class", this.#config.itemClassName);

      // Go through each child
      outlines.map((outline) => {
        // Convert it to a list item and add it to the list
        list.appendChild(outline.toListItem());

        // If it has children, perform this same function on the child array and append that list to the current one.
        if (outline.children.length > 0)
          list.appendChild(recNestLists(outline.children));
      });

      return list;
    };

    // Create our top level items in our list.
    outlines.map((outline) => {
      root.appendChild(outline.toListItem());

      // If it has children, begin recursing through them building nested lists.
      if (outline.children.length > 0)
        root.appendChild(recNestLists(outline.children));
    });

    return root;
  }

  /**
   * Gets the outlines as a nested array of outlines.
   * @returns {Array<Outline>} Array of top level outline objects. The array itself is the outline tree.
   */
  toHtml() {
    let doc = new Document();
    let wordSection = doc.createElement("div");
    wordSection.setAttribute("class", "WordSection1");
    let nodeTree = this.toNodeTree();

    wordSection.appendChild(nodeTree);
    doc.appendChild(wordSection);

    const serializer = new XMLSerializer();
    const subset = doc.querySelector(".WordSection1");
    return serializer.serializeToString(subset);
  }
}
