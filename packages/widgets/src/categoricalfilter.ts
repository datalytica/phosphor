

import {
  ArrayExt
} from '@phosphor/algorithm';

import {
  VirtualDOM, VirtualElement, h
} from '@phosphor/virtualdom';

import {
  Widget
} from '@phosphor/widgets';

import {
  Message
} from '@phosphor/messaging';

import {
  Signal,
  ISignal
} from '@phosphor/signaling';

import {
  TypeNames,
  View
} from '@jpmorganchase/perspective';


export
class CategoricalFilter extends Widget {
  constructor(options: CategoricalFilter.IOptions) {
    super( { node: Private.createFilterNode(options.name) });
    this.addClass('p-CategoricalFilter');
    this.setFlag(Widget.Flag.DisallowLayout);

    this._columnName = options.name;
    this._columnType = options.columnType;
    this._columnType;
    this._view = options.view;

    this._view.on_update( this._processResults.bind(this) );
    this._view.to_flat({}).then( this._processResults.bind(this) );

    this.renderer = CategoricalFilter.defaultRenderer;

    let closeNode = this.node.getElementsByClassName('p-CategoricalFilter-titleCloseIcon')[0];
    closeNode.addEventListener('click', (event: MouseEvent) => {
      this.close();
    });
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    this._items.length = 0;
    this._view.delete();
    super.dispose();
  }

  readonly renderer: CategoricalFilter.IRenderer;

  /**
   * A signal emitted when the current set of categories changes.
   */
  get filterChanged(): ISignal<this, CategoricalFilter.IFilterChangedArgs> {
    return this._filterChanged;
  }

  /**
   * The syntax for perspective's filters.
   */
  get pspFilter() {
    // generate list of values
    //let categories = [];
    //let filter_func = ((this._exclude) ? ((cat: CategoricalFilter.ICategory) => !cat.isChecked) 
    //                                  : ((cat: CategoricalFilter.ICategory) => cat.isChecked));

    let filter_func = ((cat: CategoricalFilter.ICategory) => cat.isChecked);
    let categories = this._items.filter(filter_func).map(cat => cat.category);
    //for (let i = 0; i < this._items.length; ++i) {
    //  if (this._items[i].isChecked) {
    //    categories.push(this._items[i].category);
    //  }
   // }
    if (categories.length !== this._items.length) {
      let op = (this._exclude) ? "not in" : "in";
      return [[this._columnName, op, categories]];
    } else {
      // Don't return any filter conditions if all are checked
      return [];
    }
  }

  /**
   * The current search query.
   *
   */
  get query() : string {
    let node = this.inputNode;
    let value = node.value;
    return value.slice(0, node.selectionStart || value.length);
  }

  /**
   * The categorical filter search node.
   *
   * #### Notes
   * This is the node which contains the search-related elements.
   */
  get searchNode(): HTMLDivElement {
    return this.node.getElementsByClassName('p-CategoricalFilter-search')[0] as HTMLDivElement;
  }

  /**
   * The categorical filter input node.
   *
   * #### Notes
   * This is the actual input node for the search area.
   */
  get inputNode(): HTMLInputElement {
    return this.node.getElementsByClassName('p-CategoricalFilter-input')[0] as HTMLInputElement;
  }

  /**
   * The categorical filter content node.
   *
   * #### Notes
   * This is the node which holds the command item nodes.
   *
   * Modifying this node directly can lead to undefined behavior.
   */
  get contentNode(): HTMLUListElement {
    return this.node.getElementsByClassName('p-CategoricalFilter-content')[0] as HTMLUListElement;
  }

  /**
   * The categorical filter exclude node.
   */
  get excludeNode(): HTMLDivElement {
    return this.node.getElementsByClassName('p-CategoricalFilter-exclude')[0] as HTMLDivElement;
  }

  /**
   * A read-only array of the command items in the palette.
   */
  get items(): ReadonlyArray<CategoricalFilter.ICategory> {
    return this._items;
  }

  /**
   * Clear the search results and schedule an update.
   *
   * #### Notes
   * This should be called whenever the search results of the palette
   * should be updated.
   *
   * This is typically called automatically by the palette as needed,
   * but can be called manually if the input text is programatically
   * changed.
   *
   * The rendered results are updated asynchronously.
   */
  refreshSearch(): void {
    let items = this._items;
    let query = this.query;

    let results = Private.search(items, query);
    if (!this._expandInline) {
      if (query && results.length) {
        // Uncheck all but the current visible set
        let resultCheck = new Set(results);
        items.forEach(item => { item.isChecked = resultCheck.has(item); });
        this._allChecked = false;
      } else if (!query) {
        // Query is empyt, reset filter to show all
        this._allChecked = true;
        items.forEach(item => { item.isChecked = true; });
      }
    }
    this._results = results;
    this.update();
  }

  /**
   * Handle the DOM events for the categorical filter.
   *
   * @param event - The DOM event sent to the categorical filter.
   *
   * #### Notes
   * This method implements the DOM `EventListener` interface and is
   * called in response to events on the categorical filter's DOM node.
   * It should not be called directly by user code.
   */
  handleEvent(event: Event): void {
    switch (event.type) {
    case 'click':
      this._evtClick(event as MouseEvent);
      break;
    case 'keydown':
      this._evtKeyDown(event as KeyboardEvent);
      break;
    case 'input':
      this._evtInput(event as KeyboardEvent);
      break;
    case 'focus':
    case 'blur':
      this._toggleFocused();
      break;
    }
  }

  /**
   * A message handler invoked on a `'before-attach'` message.
   */
  protected onBeforeAttach(msg: Message): void {
    this.node.addEventListener('click', this);
    this.node.addEventListener('keydown', this);
    this.node.addEventListener('input', this);
    this.node.addEventListener('focus', this, true);
    this.node.addEventListener('blur', this, true);
  }

  /**
   * A message handler invoked on an `'after-detach'` message.
   */
  protected onAfterDetach(msg: Message): void {
    this.node.removeEventListener('click', this);
    this.node.removeEventListener('keydown', this);
    this.node.removeEventListener('input', this);
    this.node.removeEventListener('focus', this, true);
    this.node.removeEventListener('blur', this, true);
  }


  /**
   * A message handler invoked on an `'close-request'` message.
   */
  protected onCloseRequest(msg: Message): void {
    super.onCloseRequest(msg);
    // Clear out any filters
    this._items.forEach(item => { item.isChecked = true; });
    this._filterChanged.emit({});
    this.dispose();
  }

  /**
   * A message handler invoked on an `'activate-request'` message.
   */
  protected onActivateRequest(msg: Message): void {
    if (this.isAttached) {
      let input = this.inputNode;
      input.focus();
      input.select();
    }
  }

  /**
   * A message handler invoked on an `'update-request'` message.
   */
  protected onUpdateRequest(msg: Message): void {
    // Fetch the current query text and content node.
    let query = this.query;
    let contentNode = this.contentNode;

    let results = this._results;

    if (this._expandInline) {
      let all_cat = [{category: '(Select All)',
                      count: null,
                      isChecked: this._allChecked} as CategoricalFilter.ICategory];
      results = all_cat.concat(results);
    }

    // If there is no query and no results, clear the content
    if (!query && ( results.length == 0 || results.length > 10)) {
      VirtualDOM.render(null, contentNode);
      return;
    }

    // If there is a query but no results, render the empty message
    if (query && results.length === 0) {
      let content = this.renderer.renderEmptyMessage({ query });
      VirtualDOM.render(content, contentNode);
      return;
    }

    // Create the render content for the search results.
    let renderer = this.renderer;
    let content = new Array<VirtualElement>(results.length);
    for (let i = 0, n = results.length; i < n; ++i) {
      let item = results[i];
      content[i] = renderer.renderItem(item);
    }

    // Render the search result content.
    VirtualDOM.render(content, contentNode);
  }

  /**
   * Handle the `'input'` event for the categorical filter.
   */
  private _evtInput(event: KeyboardEvent): void {
    let oldR = this._results.slice();
    this.refreshSearch();
    let newR = this._results.slice();

    if (!(oldR.length === newR.length &&
         oldR.every(function (val, idx) { return val == newR[idx]}))) {
      this._filterChanged.emit({});
    }

    // Fill in result
    if (!this._delete && this._results.length) {
      let node = this.inputNode;
      let query = node.value;
      let terms = query.split(',').map(t => t.trim());
      // autocomplete the last term
      if (terms.length) {
        let term = terms[terms.length - 1].toLocaleLowerCase();
        if (term.length) {
          let match = this._items.find(i => i.category.toLocaleLowerCase().startsWith(term));
          if (match) {
            let current = query.slice(0, query.length - term.length);
            node.value = current + match.category;
            node.setSelectionRange(current.length + term.length, current.length + match.category.length);
          }
        }
      }
    }
  }

  /**
   * Handle the `'click'` event for the categorical filter.
   */
  private _evtClick(event: MouseEvent): void {
    // Bail if the click is not the left button.
    if (event.button !== 0) {
      return;
    }

    // First check if we clicked on the exclude
    let excludeNode = this.excludeNode;
    if (excludeNode.contains(event.target as HTMLElement)) {
      this._exclude = !this._exclude;
      let checkboxNode = excludeNode.getElementsByClassName('p-CategoricalFilter-itemCheckbox')[0];
      if (this._exclude) {
        checkboxNode.classList.add('p-mod-checked');
        checkboxNode.classList.remove('p-mod-unchecked');
      } else {
        checkboxNode.classList.remove('p-mod-checked');
        checkboxNode.classList.add('p-mod-unchecked');
      }
      this._filterChanged.emit({});
      return;
    }

    // Find the index of the item which was clicked.
    let index = ArrayExt.findFirstIndex(this.contentNode.children, node => {
      return node.contains(event.target as HTMLElement);
    });

    // Bail if the click was not on an item.
    if (index === -1) {
      return;
    }

    // Kill the event when a content item is clicked.
    event.preventDefault();
    event.stopPropagation();

    if (this._expandInline) {
      // if the 'All' was clicked set all of them
      if (index === 0) {
        let allChecked = (this._allChecked = !this._allChecked);
        this._items.forEach( item => { item.isChecked = allChecked; } );
      } else {
        index -= 1;
        let item = this._results[index];
        item.isChecked = !item.isChecked;

        this._allChecked = this._items.reduce( (acc, item) => acc && item.isChecked, true);
      }
    } else {
      let item = this._results[index];
      item.isChecked = !item.isChecked;
      this._allChecked = false;
    }
    this._filterChanged.emit({});
    this.update();
  }

  /**
   * Handle the `'keydown'` event for the categorical filter.
   */
  private _evtKeyDown(event: KeyboardEvent): void {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
      return;
    }
    switch (event.keyCode) {
    case 13:  // Enter
      event.preventDefault();
      event.stopPropagation();
      break;
    case 9:   // Tab
      let node = this.inputNode;
      if (node.selectionStart !== node.selectionEnd) {
        node.selectionStart = node.selectionEnd;
      }
      event.preventDefault();
      event.stopPropagation();
      break;
    case 8:  // Backspace
      this._delete = true;
      break;
    default:
      this._delete = false;
    }
  }

  /**
   * Toggle the focused modifier based on the input node focus state.
   */
  private _toggleFocused(): void {
    let focused = document.activeElement === this.inputNode;
    this.toggleClass('p-mod-focused', focused);
  }

  private _processResults( results: any ) {

    let categories = results.row_spans[0];
    let checkedItems = new Map(this._items.map(
      (i: CategoricalFilter.ICategory) => [i.category, i.isChecked] as [string, boolean]));

    let allChecked = this._allChecked;

    let items = categories.map( (c: any, i: number): CategoricalFilter.ICategory => {
      let category = c[0].toString();
      // default to our allChecked status
      let isChecked = allChecked;
      // If we've already seen it, use the current value
      if (checkedItems.has(category)) {
        isChecked = checkedItems.get(category) as boolean;
      }
      return {category: category, count: results.data[i][0], isChecked: isChecked};
    });

    this._expandInline = (items.length <= 10);
    this.searchNode.style.display = (this._expandInline) ? 'none' : 'block';

    let query = this.query;
    this._items = items;
    this._results = Private.search(items, query);
    this.update();
  }

  private _columnName: string;
  private _items: CategoricalFilter.ICategory[] = [];
  private _results: CategoricalFilter.ICategory[] = [];
  private _allChecked: boolean = true;
  private _columnType: TypeNames;
  private _expandInline: boolean = true;
  private _exclude: boolean = false;

  private _delete: boolean = false;
  private _view: View;

  private _filterChanged = new Signal<this, CategoricalFilter.IFilterChangedArgs>(this);
}


/**
 * The namespace for the `CategoricalFilter` class statics.
 */
export
namespace CategoricalFilter {
  /**
   * An options object for creating a categorical filter.
   */
  export
  interface IOptions {
    /**
     * The name of the column.
     */
    name: string;

    /**
     * The type of the column.
     */
    columnType: TypeNames;

    /**
     * A perspective view representing the unique values
     */
    view: View;
  }

  /**
   * The arguments object for the `filterChanged` signal.
   */
  export interface IFilterChangedArgs {
    /**
     * 
     */
  }

  /**
   * An object which represents an item in a categorical filter.
   *
   * #### Notes
   * Item objects are created automatically by a categorical filter.
   */
  export
  interface ICategory {
    /**
     * The value of the category.
     */
    readonly category: string;

    /**
     * The count of the category
     */
    readonly count: number | null;

    /**
     * Whether the item item is checked.
     */
    isChecked: boolean;
  }

  /**
   * The render data for a categorical filter empty message.
   */
  export
  interface IEmptyMessageRenderData {
    /**
     * The query which failed to match any commands.
     */
    query: string;
  }

  /**
   * A renderer for use with a categorical filter.
   */
  export
  interface IRenderer {
    /**
     * Render the virtual element for a categorical filter item.
     *
     * @param data - The data to use for rendering the item.
     *
     * @returns A virtual element representing the item.
     *
     * #### Notes
     * The categorical filter will not render invisible items.
     */
    renderItem(data: ICategory): VirtualElement;

    /**
     * Render the empty results message for a categorical filter.
     *
     * @param data - The data to use for rendering the message.
     *
     * @returns A virtual element representing the message.
     */
    renderEmptyMessage(data: IEmptyMessageRenderData): VirtualElement;
  }

  /**
   * The default implementation of `IRenderer`.
   */
  export
  class Renderer implements IRenderer {
    /**
     * Render the virtual element for a categorical filter item.
     *
     * @param data - The data to use for rendering the item.
     *
     * @returns A virtual element representing the item.
     */
    renderItem(data: ICategory): VirtualElement {
      let className = this.createItemClass(data);
      return (
        h.li({ className },
          this.renderItemCheckbox(data),
          this.renderItemLabel(data)
        )
      );
    }

    /**
     * Render the empty results message for a categorical filter.
     *
     * @param data - The data to use for rendering the message.
     *
     * @returns A virtual element representing the message.
     */
    renderEmptyMessage(data: IEmptyMessageRenderData): VirtualElement {
      let content = `No items found that match '${data.query}'`;
      return h.li({ className: 'p-CategoricalFilter-emptyMessage' }, content);
    }

    /**
     * Render the checkbox for a categorical filter item.
     *
     * @param data - The data to use for rendering the label.
     *
     * @returns A virtual element representing the label.
     */
    renderItemCheckbox(data: ICategory): VirtualElement {
      let className = 'p-CategoricalFilter-itemCheckbox';
      if (data.isChecked) {
        className += ' p-mod-checked';
      } else {
        className += ' p-mod-unchecked';
      }
      return h.span({ className: className });
    }

    /**
     * Render the label for a categorical filter item.
     *
     * @param data - The data to use for rendering the label.
     *
     * @returns A virtual element representing the label.
     */
    renderItemLabel(data: ICategory): VirtualElement {
      let content = data.category;
      let count = data.count;
      let val = (count === null) ? `${content}` : `${content} (${count})`;
      return h.span({ className: 'p-CategoricalFilter-itemLabel' }, val);
    }

    /**
     * Create the class name for the categorical filter item.
     *
     * @param data - The data to use for the class name.
     *
     * @returns The full class name for the categorical filter item.
     */
    createItemClass(data: ICategory): string {
      // Set up the initial class name.
      let name = 'p-CategoricalFilter-item';

      // Add the boolean state classes.
      if (!data.isChecked) {
        name += ' p-mod-unchecked';
      }
      // Return the complete class name.
      return name;
    }
  }

  /**
   * The default `Renderer` instance.
   */
  export
  const defaultRenderer = new Renderer();
}


/**
 * The namespace for the module implementation details.
 */
namespace Private {
  /**
   * Create the DOM node for a categorical filter.
   */
  export
  function createFilterNode(column: string): HTMLDivElement {
    let node = document.createElement('div');
    let title = document.createElement('div');
    let title_label = document.createElement('span');
    let title_close = document.createElement('span');
    let exclude = document.createElement('div');
    let exclude_check = document.createElement('span');
    let exclude_label = document.createElement('span');
    let search = document.createElement('div');
    let wrapper = document.createElement('div');
    let div = document.createElement('div');
    let icon = document.createElement('span');
    let input = document.createElement('input');
    let content = document.createElement('ul');
    title.className = 'p-CategoricalFilter-title';
    title_close.className = 'p-CategoricalFilter-titleCloseIcon material-icons';
    search.className = 'p-CategoricalFilter-search';
    wrapper.className = 'p-CategoricalFilter-search-wrapper';
    icon.className = 'p-CategoricalFilter-searchIcon';
    input.className = 'p-CategoricalFilter-input';
    content.className = 'p-CategoricalFilter-content';
    exclude.className = 'p-CategoricalFilter-exclude';
    exclude_check.className = 'p-CategoricalFilter-itemCheckbox p-mod-unchecked';
    exclude_label.className = 'p-CategoricalFilter-itemLabel';
    input.spellcheck = false;
    title.appendChild(title_label);
    title.appendChild(title_close);
    title_label.textContent = column;
    title_close.textContent = 'close';
    exclude.appendChild(exclude_check);
    exclude.appendChild(exclude_label);
    exclude_label.textContent = 'Exclude';
    div.appendChild(input);
    wrapper.appendChild(icon);
    wrapper.appendChild(div);
    search.appendChild(wrapper);
    node.appendChild(title);
    node.appendChild(exclude);
    node.appendChild(search);
    node.appendChild(content);
    return node;
  }

  export
  function search(items: CategoricalFilter.ICategory[], query: string
  ) : CategoricalFilter.ICategory[] {
    if (!query) {
      return items.slice();
    }
    // Support comma separated query
    let terms = query.split(',').map(q => q.trim().toLocaleLowerCase());
    let func: any;
    let partial = terms[terms.length - 1];
    if (terms.length > 1) {
      let querySet = new Set(terms.slice(0, terms.length - 1));
      func = ( (i: CategoricalFilter.ICategory) => {
        let cat = i.category.toLocaleLowerCase();
        return (querySet.has(cat) || (partial && cat.startsWith(partial) ));
      });
    } else {
      func = ( (i: CategoricalFilter.ICategory) => {
        let cat = i.category.toLocaleLowerCase();
        return (partial && cat.startsWith(partial) );
      });
    }
    return items.filter( func );
  }
}
