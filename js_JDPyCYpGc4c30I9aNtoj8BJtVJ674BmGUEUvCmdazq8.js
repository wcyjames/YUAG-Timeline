(function (document, window, noUiSlider, Drupal) {

  Drupal.behaviors.cogappRangeSlider = {
    attach(context, settings) {
      const rangeFacetSettings = settings?.facets?.cogapp_range ?? [];

      // Loop over our settings and apply the facet slider.
      Object.entries(rangeFacetSettings).forEach(([facetId, settings]) => {
        const rangeEl = document.getElementById(facetId);

        if (rangeEl) {
          this.addCogappRangeSlider(rangeEl, settings);
        }
      })
    },

    /**
     *
     * @param {HTMLDivElement} el
     * @param settings
     */
    addCogappRangeSlider(el, settings) {
      if (typeof el.noUiSlider !== 'undefined') {
        // NoUiSlider has already been bound - let's not do anything.
        return;
      }

      let {min, max} = settings;

      min = Math.trunc(Math.floor(min));
      max = Math.trunc(Math.floor(max));

      const format = {
        from: (number) => Math.floor(number),
        to: (v) => v >= 0 ? Math.trunc(Math.floor(v)) : `${Math.trunc(Math.floor(v)) * -1} B.C.`
      }

      const slider = noUiSlider.create(el, {
        range: { min, max },
        step: 1,
        connect: true,
        start: [min, max],
        // tooltips: format,
        // format,
        // ariaFormat: format,
        handleAttributes: [
          { 'aria-label': 'Set lower year bound' },
          { 'aria-label': 'Set upper year bound' },
        ],
        pips: {
          mode: 'count',
          values: 5,
          density: 2,
          format
        }
      })

      // If we've got the same mina nd max values, then we need to disable the
      // slider. If we don't then the user can still use the slider, but only
      // for one date, and it behaves a little strangely.
      if (min === max) {
        el.setAttribute('disabled', true)
      }

      const setLink = (min, max) => {
        const applyLink = document.getElementById(`${el.id}-apply-link`)

        if (applyLink) {
          applyLink.href = settings.url
            .replace(
              '__range_slider_min__',
              Math.floor(min)
            )
            .replace(
              '__range_slider_max__',
              Math.floor(max)
            )
        }
      }

      setLink(min, max)

      // Swap out the URL when a facet is used.
      slider.on('set', (_, __, [min, max]) => setLink(min, max))

      // Link the input boxes to the slider.
      const minFacetInput = el.parentElement.querySelector(`[data-min-facet-id=${el.id}]`);
      const maxFacetInput = el.parentElement.querySelector(`[data-max-facet-id=${el.id}]`);

      slider.on('update', ([min, max], handle) => {
        if (handle === 0) {
          minFacetInput.value = Math.floor(min);
        }

        if (handle === 1) {
          maxFacetInput.value = Math.floor(max);
        }
      })

      minFacetInput.addEventListener('change', (e) => {
        console.log('min', e.currentTarget.value);
        slider.set([e.currentTarget.value, null])
      });

      maxFacetInput.addEventListener('change', (e) => {
        console.log('max', e.currentTarget.value);
        slider.set([null, e.currentTarget.value])
      })
    }
  }

})(document, window, noUiSlider, Drupal)
;
/**
 * @file
 * Provides base widget behaviours.
 */

(function ($, Drupal, once) {

  'use strict';

  /**
   * Handles "facets_filter" event and triggers "facets_filtering".
   *
   * The facets module will listend and trigger defined events on elements with
   * class: "js-facets-widget".
   *
   * Events are doing following:
   * "facets_filter" - widget should trigger this event. The facets module will
   *   handle it accordingly in case of AJAX and Non-AJAX views.
   * "facets_filtering" - The facets module will trigger this event before
   *   filter is executed.
   *
   * This is an example how to trigger "facets_filter" event for your widget:
   *   $(once('my-custom-widget-on-change', '.my-custom-widget.js-facets-widget'))
   *     .on('change', function () {
   *       // In this example $(this).val() will provide needed URL.
   *       $(this).trigger('facets_filter', [ $(this).val() ]);
   *     });
   *
   * The facets module will trigger "facets_filtering" before filter is
   * executed. Widgets can listen on "facets_filtering" event and react before
   * filter is executed. Most common use case is to disable widget. When you
   * disable widget, a user will not be able to trigger new "facets_filter"
   * event before initial filter request is finished.
   *
   * This is an example how to handle "facets_filtering":
   *   $(once('my-custom-widget-on-facets-filtering', '.my-custom-widget.js-facets-widget'))
   *     .on('facets_filtering.my_widget_module', function () {
   *       // Let's say, that widget can be simply disabled (fe. select).
   *       $(this).prop('disabled', true);
   *     });
   *
   * You should namespace events for your module widgets. With namespaced events
   * you have better control on your handlers and if it's needed, you can easier
   * register/deregister them.
   */
  Drupal.behaviors.facetsFilter = {
    attach: function (context) {
      $(once('js-facet-filter', '.js-facets-widget', context))
        .on('facets_filter.facets', function (event, url) {
          $('.js-facets-widget').trigger('facets_filtering');

          window.location = url;
        });
    }
  };

})(jQuery, Drupal, once);
;
/**
 * @file
 * Transforms links into checkboxes.
 */

(function ($, Drupal, once) {

  'use strict';

  Drupal.facets = Drupal.facets || {};
  Drupal.behaviors.facetsCheckboxWidget = {
    attach: function (context) {
      Drupal.facets.makeCheckboxes(context);
    }
  };

  window.onbeforeunload = function(e) {
    if (Drupal.facets) {
      var $checkboxWidgets = $('.js-facets-checkbox-links');
      if ($checkboxWidgets.length > 0) {
        $checkboxWidgets.each(function (index, widget) {
          var $widget = $(widget);
          var $widgetLinks = $widget.find('.facet-item > a');
          $widgetLinks.each(Drupal.facets.updateCheckbox);
        });
      }
    }
  };

  /**
   * Turns all facet links into checkboxes.
   */
  Drupal.facets.makeCheckboxes = function (context) {
    // Find all checkbox facet links and give them a checkbox.
    var $checkboxWidgets = $(once('facets-checkbox-transform', '.js-facets-checkbox-links', context));

    if ($checkboxWidgets.length > 0) {
      $checkboxWidgets.each(function (index, widget) {
        var $widget = $(widget);
        var $widgetLinks = $widget.find('.facet-item > a');

        // Add correct CSS selector for the widget. The Facets JS API will
        // register handlers on that element.
        $widget.addClass('js-facets-widget');

        // Transform links to checkboxes.
        $widgetLinks.each(Drupal.facets.makeCheckbox);

        // We have to trigger attaching of behaviours, so that Facets JS API can
        // register handlers on checkbox widgets.
        Drupal.attachBehaviors(this.parentNode, Drupal.settings);
      });

    }

    // Set indeterminate value on parents having an active trail.
    $('.facet-item--expanded.facet-item--active-trail > input').prop('indeterminate', true);
  };

  /**
   * Replace a link with a checked checkbox.
   */
  Drupal.facets.makeCheckbox = function () {
    var $link = $(this);
    var active = $link.hasClass('is-active');
    var description = $link.html();
    var href = $link.attr('href');
    var id = $link.data('drupal-facet-item-id');

    var checkbox = $('<input type="checkbox" class="facets-checkbox">')
      .attr('id', id)
      .data($link.data())
      .data('facetsredir', href);
    var label = $('<label for="' + id + '">' + description + '</label>');

    checkbox.on('change.facets', function (e) {
      e.preventDefault();

      var $widget = $(this).closest('.js-facets-widget');
      $(this).siblings('a').toggleClass('is-active');

      Drupal.facets.disableFacet($widget);
      $widget.trigger('facets_filter', [ href ]);
    });

    if (active) {
      checkbox.attr('checked', true);
      label.find('.js-facet-deactivate').remove();
    }

    $link.before(checkbox).before(label).hide();

  };

  /**
   * Update checkbox active state.
   */
  Drupal.facets.updateCheckbox = function () {
    var $link = $(this);
    var active = $link.hasClass('is-active');

    if (!active) {
      $link.parent().find('input.facets-checkbox').prop('checked', false);
    }
  };

  /**
   * Disable all facet checkboxes in the facet and apply a 'disabled' class.
   *
   * @param {object} $facet
   *   jQuery object of the facet.
   */
  Drupal.facets.disableFacet = function ($facet) {
    $facet.addClass('facets-disabled');
    $('input.facets-checkbox', $facet).click(Drupal.facets.preventDefault);
    $('input.facets-checkbox', $facet).attr('disabled', true);
  };

  /**
   * Event listener for easy prevention of event propagation.
   *
   * @param {object} e
   *   Event.
   */
  Drupal.facets.preventDefault = function (e) {
    e.preventDefault();
  };

})(jQuery, Drupal, once);
;
/**
 * @file
 * Provides the soft limit functionality.
 */

(function ($, once) {

  'use strict';

  Drupal.behaviors.facetSoftLimit = {
    attach: function (context, settings) {
      if (settings.facets.softLimit !== 'undefined') {
        $.each(settings.facets.softLimit, function (facet, limit) {
          Drupal.facets.applySoftLimit(facet, limit, settings);
        });
      }
    }
  };

  Drupal.facets = Drupal.facets || {};

  /**
   * Applies the soft limit UI feature to a specific facets list.
   *
   * @param {string} facet
   *   The facet id.
   * @param {string} limit
   *   The maximum amount of items to show.
   * @param {object} settings
   *   Settings.
   */
  Drupal.facets.applySoftLimit = function (facet, limit, settings) {
    var zero_based_limit = (limit - 1);
    var facet_id = facet;
    var facetsList = $('ul[data-drupal-facet-id="' + facet_id + '"]');

    // In case of multiple instances of a facet, we need to key them.
    if (facetsList.length > 1) {
      facetsList.each(function (key, $value) {
        $(this).attr('data-drupal-facet-id', facet_id + '-' + key);
      });
    }

    // Hide facets over the limit.
    facetsList.each(function () {
      $(once('applysoftlimit', $(this).children('li:gt(' + zero_based_limit + ')'))).hide();
    });

    // Add "Show more" / "Show less" links.
    $(once('applysoftlimit', facetsList.filter(function () {
      return $(this).find('li').length > limit;
    }))).each(function () {
      var facet = $(this);
      var showLessLabel = settings.facets.softLimitSettings[facet_id].showLessLabel;
      var showMoreLabel = settings.facets.softLimitSettings[facet_id].showMoreLabel;
      $('<a href="#" class="facets-soft-limit-link"></a>')
        .text(showMoreLabel)
        .on('click', function () {
          if (facet.find('li:hidden').length > 0) {
            facet.find('li:gt(' + zero_based_limit + ')').slideDown();
            facet.find('li:lt(' + (zero_based_limit + 2) + ') a, li:lt(' + (zero_based_limit + 2) + ') input').focus();
            $(this).addClass('open').text(showLessLabel);
          }
          else {
            facet.find('li:gt(' + zero_based_limit + ')').slideUp();
            $(this).removeClass('open').text(showMoreLabel);
          }
          return false;
        }).insertAfter($(this));
    });
  };

})(jQuery, once);
;
/**
* DO NOT EDIT THIS FILE.
* See the following change record for more information,
* https://www.drupal.org/node/2815083
* @preserve
**/

(function ($, Drupal) {
  Drupal.theme.progressBar = function (id) {
    return "<div id=\"".concat(id, "\" class=\"progress\" aria-live=\"polite\">") + '<div class="progress__label">&nbsp;</div>' + '<div class="progress__track"><div class="progress__bar"></div></div>' + '<div class="progress__percentage"></div>' + '<div class="progress__description">&nbsp;</div>' + '</div>';
  };

  Drupal.ProgressBar = function (id, updateCallback, method, errorCallback) {
    this.id = id;
    this.method = method || 'GET';
    this.updateCallback = updateCallback;
    this.errorCallback = errorCallback;
    this.element = $(Drupal.theme('progressBar', id));
  };

  $.extend(Drupal.ProgressBar.prototype, {
    setProgress: function setProgress(percentage, message, label) {
      if (percentage >= 0 && percentage <= 100) {
        $(this.element).find('div.progress__bar').css('width', "".concat(percentage, "%"));
        $(this.element).find('div.progress__percentage').html("".concat(percentage, "%"));
      }

      $('div.progress__description', this.element).html(message);
      $('div.progress__label', this.element).html(label);

      if (this.updateCallback) {
        this.updateCallback(percentage, message, this);
      }
    },
    startMonitoring: function startMonitoring(uri, delay) {
      this.delay = delay;
      this.uri = uri;
      this.sendPing();
    },
    stopMonitoring: function stopMonitoring() {
      clearTimeout(this.timer);
      this.uri = null;
    },
    sendPing: function sendPing() {
      if (this.timer) {
        clearTimeout(this.timer);
      }

      if (this.uri) {
        var pb = this;
        var uri = this.uri;

        if (uri.indexOf('?') === -1) {
          uri += '?';
        } else {
          uri += '&';
        }

        uri += '_format=json';
        $.ajax({
          type: this.method,
          url: uri,
          data: '',
          dataType: 'json',
          success: function success(progress) {
            if (progress.status === 0) {
              pb.displayError(progress.data);
              return;
            }

            pb.setProgress(progress.percentage, progress.message, progress.label);
            pb.timer = setTimeout(function () {
              pb.sendPing();
            }, pb.delay);
          },
          error: function error(xmlhttp) {
            var e = new Drupal.AjaxError(xmlhttp, pb.uri);
            pb.displayError("<pre>".concat(e.message, "</pre>"));
          }
        });
      }
    },
    displayError: function displayError(string) {
      var error = $('<div class="messages messages--error"></div>').html(string);
      $(this.element).before(error).hide();

      if (this.errorCallback) {
        this.errorCallback(this);
      }
    }
  });
})(jQuery, Drupal);;
/**
* DO NOT EDIT THIS FILE.
* See the following change record for more information,
* https://www.drupal.org/node/2815083
* @preserve
**/

(function ($, once) {
  var deprecatedMessageSuffix = "is deprecated in Drupal 9.3.0 and will be removed in Drupal 10.0.0. Use the core/once library instead. See https://www.drupal.org/node/3158256";
  var originalJQOnce = $.fn.once;
  var originalJQRemoveOnce = $.fn.removeOnce;

  $.fn.once = function jQueryOnce(id) {
    Drupal.deprecationError({
      message: "jQuery.once() ".concat(deprecatedMessageSuffix)
    });
    return originalJQOnce.apply(this, [id]);
  };

  $.fn.removeOnce = function jQueryRemoveOnce(id) {
    Drupal.deprecationError({
      message: "jQuery.removeOnce() ".concat(deprecatedMessageSuffix)
    });
    return originalJQRemoveOnce.apply(this, [id]);
  };

  var drupalOnce = once;

  function augmentedOnce(id, selector, context) {
    originalJQOnce.apply($(selector, context), [id]);
    return drupalOnce(id, selector, context);
  }

  function remove(id, selector, context) {
    originalJQRemoveOnce.apply($(selector, context), [id]);
    return drupalOnce.remove(id, selector, context);
  }

  window.once = Object.assign(augmentedOnce, drupalOnce, {
    remove: remove
  });
})(jQuery, once);;
/**
* DO NOT EDIT THIS FILE.
* See the following change record for more information,
* https://www.drupal.org/node/2815083
* @preserve
**/

(function (Drupal) {
  Drupal.behaviors.responsiveImageAJAX = {
    attach: function attach() {
      if (window.picturefill) {
        window.picturefill();
      }
    }
  };
})(Drupal);;
/**
* DO NOT EDIT THIS FILE.
* See the following change record for more information,
* https://www.drupal.org/node/2815083
* @preserve
**/

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

(function ($, window, Drupal, drupalSettings, _ref) {
  var isFocusable = _ref.isFocusable,
      tabbable = _ref.tabbable;
  Drupal.behaviors.AJAX = {
    attach: function attach(context, settings) {
      function loadAjaxBehavior(base) {
        var elementSettings = settings.ajax[base];

        if (typeof elementSettings.selector === 'undefined') {
          elementSettings.selector = "#".concat(base);
        }

        once('drupal-ajax', $(elementSettings.selector)).forEach(function (el) {
          elementSettings.element = el;
          elementSettings.base = base;
          Drupal.ajax(elementSettings);
        });
      }

      Object.keys(settings.ajax || {}).forEach(function (base) {
        return loadAjaxBehavior(base);
      });
      Drupal.ajax.bindAjaxLinks(document.body);
      once('ajax', '.use-ajax-submit').forEach(function (el) {
        var elementSettings = {};
        elementSettings.url = $(el.form).attr('action');
        elementSettings.setClick = true;
        elementSettings.event = 'click';
        elementSettings.progress = {
          type: 'throbber'
        };
        elementSettings.base = el.id;
        elementSettings.element = el;
        Drupal.ajax(elementSettings);
      });
    },
    detach: function detach(context, settings, trigger) {
      if (trigger === 'unload') {
        Drupal.ajax.expired().forEach(function (instance) {
          Drupal.ajax.instances[instance.instanceIndex] = null;
        });
      }
    }
  };

  Drupal.AjaxError = function (xmlhttp, uri, customMessage) {
    var statusCode;
    var statusText;
    var responseText;

    if (xmlhttp.status) {
      statusCode = "\n".concat(Drupal.t('An AJAX HTTP error occurred.'), "\n").concat(Drupal.t('HTTP Result Code: !status', {
        '!status': xmlhttp.status
      }));
    } else {
      statusCode = "\n".concat(Drupal.t('An AJAX HTTP request terminated abnormally.'));
    }

    statusCode += "\n".concat(Drupal.t('Debugging information follows.'));
    var pathText = "\n".concat(Drupal.t('Path: !uri', {
      '!uri': uri
    }));
    statusText = '';

    try {
      statusText = "\n".concat(Drupal.t('StatusText: !statusText', {
        '!statusText': xmlhttp.statusText.trim()
      }));
    } catch (e) {}

    responseText = '';

    try {
      responseText = "\n".concat(Drupal.t('ResponseText: !responseText', {
        '!responseText': xmlhttp.responseText.trim()
      }));
    } catch (e) {}

    responseText = responseText.replace(/<("[^"]*"|'[^']*'|[^'">])*>/gi, '');
    responseText = responseText.replace(/[\n]+\s+/g, '\n');
    var readyStateText = xmlhttp.status === 0 ? "\n".concat(Drupal.t('ReadyState: !readyState', {
      '!readyState': xmlhttp.readyState
    })) : '';
    customMessage = customMessage ? "\n".concat(Drupal.t('CustomMessage: !customMessage', {
      '!customMessage': customMessage
    })) : '';
    this.message = statusCode + pathText + statusText + customMessage + responseText + readyStateText;
    this.name = 'AjaxError';
  };

  Drupal.AjaxError.prototype = new Error();
  Drupal.AjaxError.prototype.constructor = Drupal.AjaxError;

  Drupal.ajax = function (settings) {
    if (arguments.length !== 1) {
      throw new Error('Drupal.ajax() function must be called with one configuration object only');
    }

    var base = settings.base || false;
    var element = settings.element || false;
    delete settings.base;
    delete settings.element;

    if (!settings.progress && !element) {
      settings.progress = false;
    }

    var ajax = new Drupal.Ajax(base, element, settings);
    ajax.instanceIndex = Drupal.ajax.instances.length;
    Drupal.ajax.instances.push(ajax);
    return ajax;
  };

  Drupal.ajax.instances = [];

  Drupal.ajax.expired = function () {
    return Drupal.ajax.instances.filter(function (instance) {
      return instance && instance.element !== false && !document.body.contains(instance.element);
    });
  };

  Drupal.ajax.bindAjaxLinks = function (element) {
    once('ajax', '.use-ajax', element).forEach(function (ajaxLink) {
      var $linkElement = $(ajaxLink);
      var elementSettings = {
        progress: {
          type: 'throbber'
        },
        dialogType: $linkElement.data('dialog-type'),
        dialog: $linkElement.data('dialog-options'),
        dialogRenderer: $linkElement.data('dialog-renderer'),
        base: $linkElement.attr('id'),
        element: ajaxLink
      };
      var href = $linkElement.attr('href');

      if (href) {
        elementSettings.url = href;
        elementSettings.event = 'click';
      }

      var type = $linkElement.data('ajax-type');

      if (type) {
        elementSettings.type = type;
      }

      Drupal.ajax(elementSettings);
    });
  };

  Drupal.Ajax = function (base, element, elementSettings) {
    var defaults = {
      type: 'POST',
      event: element ? 'mousedown' : null,
      keypress: true,
      selector: base ? "#".concat(base) : null,
      effect: 'none',
      speed: 'none',
      method: 'replaceWith',
      progress: {
        type: 'throbber',
        message: Drupal.t('Please wait...')
      },
      submit: {
        js: true
      }
    };
    $.extend(this, defaults, elementSettings);
    this.commands = new Drupal.AjaxCommands();
    this.instanceIndex = false;

    if (this.wrapper) {
      this.wrapper = "#".concat(this.wrapper);
    }

    this.element = element;
    this.element_settings = elementSettings;
    this.elementSettings = elementSettings;

    if (this.element && this.element.form) {
      this.$form = $(this.element.form);
    }

    if (!this.url) {
      var $element = $(this.element);

      if ($element.is('a')) {
        this.url = $element.attr('href');
      } else if (this.element && element.form) {
        this.url = this.$form.attr('action');
      }
    }

    var originalUrl = this.url;
    this.url = this.url.replace(/\/nojs(\/|$|\?|#)/, '/ajax$1');

    if (drupalSettings.ajaxTrustedUrl[originalUrl]) {
      drupalSettings.ajaxTrustedUrl[this.url] = true;
    }

    var ajax = this;
    ajax.options = {
      url: ajax.url,
      data: ajax.submit,
      beforeSerialize: function beforeSerialize(elementSettings, options) {
        return ajax.beforeSerialize(elementSettings, options);
      },
      beforeSubmit: function beforeSubmit(formValues, elementSettings, options) {
        ajax.ajaxing = true;
        return ajax.beforeSubmit(formValues, elementSettings, options);
      },
      beforeSend: function beforeSend(xmlhttprequest, options) {
        ajax.ajaxing = true;
        return ajax.beforeSend(xmlhttprequest, options);
      },
      success: function success(response, status, xmlhttprequest) {
        if (typeof response === 'string') {
          response = $.parseJSON(response);
        }

        if (response !== null && !drupalSettings.ajaxTrustedUrl[ajax.url]) {
          if (xmlhttprequest.getResponseHeader('X-Drupal-Ajax-Token') !== '1') {
            var customMessage = Drupal.t('The response failed verification so will not be processed.');
            return ajax.error(xmlhttprequest, ajax.url, customMessage);
          }
        }

        return ajax.success(response, status);
      },
      complete: function complete(xmlhttprequest, status) {
        ajax.ajaxing = false;

        if (status === 'error' || status === 'parsererror') {
          return ajax.error(xmlhttprequest, ajax.url);
        }
      },
      dataType: 'json',
      jsonp: false,
      type: ajax.type
    };

    if (elementSettings.dialog) {
      ajax.options.data.dialogOptions = elementSettings.dialog;
    }

    if (ajax.options.url.indexOf('?') === -1) {
      ajax.options.url += '?';
    } else {
      ajax.options.url += '&';
    }

    var wrapper = "drupal_".concat(elementSettings.dialogType || 'ajax');

    if (elementSettings.dialogRenderer) {
      wrapper += ".".concat(elementSettings.dialogRenderer);
    }

    ajax.options.url += "".concat(Drupal.ajax.WRAPPER_FORMAT, "=").concat(wrapper);
    $(ajax.element).on(elementSettings.event, function (event) {
      if (!drupalSettings.ajaxTrustedUrl[ajax.url] && !Drupal.url.isLocal(ajax.url)) {
        throw new Error(Drupal.t('The callback URL is not local and not trusted: !url', {
          '!url': ajax.url
        }));
      }

      return ajax.eventResponse(this, event);
    });

    if (elementSettings.keypress) {
      $(ajax.element).on('keypress', function (event) {
        return ajax.keypressResponse(this, event);
      });
    }

    if (elementSettings.prevent) {
      $(ajax.element).on(elementSettings.prevent, false);
    }
  };

  Drupal.ajax.WRAPPER_FORMAT = '_wrapper_format';
  Drupal.Ajax.AJAX_REQUEST_PARAMETER = '_drupal_ajax';

  Drupal.Ajax.prototype.execute = function () {
    if (this.ajaxing) {
      return;
    }

    try {
      this.beforeSerialize(this.element, this.options);
      return $.ajax(this.options);
    } catch (e) {
      this.ajaxing = false;
      window.alert("An error occurred while attempting to process ".concat(this.options.url, ": ").concat(e.message));
      return $.Deferred().reject();
    }
  };

  Drupal.Ajax.prototype.keypressResponse = function (element, event) {
    var ajax = this;

    if (event.which === 13 || event.which === 32 && element.type !== 'text' && element.type !== 'textarea' && element.type !== 'tel' && element.type !== 'number') {
      event.preventDefault();
      event.stopPropagation();
      $(element).trigger(ajax.elementSettings.event);
    }
  };

  Drupal.Ajax.prototype.eventResponse = function (element, event) {
    event.preventDefault();
    event.stopPropagation();
    var ajax = this;

    if (ajax.ajaxing) {
      return;
    }

    try {
      if (ajax.$form) {
        if (ajax.setClick) {
          element.form.clk = element;
        }

        ajax.$form.ajaxSubmit(ajax.options);
      } else {
        ajax.beforeSerialize(ajax.element, ajax.options);
        $.ajax(ajax.options);
      }
    } catch (e) {
      ajax.ajaxing = false;
      window.alert("An error occurred while attempting to process ".concat(ajax.options.url, ": ").concat(e.message));
    }
  };

  Drupal.Ajax.prototype.beforeSerialize = function (element, options) {
    if (this.$form && document.body.contains(this.$form.get(0))) {
      var settings = this.settings || drupalSettings;
      Drupal.detachBehaviors(this.$form.get(0), settings, 'serialize');
    }

    options.data[Drupal.Ajax.AJAX_REQUEST_PARAMETER] = 1;
    var pageState = drupalSettings.ajaxPageState;
    options.data['ajax_page_state[theme]'] = pageState.theme;
    options.data['ajax_page_state[theme_token]'] = pageState.theme_token;
    options.data['ajax_page_state[libraries]'] = pageState.libraries;
  };

  Drupal.Ajax.prototype.beforeSubmit = function (formValues, element, options) {};

  Drupal.Ajax.prototype.beforeSend = function (xmlhttprequest, options) {
    if (this.$form) {
      options.extraData = options.extraData || {};
      options.extraData.ajax_iframe_upload = '1';
      var v = $.fieldValue(this.element);

      if (v !== null) {
        options.extraData[this.element.name] = v;
      }
    }

    $(this.element).prop('disabled', true);

    if (!this.progress || !this.progress.type) {
      return;
    }

    var progressIndicatorMethod = "setProgressIndicator".concat(this.progress.type.slice(0, 1).toUpperCase()).concat(this.progress.type.slice(1).toLowerCase());

    if (progressIndicatorMethod in this && typeof this[progressIndicatorMethod] === 'function') {
      this[progressIndicatorMethod].call(this);
    }
  };

  Drupal.theme.ajaxProgressThrobber = function (message) {
    var messageMarkup = typeof message === 'string' ? Drupal.theme('ajaxProgressMessage', message) : '';
    var throbber = '<div class="throbber">&nbsp;</div>';
    return "<div class=\"ajax-progress ajax-progress-throbber\">".concat(throbber).concat(messageMarkup, "</div>");
  };

  Drupal.theme.ajaxProgressIndicatorFullscreen = function () {
    return '<div class="ajax-progress ajax-progress-fullscreen">&nbsp;</div>';
  };

  Drupal.theme.ajaxProgressMessage = function (message) {
    return "<div class=\"message\">".concat(message, "</div>");
  };

  Drupal.theme.ajaxProgressBar = function ($element) {
    return $('<div class="ajax-progress ajax-progress-bar"></div>').append($element);
  };

  Drupal.Ajax.prototype.setProgressIndicatorBar = function () {
    var progressBar = new Drupal.ProgressBar("ajax-progress-".concat(this.element.id), $.noop, this.progress.method, $.noop);

    if (this.progress.message) {
      progressBar.setProgress(-1, this.progress.message);
    }

    if (this.progress.url) {
      progressBar.startMonitoring(this.progress.url, this.progress.interval || 1500);
    }

    this.progress.element = $(Drupal.theme('ajaxProgressBar', progressBar.element));
    this.progress.object = progressBar;
    $(this.element).after(this.progress.element);
  };

  Drupal.Ajax.prototype.setProgressIndicatorThrobber = function () {
    this.progress.element = $(Drupal.theme('ajaxProgressThrobber', this.progress.message));
    $(this.element).after(this.progress.element);
  };

  Drupal.Ajax.prototype.setProgressIndicatorFullscreen = function () {
    this.progress.element = $(Drupal.theme('ajaxProgressIndicatorFullscreen'));
    $('body').append(this.progress.element);
  };

  Drupal.Ajax.prototype.success = function (response, status) {
    var _this = this;

    if (this.progress.element) {
      $(this.progress.element).remove();
    }

    if (this.progress.object) {
      this.progress.object.stopMonitoring();
    }

    $(this.element).prop('disabled', false);
    var elementParents = $(this.element).parents('[data-drupal-selector]').addBack().toArray();
    var focusChanged = false;
    Object.keys(response || {}).forEach(function (i) {
      if (response[i].command && _this.commands[response[i].command]) {
        _this.commands[response[i].command](_this, response[i], status);

        if (response[i].command === 'invoke' && response[i].method === 'focus' || response[i].command === 'focusFirst') {
          focusChanged = true;
        }
      }
    });

    if (!focusChanged && this.element && !$(this.element).data('disable-refocus')) {
      var target = false;

      for (var n = elementParents.length - 1; !target && n >= 0; n--) {
        target = document.querySelector("[data-drupal-selector=\"".concat(elementParents[n].getAttribute('data-drupal-selector'), "\"]"));
      }

      if (target) {
        $(target).trigger('focus');
      }
    }

    if (this.$form && document.body.contains(this.$form.get(0))) {
      var settings = this.settings || drupalSettings;
      Drupal.attachBehaviors(this.$form.get(0), settings);
    }

    this.settings = null;
  };

  Drupal.Ajax.prototype.getEffect = function (response) {
    var type = response.effect || this.effect;
    var speed = response.speed || this.speed;
    var effect = {};

    if (type === 'none') {
      effect.showEffect = 'show';
      effect.hideEffect = 'hide';
      effect.showSpeed = '';
    } else if (type === 'fade') {
      effect.showEffect = 'fadeIn';
      effect.hideEffect = 'fadeOut';
      effect.showSpeed = speed;
    } else {
      effect.showEffect = "".concat(type, "Toggle");
      effect.hideEffect = "".concat(type, "Toggle");
      effect.showSpeed = speed;
    }

    return effect;
  };

  Drupal.Ajax.prototype.error = function (xmlhttprequest, uri, customMessage) {
    if (this.progress.element) {
      $(this.progress.element).remove();
    }

    if (this.progress.object) {
      this.progress.object.stopMonitoring();
    }

    $(this.wrapper).show();
    $(this.element).prop('disabled', false);

    if (this.$form && document.body.contains(this.$form.get(0))) {
      var settings = this.settings || drupalSettings;
      Drupal.attachBehaviors(this.$form.get(0), settings);
    }

    throw new Drupal.AjaxError(xmlhttprequest, uri, customMessage);
  };

  Drupal.theme.ajaxWrapperNewContent = function ($newContent, ajax, response) {
    return (response.effect || ajax.effect) !== 'none' && $newContent.filter(function (i) {
      return !($newContent[i].nodeName === '#comment' || $newContent[i].nodeName === '#text' && /^(\s|\n|\r)*$/.test($newContent[i].textContent));
    }).length > 1 ? Drupal.theme('ajaxWrapperMultipleRootElements', $newContent) : $newContent;
  };

  Drupal.theme.ajaxWrapperMultipleRootElements = function ($elements) {
    return $('<div></div>').append($elements);
  };

  Drupal.AjaxCommands = function () {};

  Drupal.AjaxCommands.prototype = {
    insert: function insert(ajax, response) {
      var $wrapper = response.selector ? $(response.selector) : $(ajax.wrapper);
      var method = response.method || ajax.method;
      var effect = ajax.getEffect(response);
      var settings = response.settings || ajax.settings || drupalSettings;
      var $newContent = $($.parseHTML(response.data, document, true));
      $newContent = Drupal.theme('ajaxWrapperNewContent', $newContent, ajax, response);

      switch (method) {
        case 'html':
        case 'replaceWith':
        case 'replaceAll':
        case 'empty':
        case 'remove':
          Drupal.detachBehaviors($wrapper.get(0), settings);
          break;

        default:
          break;
      }

      $wrapper[method]($newContent);

      if (effect.showEffect !== 'show') {
        $newContent.hide();
      }

      var $ajaxNewContent = $newContent.find('.ajax-new-content');

      if ($ajaxNewContent.length) {
        $ajaxNewContent.hide();
        $newContent.show();
        $ajaxNewContent[effect.showEffect](effect.showSpeed);
      } else if (effect.showEffect !== 'show') {
        $newContent[effect.showEffect](effect.showSpeed);
      }

      if ($newContent.parents('html').length) {
        $newContent.each(function (index, element) {
          if (element.nodeType === Node.ELEMENT_NODE) {
            Drupal.attachBehaviors(element, settings);
          }
        });
      }
    },
    remove: function remove(ajax, response, status) {
      var settings = response.settings || ajax.settings || drupalSettings;
      $(response.selector).each(function () {
        Drupal.detachBehaviors(this, settings);
      }).remove();
    },
    changed: function changed(ajax, response, status) {
      var $element = $(response.selector);

      if (!$element.hasClass('ajax-changed')) {
        $element.addClass('ajax-changed');

        if (response.asterisk) {
          $element.find(response.asterisk).append(" <abbr class=\"ajax-changed\" title=\"".concat(Drupal.t('Changed'), "\">*</abbr> "));
        }
      }
    },
    alert: function alert(ajax, response, status) {
      window.alert(response.text);
    },
    announce: function announce(ajax, response) {
      if (response.priority) {
        Drupal.announce(response.text, response.priority);
      } else {
        Drupal.announce(response.text);
      }
    },
    redirect: function redirect(ajax, response, status) {
      window.location = response.url;
    },
    css: function css(ajax, response, status) {
      $(response.selector).css(response.argument);
    },
    settings: function settings(ajax, response, status) {
      var ajaxSettings = drupalSettings.ajax;

      if (ajaxSettings) {
        Drupal.ajax.expired().forEach(function (instance) {
          if (instance.selector) {
            var selector = instance.selector.replace('#', '');

            if (selector in ajaxSettings) {
              delete ajaxSettings[selector];
            }
          }
        });
      }

      if (response.merge) {
        $.extend(true, drupalSettings, response.settings);
      } else {
        ajax.settings = response.settings;
      }
    },
    data: function data(ajax, response, status) {
      $(response.selector).data(response.name, response.value);
    },
    focusFirst: function focusFirst(ajax, response, status) {
      var focusChanged = false;
      var container = document.querySelector(response.selector);

      if (container) {
        var tabbableElements = tabbable(container);

        if (tabbableElements.length) {
          tabbableElements[0].focus();
          focusChanged = true;
        } else if (isFocusable(container)) {
          container.focus();
          focusChanged = true;
        }
      }

      if (ajax.hasOwnProperty('element') && !focusChanged) {
        ajax.element.focus();
      }
    },
    invoke: function invoke(ajax, response, status) {
      var $element = $(response.selector);
      $element[response.method].apply($element, _toConsumableArray(response.args));
    },
    restripe: function restripe(ajax, response, status) {
      $(response.selector).find('> tbody > tr:visible, > tr:visible').removeClass('odd even').filter(':even').addClass('odd').end().filter(':odd').addClass('even');
    },
    update_build_id: function update_build_id(ajax, response, status) {
      document.querySelectorAll("input[name=\"form_build_id\"][value=\"".concat(response.old, "\"]")).forEach(function (item) {
        item.value = response.new;
      });
    },
    add_css: function add_css(ajax, response, status) {
      $('head').prepend(response.data);
    },
    message: function message(ajax, response) {
      var messages = new Drupal.Message(document.querySelector(response.messageWrapperQuerySelector));

      if (response.clearPrevious) {
        messages.clear();
      }

      messages.add(response.message, response.messageOptions);
    }
  };
})(jQuery, window, Drupal, drupalSettings, window.tabbable);
;
(function ($, Drupal, once) {
  Drupal.behaviors.block_ajax = {
    attach: function (context, drupalSettings) {
      /**
       * Implements ajax block handler.
       */
      let ajaxBlockHandler = function ($block) {
        // Make sure we have block.
        let blockId = $block.data('block-ajax-id');
        if (blockId && drupalSettings.block_ajax.blocks[blockId] !== undefined) {
          let pluginId = $block.data('block-ajax-plugin-id');
          if (!pluginId) {
            return;
          }

          // Block parent.
          let $blockParent = $block.parent();

          let ajaxUrl = 'block/ajax/' + blockId + '?';
          let ajaxUrlParams = {};

          // Get current node.
          let currentNode = drupalSettings.block_ajax.blocks[blockId].current_node;
          if (currentNode) {
            ajaxUrlParams.nid = currentNode;
          }

          // Get current user.
          let currentUser = drupalSettings.block_ajax.blocks[blockId].current_user;
          if (currentUser) {
            ajaxUrlParams.uid = currentUser;
          }

          // Get current term.
          let currentTerm = drupalSettings.block_ajax.blocks[blockId].current_term;
          if (currentTerm) {
            ajaxUrlParams.tid = currentTerm;
          }

          // Setup request.
          let request = $.ajax({
            type: drupalSettings.block_ajax.config['type'],
            url: Drupal.url(ajaxUrl + $.param(ajaxUrlParams)),
            data: {
              plugin_id: pluginId,
              config: drupalSettings.block_ajax.blocks[blockId]
            },
            timeout: drupalSettings.block_ajax.config['timeout'],
            cache: drupalSettings.block_ajax.config['cache'],
            async: drupalSettings.block_ajax.config['async'],
            dataType: drupalSettings.block_ajax.config['dataType'],
            beforeSend: function () {
              if (drupalSettings.block_ajax.blocks[blockId].block_ajax.show_spinner) {
                // Add Ajax progress throbber.
                if (drupalSettings.block_ajax.blocks[blockId].block_ajax.placeholder) {
                  // Add throbber with message.
                  $block.after(Drupal.theme.ajaxProgressThrobber(Drupal.t(drupalSettings.block_ajax.blocks[blockId].block_ajax.placeholder)));
                } else {
                  // Add throbber with no message.
                  $block.after(Drupal.theme.ajaxProgressThrobber());
                }
              }
            }
          });

          // Request done handler.
          request.done(function (data) {
            // No content, let's return.
            if (typeof data.content !== 'string' || !data.content.length) {
              return;
            }

            // Add processed class to block wrapper.
            // Remove contextual-region class and move to inside.
            $blockParent.addClass('block-ajax-processed').removeClass('contextual-region');

            // Replace block content.
            $block.replaceWith(data.content);

            // Move contextual links inside new block content.
            $('.contextual', $blockParent).prependTo($('.block-ajax-block', $blockParent));

            // Add in contextual-region class.
            $('.block-ajax-block', $blockParent).addClass('contextual-region');

            // Attach behaviours to the updated element.
            $block.each(function () {
              // Note that the global drupal settings reference is being used to
              // make sure the actualised global state is being used.
              Drupal.attachBehaviors(this, window.drupalSettings);
            });

            // Remove throbber.
            if (drupalSettings.block_ajax.blocks[blockId].block_ajax.show_spinner) {
              $('.ajax-progress-throbber', $blockParent).remove();
            }
          });

          // Request fail handler.
          request.fail(function (jqXHR, textStatus) {
            // Remove throbber.
            if (drupalSettings.block_ajax.blocks[blockId].block_ajax.show_spinner) {
              $('.ajax-progress-throbber', $blockParent).remove();
            }

            // Throw console log error.
            console.log("Ajax Block: " + blockId + " request failed: " + textStatus);
          });
        }
      };
      /**
       * Initialize and loop over Ajax blocks.
       */
      $(once('block_ajax', '[data-block-ajax-id]', context)).each(function () {
        let $block = $(this);

        // Load in block via AJAX
        ajaxBlockHandler($block);

        // On RefreshAjaxBlock event
        $block.on('RefreshAjaxBlock', function () {
          // Execute the handler payload.
          ajaxBlockHandler($(this));
        });
      });
    },
    detach: function (context) {
    }
  };
  /**
   * Implements ajax block refreshing command.
   */
  Drupal.AjaxCommands.prototype.AjaxBlockRefreshCommand = function (ajax, response, status) {
    $(response.selector).trigger('RefreshAjaxBlock');
  };
})(jQuery, Drupal, once);
;
