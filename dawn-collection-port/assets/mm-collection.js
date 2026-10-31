/**
 * Minimog Collection Module for Dawn
 * Self-contained port of Minimog collection filtering, sorting, grid layout, and pagination.
 */
(function () {
  // Global theme namespaces
  window.MinimogTheme = window.MinimogTheme || {};
  window.MinimogLibs = window.MinimogLibs || {};
  window.MinimogSettings = window.MinimogSettings || {
    design_mode: !!(window.Shopify && window.Shopify.designMode),
  };

  // Mobile media query helper
  const mobileQuery = window.matchMedia("(max-width: 767px)");
  window.MinimogTheme.config = window.MinimogTheme.config || {
    mqlMobile: mobileQuery.matches,
    mediaQueryMobile: "screen and (max-width: 767px)",
    mediaQueryTablet: "screen and (max-width: 1023px)",
  };

  const updateMql = (e) => {
    window.MinimogTheme.config.mqlMobile = e.matches;
    document.dispatchEvent(new CustomEvent(e.matches ? "matchMobile" : "unmatchMobile"));
  };
  if (mobileQuery.addEventListener) {
    mobileQuery.addEventListener("change", updateMql);
  } else if (mobileQuery.addListener) {
    mobileQuery.addListener(updateMql);
  }

  // MinimogEvents event bus
  window.MinimogEvents =
    window.MinimogEvents ||
    new (class {
      constructor() {
        this.events = {};
      }
      subscribe(evt, callback) {
        this.events[evt] = this.events[evt] || [];
        this.events[evt].push(callback);
        return () => this.unSubscribe(evt, callback);
      }
      unSubscribe(evt, callback) {
        const arr = this.events[evt];
        if (arr && Array.isArray(arr)) {
          for (let i = 0; i < arr.length; i++) {
            if (arr[i] === callback) {
              arr.splice(i, 1);
              break;
            }
          }
        }
      }
      emit(evt, ...args) {
        (this.events[evt] || []).forEach((fn) => {
          try {
            fn(...args);
          } catch (e) {
            console.error(e);
          }
        });
      }
    })();

  // DOM and helper utilities
  function queryDomNodes(selectors = {}, context = document) {
    const ctx = typeof context === "string" ? document.querySelector(context) : context;
    if (!ctx) return {};
    return Object.entries(selectors).reduce((acc, [name, selector]) => {
      const findOne = typeof selector === "string";
      const queryMethod = findOne ? "querySelector" : "querySelectorAll";
      const sl = findOne ? selector : selector[0];
      acc[name] = ctx[queryMethod](sl);
      return acc;
    }, {});
  }
  window.queryDomNodes = window.queryDomNodes || queryDomNodes;

  function debounce(fn, wait) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }
  window.debounce = window.debounce || debounce;

  function addEventDelegate({ context = document.documentElement, event = "click", selector, handler, capture = false }) {
    const ctx = typeof context === "string" ? document.querySelector(context) : context;
    if (!ctx) return () => {};
    const listener = function (e) {
      for (let target = e.target; target && target !== this; target = target.parentNode) {
        if (target.matches && target.matches(selector)) {
          handler.call(target, e, target);
          break;
        }
      }
    };
    ctx.addEventListener(event, listener, capture);
    return () => ctx.removeEventListener(event, listener, capture);
  }
  window.addEventDelegate = window.addEventDelegate || addEventDelegate;

  const sectionCache = new Map();
  function fetchSection(sectionId, options = {}) {
    const { url: _url, fromCache = false, params = {} } = options;
    return new Promise((resolve, reject) => {
      const url = new URL(_url || window.location.href);
      url.searchParams.set("section_id", sectionId);
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

      const cacheKey = url.toString();
      if (fromCache && sectionCache.has(cacheKey)) {
        resolve(sectionCache.get(cacheKey));
        return;
      }
      fetch(cacheKey)
        .then((res) => {
          if (res.ok) return res.text();
          throw new Error(`Failed to load section ${sectionId}`);
        })
        .then((text) => {
          const doc = new DOMParser().parseFromString(text, "text/html");
          if (fromCache) sectionCache.set(cacheKey, doc);
          resolve(doc);
        })
        .catch(reject);
    });
  }
  window.fetchSection = window.fetchSection || fetchSection;

  function updateParam(key, value) {
    const { location } = window;
    const baseUrl = [location.protocol, "//", location.host, location.pathname].join("");
    const urlParams = new URLSearchParams(window.location.search);
    if (value !== "" && value !== "undefined" && value !== undefined && value !== null) {
      urlParams.set(key, value);
    } else {
      urlParams.delete(key);
    }
    const queryString = urlParams.toString();
    const newUrl = queryString ? `${baseUrl}?${queryString}` : baseUrl;
    window.history.pushState({ path: newUrl }, "", newUrl);
  }
  window.updateParam = window.updateParam || updateParam;

  function refreshProductReview() {
    if (typeof SMARTIFYAPPS !== "undefined" && SMARTIFYAPPS.rv && SMARTIFYAPPS.rv.installed) {
      SMARTIFYAPPS.rv.scmReviewsRate.actionCreateReviews();
    }
    if (typeof Yotpo !== "undefined" && typeof Yotpo.API === "function") {
      const yotpoApi = new Yotpo.API(yotpo);
      yotpoApi?.refreshWidgets();
    }
  }
  window.refreshProductReview = window.refreshProductReview || refreshProductReview;

  function handleBackgroundImageLazyload() {
    const lazyBgs = document.querySelectorAll(".m-bg-lazy:not(.loaded)");
    if (!lazyBgs.length) return;
    if ("IntersectionObserver" in window) {
      const obs = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("loaded");
            observer.unobserve(entry.target);
          }
        });
      });
      lazyBgs.forEach((bg) => obs.observe(bg));
    } else {
      lazyBgs.forEach((bg) => bg.classList.add("loaded"));
    }
  }
  window.handleBackgroundImageLazyload = window.handleBackgroundImageLazyload || handleBackgroundImageLazyload;

  // AnimateLoading implementation
  class AnimateLoading {
    constructor(target = document.body, options = {}) {
      this.target = target || document.body;
      this.options = Object.assign(
        {
          overlay: null,
          thickness: "3px",
          color: "currentColor",
          startDuration: 1000,
          finishDuration: 300,
        },
        options
      );
      this.overlay = this.options.overlay;
      this.setLoadingData();
    }
    setLoadingData() {
      const { thickness, color, startDuration, finishDuration } = this.options;
      this.target.style.setProperty("--al-thickness", thickness);
      this.target.style.setProperty("--al-color", color);
      this.target.style.setProperty("--al-start-duration", `${startDuration}ms`);
      this.target.style.setProperty("--al-finish-duration", `${finishDuration}ms`);
    }
    start() {
      this.target.classList.add("al-loading-bar", "start", "loading");
      if (this.overlay) {
        this.overlay.classList.add("al-loading-overlay", "overlay-show");
      }
    }
    finish(cb = () => {}) {
      this.target.classList.add("loaded");
      this.target.classList.remove("loading");
      if (this.overlay) {
        this.overlay.classList.remove("overlay-show");
      }
      setTimeout(() => {
        this.target.classList.remove("al-loading-bar", "start", "loaded");
        if (this.overlay) {
          this.overlay.classList.remove("al-loading-overlay");
        }
        cb();
      }, this.options.finishDuration);
    }
  }
  window.MinimogLibs.AnimateLoading = AnimateLoading;

  // Accordion implementation
  class Accordion {
    constructor(container, options = {}) {
      this.defaultOptions = {
        presetContentHeight: false,
        duration: 300,
        onload: false,
        callback: () => {},
      };
      this.selectors = {
        items: [".m-accordion--item"],
        buttons: [".m-accordion--item-button"],
        contents: [".m-accordion--item-content"],
      };
      this.openClass = "open";
      this.initClass = "acc-initialized";
      this.container = container;
      if (!this.container || this.container.classList.contains(this.initClass)) return;

      this.options = Object.assign({}, this.defaultOptions, options);
      this.container.classList.add(this.initClass);
      this.domNodes = queryDomNodes(this.selectors, this.container);
      this.debouncedSetContentHeight = debounce(this.setContentHeight.bind(this), 300);

      this.init();
    }
    init() {
      this.setContentHeight();
      this.removeEvents = addEventDelegate({
        context: this.container,
        selector: this.selectors.buttons[0],
        handler: (e, button) => {
          e.preventDefault();
          const item = button.closest(".m-accordion--item");
          if (!item) return;
          const items = Array.from(this.container.querySelectorAll(".m-accordion--item"));
          const index = items.indexOf(item);
          if (index !== -1) {
            this.toggle(index);
          }
        },
      });
      window.addEventListener("resize", this.debouncedSetContentHeight);
      if (typeof this.options.callback === "function") {
        this.options.callback();
      }
    }
    destroy() {
      this.removeEvents && this.removeEvents();
      window.removeEventListener("resize", this.debouncedSetContentHeight);
      this.container && this.container.classList.remove(this.initClass);
    }
    setContentHeight() {
      this.domNodes = queryDomNodes(this.selectors, this.container);
      const items = this.domNodes.items || [];
      items.forEach((item) => {
        const content = item.querySelector(".m-accordion--item-content");
        if (!content) return;
        if (item.classList.contains(this.openClass)) {
          item.style.setProperty("--content-max-height", `${content.scrollHeight}px`);
        } else {
          item.style.setProperty("--content-max-height", "0px");
        }
      });
    }
    toggle(index) {
      this.domNodes = queryDomNodes(this.selectors, this.container);
      const item = this.domNodes.items && this.domNodes.items[index];
      if (!item) return;
      const content = item.querySelector(".m-accordion--item-content");
      const isOpen = item.classList.contains(this.openClass);

      item.classList.toggle(this.openClass);
      if (content) {
        if (!isOpen) {
          item.style.setProperty("--content-max-height", `${content.scrollHeight}px`);
          content.style.opacity = "1";
        } else {
          item.style.setProperty("--content-max-height", "0px");
        }
      }
    }
  }
  window.MinimogLibs.Accordion = Accordion;

  // Custom Elements
  if (!customElements.get("responsive-image")) {
    class ResponsiveImage extends HTMLElement {
      constructor() {
        super();
        this.img = this.querySelector("img");
        if (this.img) {
          this.src = this.img.src;
          this.loadImage = this.loadImage.bind(this);
          this.img.onload = this.onLoad.bind(this);
          if (this.img.complete) {
            this.onLoad();
          }
        }
      }
      connectedCallback() {
        if ("IntersectionObserver" in window) {
          this.initIntersectionObserver();
        } else {
          this.loadImage();
        }
      }
      disconnectedCallback() {
        this.disconnectObserver();
      }
      loadImage() {
        this.setAttribute("intersecting", "true");
        if (this.img && this.src) {
          this.img.src = this.src;
        }
        window.MinimogEvents.emit("m:image-loaded", this);
      }
      onLoad() {
        this.classList.add("m-image-loaded");
      }
      initIntersectionObserver() {
        if (this.observer) return;
        this.observer = new IntersectionObserver(
          (entries) => {
            if (entries[0] && entries[0].isIntersecting) {
              this.observer.unobserve(this);
              this.loadImage();
            }
          },
          { rootMargin: "50px" }
        );
        this.observer.observe(this);
      }
      disconnectObserver() {
        if (this.observer) {
          this.observer.disconnect();
          this.observer = null;
        }
      }
    }
    customElements.define("responsive-image", ResponsiveImage);
  }

  if (!customElements.get("m-select-component")) {
    class MSelectComponent extends HTMLElement {
      constructor() {
        super();
        this.selectors = {
          elSelectNative: ".js-selectNative",
          elSelectCustom: ".js-selectCustom",
          elSelectCustomBox: ".m-select-custom--trigger",
          elSelectCustomOpts: ".m-select-custom--options",
          elSelectCustomOpt: ".m-select-custom--option",
        };
      }
      connectedCallback() {
        this.domNodes = queryDomNodes(this.selectors, this);
        this.init();
      }
      init() {
        const { elSelectNative, elSelectCustom, elSelectCustomBox, elSelectCustomOpt } = this.domNodes;
        if (!elSelectNative || !elSelectCustom) return;

        this.syncValueToCustom();
        elSelectCustomBox && elSelectCustomBox.addEventListener("click", (e) => {
          e.stopPropagation();
          elSelectCustom.classList.toggle("isActive");
        });

        if (elSelectCustomOpt && elSelectCustomOpt.length) {
          elSelectCustomOpt.forEach((opt, idx) => {
            opt.addEventListener("click", () => {
              elSelectNative.selectedIndex = idx;
              this.syncValueToCustom();
              elSelectCustom.classList.remove("isActive");
              elSelectNative.dispatchEvent(new Event("change", { bubbles: true }));
            });
          });
        }

        document.addEventListener("click", (e) => {
          if (!this.contains(e.target)) {
            elSelectCustom.classList.remove("isActive");
          }
        });
      }
      syncValueToCustom() {
        const { elSelectNative, elSelectCustom } = this.domNodes;
        if (!elSelectNative || !elSelectCustom) return;
        const triggerText = elSelectCustom.querySelector(".m-select-custom--trigger-text");
        const selected = elSelectNative.options[elSelectNative.selectedIndex];
        if (triggerText && selected) {
          triggerText.textContent = selected.text;
        }
      }
    }
    customElements.define("m-select-component", MSelectComponent);
  }

  if (!customElements.get("price-range")) {
    class PriceRange extends HTMLElement {
      constructor() {
        super();
        this.rangeMin = this.querySelector('input[type="range"]:first-child');
        this.rangeMax = this.querySelector('input[type="range"]:last-child');
        this.inputMin = this.querySelector('input[name="filter.v.price.gte"]');
        this.inputMax = this.querySelector('input[name="filter.v.price.lte"]');

        if (this.inputMin) {
          this.inputMin.addEventListener("focus", () => this.inputMin.select());
          this.inputMin.addEventListener("change", this.onInputMinChange.bind(this));
        }
        if (this.inputMax) {
          this.inputMax.addEventListener("focus", () => this.inputMax.select());
          this.inputMax.addEventListener("change", this.onInputMaxChange.bind(this));
        }
        if (this.rangeMin) {
          this.rangeMin.addEventListener("change", this.onRangeMinChange.bind(this));
          this.rangeMin.addEventListener("input", this.onRangeMinInput.bind(this));
        }
        if (this.rangeMax) {
          this.rangeMax.addEventListener("change", this.onRangeMaxChange.bind(this));
          this.rangeMax.addEventListener("input", this.onRangeMaxInput.bind(this));
        }
      }
      onInputMinChange(e) {
        e.preventDefault();
        e.target.value = Math.max(
          Math.min(parseInt(e.target.value) || 0, parseInt(this.inputMax.value || e.target.max) - 1),
          e.target.min || 0
        );
        if (this.rangeMin) {
          this.rangeMin.value = e.target.value;
          this.rangeMin.parentElement.style.setProperty(
            "--from",
            `${(parseInt(this.rangeMin.value) / parseInt(this.rangeMin.max)) * 100}%`
          );
        }
      }
      onInputMaxChange(e) {
        e.preventDefault();
        e.target.value = Math.min(
          Math.max(parseInt(e.target.value) || 0, parseInt(this.inputMin.value || e.target.min) + 1),
          e.target.max
        );
        if (this.rangeMax) {
          this.rangeMax.value = e.target.value;
          this.rangeMax.parentElement.style.setProperty(
            "--to",
            `${(parseInt(this.rangeMax.value) / parseInt(this.rangeMax.max)) * 100}%`
          );
        }
      }
      onRangeMinChange(e) {
        e.stopPropagation();
        if (this.inputMin) {
          this.inputMin.value = e.target.value;
          this.inputMin.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
      onRangeMaxChange(e) {
        e.stopPropagation();
        if (this.inputMax) {
          this.inputMax.value = e.target.value;
          this.inputMax.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
      onRangeMinInput(e) {
        const val = Math.min(parseInt(e.target.value), parseInt(this.inputMax.value || e.target.max) - 1);
        e.target.value = val;
        e.target.parentElement.style.setProperty(
          "--from",
          `${(val / parseInt(e.target.max)) * 100}%`
        );
        if (this.inputMin) this.inputMin.value = val;
      }
      onRangeMaxInput(e) {
        const val = Math.max(parseInt(e.target.value), parseInt(this.inputMin.value || e.target.min) + 1);
        e.target.value = val;
        e.target.parentElement.style.setProperty(
          "--to",
          `${(val / parseInt(e.target.max)) * 100}%`
        );
        if (this.inputMax) this.inputMax.value = val;
      }
    }
    customElements.define("price-range", PriceRange);
  }

  if (!customElements.get("facet-remove")) {
    class FacetRemove extends HTMLElement {
      constructor() {
        super();
        const removeFilterNode = this.querySelector("a");
        if (removeFilterNode) {
          removeFilterNode.addEventListener("click", (e) => {
            e.preventDefault();
            const filtersForm =
              this.closest("collection-filters-form") || document.querySelector("collection-filters-form");
            if (filtersForm) {
              filtersForm.renderPage(new URL(removeFilterNode.href, window.location.origin).searchParams.toString());
            } else {
              window.location.href = removeFilterNode.href;
            }
          });
        }
      }
    }
    customElements.define("facet-remove", FacetRemove);
  }

  const cachedFiltersResult = [];
  if (!customElements.get("collection-filters-form")) {
    class CollectionFiltersForm extends HTMLElement {
      constructor() {
        super();
        this.selectors = {
          section: ".facest-filters-section",
          productGridContainer: "#CollectionProductGrid",
          filtersForm: "#CollectionFiltersForm",
          sortingInToolbar: "[data-toolbar-sorting] select",
          sortingInForm: "[data-form-sorting] select",
          initialActiveSortingOption: ".m-sortby-mobile--content li.active",
          filtersWrapper: ".m-filter--wrapper",
          sidebar: ".m-sidebar",
          sidebarContent: ".m-sidebar--content",
          openSidebar: ".m-sidebar--open",
          closeSidebar: ".m-sidebar--close",
        };
      }
      connectedCallback() {
        this.domNodes = queryDomNodes(this.selectors);
        this.setData();
        this.debouncedOnSubmit = debounce((evt) => this.onSubmitHandler(evt), 500);
        if (this.domNodes.filtersForm) {
          this.domNodes.filtersForm.addEventListener("input", this.debouncedOnSubmit.bind(this));
        }
        this.setLoadingTarget();
        this.initSorting();
        window.addEventListener("popstate", this.onHistoryChange);
      }
      disconnectedCallback() {
        window.removeEventListener("popstate", this.onHistoryChange);
        if (this.listeners) {
          this.listeners.forEach((unsubscribe) => unsubscribe());
        }
      }
      setData() {
        const { section, initialActiveSortingOption } = this.domNodes;
        if (!section) return;
        this.enableSorting = section.dataset.enableSorting === "true";
        this.filtersPosition = section.dataset.filtersPosition;
        this.sectionId = section.dataset.sectionId;
        this.activeSortingOption = initialActiveSortingOption;
        this.view = section.dataset.view;
        this.listeners = [];
      }
      initSorting() {
        const { sortingInToolbar } = this.domNodes;
        if (!this.enableSorting || !sortingInToolbar) return;
        const selectedOpt = sortingInToolbar.querySelector("option[selected]");
        if (selectedOpt && selectedOpt.dataset.index) {
          sortingInToolbar.selectedIndex = selectedOpt.dataset.index;
        }
        sortingInToolbar.addEventListener("change", () => {
          this.handleSorting(sortingInToolbar.selectedIndex);
        });

        this.listeners = [
          addEventDelegate({
            selector: ".m-sortby-mobile--content li",
            handler: (e, option) => {
              if (option !== this.activeSortingOption) {
                this.activeSortingOption?.classList?.remove?.("active");
                option.classList.add("active");
                this.activeSortingOption = option;
                if (window.MinimogTheme.Collection) {
                  window.MinimogTheme.Collection.closeMobileSorting();
                }
                this.handleSorting(option.dataset.index);
              }
            },
          }),
        ];
      }
      handleSorting(sortingOptionIndex) {
        const { filtersForm, sortingInForm } = this.domNodes;
        if (sortingInForm) {
          sortingInForm.selectedIndex = Number(sortingOptionIndex) || 0;
        }
        if (filtersForm) {
          filtersForm.dispatchEvent(new Event("input"));
        }
      }
      setLoadingTarget() {
        const screen = window.innerWidth < 768 ? "mobile" : "desktop";
        const { productGridContainer, section } = this.domNodes;
        const isFiltersOffCanvas = screen === "mobile" || this.filtersPosition === "fixed";
        const options = isFiltersOffCanvas ? {} : { overlay: productGridContainer };
        this.loading = new MinimogLibs.AnimateLoading(section || document.body, options);
      }
      onSubmitHandler(event) {
        if (event) event.preventDefault();
        if (!this.domNodes.filtersForm) return;
        const formData = new FormData(this.domNodes.filtersForm);
        const searchParams = new URLSearchParams(formData).toString();
        this.renderPage(searchParams);
      }
      onHistoryChange = (event) => {
        const searchParams = event.state?.searchParams || "";
        this.renderPage(searchParams, false);
      };
      renderPage = (searchParams, updateURLHash = true) => {
        if (this.loading) this.loading.start();
        const _url = `${window.location.pathname}?section_id=${this.sectionId}&${searchParams}`;
        const cachedResult = cachedFiltersResult.find(({ url }) => url === _url);
        const renderFunc = cachedResult ? this.renderSectionFromCache : this.renderSectionFromFetch;
        renderFunc(_url)
          .then(() => {
            if (window.MinimogTheme.Collection) {
              window.MinimogTheme.Collection.init();
            }
            if (this.loading) this.loading.finish(this.scrollToTop);
            document.dispatchEvent(new CustomEvent("collection:rerendered"));
          })
          .catch(console.error);

        if (updateURLHash) this.updateURLHash(searchParams);
      };
      renderSectionFromFetch = (url) => {
        return fetch(url)
          .then((res) => {
            if (res.ok) return res.text();
            throw new Error("Failed to load section!");
          })
          .then((text) => {
            cachedFiltersResult.push({ url, html: text });
            this.renderProductGrid(text);
          })
          .catch(console.error);
      };
      renderSectionFromCache = async (_url) => {
        const cachedResult = cachedFiltersResult.find(({ url }) => url === _url);
        if (cachedResult) this.renderProductGrid(cachedResult.html);
      };
      renderProductGrid = (html) => {
        const newSection = new DOMParser().parseFromString(html, "text/html").querySelector(".facest-filters-section");
        if (this.domNodes.section && newSection) {
          this.domNodes.section.replaceWith(newSection);
        }
        handleBackgroundImageLazyload();
      };
      updateURLHash(searchParams) {
        history.pushState(
          { searchParams },
          "",
          `${window.location.pathname}${searchParams ? "?" + searchParams : ""}`
        );
      }
      scrollToTop = () => {
        const target = document.getElementById("CollectionProductGrid");
        if (!target) return;
        window.scrollTo({
          behavior: "smooth",
          top: target.getBoundingClientRect().top + window.pageYOffset - 80,
        });
      };
    }
    customElements.define("collection-filters-form", CollectionFiltersForm);
  }

  if (!customElements.get("collection-tags-filters")) {
    class TagsFilter extends HTMLElement {
      constructor() {
        super();
        this.selectors = {
          mainContent: "#MainContent",
          section: 'section[data-section-type="collection-template"]',
          collectionHeader: '[data-section-type="collection-header"]',
          productGridContainer: "#CollectionProductGrid",
          sorting: 'select[name="sort_by"]',
          initialActiveSortingOption: ".m-sortby-mobile--content li.active",
        };
        this.preventClick = false;
      }
      connectedCallback() {
        this.domNodes = queryDomNodes(this.selectors);
        this.setData();
        this.listeners = [
          addEventDelegate({
            selector: "[data-tag-filter]",
            handler: this.handleFilter,
          }),
        ];
        this.initSorting();
        this.setLoadingTarget();
      }
      disconnectedCallback() {
        this.listeners.forEach((unsubscribe) => unsubscribe());
      }
      setData = () => {
        const { section, initialActiveSortingOption } = this.domNodes;
        if (!section) return;
        this.enableSorting = section.dataset.enableSorting === "true";
        this.filtersPosition = section.dataset.filtersPosition;
        this.sectionId = section.dataset.sectionId;
        this.activeSortingOption = initialActiveSortingOption;
      };
      handleFilter = (e, tag) => {
        e.preventDefault();
        if (this.preventClick) return;
        this.preventClick = true;
        const link = tag.querySelector("a");
        const url = link && link.href;
        if (url) this.fetchSectionHtml(url);
      };
      initSorting() {
        if (!this.enableSorting) return;
        if (this.domNodes.sorting) {
          this.domNodes.sorting.addEventListener("change", (e) => {
            this.handleSorting(e && e.target && e.target.value);
          });
        }
        addEventDelegate({
          selector: ".m-sortby-mobile--content li",
          handler: (e, option) => {
            if (option !== this.activeSortingOption) {
              this.activeSortingOption && this.activeSortingOption.classList.remove("active");
              option.classList.add("active");
              this.activeSortingOption = option;
              if (window.MinimogTheme.Collection) {
                window.MinimogTheme.Collection.closeMobileSorting();
              }
              this.handleSorting(option.dataset.value);
            }
          },
        });
      }
      handleSorting = (value) => {
        if (!value) return;
        updateParam("sort_by", value);
        this.fetchSectionHtml(window.location.href);
      };
      fetchSectionHtml(url) {
        if (this.loading) this.loading.start();
        fetch(url)
          .then((res) => {
            if (res.ok) return res.text();
            throw new Error("Failed to load section!");
          })
          .then((text) => {
            this.preventClick = false;
            this.renderProductGrid(text);
            this.updateBrowserHistory(url);
            if (window.MinimogTheme.Collection) {
              window.MinimogTheme.Collection.init();
            }
            if (this.loading) this.loading.finish(this.scrollToTop);
            document.dispatchEvent(new CustomEvent("collection:rerendered"));
          })
          .catch(console.error);
      }
      renderProductGrid = (html) => {
        const dom = new DOMParser().parseFromString(html, "text/html");
        const newSection = dom.querySelector(this.selectors.section);
        if (this.domNodes.section && newSection) {
          this.domNodes.section.replaceWith(newSection);
        }
        handleBackgroundImageLazyload();
      };
      setLoadingTarget = () => {
        const screen = window.innerWidth < 768 ? "mobile" : "desktop";
        const { productGridContainer, section } = this.domNodes;
        const isFiltersOffCanvas = screen === "mobile" || this.filtersPosition === "fixed";
        const options = isFiltersOffCanvas ? {} : { overlay: productGridContainer };
        this.loading = new MinimogLibs.AnimateLoading(section || document.body, options);
      };
      updateBrowserHistory(url) {
        window.history.replaceState({ path: url }, "", url);
      }
      scrollToTop = () => {
        const target = document.getElementById("CollectionProductGrid");
        if (!target) return;
        window.scrollTo({
          behavior: "smooth",
          top: target.getBoundingClientRect().top + window.pageYOffset - 80,
        });
      };
    }
    customElements.define("collection-tags-filters", TagsFilter);
  }

  // Collection Class Controller
  class Collection {
    constructor() {
      this.selectors = {
        section: ".facest-filters-section",
        toolbar: ".m-collection-toolbar",
        cols: [".m-toolbar--column-switcher button"],
        productContainer: "[data-product-container]",
        loadMoreBtn: "[data-load-more]",
        sidebar: ".m-sidebar",
        sidebarContent: ".m-sidebar--content",
        openSidebar: ".m-sidebar--open",
        closeSidebar: ".m-sidebar--close",
        filtersWrapper: ".m-filter--wrapper",
      };
      this.mobileSortingSelectors = {
        openSorting: ".m-sortby--open",
        closeSorting: ".m-sortby-mobile--close",
        sortingWrapper: ".m-sortby-mobile--wrapper",
        sortingList: ".m-sortby-mobile--content",
      };
      this.sectionId = "";
      this.isDesignMode = window.MinimogSettings.design_mode;
      this.currentPage = 1;
      this.STORAGE_KEY = "gridColumnViews";
      this.MAX_COL_BY_SCREEN_SIZE = {
        mobile: 2,
        tablet: 4,
        desktop: 5,
      };
      this.sideEffectEventsAdded = false;
      this.isLoadingMore = false;
      this.stickyScrollHandlerAdded = false;
    }

    init = () => {
      this.domNodes = queryDomNodes(this.selectors);
      this.mbSortingNodes = queryDomNodes(this.mobileSortingSelectors);
      if (!this.domNodes.section) return;

      this.setData();
      this.initGridView();
      this.initFilters();
      this.initMobileSorting();
      this.initProducts();

      if (!this.sideEffectEventsAdded) {
        this.sideEffectEventsAdded = true;
        window.MinimogEvents.subscribe("ON_PRODUCT_LIST_UPDATED", () => refreshProductReview());
        this.handleStickyToolbar();
        document.addEventListener("matchMobile", () => this.handleStickyToolbar());
        document.addEventListener("unmatchMobile", () => this.handleStickyToolbar());
      }
    };

    setData = () => {
      const { section, productContainer } = this.domNodes;
      if (!section) return;
      this.sectionId = section.dataset.sectionId;
      this.paginationType = section.dataset.paginationType;
      this.totalPages = productContainer && Number(productContainer.dataset.totalPages);
      this.view = section.dataset.view;
      this.activeCol = null;
      this.currentPage = 1;
      this.initialCol = Number(section.dataset.initialColumn) || 3;
      this.cachedCol = Number(window.localStorage.getItem(this.STORAGE_KEY)) || this.initialCol;
      this.showColSwitchers = section.dataset.showColSwitchers === "true";
      this.enableFilters = section.dataset.enableFilters === "true";
      this.enableSorting = section.dataset.enableSorting === "true";
      this.filtersType = section.dataset.filtersType;
      this.filtersPosition = section.dataset.filtersPosition;
    };

    initGridView = () => {
      this.toggleView(this.isDesignMode ? this.initialCol : this.cachedCol);
      this.updateViewByScreen();
      addEventDelegate({
        selector: this.selectors.cols[0],
        context: this.domNodes.toolbar,
        handler: (e, colNode) => this.toggleView(Number(colNode.dataset.column)),
      });
      this.initLoadMore();
      if (!this.sideEffectEventsAdded) {
        window.addEventListener("resize", debounce(this.updateViewByScreen, 500));
      }
    };

    initFilters = () => {
      if (!this.enableFilters) return;
      const { sidebar, openSidebar, closeSidebar } = this.domNodes;
      window.requestAnimationFrame(this.initAccordions);
      if (openSidebar) openSidebar.addEventListener("click", this.openSidebarFilter);
      if (closeSidebar) closeSidebar.addEventListener("click", this.closeSidebarFilter);
      if (sidebar) sidebar.addEventListener("click", (e) => e.target === sidebar && this.closeSidebarFilter());
    };

    initMobileSorting = () => {
      if (!this.enableSorting) return;
      const { openSorting, closeSorting, sortingWrapper } = this.mbSortingNodes;
      if (openSorting) openSorting.addEventListener("click", this.openMobileSorting);
      if (closeSorting) closeSorting.addEventListener("click", this.closeMobileSorting);
      if (sortingWrapper)
        sortingWrapper.addEventListener("click", (e) => e.target === sortingWrapper && this.closeMobileSorting());
    };

    openMobileSorting = () => {
      const { sortingWrapper, sortingList } = this.mbSortingNodes;
      if (!sortingWrapper || !sortingList) return;
      sortingWrapper.style.display = "block";
      window.requestAnimationFrame(() => {
        sortingWrapper.style.setProperty("--m-bg-opacity", "0.5");
        sortingList.style.setProperty("--m-translate-y", "0");
      });
    };

    closeMobileSorting = () => {
      const { sortingWrapper, sortingList } = this.mbSortingNodes;
      if (!sortingWrapper || !sortingList) return;
      sortingWrapper.style.setProperty("--m-bg-opacity", "0");
      sortingList.style.setProperty("--m-translate-y", "100%");
      setTimeout(() => sortingWrapper.style.setProperty("display", "none"), 300);
    };

    initAccordions = () => {
      this.accordions && this.accordions.destroy();
      const { filtersWrapper } = this.domNodes;
      if (!filtersWrapper) return;
      filtersWrapper.classList.remove("acc-initialized");
      this.accordions = new MinimogLibs.Accordion(filtersWrapper, {
        presetContentHeight: window.innerWidth > 1280 && this.filtersPosition !== "fixed",
        callback: () => filtersWrapper.style.setProperty("opacity", "1"),
      });
    };

    openSidebarFilter = () => {
      const { sidebar, sidebarContent, section } = this.domNodes;
      if (!sidebar || !sidebarContent) return;
      sidebar.style.display = "block";
      window.requestAnimationFrame(() => {
        sidebar.style.setProperty("--m-bg-opacity", "0.5");
        sidebarContent.style.setProperty("--m-translate-x", "0");
        this.accordions && this.accordions.setContentHeight();
      });
      if (section) section.classList.add("sidebar-open");
    };

    closeSidebarFilter = () => {
      const { sidebar, sidebarContent, section } = this.domNodes;
      if (!sidebar || !sidebarContent) return;
      if (section) section.classList.remove("sidebar-open");
      if (window.innerWidth < 1280 || sidebar.dataset.type === "fixed") {
        sidebarContent.style.setProperty("--m-translate-x", "-100%");
        sidebar.style.removeProperty("--m-bg-opacity");
        setTimeout(() => sidebar.style.removeProperty("display"), 300);
      }
    };

    toggleView = (col) => {
      if (!col || this.view === "search") return;
      const { cols, productContainer } = this.domNodes;
      if (!productContainer) return;

      const activeCol = this.activeCol || this.initialCol;
      if (this.showColSwitchers && cols && cols.length >= activeCol && cols.length >= col) {
        cols[activeCol - 1]?.classList?.remove("active");
        cols[col - 1]?.classList?.add("active");
      }

      productContainer.classList.remove(`m-cols-${activeCol}`);
      productContainer.classList.add(`m-cols-${col}`);

      try {
        window.localStorage.setItem(this.STORAGE_KEY, col);
      } catch (e) {}
      this.activeCol = col;
    };

    updateViewByScreen = () => {
      if (this.activeCol === 1) return;
      const device = this.getDeviceByScreenSize();
      const maxCol = this.MAX_COL_BY_SCREEN_SIZE[device];
      if (maxCol < this.activeCol) this.toggleView(maxCol);
    };

    getDeviceByScreenSize = () => {
      if (window.innerWidth < 768) return "mobile";
      if (window.innerWidth < 1024) return "tablet";
      return "desktop";
    };

    initLoadMore = () => {
      if (this.paginationType === "paginate" || this.totalPages <= 1 || this.view === "search") return;
      const { loadMoreBtn } = this.domNodes;
      if (!loadMoreBtn) return;
      loadMoreBtn.removeEventListener("click", this.loadMoreProducts);
      loadMoreBtn.addEventListener("click", this.loadMoreProducts);

      if (this.infiniteLoadingObserver) {
        this.infiniteLoadingObserver.disconnect();
      }

      if (this.paginationType === "infinite") {
        this.infiniteLoadingObserver = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.intersectionRatio === 1) this.loadMoreProducts();
            });
          },
          { threshold: 1 }
        );
        this.infiniteLoadingObserver.observe(loadMoreBtn);
      }
    };

    loadMoreProducts = () => {
      if (this.isLoadingMore) return;
      const nextPage = this.currentPage + 1;
      if (nextPage > this.totalPages) return;

      this.isLoadingMore = true;
      const { productContainer, loadMoreBtn } = this.domNodes;
      this.toggleLoading(true);
      fetchSection(this.sectionId, { fromCache: true, params: { page: nextPage } })
        .then((productGridHTML) => {
          const productNodes = productGridHTML.querySelectorAll("[data-product-container] .m-product-item");
          productNodes.forEach((prodNode) => productContainer.appendChild(prodNode));
          this.initProducts();
        })
        .catch((err) => console.error("Failed to load more products.", err))
        .finally(() => {
          this.isLoadingMore = false;
          window.MinimogEvents.emit("ON_PRODUCT_LIST_UPDATED");
          this.toggleLoading(false);
          this.currentPage = nextPage;
          if (nextPage >= this.totalPages) {
            loadMoreBtn && loadMoreBtn.parentNode && loadMoreBtn.parentNode.remove();
            this.infiniteLoadingObserver && this.infiniteLoadingObserver.disconnect();
          }
        });
    };

    initProducts = () => {
      window.MinimogTheme.CompareProduct && window.MinimogTheme.CompareProduct.setCompareButtonsState();
      window.MinimogTheme.Wishlist && window.MinimogTheme.Wishlist.setWishlistButtonsState();
    };

    toggleLoading = (loading) => {
      const { loadMoreBtn } = this.domNodes;
      if (loadMoreBtn) {
        const method = loading ? "add" : "remove";
        loadMoreBtn.classList[method]("m-spinner-loading");
      }
    };

    handleStickyToolbar() {
      const toolbar = this.domNodes.toolbar;
      if (!toolbar) return;
      if (this.stickyScrollHandlerAdded) return;
      this.stickyScrollHandlerAdded = true;
      const extraSpace = toolbar.offsetTop;
      let lastScroll = 0;
      window.addEventListener("scroll", () => {
        const tb = this.domNodes.toolbar;
        if (!tb) return;
        if (window.MinimogTheme.config.mqlMobile) {
          const currentScroll = window.scrollY;
          if (currentScroll <= extraSpace) {
            tb.classList.remove("scroll-up", "m-collection-toolbar--sticky");
            return;
          }
          tb.classList.add("m-collection-toolbar--sticky");
          if (
            currentScroll > tb.offsetHeight + extraSpace &&
            currentScroll > lastScroll &&
            !tb.classList.contains("scroll-down")
          ) {
            tb.classList.remove("scroll-up");
            tb.classList.add("scroll-down");
          } else if (currentScroll < lastScroll && tb.classList.contains("scroll-down")) {
            tb.classList.remove("scroll-down");
            tb.classList.add("scroll-up");
          }
          lastScroll = currentScroll;
        } else {
          tb.classList.remove("scroll-up", "m-collection-toolbar--sticky", "scroll-down");
        }
      });
    }
  }

  window.Collection = Collection;
  window.MinimogTheme.Collection = new Collection();

  // AJAX Cart Quick-Add for single-variant products in Dawn
  addEventDelegate({
    context: document,
    event: "submit",
    selector: ".product-card-form",
    handler: (e, form) => {
      e.preventDefault();
      const submitBtn = form.querySelector('[name="add"]');
      if (submitBtn) submitBtn.classList.add("m-spinner-loading");

      const formData = new FormData(form);
      formData.append("sections_url", window.location.pathname);

      const cartNotification = document.querySelector("cart-notification");
      const cartDrawer = document.querySelector("cart-drawer");
      const cartTarget = cartDrawer || cartNotification;

      if (cartTarget && typeof cartTarget.getSectionsToRender === "function") {
        formData.append("sections", cartTarget.getSectionsToRender().map((s) => s.id).join(","));
      }

      const rootUrl =
        window.Shopify && window.Shopify.routes && window.Shopify.routes.root ? window.Shopify.routes.root : "/";
      fetch(rootUrl + "cart/add.js", {
        method: "POST",
        headers: { "X-Requested-With": "XMLHttpRequest" },
        body: formData,
      })
        .then((res) => res.json())
        .then((response) => {
          if (response.status) {
            console.error(response.description || "Failed to add item to cart.");
            return;
          }
          if (cartTarget && typeof cartTarget.renderContents === "function") {
            cartTarget.renderContents(response);
          } else {
            fetch(rootUrl + "cart.js")
              .then((r) => r.json())
              .then((cart) => {
                document.querySelectorAll(".cart-count-bubble span:first-child").forEach((el) => {
                  el.textContent = cart.item_count;
                });
              })
              .catch(() => {});
          }
        })
        .catch((err) => console.error("Error adding to cart:", err))
        .finally(() => {
          if (submitBtn) submitBtn.classList.remove("m-spinner-loading");
        });
    },
  });

  // Initialization
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => window.MinimogTheme.Collection.init());
  } else {
    window.MinimogTheme.Collection.init();
  }

  if (window.Shopify && window.Shopify.designMode) {
    document.addEventListener("shopify:section:load", function () {
      window.MinimogTheme.Collection.init();
    });
  }
})();
