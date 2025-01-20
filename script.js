// ==UserScript==
// @name         Physics Engine for Navigating Intelligent Systems
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
const dev = false;
if (dev) console.log("dev")
function blockAndReplaceScript() {
    const scripts = document.querySelectorAll('script');
    scripts.forEach(script => {
        if (script.src && (script.src.includes('skill/skill.js') || script.src.includes('problemrender.js'))) {
            console.log('Blocking script with src:', script.src);

            // Inject a modified version of the script
            if (script.src.includes('skill/skill.js')) {
                if (dev) script.src = "http://127.0.0.1:5500/skill.js";
                if (!dev) script.src = "https://cdn.jsdelivr.net/gh/TheUntitledGoose/pos-phys@main/skill.js";
            } else {
                if (dev) script.src = "http://127.0.0.1:5500/problemrenderer.js";
                if (!dev) script.src = "https://cdn.jsdelivr.net/gh/TheUntitledGoose/pos-phys@refs/heads/main/problemrenderer.js";
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

// add my own script
const newScript = document.createElement('script');
newScript.type = "module"
newScript.src = "https://cdn.jsdelivr.net/gh/TheUntitledGoose/imgui-js@main/imgui.js";
document.head.appendChild(newScript);

observer.observe(document, { childList: true, subtree: true });

// Update Checker
function checkForUpdates(currentVersion) {
    const repoUrl = "https://raw.githubusercontent.com/TheUntitledGoose/pos-phys/refs/heads/main/version.json";
    
    try {
        fetch(repoUrl)
            .then(response => response.json())
            .then(data => {
                const latestVersion = data.version;
                const downloadUrl = "https://github.com/TheUntitledGoose/pos-phys/blob/main/script.js";

                if (latestVersion !== currentVersion) {
                    console.log(`Your version: ${currentVersion}. Version: ${latestVersion} is available.\nDownload from: ${downloadUrl}`);
                    
                    // You can add code here to prompt the user to download the update
                    alert(`Version: ${latestVersion}, is available! Current: ${currentVersion}. Please download it from:\n${downloadUrl}`);
                    // Open the download URL in a new tab or window
                    window.open(downloadUrl, '_blank');
                } else {
                    console.log(`You are using the latest version: ${currentVersion}.`);
                }
            })
            .catch(error => {
                console.error("Error checking for updates:", error);
                alert(`An error occurred while checking for updates. Please try again later.`);
            });
    } catch (error) {
        console.error("Error checking for updates:", error);
        alert(`An error occurred while checking for updates. Please try again later.`);
    }
}

// Initial update check when the script runs
checkForUpdates("2.0.0");
