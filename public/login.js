const msgs = {
    fr: {
        "or": "ou",
        "You have no registered factors": "Vous n'avez aucun facteur enregistré",
        "You refused the request": "Vous avez refusé la demande.",
        "Error": "Erreur",
        "Authenticate by physical factor (WebAuthn)": "S'authentifier par facteur physique (WebAuthn)",
        "Open the Esup Auth application on your mobile %TRANSPORT% to validate the authentication.": "Ouvrez l'application Esup Auth sur votre portable %TRANSPORT% pour valider l'authentification.",
        "Please enter a code:": "Merci de renseigner un code :",
        "Try another method": "Essayez une autre méthode",
        "Error, please try again later": "Erreur, veuillez réessayer ultérieurement",
        "The physical factor you named '%NAME%'": "Le facteur physique que vous avez nommé '%NAME%'",
        "You have not given this factor a name. Go to your settings to give it a name.": "Vous n'avez pas donné de nom à ce facteur. Allez dans vos paramètres pour donner un nom.",
        "unnamed key": "clé sans nom",
        "A code has been sent to %TRANSPORT%,<br>enter it here to log in.": "Un code a été envoyé au %TRANSPORT%,<br>saisissez le ici pour vous connecter.",
        "A code has been sent to your email %TRANSPORT%,<br>enter it here to log in.": "Un code a été envoyé sur votre mél %TRANSPORT%,<br>saisissez le ici pour vous connecter.",
        "Authenticate with your multi-service card on an NFC-compatible smartphone": "S'authentifier avec sa carte multi-service sur un Smartphone compatible NFC",
        "Enter the code shown on your code grid": "Saisir le code indiqué sur votre grille de code",
        "Receive a code by mail on %TRANSPORT%": "Recevoir un code par mél sur %TRANSPORT%",
        "Receive a code by SMS on %TRANSPORT%": "Recevoir un code par SMS sur %TRANSPORT%",
        "Authentication failed": "L'authentification a échoué",
        "Authenticate via the Esup Auth application on your %TRANSPORT%": "S'authentifier via l'application Esup Auth sur votre %TRANSPORT%",
        "Enter the 6-digit code": "Saisissez le code de 6 chiffres",
        "Enter the code shown in the cell at the intersection of <strong>row %LINE%</strong> and <strong>column %COLUMN%</strong> 5 of your passcode grid.": "Veuillez saisir le code indiqué au croisement de la <strong>ligne %LINE%</strong> et de la <strong>colonne %COLUMN%</strong> de votre grille de codes.",
        "Enter a TOTP code or a backup code": "Saisir un code TOTP ou un code de secours",
        "Other connection method": "Autre méthode de connexion",
        "Please try again.": "Veuillez réessayer.",
        "Please enter the code displayed on your TOTP application:": "Merci de renseigner le code affiché sur votre application TOTP :",
        "Please enter the code displayed on your TOTP application or a backup code:": "Merci de renseigner le code affiché sur votre application TOTP ou un code de secours :",
        "Please wait": "Veuillez patienter",
        "Request a new notification": "Demander une nouvelle notification",
        "Show the code": "Afficher le code",
        "Use one of the following methods to log in": "Utilisez une des méthodes suivantes pour vous connecter",
        "Receive a new code": "Recevoir un nouveau code",

        "nfc_html": /*html*/`
            <ol>
                <li>Lancez ou téléchargez la dernière version d'Esup-Auth (pour <a href="%ANDROID_APP_URL%">Android</a> ou <a href="%IOS_APP_URL%">IOS</a>)</li>
                <li>Scannez le QRcode suivant à l'aide de l'application Esup-Auth dans le menu "Authentification NFC" : <div class="esupnfc_qrcode">%QRCODE%</div></li>
                <li>Scannez votre carte étudiante ou professionnelle en NFC l'aide de l'application Esup-Auth</li>
            </ol>
        `,
        "no_choices_html": /*html*/`
            Vous n'avez pas activé vos codes à usage unique.
            <br/><br/>
            Nous vous invitons à activer l'authentification renforcée sur l'application de
            <a href="%OTP_MANAGER_URL%" target="_blank">gestion d'authentification</a> de votre compte.
        `,
    },
    en: {
        "nfc_html": /*html*/`
            <ol>
                <li>Launch or download the latest version of Esup-Auth (for <a href="%ANDROID_APP_URL%">Android</a> or <a href="%IOS_APP_URL%">IOS</a>)</li>
                <li>Scan the following QR code using the Esup-Auth app in the "NFC Authentication" menu: <div class="esupnfc_qrcode">%QRCODE%</div></li>
                <li>Scan your student or professional card via NFC using the Esup-Auth app</li>
            </ol>
        `,
        "no_choices_html": /*html*/`
            You have not activated your one-time codes.
            <br/><br/>
            We invite you to activate enhanced authentication in the
            <a href="%OTP_MANAGER_URL%" target="_blank">authentication management</a> application of your account.
        `,
    }
}

function unique(arr) {
    return Array.from(new Set(arr))
}
const langs = unique([...navigator.languages, 'en'].map(k => {
    if (k in msgs) return k
    k = k.replace(/-.*/, '')
    if (k in msgs) return k
    return undefined
}).filter(e=>e))

    function translate(s, args, langs) {
        for (const lang of langs) {
            const s_ = msgs[lang][s]
            if (s_) {
                s = s_;
                break;
            }
            if (lang === 'en') break; // "en" does not need translation (except for "xxx_html" keys which must have been handled above)
        }
        $.each(args, (key, val) => {
            s = s.replace(key, val)
        })
        return s;
    }
    function _(s, args) {
        return translate(s, args || {}, langs)
    }

    function or_list_to_string(spans) {
        if(spans.length === 1) {
            return spans[0];
        } else if(spans.length === 2) {
            return spans.join(" " + _("or") + " ");
        } else {
            return spans.slice(0, -1).join(', ') + ', ' + _("or") + ' ' + spans.slice(-1);
        }
    }

    $("form").append(/*html*/`

       <div class="main1">

        <div id="no-choices" class="d-none">${_('no_choices_html', { '%OTP_MANAGER_URL%': 'https://otpmanager-test.univ-paris1.fr/preferences' })}</div>

        <div id="choices">
            <h2>${_("Use one of the following methods to log in")}</h2>

            <ul id="methodChoices">
                <li>${_("Please wait")}</li>
            </ul>
        </div>
               
        <div id="code" class="d-none">
          <div>
            <p>
              <label for="token">
                <div id="code_label"></div>
                <input type="text" id="token" class="obfuscated" required
                oninput="autosubmitIfValid(this)"
                minlength="6" maxlength="6" pattern="[0-9]{6}"
                placeholder="${_("Enter the 6-digit code")}"
                accesskey="m" autocomplete="one-time-code" name="token" value="">
              </label>
            </p>
            <p>
              <label id="toggle_code_visibility-LABEL" for="toggle_code_visibility">
                ${_("Show the code")}
                <input id="toggle_code_visibility" type="checkbox"
                  onchange="document.getElementById('token').classList.toggle('obfuscated', !this.checked)" />
              </label>
            </p>

            <ul>
                <li id="retry"><a></a></li>
                <li id="back_to_choices"><a>${_("Other connection method")}</a></li>
            </ul>
          </div>
          <img id="page_icon"></div>
       </div>
    `)

    // for IE11 in pulse-secure
    Array.prototype.find = Array.prototype.find || function(callback) {
        var list = Object(this);
        var length = list.length >>> 0;
        var thisArg = arguments[1];
        for (var i = 0; i < length; i++) {
            var element = list[i];
            if ( callback.call(thisArg, element, i, list) ) {
                return element;
            }
        }
    };
    
    /**
     * Like "element.onclick = func", but makes it accessible from the keyboard
     * @param {String|Element} element an HTML element, or a selector to get it
     */
    function onclick(element, func) {
        if (typeof element === 'string' || element instanceof String) {
            element = document.querySelector(element);
        }

        element.onclick = func;
        element.onkeydown = function (event) {
            if (event.key === "Enter") {
                element.click();
            }
        };
        element.tabIndex = 0;
    }
     
	/**
	* wait for the browser to update the displayed title (otherwise, on Firefox, displayTitle() is omitted)
	*/
	async function afterNextPaint() {
	    return new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
	}

    /** base64url helper functions **/
    /**
    * Convert from a Base64URL-encoded string to an Array Buffer. Best used when converting a
    * credential ID from a JSON string to an ArrayBuffer, like in allowCredentials or
    * excludeCredentials
    *
    * Helper method to compliment `bufferToBase64URLString`
    */
    function base64URLStringToBuffer(base64URLString) {
        // Convert from Base64URL to Base64
        const base64 = base64URLString.replace(/-/g, '+').replace(/_/g, '/');
        /**
         * Pad with '=' until it's a multiple of four
         * (4 - (85 % 4 = 1) = 3) % 4 = 3 padding
         * (4 - (86 % 4 = 2) = 2) % 4 = 2 padding
         * (4 - (87 % 4 = 3) = 1) % 4 = 1 padding
         * (4 - (88 % 4 = 0) = 4) % 4 = 0 padding
         */
        const padLength = (4 - (base64.length % 4)) % 4;
        const padded = base64.padEnd(base64.length + padLength, '=');

        // Convert to a binary string
        const binary = atob(padded);

        // Convert binary string to buffer
        const buffer = new ArrayBuffer(binary.length);
        const bytes = new Uint8Array(buffer);

        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }

        return buffer;
    }

    /**
    * Convert the given array buffer into a Base64URL-encoded string. Ideal for converting various
    * credential response ArrayBuffers to string for sending back to the server as JSON.
    *
    * Helper method to compliment `base64URLStringToBuffer`
    * 
    * source: https://github.com/MasterKale/SimpleWebAuthn/blob/master/packages/browser/src/helpers/bufferToBase64URLString.ts
    */
    function bufferToBase64URLString(buffer) {
        const bytes = new Uint8Array(buffer);
        let str = '';

        for (const charCode of bytes) {
            str += String.fromCharCode(charCode);
        }

        const base64String = btoa(str);

        return base64String.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    }


    function autosubmitIfValid(input) {
        if (!input.validationMessage) {
            document.getElementById("fm1").submit()
        }
    }

    function clear_errors() {
        $("#errors").remove();
    }

    function show(idToShow) {
        ["no-choices", "choices", "code"].forEach(function (id) {
            $('#' + id).toggleClass('d-none', id !== idToShow);
        });
        // focus on first focusable element
        let elt = document.getElementById(idToShow).querySelector('button, [href], input, select, [tabindex]')
        if (elt) elt.focus();
    }
    async function show_method(params, chosen) {
        show('code');

        $("#token, #submitCode, #toggle_code_visibility-LABEL").toggleClass('d-none', chosen.opts.hide_submitCode === true);
        $("#token").focus();
        updateCode_label(chosen.opts.code_label && await chosen.opts.code_label(params, chosen) || _("Please enter a code:"));

        document.querySelector('#page_icon').src = params.apiUrl + '/public/images/page-' + (chosen.opts.override_icon || chosen.transport || chosen.method) + ".svg";

        $("#back_to_choices").toggleClass('d-none', $("#methodChoices > li").length <= 1);

        $("#retry").toggleClass('d-none', !(chosen.transport || chosen.opts.retryText));
        const retryElement = document.querySelector("#retry a");
        retryElement.text = chosen.opts.retryText || _("Receive a new code");
        onclick(retryElement, async () => { clear_errors(); await activate_method(params, chosen, {}) });

        return false;
    }
    
    function updateCode_label(code_label) {
        $('#code_label').html(code_label);
    }
    
    async function initializeWebauthn(params, chosen, opts) {

        function displayTitle({title, desc = ''}) {
            updateCode_label("<h2><b>" + "WebAuthn" + "</b><br>" + title + "</h2>" + desc)
        }
        
        // PublicKeyCredential can not be serialized
        // because it contains some ArrayBuffers, which
        // can not be serialized.
        // This just translates the buffer to its' 'safe'
        // version.
        // This is only for the AUTHENTICATION part
        // It is slightly different from what is
        // used for registration
        const SerializePKC = PKC => {
            return {
                id: PKC.id,
                type: PKC.type,
                rawId: bufferToBase64URLString(PKC.rawId),
                response: {
                    authenticatorData: bufferToBase64URLString(PKC.response.authenticatorData),
                    clientDataJSON: bufferToBase64URLString(PKC.response.clientDataJSON),
                    signature: bufferToBase64URLString(PKC.response.signature),
                    userHandle: PKC.response.userHandle ? bufferToBase64URLString(PKC.response.userHandle) : undefined,
                }
            };
        }

    
        const webauthnData = await (fetch(`${params.apiUrl}users/${params.uid}/methods/webauthn/secret/${params.userHash}`, {method: "POST"})
            .then(res => res.json())
        );
            
        // afficher le titre
        if(webauthnData.auths.length === 0) {
            displayTitle({
             title: _("You have no registered factors"),
             desc: _("Try another method")
            });
        } else {
            let spans = webauthnData.auths.map(function authToSpan(authenticator) {
                const name = authenticator.name || _("unnamed key");
                const title = authenticator.name ? 
                    _("The physical factor you named '%NAME%'", { '%NAME%': authenticator.name }) :
                    _("You have not given this factor a name. Go to your settings to give it a name.")
                return `<span class="factor" title="${title}">${name}</span>`;
            });
            displayTitle({
                title: _("Utilisez %FACTORS% pour vous authentifier.", { '%FACTORS%': or_list_to_string(spans) })
            });
        }
        
        const publicKeyCredentialRequestOptions = {
            challenge: base64URLStringToBuffer(webauthnData.nonce),
            rp: webauthnData.rp,
            rpId: webauthnData.rp.id,
            pubKeyCredParams: webauthnData.pubKeyTypes,
            // user has 3 * 60 seconds to register
            timeout: 3 * 60000,
            // leaks data about the user if in direct mode.
            attestation: "none",
            // Use registered credentials
            allowCredentials: webauthnData.auths.map(a => ({id: base64URLStringToBuffer(a.credentialID), type: "public-key"})),
        };
        
        await afterNextPaint();

        let assertion;
        try {
            // authenticate
            assertion = await navigator.credentials.get({
                publicKey: publicKeyCredentialRequestOptions
            });
        }
        catch(e) {
            if(e.name === "NotAllowedError") {
                if(e.message === "CredentialContainer request is not allowed.") {
                    displayTitle({
                        title: _("Authentication failed"),
                        desc: _("Please try again."),
                    })
                    // There is a firefox bug where if you have your console opened when you try to call this, it fails
                    console.info("If the authentication crashed and you had your firefox console open when you tried to login, please close it and try again, as it may be due to a firefox bug. You can ignore this message otherwise.");
                }
                else {
                    displayTitle({
                        title: _("Authentication failed"),
                        desc: _("You refused the request"),
                    })
                }
            }
            return;
        }
        
        if(assertion === undefined) {
            displayTitle({
                title: _("Authentication failed"),
                desc: _("Please try again."),
            })
            return;
        }
        
        const res = await fetch(`${params.apiUrl}users/${params.uid}/webauthn/login/${params.userHash}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                //note: credID is contained in response, as response.id
                //note: response.id and response.rawId are the same when sending
                // because rawId is an arraybuffer, and serializePKC converts it to
                // a string, causing to equal id.
                //=> 3x the same id is sent, redundant
                response: SerializePKC(assertion),
                credID: assertion.id
            })
        });
        
        const verifdata = await res.json();

        // Success response
        if(200 <= res.status && res.status < 300) {
            $('#token').val(verifdata.token);
            $('#fm1').submit();
        }
        // failed
        else {
            if(typeof verifdata.message === "object") {
                displayTitle({
                    title: _("Authentication failed"),
                    desc: verifdata.message.title + "<br>" + verifdata.message.desc,
                })
            }
        }
    }

    function getUserOtpMethods_and_displayChoices(params) {
        $.ajax({ url: params.apiUrl + '/users/'+ params.uid +'/' + params.userHash }).done(async function(data) {
            if (data.code != "Ok") {
                alert(_("Error, please try again later"));
                return;
            }
            try {
                await displayChoices(params, data.user);
            } catch (e) {
                alert(_("Error") + ' ' + e)
            }
        });
    }
    const methods = {
        // l'ordre est utilisé pour choisir dans quel ordre afficher les méthodes
        webauthn: {
            label: {
                '': _("Authenticate by physical factor (WebAuthn)")
            },
            override_icon: 'cle',
            hide_submitCode: true,
            retryText: "Réessayer",
            initialise: initializeWebauthn,
        },
        push: { 
            label: { 
                push: _("Authenticate via the Esup Auth application on your %TRANSPORT%"),
            },
            hide_submitCode: true,
            retryText: _("Request a new notification"),
            code_label_afterSubmit: _("Open the Esup Auth application on your mobile %TRANSPORT% to validate the authentication."),
        },
        no_transport: {
            label: {
                '': _("Enter a TOTP code or a backup code"),
            },
            real_methods: [ 'totp', 'bypass'],
            code_label: (params, chosen) => {
                switch(chosen.real_methods.sort().join(' ')) {
                    case 'totp':
                        return _("Please enter the code displayed on your TOTP application:");
                    case 'bypass totp':
                        return _("Please enter the code displayed on your TOTP application or a backup code:");
                }
            },
        },
        random_code_mail: { label: { 
            sms: _("Receive a code by SMS on %TRANSPORT%"),
            mail: _("Receive a code by mail on %TRANSPORT%"),
        } },
        random_code: { label: { 
            sms: _("Receive a code by SMS on %TRANSPORT%"),
            mail: _("Receive a code by mail on %TRANSPORT%"),
        } },
        passcode_grid: { label: { 
            '': _("Enter the code shown on your code grid"),
        } },
        esupnfc: {
            label: {
                '': _("Authenticate with your multi-service card on an NFC-compatible smartphone")
            },
            override_icon: 'carte',
            hide_submitCode: true,
            code_label: async (params, chosen) => {
                if (!(params.methods.esupnfc || {}).server_infos) {
                    return _("Authenticate with your multi-service card on an NFC-compatible smartphone");
                }
                if (!params.methods.esupnfc.server_infos.qrCode) {
                    const esupnfc_secret = await (fetch(`${params.apiUrl}esupnfc/infos?requireQrCode=true`, { method: "GET" })
                        .then(res => res.json())
                    );
                    params.methods.esupnfc.server_infos = esupnfc_secret.server_infos;
                }
                return _('nfc_html', { 
                    '%ANDROID_APP_URL%': 'https://play.google.com/store/apps/details?id=org.esupportail.esupAuth',
                    '%IOS_APP_URL%': 'https://apps.apple.com/fr/app/esup-auth/id1563904941',
                    '%QRCODE%': params.methods.esupnfc.server_infos.qrCode }
                );
            },
        },
    };
    
    const transports = {
        mail:{
            code_label_afterSubmit: _("A code has been sent to your email %TRANSPORT%,<br>enter it here to log in.")
        },
        sms:{
            code_label_afterSubmit: _("A code has been sent to %TRANSPORT%,<br>enter it here to log in.")
        }
    }

    async function activate_method(params, chosen, opts) {
        if(chosen.method == "passcode_grid") {
            chosen.transport = "passcode_grid";
        }

        if (chosen.transport) {
            submitCodeRequest(params, chosen, opts);
        }
        await show_method(params, chosen);
        if (chosen.opts.initialise) chosen.opts.initialise(params, chosen, opts);
    }

    function toggleDisplay(element, shown) {
        if(element.initialDisplayProperty === undefined) {
            // value you gave (e.g. 'flex') or nothing (reset)
            element.initialDisplayProperty = element.style.display || 'initial';
        }
        element.style.display = shown ? element.initialDisplayProperty : 'none';
    }

    function computeChoices(params, methods_and_transports) {
        let choices = []
        $.each(methods, function (method, opts) {

            var real_methods = (opts.real_methods || [method]).filter(function (method_) {
                return (methods_and_transports.methods[method_] || {}).active
            })
            if (real_methods.length === 0) return;
            var params = methods_and_transports.methods[real_methods[0]];

            (params.transports.length ? params.transports : ['']).forEach(function (transport) {
                //if (transport !== '') return;
                var transport_text = transport && methods_and_transports.transports[transport];
                if (opts.label[transport]) {
                    var text = opts.label[transport].replace('%TRANSPORT%', transport_text)
                    choices.push({ 
                        method: method, 
                        real_methods: real_methods, 
                        transport: transport, 
                        transport_text: transport_text, 
                        text: text,
                        opts: $.extend({}, opts, transports[transport]),
                    })
                } else {
                    console.error("weird transport", transport, "for (pseudo) method", method)
                }
            })
        })
        return choices
    }

    function server_log(vals) {
        fetch('log?' + new URLSearchParams(vals))
    }

    async function displayChoices(params, user_params) {
        let choices = computeChoices(params, user_params)
        if (choices.length === 0) {
            show('no-choices');
            try { server_log({ warn: "no-choices", uid: params.uid, service: new URLSearchParams(location.search).get("service") }); } catch (e) {}
            return;
        }
        if(user_params.methods.waitingFor === true){
            initializeSocket(params);
        }
        $("#methodChoices").empty().append(choices.map(function (choice) {
            const button = $("<a class='large'>");
            onclick(button[0], async () => {
                clear_errors();
                await activate_method(params, choice, {});
                return false;
            });
            button.append($("<span></span>").text(choice.text));
            button.append($("<img>", { src: params.apiUrl + "/public/images/liste-" + (choice.opts.override_icon || choice.transport || choice.method) + ".svg" } ));
            return $("<li></li>").append(button);
        }));
        $("#methodChoices li a").first().focus();
        const last_send_message = user_params.last_send_message || {};
        if (document.hidden) {
            // we are not visible, wait for user to choose
        } else if (last_send_message.auto && !last_send_message.verified) {
            // last submitCodeRequest did not succeed
        } else {
            const last_validated_method = (user_params.last_validated || {}).method;
            // use last validated method, or first method by default
            const chosen = (last_validated_method && choices.find(choice => choice.real_methods.includes(last_validated_method))) || choices[0];
            await activate_method(params, chosen, { auto: true });
        }
    }

    function submitCodeRequest(params, chosen, opts) {
        $.ajax({
            type: 'POST',
            url: params.apiUrl + '/users/'+ params.uid +'/methods/' + chosen.method + '/transports/' + chosen.transport + '/' + params.userHash + (opts.auto ? '?auto' : '')
        }).done(function(data) {
            if (data.code !== "Ok") {
                alert(_("Error, please try again later"));
                show('choices');
                console.log("Something is broken : ", data);
            } else {
                console.log(chosen);
                let code_label = chosen.opts.code_label_afterSubmit || _("A code has been sent to %TRANSPORT%,<br>enter it here to log in.");
                if(chosen.method == "passcode_grid") {
                    const challenge = data.message.challenge;
                    code_label = _("Enter the code shown in the cell at the intersection of <strong>row %LINE%</strong> and <strong>column %COLUMN%</strong> 5 of your passcode grid.",
                                   { '%LINE%': String.fromCharCode(challenge[0] + 'A'.charCodeAt(0)), '%COLUMN%': challenge[1] + 1 })
                }
                updateCode_label(code_label.replace('%TRANSPORT%', chosen.transport_text));
            }
        });
    }
    
    function initializeSocket(params) {
        var socket = io.connect(params.apiUrl, {
            reconnect: true, 
            path: "/sockets", 
            query: 'uid=' + params.uid + '&hash=' + params.userHash + '&app=cas'
        });
        socket.on('connect', function () {
        });          
        socket.on('userAuth', function (data) {
            if (data.code == "Ok") {
                $('#token').val(data.otp);
                $('#fm1').submit();
            }
        });
    }

    function milliseconds_to_DaysHoursMinutes(ms) {
        const minutes = Math.round(ms / 60 / 1000)
        return {
            days: Math.floor(minutes / 60 / 24),
            hours: Math.floor(minutes / 60) % 24,
            minutes: minutes % 60,
        }
    }

    function milliseconds_to_french_text(ms) {
        const translate = { days: ['jour', 'jours'], hours: ['heure', 'heures'], minutes: ['minute', 'minutes'] }
        const dhm = milliseconds_to_DaysHoursMinutes(ms)
        const to_text = (field) => {
            const val = dhm[field]
            return val === 0 ? '' : val + " " + translate[field][val > 1 ? 1 : 0]
        }

        const d = to_text('days')
        const h = to_text('hours')
        const m = to_text('minutes')

        return (
            dhm.days >= 7 ? [d] : dhm.days >= 1 ? [d,h]:
            dhm.hours >= 10 ? [h] : [h,m]
        ).filter(s => s).join(' et ')
    }
   
    onclick("#back_to_choices", () => { clear_errors(); show('choices'); });
