/* eslint-disable */
(function () {
    /* eslint-disable */
    if (!window.$mcSite) {
        $mcSite = {
            optinFeatures: [],
            enableOptIn: function () {
                this.createCookie("mc_user_optin", true, 365);
                this.optinFeatures.forEach(function (fn) {
                    fn();
                });
            },

            runIfOptedIn: function (fn) {
                if (this.hasOptedIn()) {
                    fn();
                } else {
                    this.optinFeatures.push(fn);
                }
            },

            hasOptedIn: function () {
                var cookieValue = this.readCookie("mc_user_optin");

                if (cookieValue === undefined) {
                    return true;
                }

                return cookieValue === "true";
            },

            createCookie: function (name, value, expirationDays) {
                var cookie_value = encodeURIComponent(value) + ";";
                
                if (expirationDays === undefined) {
                    throw new Error("expirationDays is not defined");
                }

                // set expiration
                if (expirationDays !== null) {
                    var expirationDate = new Date();
                    expirationDate.setDate(expirationDate.getDate() + expirationDays);
                    cookie_value += " expires=" + expirationDate.toUTCString() + ";";
                }
    
                cookie_value += "path=/";
                document.cookie = name + "=" + cookie_value;
            },

            readCookie: function (name) {
                var nameEQ = name + "=";
                var ca = document.cookie.split(";");
    
                for (var i = 0; i < ca.length; i++) {
                    var c = ca[i];
    
                    while (c.charAt(0) === " ") {
                        c = c.substring(1, c.length);
                    }
    
                    if (c.indexOf(nameEQ) === 0) {
                        return c.substring(nameEQ.length, c.length);
                    }
                }
    
                return undefined;
            }
        };
    }

    $mcSite.amped_forms={settings:{uid:"88033441",src:"https:\/\/form-assets.mailchimp.com\/snippet\/account\/",site_unique_id:"ce98550962f0af0b9d8b848d7"}};$mcSite.popup_form={settings:{base_url:"mc.us17.list-manage.com",list_id:"ba442c54bb",uuid:"0000ccca1e3e980e684ed21dd",f_id:"5157",skip_install:""}};
})();
(function () {
    var module = window.$mcSite.amped_forms;

    if (module.installed === true) {
        return;
    }

    if (!module.settings) {
        return;
    }

    var settings = module.settings;

    if (!settings.uid) {
        return;
    }

    var script = document.createElement("script");

    var fixedUrl = settings.src.replace("\\/", "/");

    script.src = fixedUrl + settings.uid + "?site=" + settings.site_unique_id;
    script.type = "text/javascript";

    document.body.appendChild(script);

}());
(function () {
    if (window.$mcSite === undefined || window.$mcSite.popup_form === undefined) {
        return;
    }

    if (window.location.href.indexOf("checkout.shopify") >= 0) {
        return;
    }

    var scripts = document.getElementsByTagName("script");
    for (var i = 0; i < scripts.length; i++) {
        // look for src containing the old embed.js code and bail if it exists
        if (scripts[i].getAttribute("src") === "//s3.amazonaws.com/downloads.mailchimp.com/js/signup-forms/popup/embed.js" || scripts[i].getAttribute("src") === "//downloads.mailchimp.com/js/signup-forms/popup/embed.js") {
            return;
        }
    }

    var module = window.$mcSite.popup_form;

    if (module.installed === true) {
        return;
    }

    if (!module.settings) {
        return;
    }

    var settings = module.settings;

    if (!settings.base_url || !settings.uuid || !settings.list_id || settings.skip_install === "1") {
        return;
    }

    var script = document.createElement("script");

    script.src = "//downloads.mailchimp.com/js/signup-forms/popup/unique-methods/embed.js";
    script.type = "text/javascript";
    script.onload = function () {
        if (window.dojoRequire) {
            window.dojoRequire(["mojo/signup-forms/Loader"], function (L) {
                L.start({
                    "baseUrl": settings.base_url,
                    "uuid": settings.uuid,
                    "lid": settings.list_id,
                    "uniqueMethods": true,
                    "f_id": settings.f_id
                });
            });
        }
    };

    document.body.appendChild(script);

    window.$mcSite.popup_form.installed = true;
}());
