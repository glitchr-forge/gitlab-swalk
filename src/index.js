import "sweetalert2"

$.fn.serializeObject = function() {
    var o = {};
    var a = this.serializeArray();
    $.each(a, function() {
        if (o[this.name]) {
            if (!o[this.name].push) {
                o[this.name] = [o[this.name]];
            }
            o[this.name].push(this.value || '');
        } else {
            o[this.name] = this.value || '';
        }
    });
    return o;
};

jQuery.fn.extend({
    getAttributes: function(startsWith = "", replaceStartsWith = undefined)
    {
        var attrs = {}
        Object.values($(this).get(0).attributes)
              .map(attr => attr.name.startsWith(startsWith) ? (attrs[attr.name] = attr.value) : null);

        return attrs;
    }
});

;(function (root, factory) {

    if (typeof define === 'function' && define.amd) {
        define(factory);
    } else if (typeof exports === 'object') {
        module.exports = factory();
    } else {
        root.Swalk = factory();
    }

})(this, function () {

    var Swalk = {};
        Swalk.version = '0.1.0';

    var Settings = Swalk.settings = {

        didOpen: function(el) { $(el).find("a").click(() => Swal.close()); }
    };

    var debug = false;
    var ready = false;
    Swalk.ready = function (options = {}, toasterId = "#toaster") {

        if("debug" in options)
            debug = options["debug"];

        Swalk.configure(options);
        ready = true;

        if(debug) console.log("Swalk is ready.");
        dispatchEvent(new Event('swalk:ready'));

        Swalk.onCall();
        return this;
    };

    Swalk.configure = function (options) {

        var key, value;
        for (key in options) {
            value = options[key];
            if (value !== undefined && options.hasOwnProperty(key)) Settings[key] = value;
        }

        if(debug) console.log("Swalk configuration: ", Settings);
        return this;
    };

    Swalk.get = function(key) {

        if(key in Swalk.settings)
            return Swalk.settings[key];

        return null;
    };

    Swalk.set = function(key, value) {

        Swalk.settings[key] = value;
        return this;
    };

    Swalk.add = function(key, value) {

        if(! (key in Swalk.settings))
            Swalk.settings[key] = [];

        if (Swalk.settings[key].indexOf(value) === -1)
            Swalk.settings[key].push(value);

        return this;
    };

    Swalk.remove = function(key, value) {

        if(key in Swalk.settings) {

            Swalk.settings[key] = Swalk.settings[key].filter(function(setting, index, arr){
                return value != setting;
            });

            return Swalk.settings[key];
        }

        return null;
    };

    const toCamel = (s) => {
        return s.replace(/([-_][a-z])/ig, ($1) => {
          return $1.toUpperCase()
            .replace('-', '')
            .replace('_', '');
        });
    };

    Swalk.onCall = function() {

        if(debug) console.log("Swalk call..");
        $('.swal').each(function() {

            var ariaLabelledBy = $(this).attr("aria-labelledby");
            if(!ariaLabelledBy) return;

            var swal = this;
            $("#"+ariaLabelledBy).click(function() {

                var identifier = this;
                var fire = function(el) {

                    if(el === undefined) return;
                    identifier.dispatchEvent(new Event('swalk:load'));

                    var swalAsk = $(el).find("[aria-labelledby^='ask']");
                        swalAsk = swalAsk.length     ? swalAsk     : $(el);

                    $(swalAsk).each(function() {

                        var title = $(swalAsk).find("> h1");
                            title = title.length ? title[0].innerHTML : "";
                        var html  = $(swalAsk).find("> span");
                            html = html.length ?  html[0].innerHTML : "";

                        var options = {...Settings};
                        var attrs = $(swalAsk).getAttributes("aria-");
                        Object.keys(attrs).forEach(attr => options[toCamel(attr.substring(String("aria-").length))] = attrs[attr]);

                        delete options["labelledby"];

                        Swal.fire(Object.assign({}, options, {

                            title: title,
                            html : html,

                            didOpen: function(el) {

                                identifier.dispatchEvent(new Event('swalk:ask'))
                                if(typeof options["didOpen"] === "function")
                                    options["didOpen"](el);
                            },

                            willClose: () => {

                                identifier.dispatchEvent(new Event('swalk:close'))
                                if(typeof options["willClose"] === "function")
                                    options["willClose"](el);
                            },

                            timerProgressBar : (options["timerProgressBar"]) || (options["timer"] !== undefined),

                            showConfirmButton : (options["showConfirmButton"]) || (options["confirmButtonText"] !== undefined),
                            showDenyButton    : (options[ "showDenyButton"])   || (options[ "denyButtonText"] !== undefined),
                            showCancelButton  : (options[ "showCancelButton"]) || (options[ "cancelButtonText"] !== undefined),

                        })).then((result) => {

                            identifier.dispatchEvent(new CustomEvent('swalk:answer', result));
                            if (result.isConfirmed) {

                                var swalConfirmed = $(el).find("[aria-labelledby^='confirm']");
                                    swalConfirmed = swalConfirmed.length ? swalConfirmed[0] : undefined;

                                result["element"] = swalConfirmed;
                                identifier.dispatchEvent(new CustomEvent('swalk:confirm', result));
                                if(swalConfirmed) fire(swalConfirmed);

                            } else if (result.isDenied) {

                                var swalDenied  = $(el).find("[aria-labelledby^='denied']");
                                    swalDenied  = swalDenied.length ? swalDenied[0] : undefined;

                                result["element"] = swalDenied;
                                identifier.dispatchEvent(new CustomEvent('swalk:deny', result));
                                if(swalDenied) fire(swalDenied);

                            } else if (result.isDismissed) {

                                var action = result.dismiss;
                                var swalDismissed  = $(el).find("[aria-labelledby^='"+action+"']");
                                    swalDismissed  = swalDismissed.length ? swalDismissed[0] : undefined;

                                identifier.dispatchEvent(new CustomEvent('swalk:dismiss', result));
                                if (swalDismissed === undefined) {
                                    action = "dismiss";
                                    swalDismissed  = $(el).find("[aria-labelledby^='dismiss']");
                                    swalDismissed  = swalDismissed.length ? swalDismissed[0] : undefined;
                                }

                                result["element"] = swalDismissed;
                                identifier.dispatchEvent(new CustomEvent('swalk:'+action, result));
                                if(swalDismissed) fire(swalDismissed);
                            }
                        })
                    });
                };

                fire(swal);
            });
        });
    }

    return Swalk;
});