
import {
  ArrayExt
} from '@phosphor/algorithm';

import {
  Message
} from '@phosphor/messaging';

import {
  Drag,
  IDragEvent
} from '@phosphor/dragdrop';

import {
  MimeData
} from '@phosphor/coreutils';

import {
  ElementExt
} from '@phosphor/domutils';

import {
  Widget
} from '@phosphor/widgets';

import {
  Signal,
  ISignal
} from '@phosphor/signaling';


/**
 * The class name added to the pivot selector node.
 */
const PIVOT_SELECTOR_CLASS = 'dg-PivotSelector';

const PIVOT_SELECTOR_EMPTY = 'dg-PivotSelector-empty';

const PIVOT_SELECTOR_CHEVRON_CLASS = 'dg-PivotSelector-chevron';

const PIVOT_SELECTOR_DRAGGING = 'dg-PivotSelector-dragging';

/**
 * The class name added to the pivot selector node.
 */
const PIVOT_SELECTOR_ITEM_CLASS = 'dg-PivotSelector-item';

const PIVOT_SELECTOR_ITEM_LABEL = 'dg-PivotSelector-item-label';

const PIVOT_SELECTOR_ITEM_DISABLED = 'dg-PivotSelector-item-disabled';

const PIVOT_SELECTOR_ITEM_CLOSE_CLASS = 'dg-PivotSelector-item-close';

/**
 * The mime type for a contents drag object.
 */
const CONTENTS_MIME = 'application/x-prism-column';

/**
 * The class name added to drop targets.
 */
const DROP_TARGET_CLASS = 'dg-mod-dropTarget';

/**
 * A class which hosts folder pivot selectors.
 */
export class PivotSelector extends Widget {
  /**
   * Construct a new pivot selector.
   */
  constructor(options: PivotSelector.IOptions) {
    super();
    this.setFlag(Widget.Flag.DisallowLayout);
    this._pivots = [];
    this._title = options.title;
    this._iconClass = options.iconClass || "";
    this._placeholderText = options.placeholderText || "";
    this.addClass(PIVOT_SELECTOR_CLASS);

    if (this._pivots) {
      this._items = Private.createItems(this._pivots);

      this._pivotsChanged.emit({
        previousPivots: null,
        currentPivots: this._pivots
      });
    }
  }

  get index(): number {
    return this._currentIndex;
  }

  /**
   * A signal emitted when the current index changes.
   */
  get indexChanged(): ISignal<this, PivotSelector.IIndexChangedArgs> {
    return this._indexChanged;
  }

  set pivots(pivots: string[]) {
    this._pivots = pivots;
    this._currentIndex = pivots.length - 1;
    this._items = Private.createItems(pivots);
    this.update();
  }

  get pivots(): string[] {
    return this._pivots;
  }

  /**
   * A signal emitted when the pivots change.
   */
  get pivotsChanged(): ISignal<this, PivotSelector.IPivotsChangedArgs> {
    return this._pivotsChanged;
  }

  /**
   * Handle the DOM events for the pivots selector.
   *
   * @param event - The DOM event sent to the widget.
   *
   * #### Notes
   * This method implements the DOM `EventListener` interface and is
   * called in response to events on the panel's DOM node. It should
   * not be called directly by user code.
   */
  handleEvent(event: Event): void {
    switch (event.type) {
      case 'mousedown':
        this._evtMouseDown(event as MouseEvent);
        break;
      case 'mousemove':
        this._evtMouseMove(event as MouseEvent);
        break;
      case 'mouseup':
        this._evtMouseUp(event as MouseEvent);
        break;
      case 'p-dragenter':
        this._evtDragEnter(event as IDragEvent);
        break;
      case 'p-dragleave':
        this._evtDragLeave(event as IDragEvent);
        break;
      case 'p-dragover':
        this._evtDragOver(event as IDragEvent);
        break;
      case 'p-drop':
        this._evtDrop(event as IDragEvent);
        break;
      default:
        return;
    }
  }

  /**
   * A message handler invoked on an `'after-attach'` message.
   */
  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.update();
    let node = this.node;
    node.addEventListener('mousedown', this);
    //node.addEventListener('click', this);
    node.addEventListener('p-dragenter', this);
    node.addEventListener('p-dragleave', this);
    node.addEventListener('p-dragover', this);
    node.addEventListener('p-drop', this);
  }

  /**
   * A message handler invoked on a `'before-detach'` message.
   */
  protected onBeforeDetach(msg: Message): void {
    super.onBeforeDetach(msg);
    let node = this.node;
    node.removeEventListener('mousedown', this);
    //node.removeEventListener('click', this);
    node.removeEventListener('p-dragenter', this);
    node.removeEventListener('p-dragleave', this);
    node.removeEventListener('p-dragover', this);
    node.removeEventListener('p-drop', this);
  }

  /**
   * A handler invoked on an `'update-request'` message.
   */
  protected onUpdateRequest(msg: Message): void {
    // Update the pivot selector list.
    this.updateNode(this._items, this._currentIndex, false);
  }
  /*protected onUpdateRequest(msg: Message): void {
    let titles = this._titles;
    let renderer = this.renderer;
    let currentTitle = this.currentTitle;
    let content = new Array<VirtualElement>(titles.length);
    for (let i = 0, n = titles.length; i < n; ++i) {
      let title = titles[i];
      let current = title === currentTitle;
      let zIndex = current ? n : n - i - 1;
      content[i] = renderer.renderTab({ title, current, zIndex });
    }
    VirtualDOM.render(content, this.contentNode);
  }*/

  /**
   * Handle the `'mousedown'` event for the tab bar.
   */
  private _evtMouseDown(event: MouseEvent): void {
    // Do nothing if it's not a left mouse press.
    if (event.button !== 0) {
      return;
    }

    // Do nothing if a drag is in progress.
    if (this._dragData) {
      return;
    }

    let index = ArrayExt.findFirstIndex(this._items, node => {
      return ElementExt.hitTest(node, event.clientX, event.clientY)
    });
    // Do nothing if the press is not on a tab.
    if (index === -1) {
      return;
    }

    // Pressing on a tab stops the event propagation.
    event.preventDefault();
    event.stopPropagation();

    // Initialize the non-measured parts of the drag data.
    this._dragData = {
      pivot: this._items[index] as HTMLElement,
      index: index,
      pressX: event.clientX,
      pressY: event.clientY,
      contentRect: null,
      dragRequested: false
    };

    // Add the document mouse up listener.
    document.addEventListener('mouseup', this, true);

    // Check if close button was clicked.
    let icon = Private.findElement(this._items[index], PIVOT_SELECTOR_ITEM_CLOSE_CLASS);
    if (icon && ElementExt.hitTest(icon, event.clientX, event.clientY)) {
      return;
    }

    // Listen for mouse moves if the close button wasn't pressed
    document.addEventListener('mousemove', this, true);
  }

  /**
   * Handle the `'mousemove'` event for the tab bar.
   */
  private _evtMouseMove(event: MouseEvent): void {
    // Do nothing if no drag is in progress.
    let data = this._dragData;
    if (!data) {
      return;
    }

    // Suppress the event during a drag.
    event.preventDefault();
    event.stopPropagation();

    // Emit the drag requested signal if the threshold is exceeded.
    if (!data.dragRequested && Private.dragExceeded(data, event)) {
      // Only emit the signal once per drag cycle.
      data.dragRequested = true;

      let columnName = this._pivots[data.index];

      // Setup the mime data for the drag operation.
      let mimeData = new MimeData();
      mimeData.setData(CONTENTS_MIME, columnName);

      // Create the drag image for the drag operation.
      let dragImage: HTMLElement = document.createElement('span');
      let label = document.createElement('span');
      dragImage.appendChild(label);
      label.textContent = columnName;
      label.className = 'dg-PivotSelector-item-label';
      dragImage.className = 'dg-PivotSelector-item';

      // Create the drag object to manage the drag-drop operation.
      let drag = new Drag({
        mimeData, dragImage,
        proposedAction: 'move',
        supportedActions: 'move',
      });

      let previousPivots = this._pivots.slice();
      ArrayExt.removeAt(this._pivots, data.index);
      this._items = Private.createItems(this._pivots);
      this.updateNode(this._items, this._currentIndex, false);

      // Create the cleanup callback.
      let cleanup = (() => {
        // Check status of drag
        // fire pivot changed event if previous pivots is different than current
        let currentPivots = this._pivots;
        let fireSignal = false;

        if (previousPivots.length == currentPivots.length) {
          for (let i = 0; i < previousPivots.length; ++i) {
            if (previousPivots[i] != currentPivots[i]) {
              fireSignal = true;
              break;
            }
          }
        } else {
          fireSignal = true;
        }

        if (fireSignal) {
          this._pivotsChanged.emit({
            previousPivots: previousPivots,
            currentPivots: currentPivots
          });
        }
      });

      // Start the drag operation and cleanup when done.
      drag.start(event.clientX, event.clientY).then(cleanup);
    }
  }

  /**
   * Handle the `'mouseup'` event for the document.
   */
  private _evtMouseUp(event: MouseEvent): void {
    // Do nothing if it's not a left or middle mouse release.
    if (event.button !== 0 && event.button !== 1) {
      return;
    }

    // Do nothing if no drag is in progress.
    const data = this._dragData;
    if (!data) {
      return;
    }

    // Stop the event propagation.
    event.preventDefault();
    event.stopPropagation();

    // Remove the extra mouse event listeners.
    document.removeEventListener('mousemove', this, true);
    document.removeEventListener('mouseup', this, true);

    // Clear the drag data.
    this._dragData = null;

    // Handle a release when the drag is not active.
    if (!data.dragRequested) {
      let index = ArrayExt.findFirstIndex(this._items, node => {
        return ElementExt.hitTest(node, event.clientX, event.clientY)
      });

      // Do nothing if the release is not on the original pressed tab.
      if (index !== data.index) {
        return;
      }

      // Check if close button was clicked.
      let icon = Private.findElement(this._items[index], PIVOT_SELECTOR_ITEM_CLOSE_CLASS);
      if (icon && ElementExt.hitTest(icon, event.clientX, event.clientY)) {
        let previousPivots = this._pivots.slice();
        this._pivots.splice(index, 1);
        this._currentIndex = this._pivots.length - 1;
        this._items = Private.createItems(this._pivots);

        this.updateNode(this._items, this._currentIndex, false);
        this._pivotsChanged.emit({
          previousPivots: previousPivots,
          currentPivots: this._pivots
        });

        return;
      }

      // Otherwise, trigger an index change event
      let prevIndex = this._currentIndex;
      this._currentIndex = index;
      this._items = Private.createItems(this._pivots);

      this.updateNode(this._items, this._currentIndex, false);
      this._indexChanged.emit({
        previousIndex: prevIndex,
        currentIndex: this._currentIndex
      });

    }
  }

  /**
   * Handle the `'p-dragenter'` event for the widget.
   */
  private _evtDragEnter(event: IDragEvent): void {
    if (event.mimeData.hasData(CONTENTS_MIME)) {
      this.node.classList.add(DROP_TARGET_CLASS);
      let index = Private.findInsertionIndex(this._items, event.clientX);
      if (index == -1) {
        index = this._items.length;
      }
      let column = event.mimeData.getData(CONTENTS_MIME) as string;
      let virtual = Private.createItems([column])[0];
      let items = this._items.slice();
      items.splice(index, 0, virtual);
      this.updateNode(items, items.length, true);

      event.preventDefault();
      event.stopPropagation();
    }
  }

  /**
   * Handle the `'p-dragleave'` event for the widget.
   */
  private _evtDragLeave(event: IDragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.node.classList.remove(DROP_TARGET_CLASS);
    this.updateNode(this._items, this._currentIndex, false);
  }

  /**
   * Handle the `'p-dragover'` event for the widget.
   */
  private _evtDragOver(event: IDragEvent): void {
    if (event.mimeData.hasData(CONTENTS_MIME)) {
      event.preventDefault();
      event.stopPropagation();
      event.dropAction = event.proposedAction;
      let index: number;

      // This code needs to be rewritten with a vdom
      let nodeList = this.node.querySelectorAll(`.${PIVOT_SELECTOR_ITEM_CLASS}`);
      let elems = Array.from(nodeList) as HTMLElement[];
      if (elems) {
        index = Private.findInsertionIndex(elems, event.clientX);
      } else {
        index = 0;
      }
      if (index == -1) {
        index = this._items.length;
      }

      let column = event.mimeData.getData(CONTENTS_MIME) as string;
      let virtual = Private.createItems([column])[0];
      let items = this._items.slice();
      items.splice(index, 0, virtual);
      this.updateNode(items, items.length, true);
    }
  }

  /**
   * Handle the `'p-drop'` event for the widget.
   */
  private _evtDrop(event: IDragEvent): void {
    if (event.mimeData.hasData(CONTENTS_MIME)) {
      event.preventDefault();
      event.stopPropagation();
      if (event.proposedAction === 'none') {
        event.dropAction = 'none';
        return;
      }
      if (!event.mimeData.hasData(CONTENTS_MIME)) {
        return;
      }
      event.dropAction = event.proposedAction;

      // Target is this node.
      let target = event.target as HTMLElement;
      target.classList.remove(DROP_TARGET_CLASS);
      let column = event.mimeData.getData(CONTENTS_MIME) as string;

      let index = Private.findInsertionIndex(this._items, event.clientX);
      if (index == -1) {
        index = this._items.length;
      }

      let previousPivots = this._pivots.slice();
      this._pivots.splice(index, 0, column);
      this._currentIndex = this._pivots.length - 1;
      this._items = Private.createItems(this._pivots);

      this.updateNode(this._items, this._currentIndex, false);
      this._pivotsChanged.emit({
        previousPivots: previousPivots,
        currentPivots: this._pivots
      });
    }
  }

  /**
   * Populate the pivot selector node.
   */
  private updateNode(
    items: ReadonlyArray<HTMLElement>,
    index: number,
    dragging: boolean
  ) : ReadonlyArray<HTMLElement> {

    let node = this.node;
    let title = this._title;
    let iconClass = this._iconClass;
    let placeholder = this._placeholderText;

    // Remove previous items.
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }

    let item: HTMLElement;

    if (iconClass) {
      item = document.createElement('span');
      item.className = 'dg-PivotSelector-title-icon ' + iconClass;
      node.appendChild(item);
    }

    item = document.createElement('span');
    item.className = 'dg-PivotSelector-title';
    item.textContent = title;
    node.appendChild(item);

    if (items.length) {
      for (let i = 0; i < items.length; i++) {
        let item = items[i];
        node.appendChild(item);

        if (dragging) {
          item.classList.add(PIVOT_SELECTOR_DRAGGING);
        } else {
          item.classList.remove(PIVOT_SELECTOR_DRAGGING);
        }

        if (i > index) {
          item.classList.add(PIVOT_SELECTOR_ITEM_DISABLED);
        } else {
          item.classList.remove(PIVOT_SELECTOR_ITEM_DISABLED);
        }
        // Add separators
        if (i != items.length - 1) {
          let sep = document.createElement('i');
          sep.classList.add(PIVOT_SELECTOR_CHEVRON_CLASS);
          sep.classList.add('material-icons');
          sep.textContent = 'navigate_next';
          node.appendChild(sep);
          if (i > index - 1) {
            sep.classList.add(PIVOT_SELECTOR_ITEM_DISABLED);
          }
        }
      }
    } else {
      let empty = document.createElement('span');
      empty.className = PIVOT_SELECTOR_EMPTY;
      empty.textContent = placeholder;
      node.appendChild(empty);
    }
    return items;
  }

  private _currentIndex: number = 0;
  private _pivots: string[];
  private _title: string;
  private _iconClass: string;
  private _placeholderText: string;
  private _items: ReadonlyArray<HTMLElement>;
  private _pivotsChanged = new Signal<this, PivotSelector.IPivotsChangedArgs>(this);
  private _indexChanged = new Signal<this, PivotSelector.IIndexChangedArgs>(this);

  private _dragData: Private.IDragData | null = null;
}

/**
 * The namespace for the `PivotSelector` class statics.
 */
export namespace PivotSelector {
  /**
   * An options object for initializing a pivot selector
   */
  export interface IOptions {
    /**
     * A starting list of items.
     */
    title: string;

    /**
     * A placeholder string to show when there are no items.
     */
    placeholderText?: string;

    /**
     * The icon class.
     */
    iconClass?: string;
  }

  /**
   * The arguments object for the `pivotsChanged` signal.
   */
  export interface IPivotsChangedArgs {
    /**
     * The previous pivot values.
     */
     readonly previousPivots: string[] | null;

    /**
     * The current pivot values.
     */
     readonly currentPivots: string[];
  }

  /**
   * The arguments object for the `indexChanged` signal.
   */
  export interface IIndexChangedArgs {
    /**
     * The previous index value.
     */
     readonly previousIndex: number | null;

    /**
     * The current index value.
     */
     readonly currentIndex: number;
  }

}

/**
 * The namespace for the crumbs private data.
 */
namespace Private {

  /**
   * The drag distance threshold.
   */
  export
  const DRAG_THRESHOLD = 20;

  /**
   * A struct which holds the drag data for a tab bar.
   */
  export
  interface IDragData {
    /**
     * The pivot node being dragged.
     */
    pivot: HTMLElement;

    /**
     * The index of the pivot being dragged.
     */
    index: number;

    /**
     * The mouse press client X position.
     */
    pressX: number;

    /**
     * The mouse press client Y position.
     */
    pressY: number;

    /**
     * The bounding client rect of the pivot selector content node.
     *
     * This will be `null` if the drag is not active.
     */
    contentRect: ClientRect | null;

    /**
     * Whether a drag request as been made.
     */
    dragRequested: boolean;
  }

  /**
   * Test if the event exceeds the drag drag threshold.
   */
  export
  function dragExceeded(data: IDragData, event: MouseEvent): boolean {
    let dx = Math.abs(event.clientX - data.pressX);
    let dy = Math.abs(event.clientY - data.pressY);
    return dx >= DRAG_THRESHOLD || dy >= DRAG_THRESHOLD;
  }

  /**
   * Create the pivot nodes.
   */
  export function createItems(
    pivots: string[]
  ) : ReadonlyArray<HTMLElement> {
    let items: HTMLElement[] = [];

    for (let i = 0; i < pivots.length; i++) {
      let pivot = pivots[i];
      let item = document.createElement('span');
      let label = document.createElement('span');
      let close = document.createElement('i');

      item.className = PIVOT_SELECTOR_ITEM_CLASS;
      item.title = pivot;
      label.className = PIVOT_SELECTOR_ITEM_LABEL;
      label.textContent = pivot;

      close.classList.add(PIVOT_SELECTOR_ITEM_CLOSE_CLASS);
      close.classList.add('material-icons');
      close.classList.add('md-small');
      close.textContent = 'close';

      item.appendChild(label);
      item.appendChild(close);

      items.push(item);
    }
    return items;
  }

  export function findInsertionIndex(
    items: ReadonlyArray<HTMLElement>,
    clientX: number,
  ) : number {
    let index = ArrayExt.findFirstIndex(items, element => {
      let rect = element.getBoundingClientRect();
      return (clientX < rect.right);
    });
    return index;
  }

  export function findElement(
    parent: HTMLElement,
    className: string
  ): HTMLElement {
    return parent.querySelector(`.${className}`) as HTMLElement;
  }
}
