
import {
//  VirtualDOM, VirtualElement, h
} from '@phosphor/virtualdom';

import {
  Message
} from '@phosphor/messaging';

import {
	Widget
} from '@phosphor/widgets';

import {
  Signal,
  ISignal
} from '@phosphor/signaling';

import {
	TypeNames, //NumericRelation
} from '@jpmorganchase/perspective';


export
class NumericFilter extends Widget {
  constructor(options: NumericFilter.IOptions) {
    super( { node: Private.createFilterNode(options.name) });
    this.addClass('p-NumericFilter');
    this.setFlag(Widget.Flag.DisallowLayout);

    this._columnName = options.name;
    this._columnType = options.columnType;
    this._columnType;

    let closeNode = this.node.getElementsByClassName('p-NumericFilter-titleCloseIcon')[0];
    closeNode.addEventListener('click', (event: MouseEvent) => {
      this.close();
    });
  }

  /**
   * A signal emitted when the current set of categories changes.
   */
  get filterChanged(): ISignal<this, NumericFilter.IFilterChangedArgs> {
    return this._filterChanged;
  }

  /**
   * The syntax for perspective's filters.
   */
  get pspFilter() {
    // generate list of values
    let conditions: any[] = [];

    let relation = this.selectNode.value;
    let value = Number.parseFloat(this.inputNode.value);

    if (relation && !Number.isNaN(value)) {
      conditions.push([this._columnName, relation, value]);
    }
    return conditions;
  }

  /**
   * The numeric filter input node.
   *
   * #### Notes
   * This is the actual input node.
   */
  get inputNode(): HTMLInputElement {
    return this.node.getElementsByClassName('p-NumericFilter-input')[0] as HTMLInputElement;
  }

  /**
   * The numeric filter select node.
   *
   * #### Notes
   * This is the actual select.
   */
  get selectNode(): HTMLSelectElement {
    return this.node.getElementsByClassName('p-NumericFilter-select')[0] as HTMLSelectElement;
  }

  /**
   * Handle the DOM events for the numeric filter.
   *
   * @param event - The DOM event sent to the numeric filter.
   *
   * #### Notes
   * This method implements the DOM `EventListener` interface and is
   * called in response to events on the numeric filter's DOM node.
   * It should not be called directly by user code.
   */
  handleEvent(event: Event): void {
    switch (event.type) {
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
    this.node.addEventListener('input', this);
    this.node.addEventListener('focus', this, true);
    this.node.addEventListener('blur', this, true);
  }

  /**
   * A message handler invoked on an `'after-detach'` message.
   */
  protected onAfterDetach(msg: Message): void {
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
    this.selectNode.value = '';
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
   * Handle the `'input'` event for the categorical filter.
   */
  private _evtInput(event: KeyboardEvent): void {
    let value = Number.parseFloat(this.inputNode.value);
    if (!Number.isNaN(value)) {
      this._filterChanged.emit({});
    }
  }

  /**
   * Toggle the focused modifier based on the input node focus state.
   */
  private _toggleFocused(): void {
    let focused = document.activeElement === this.inputNode;
    this.toggleClass('p-mod-focused', focused);
  }

  private _columnName: string;
  private _columnType: TypeNames;

  private _filterChanged = new Signal<this, NumericFilter.IFilterChangedArgs>(this);

}

/**
 * The namespace for the `NumericFilter` class statics.
 */
export
namespace NumericFilter {
  /**
   * An options object for creating a numeric filter.
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
  }

  /**
   * The arguments object for the `filterChanged` signal.
   */
  export interface IFilterChangedArgs {
    /**
     * 
     */
  }

}


/**
 * The namespace for the module implementation details.
 */
namespace Private {
  /**
   * Create the DOM node for a numeric filter.
   */
  export
  function createFilterNode(column: string): HTMLDivElement {
    let node = document.createElement('div');
    let title = document.createElement('div');
    let title_label = document.createElement('span');
    let title_close = document.createElement('span');
    let wrapper = document.createElement('div');
    let relation = document.createElement('select');
    let value = document.createElement('input');
    title.className = 'p-NumericFilter-title';
    title_close.className = 'p-NumericFilter-titleCloseIcon material-icons';
    wrapper.className = 'p-NumericFilter-input-wrapper';
    relation.className = 'p-NumericFilter-select';
    value.className = 'p-NumericFilter-input';

    let relations: Array<[string, string]> = [['Equals', '=='], ['Not Equals', '!='],
                     ['Greater Than', '>'], ['Less Than', '<'],
                     ['Less Than or Equals', '<='], ['Greater Than or Equals', '>=']];
    relations.forEach(rel => {
      let opt = document.createElement("option");
      opt.label = rel[0];
      opt.value = rel[1];
      relation.appendChild(opt);
    });

    value.spellcheck = false;
    title.appendChild(title_label);
    title.appendChild(title_close);
    title_label.textContent = column;
    title_close.textContent = 'close';
    node.appendChild(title);
    wrapper.appendChild(relation);
    wrapper.appendChild(value);
    node.appendChild(wrapper);
    return node;
  }
}


