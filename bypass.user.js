// ==UserScript==
// @name         Link4m Bypass Clean
// @namespace    http://tampermonkey.net/
// @version      4.0
// @description  Clean bypass no images
// @author       palofsc
// @match        *://*.link4m.com/*
// @match        *://*.link4m.net/*
// @match        *://*.link4m.xyz/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';
    const st = window.setTimeout;
    window.setTimeout = function(fn, d) {
        if (typeof fn === 'function' && (/countdown|timer|redirect|location|updateTimer|skip|wait/i.test(fn.toString()) || d > 999)) return 0;
        return st.apply(this, arguments);
    };
    const si = window.setInterval;
    window.setInterval = function(fn, d) {
        if (typeof fn === 'function' && /countdown|timer|redirect|updateTimer/i.test(fn.toString())) return 0;
        return si.apply(this, arguments);
    };
    const ow = window.open;
    window.open = function(url) {
        if (typeof url === 'string' && url.startsWith('http') && !/link4m/.test(url)) window.location.href = url;
        return null;
    };
    function removeAll() {
        let s = 'div[class*="overlay"],div[id*="overlay"],div[class*="modal"],div[id*="modal"],div[class*="popup"],div[id*="popup"],div[class*="countdown"],div[id*="countdown"],div[class*="timer"],div[id*="timer"],div[class*="loading"],div[id*="loading"],div[class*="blocker"],div[id*="blocker"],div[class*="ad"],div[id*="ad"],ins';
        document.querySelectorAll(s).forEach(function(el) { el.remove(); });
        document.body.style.cssText = 'overflow:auto;position:static;pointer-events:auto;opacity:1;';
        document.documentElement.style.cssText = 'overflow:auto;position:static;';
    }
    function findAndGo() {
        removeAll();
        let allA = document.querySelectorAll('a[href]');
        for (let a of allA) {
            let h = a.getAttribute('href');
            if (h && /^https?:\/\//.test(h) && !/link4m/.test(h)) {
                window.location.replace(h);
                return;
            }
        }
        let allE = document.querySelectorAll('*');
        for (let el of allE) {
            let attrs = ['href','data-url','data-link','data-redirect','data-destination','data-goto','data-target'];
            for (let attr of attrs) {
                let v = el.getAttribute(attr);
                if (v && /^https?:\/\//.test(v) && !/link4m/.test(v)) {
                    window.location.replace(v);
                    return;
                }
            }
        }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            removeAll();
            setTimeout(findAndGo, 100);
            setTimeout(findAndGo, 500);
            setTimeout(findAndGo, 1000);
            setTimeout(findAndGo, 2000);
            setTimeout(findAndGo, 4000);
        });
    } else {
        removeAll();
        setTimeout(findAndGo, 100);
        setTimeout(findAndGo, 500);
        setTimeout(findAndGo, 1000);
    }
    new MutationObserver(function() {
        removeAll();
    }).observe(document.documentElement, { childList: true, subtree: true, attributes: true });
})();
