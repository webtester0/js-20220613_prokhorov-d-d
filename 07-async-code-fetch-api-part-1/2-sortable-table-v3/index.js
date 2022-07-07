import fetchJson from "./utils/fetch-json.js";

const BACKEND_URL = "https://course-js.javascript.ru";
export default class SortableTable {
  element;
  subElement = {};
  isSortLocally = false;

  constructor(headerConfig = [], { data = [], sorted = {}, url = "" } = {}) {
    this.headerConfig = headerConfig;
    this.data = data;
    this.sorted = sorted;
    this.url = new URL(url, BACKEND_URL);

    this.render();
    //Стартовая сортировка
    if (Object.keys(sorted).length) {
      this.sort(sorted.id, sorted.order);
    }
  }

  getTemplate() {
    return `
    <div data-element="productsContainer" class="products-list__container">
      <div class="sortable-table">
          <div data-element="header" class="sortable-table__header sortable-table__row">  
            ${this.getHeader(this.headerConfig, this.orderValue)}
        </div>
        <div data-element="body" class="sortable-table__body">
            ${this.getElements(this.data)}
        </div>
      </div>
  </div>
    `;
  }

  getHeader() {
    return this.headerConfig
      .map(({ id = "", title = "", sortable = false }) => {
        return `
          <div class="sortable-table__cell" data-id="${id}" data-sortable="${sortable}">
            <span>${title}</span>
            <span data-element="arrow" class="sortable-table__sort-arrow">
            <span class="sort-arrow"></span>
          </span>
          </div>        
        `;
      })
      .join("");
  }

  getElements(data) {
    return data
      .map((item) => {
        return `
                <a href="/products/${item.id}" class="sortable-table__row">

                  ${this.getElement(item)}
              </a>
    `;
      })
      .join("");
  }

  getElement(item) {
    const headers = this.headerConfig.map(({ id, template }) => {
      return { id, template };
    });
    return headers
      .map(({ id, template }) => {
        return template
          ? template(item[id])
          : `<div class="sortable-table__cell">${item[id]}</div>`;
      })
      .join("");
  }

  sortValues(arr, fieldValue = "", param = "", sortType = "number") {
    if (!param) return;
    const directions = {
      asc: 1,
      desc: -1,
    };
    const direction = directions[param];

    if (sortType === "string") {
      const collator = new Intl.Collator(["ru", "en"], {
        sensitivity: "variant",
        caseFirst: "upper",
      });
      return [...arr].sort(
        (obj1, obj2) =>
          direction * collator.compare(obj1[fieldValue], obj2[fieldValue])
      );
    }
    return [...arr].sort(
      (obj1, obj2) => direction * (obj1[fieldValue] - obj2[fieldValue])
    );
  }

  sortOnClient(fieldValue, orderValue) {
    this.orderValue = orderValue;
    let sortable = false;
    let sortType = "number";

    for (const header of this.headerConfig) {
      if (fieldValue === header.id) {
        sortable = header.sortable;
        sortType = header.sortType;
      }
    }

    if (!sortable) return;

    if (sortType === "string") {
      this.data = this.sortValues(this.data, fieldValue, orderValue, sortType);
    }
    this.data = this.sortValues(this.data, fieldValue, orderValue);

    //add sort arrow
    const allColumns = this.element.querySelectorAll(
      ".sortable-table__cell[data-id]"
    );
    const currentColumn = this.element.querySelector(
      `.sortable-table__cell[data-id="${fieldValue}"]`
    );

    allColumns.forEach((column) => {
      column.dataset.order = "";
    });

    currentColumn.dataset.order = orderValue;

    this.update(this.data);
  }

  async sortOnServer(fieldValue, orderValue) {
    console.log(orderValue);
    this.orderValue = orderValue;
    console.log(this.orderValue);

    this.url.searchParams.set("_embed", "subcategory.category");
    this.url.searchParams.set("_sort", fieldValue);
    this.url.searchParams.set("_order", orderValue);
    this.url.searchParams.set("_start", 0);
    this.url.searchParams.set("_end", 30);

    const data = await fetchJson(this.url);

    this.update(data);
    return data;
  }

  update(updateData) {
    const columns = this.getElements(updateData);
    this.subElements.body.innerHTML = columns;
  }

  async sort(fieldValue, orderValue) {
    if (this.isSortLocally) {
      this.sortOnClient(fieldValue, orderValue);
    } else {
      await this.sortOnServer(fieldValue, orderValue);
    }
  }

  getSubElements() {
    const result = {};
    const elements = this.element.querySelectorAll("[data-element]");

    for (const subElement of elements) {
      const name = subElement.dataset.element;

      result[name] = subElement;
    }

    return result;
  }

  initEventListener() {
    this.element.addEventListener("pointerdown", async (event) => {
      const title = event.target.closest("div");
      const headers = this.element.querySelector(".sortable-table__header");

      if (!title) return;
      if (!headers.contains(title)) return;

      if (title.dataset.sortable === "true") {
        if (title.dataset.order && title.dataset.order === "asc") {
          title.dataset.order = "desc";
        } else {
          title.dataset.order = this.sorted.order;
        }
        await this.sort(title.dataset.id, title.dataset.order);
      }
      return;
    });
  }

  render() {
    const element = document.createElement("div");

    element.innerHTML = this.getTemplate();
    this.element = element.firstElementChild;
    this.initEventListener();

    this.subElements = this.getSubElements();
  }

  remove() {
    if (this.element) {
      this.element.remove();
    }
  }

  destroy() {
    this.remove();
    this.element = null;
  }
}
