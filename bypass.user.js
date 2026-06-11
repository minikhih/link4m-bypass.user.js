// ==UserScript==
// @name         Link4m Ultimate Bypass
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  Bypass 100% Link4m
// @author       palofsc
// @match        *://*.link4m.com/*
// @match        *://*.link4m.net/*
// @match        *://*.link4m.xyz/*
// @match        *://*.link4m.co/*
// @match        *://*.link4m.me/*
// @match        *://*.link4m.in/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    const _setTimeout = window.setTimeout;
    window.setTimeout = function(a, b) {
        if (typeof a === 'function' && (/countdown|timer|redirect|location|updateTimer|showTimer|skip|wait/i.test(a.toString()) || b > 999)) return 0;
        return _setTimeout.apply(this, arguments);
    };
    const _setInterval = window.setInterval;
    window.setInterval = function(a, b) {
        if (typeof a === 'function' && /countdown|timer|redirect|updateTimer/i.test(a.toString())) return 0;
        return _setInterval.apply(this, arguments);
    };

    const _open = window.open;
    window.open = function(url) {
        if (typeof url === 'string' && url.startsWith('http') && !/link4m/.test(url)) window.location.href = url;
        return null;
    };

    Object.defineProperty(document, 'hidden', { get: function() { return false; } });
    Object.defineProperty(document, 'visibilityState', { get: function() { return 'visible'; } });
    Object.defineProperty(document, 'webkitHidden', { get: function() { return false; } });
    Object.defineProperty(document, 'webkitVisibilityState', { get: function() { return 'visible'; } });

    window.addEventListener('visibilitychange', function(e) { e.stopImmediatePropagation(); }, true);
    window.addEventListener('pagehide', function(e) { e.stopImmediatePropagation(); }, true);
    window.addEventListener('beforeunload', function(e) { e.stopImmediatePropagation(); }, true);

    const origPushState = history.pushState;
    history.pushState = function() { return origPushState.apply(this, arguments); };
    const origReplaceState = history.replaceState;
    history.replaceState = function() { return origReplaceState.apply(this, arguments); };

    window.addEventListener('popstate', function(e) { e.stopImmediatePropagation(); }, true);

    function extractHash(url) {
        let m = url.match(/[?&](r|go|to|url|link|dest|redirect|out|target|ref|token|hash|id|key)=([^&]+)/i);
        if (m) return decodeURIComponent(m[2]);
        m = url.match(/[?&](r|go|to|url|link|dest|redirect|out|target|ref|token|hash|id|key)=([^&]+)/i);
        if (m) return decodeURIComponent(m[2]);
        m = url.match(/[#]([^?&]+)/);
        if (m && m[1].length > 10) return decodeURIComponent(m[1]);
        return null;
    }

    let finalUrl = extractHash(window.location.href);
    if (finalUrl && /^https?:\/\//.test(finalUrl)) {
        window.location.replace(finalUrl);
        return;
    }

    const origXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
        this.__url = url;
        return origXHROpen.apply(this, arguments);
    };
    const origXHRSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function() {
        let self = this;
        self.addEventListener('readystatechange', function() {
            if (self.readyState === 4 && self.status === 200) {
                try {
                    let data = JSON.parse(self.responseText);
                    let u = data.url || data.link || data.redirect || data.destination || data.goto || data.target || data.result;
                    if (u && /^https?:\/\//.test(u)) {
                        window.location.replace(u);
                    }
                } catch(e) {}
            }
        });
        return origXHRSend.apply(this, arguments);
    };

    const origFetch = window.fetch;
    window.fetch = function(input, init) {
        return origFetch.apply(this, arguments).then(function(response) {
            let url = typeof input === 'string' ? input : input.url;
            response.clone().text().then(function(body) {
                try {
                    let data = JSON.parse(body);
                    let u = data.url || data.link || data.redirect || data.destination || data.goto || data.target || data.result;
                    if (u && /^https?:\/\//.test(u)) {
                        window.location.replace(u);
                    }
                } catch(e) {}
            }).catch(function() {});
            return response;
        });
    };

    function removeAllBlockers() {
        let selectors = [
            'div[class*="overlay"]', 'div[id*="overlay"]',
            'div[class*="modal"]', 'div[id*="modal"]',
            'div[class*="popup"]', 'div[id*="popup"]',
            'div[class*="countdown"]', 'div[id*="countdown"]',
            'div[class*="timer"]', 'div[id*="timer"]',
            'div[class*="loading"]', 'div[id*="loading"]',
            'div[class*="please-wait"]', 'div[id*="please-wait"]',
            'div[class*="blocker"]', 'div[id*="blocker"]',
            'div[class*="adblock"]', 'div[id*="adblock"]',
            'div[class*="notification"]', 'div[id*="notification"]',
            'ins', '[class*="ads"]', '[id*="ads"]'
        ];
        selectors.forEach(function(s) {
            document.querySelectorAll(s).forEach(function(el) {
                el.remove();
            });
        });
        document.body.style.cssText = 'overflow:auto !important; position:static !important; pointer-events:auto !important; opacity:1 !important;';
        document.documentElement.style.cssText = 'overflow:auto !important; position:static !important;';
    }

    function clickAllButtons() {
        let btns = document.querySelectorAll('button, a, input[type="button"], input[type="submit"]');
        btns.forEach(function(btn) {
            let text = (btn.textContent || btn.value || '').toLowerCase();
            if (/get link|continue|download|skip|next|go|visit|open|unlock|access|verify|human/i.test(text)) {
                btn.click();
            }
        });
        let allLinks = document.querySelectorAll('a[href]');
        allLinks.forEach(function(a) {
            let href = a.getAttribute('href');
            if (href && /^https?:\/\//.test(href) && !/link4m/.test(href)) {
                window.location.replace(href);
            }
        });
    }

    function deepScanAndRedirect() {
        removeAllBlockers();
        clickAllButtons();
        let all = document.querySelectorAll('*');
        all.forEach(function(el) {
            let attrs = ['href', 'data-url', 'data-link', 'data-redirect', 'data-destination', 'data-goto', 'data-target', 'data-out', 'data-go'];
            attrs.forEach(function(attr) {
                let val = el.getAttribute(attr);
                if (val && /^https?:\/\//.test(val) && !/link4m/.test(val)) {
                    window.location.replace(val);
                }
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            removeAllBlockers();
            setTimeout(deepScanAndRedirect, 100);
            setTimeout(deepScanAndRedirect, 500);
            setTimeout(deepScanAndRedirect, 1000);
            setTimeout(deepScanAndRedirect, 2000);
            setTimeout(deepScanAndRedirect, 4000);
            setTimeout(deepScanAndRedirect, 8000);
        });
    } else {
        removeAllBlockers();
        setTimeout(deepScanAndRedirect, 100);
        setTimeout(deepScanAndRedirect, 500);
        setTimeout(deepScanAndRedirect, 1000);
        setTimeout(deepScanAndRedirect, 2000);
    }

    const observer = new MutationObserver(function() {
        removeAllBlockers();
        clickAllButtons();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true });

    window.addEventListener('load', function() {
        removeAllBlockers();
        setTimeout(deepScanAndRedirect, 100);
        setTimeout(deepScanAndRedirect, 1000);
    });

})();
