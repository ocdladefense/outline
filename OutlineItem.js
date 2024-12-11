export default class OutlineItem {

    /**
     * An outline item in the document that references a specific dom element in the document.
     * 
     * @param {string} [content=''] content Content of the node, the main body of text pulled from the page.
     * @param {string} [href=''] Reference to the node that was parsed. Used to link to the node in the page.
     * @param {int} [level=0] Level of indendation in the list. Level 1 is the top level.
     */
    constructor(content = '', href = '', level = 0) {
        
        this.content = content;
        this.href = href;
        this.level = level;

        // Outline items can have outlines as children.
        this.children = [];

        // The parent outline allows us to move up the tree. This is the outline that this is a child of.
        this.parent = null;
    }


    /**
    * Adds a child to the current outline, and registers this outline as its parent.
    * @param {Outline} child Child outline to be adopted
    */
    adopt(child) {
        child.parent = this;
        this.children.push(child);
    }

    /**
    * Converts an outline object to a list item, with an anchor.
    * @returns {DomElement} Single list item based on the current object
    */
    toListItem() {
        // Create our dom elements
        let content = document.createTextNode(this.content);
        let anchor = document.createElement("a");

        // Set attributes for the anchor. This creates our link and does some styling
        anchor.setAttribute("href", "#" + this.href);
        anchor.setAttribute("class", "outline-anchor");

        // Create the list item and add some styling
        let node = document.createElement("li");
        node.setAttribute("class", "outline-item outline-item-level-" + this.level);
        node.setAttribute('id', this.href + '-outline-item');

        // Build the list item
        anchor.appendChild(content);
        node.appendChild(anchor);

        return node;
    };
}