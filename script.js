// ==UserScript==
// @name         Pos Phys Answ - test
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        https://*.positivephysics.org/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @require      https://code.jquery.com/jquery-2.1.4.min.js
// @run-at       document-start
// ==/UserScript==

var $ = window.jQuery;
function blockAndReplaceScript() {
    const scripts = document.querySelectorAll('script');
    scripts.forEach(script => {
        if (script.src && (script.src.includes('skill/skill.js') || script.src.includes('problemrender.js'))) {
            console.log('Blocking script with src:', script.src);

            // Inject a modified version of the script
            if (script.src.includes('skill/skill.js')) {
                script.src = "https://cdn.jsdelivr.net/gh/TheUntitledGoose/pos-phys@refs/heads/last-working/skill.js";
                //script.src = "http://127.0.0.1:5500/skill.js";
            } else {
                script.src = "https://cdn.jsdelivr.net/gh/TheUntitledGoose/pos-phys@refs/heads/main/problemrenderer.js";
                //script.src = "http://127.0.0.1:5500/problemrenderer.js";
            }
            console.log('Injected modified script.');
        }
    });
}

const observer = new MutationObserver(function(mutations) {
    mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
            if (node.tagName === 'SCRIPT') {
                blockAndReplaceScript();
            }
        });
    });
});

observer.observe(document, { childList: true, subtree: true });