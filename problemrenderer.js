//
// PLEASE NOTE!!
//
// problemrender.js will not work without a custom version of math.js
// to build said custom version, you need to
// 1. pull down math.js from github
// 2. then run "npm install" inside that folder (install npm if you don't have it yet)
// 3. edit defaultInstance.js file inside that package and make it look like this:

// import * as all from './factoriesAny.js'
// import { create } from './core/create.js'
// const math = create(all)
// math.import({
    // getTableVal: function (table, element, characteristic) {
    //     return table[element-1][characteristic];
    // },
    // // The next function was created for Abi but can be used by anyone.
    // // use like this:
    // // i = [1,3,5,7,9]
    // // seed = randomInt(99999)
    // // r = sort(i,seedOrder(seed))
    // seedOrder: function(seed) {
    //     return function() {
    //         var t = seed += 0x6D2B79F5;
    //         t = Math.imul(t ^ t >>> 15, t | 1);
    //         t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    //         return ((t ^ t >>> 14) >>> 0) / 4294967296-0.5;
    //     }
    // },
    // sigFig: function(number,figs) {
    //     // There's a little hack here to force rounding up if it's very close to the deciding digit being exactly 5
    //     // This is required because of floating point errors that sometimes turn 10.575 into 10.57499999999998 or something like that.
    //     return Number((number*(1+.000001/(10 ** figs))).toPrecision(figs));
    // },
    // decFig: function(number,figs) {
    //     return Number(math.round(number,figs));
    // },
    // showIf: function(condition) {
    //     if (condition) {
    //         return 1;
    //     } else {
    //         return Infinity;
    //     }
    // }
// });
// export default math

// 4. run "npm run build" in that directory
// 5. grab /lib/browser/math.js after the build completes and put it in /js/auxiliary/custom_mathjs_bundle/
// 6. And test test test!

var vvar;
var gravm;
var timerId = 0;

const newRoundNice = function(input, statement, custom_rounding) {
    // Default sf is -1 (which will be interpreted as 3 or the problem default later)
    let sf = -1;
    let fixed_decimal = -1;

    // Interpret custom_rounding which is a string value defined in the select in customproblemcreator.html
    switch (custom_rounding) {
        case "":
            // do nothign and stick fully with defaults
            break;
        case "2sigFig":
            sf = 2;
            break;
        case "3sigFig":
            sf = 3;
            break;
        case "4sigFig":
            sf = 4;
            break;
        case "0decimal":
            fixed_decimal = 0;
            break;
        case "1decimal":
            fixed_decimal = 1;
            break;
        case "2decimal":
            fixed_decimal = 2;
            break;
        case "3decimal":
            fixed_decimal = 3;
            break;
    }

    // Some parsing of the statement to see if it includes
    // context clues that tell us to use a specific number
    // of sig figs instead of the default roundNice behavior in the else if

    // Regular expression matches any variable before an = sign (optional) followed by whitespace
    // followed by sigFig( or rand( followed by anything followed by final comma,
    // a capturing group for sig fig number, one final ), optional whitespace, and end of line

    // FUNCTIONALLLY, this means that rand() or sigFig() must be the OUTERMOST function
    // in the expression or it will be ignored.
    let randOrSfMatch = statement.match(/^(?:.*=)?\s*(rand|sigFig|decFig) *\(.*,([^,\)]+)\)\s*$/);
    if (randOrSfMatch) {
        let functionName = randOrSfMatch[1];
        let secondArgument = randOrSfMatch[2]; // This is the second capture group or the last item in the function
        if (functionName == "decFig") {
            sf = -1;
            fixed_decimal = secondArgument;
        } else {
            // this is the case of rand or sigFig
            sf = secondArgument;
            fixed_decimal = -1;
        }
    }

    // Now we do the actual rounded rendering. Everything earlier was to determine the correct
    // number of SF, now here is the actual math.
    if (typeof input == "number" && sf > 0) {
        // There's a little hack here to force rounding up if it's very close to the deciding digit being exactly 5
        // This is required because of floating point errors that sometimes turn 10.575 into 10.57499999999998 or something like that.
        let roundedString = (input*(1+.000001/(10 ** sf))).toPrecision(sf);
        let rounded = parseFloat(roundedString);
        let absrounded = Math.abs(rounded);
        // This little bit here makes scientific notation go away if the number is less than 10,000,000
        if (absrounded >= 10 ** sf && absrounded < 10000000) {
            return rounded; // Don't allow scientific notation
        } else {
            return roundedString; // Allow scientific notation
        }
    } else if (typeof input == "number" && fixed_decimal >= 0) {
        // Exact number of decimal places to include in the string
        // math.js round is better than toFixed because it handles floating point weirdness automatically
        return math.round(input,fixed_decimal);
    } else if (typeof input == "number") {
        // Default rounding behavior of custom_rounding = "" that is sf = -1 and fixed_decimal = -1
        let absinput = Math.abs(input);

        if (absinput >= 10000000) { // In this case, use scientific notation
            // There's a little hack here to force rounding up if it's very close to the deciding digit being exactly 5
            // This is required because of floating point errors that sometimes turn 10.575 into 10.57499999999998 or something like that.
            return (input*1.000000001).toPrecision(3);
        } else if (absinput >= 100) { // Just show the number rounded to nearest integer
            return input.toFixed(0);
        } else {
            // Numbers less than 100
            // Show with exactly 3 sig figs if there is nonzero info in the 4th+ sig fig...
            // but not if the added info is in sig. fig. 9+ as that's just floating point noise
            input = parseFloat(input.toPrecision(8));
            if (input - input.toPrecision(3) !== 0) {
                // There's a little hack here to force rounding up if it's very close to the deciding digit being exactly 5
                // This is required because of floating point errors that sometimes turn 10.575 into 10.57499999999998 or something like that.
                return (input*1.000000001).toPrecision(3);
            }
        }
        // None of the above so we just return the input
        // this will truncate possibly unsignificant digits: 2.00 renders as 2 in this case
        return input;
    } else {
        // Non numeric so just return it as is
        return input;
    }
}

// html is an html string, destination is a selector string or a selection object or a node
problemRender = function (html, custom_math, destination, only_randoms, custom_rounding) {
    // Remove all zero width spaces
    html = html.replace(/&#x200B;/g, "");
    html = html.replace(/\u200B/g, "");
    // Replace all non-breaking spaces with regular spaces as they make translation look awful!
    html = html.replace(/&nbsp;/g, " ");

    // Check if there is a time simulation going on, in which case we hardwire t = tSim
    if (custom_math.includes("time.final")) {
        custom_math = "t = tSim\n" + custom_math;
    }

    // Get ready to insert the html to the DOM
    let tempdiv = $("<div>");
    // Split left and right hand side on hr.right-hand-start
    var leftRightSplit = html.split(/<hr[^>]*?class[^>]*?right-hand-start[^>]*>/);
    // loop through leftRightSplit
    for (let i = 0; i < leftRightSplit.length; i++) {
        // If we are at the last element and it's an even index, full width
        if ( (i == leftRightSplit.length-1) && (i % 2 === 0) ) {
            $('<div class="createProblemContainerClass col-12"></div>').appendTo(tempdiv).html(leftRightSplit[i]);
        } else {
            // else half width
            $('<div class="createProblemContainerClass col-12 col-lg-6 mb-3 pl-2 pr-2"></div>').appendTo(tempdiv).html(leftRightSplit[i]);
        }
    }

    // Save this for later as it'll be helpful in regenerating everything each time a dyndropdown changes
    const prerenderedClone = tempdiv.clone();

    // TODO: answerValues should eventually not be a global that makes it easy for students to grab the correct answers
    // Thankfully it does get zapped right after upload to the server
    console.log(answerValues)
    answerValues = [];
    console.log(answerValues)
    let sim = new SimObject();

    // This will be passed in empty if new or populated from db with only_randoms if previously visited
    // This initializes the list of variables used for problem rendering with the foundational only_randoms
    // and all the others can be derived from only_randoms (or created from scratch as new randoms)
    let vars = new Map(only_randoms);
    let teacherNotifications = renderContainer(tempdiv, custom_math, only_randoms, custom_rounding, null, vars, answerValues, sim);

    tempdiv.children().appendTo($(destination));

    // Preload images (if any)
    // check if vars has variable preloadImages and if it is an array of strings
    if (vars.has("preloadImages")) {
        let images = vars.get("preloadImages");
        // if image is a string, image = array with that string as it's single element
        if (typeof images === 'string') {
            images = [images];
        }
        try {
            images.forEach(function (path) {
                // if path is a string
                if (typeof path === 'string') {
                    // preload the image at "https://www.positivephysics.org/s3_customimages/" + path
                    let img = new Image();
                    img.src = "https://www.positivephysics.org/s3_customimages/" + path;
                }
            });
        } catch (e) {
            console.log("Error preloading images: " + e);
        }
    }

    sim.getTimeVarsFromMathVars(vars);
    sim.buttonExists = $(destination).find(".simbutton").length > 0;

    // Used by both of the following
    sim.refreshDynamic = function () {
        // Get the dyndropdown statements
        let dyndropdown_statements = getDynDropDownStatements(destination);
        dyndropdown_statements.push("tSim = " + sim.t);
        
        let newRenderedDiv = prerenderedClone.clone();

        // This will be passed in empty if new or populated from db with only_randoms if previously visited
        // This initializes the list of variables used for problem rendering with the foundational only_randoms
        // and all the others can be derived from only_randoms (or created from scratch as new randoms)
        let vars = new Map(only_randoms);
        // Don't pass answerValues this time! They don't need to be reupdated!
        renderContainer(newRenderedDiv, custom_math, only_randoms, custom_rounding, dyndropdown_statements, vars, null, sim);
        sim.getTimeVarsFromMathVars(vars);

        newRenderedDiv.find(".refreshable").each(function () {
            const refreshable_id = $(this).data("refreshable_id");
            let this1 = this; // for javascript "closure" so we can reference it below
            $(destination).find(".refreshable").each(function () {
                if ($(this).data("refreshable_id") == refreshable_id) {
                    // First update css if there's a styles data item
                    if ($(this1).data("styles") !== undefined && $(this1).data("styles") !== $(this).data("styles")) {
                        $(this).css($(this1).data("styles"));
                    }
                    // If differences remain, update the whole thing
                    if ($(this1).is("img") && $(this).attr("src") != $(this1).attr("src")) {
                        $(this).attr("src", $(this1).attr("src"));
                    } else if (this.outerHTML != this1.outerHTML) {
                        // If differences remain, update the whole thing
                        $(this).replaceWith(this1);
                    }
                }
            });
        });
    }

    // Reset any existing timers as we will rebuild them
    if (timerId != 0) {
        clearInterval(timerId);
    }

    sim.start = function() {
        // Animation interval
        if (timerId != 0) {
            clearInterval(timerId);
        }
        // if html or custom_math contains a number in time.final, then we will simulate
        if (typeof sim.final == 'number') {
            timerId = setInterval(function () {

                if (!sim.paused) {
                    sim.stepSimForward();
                }
                
            },sim.interval*1000/sim.speedx);
        }
    }

    if (!sim.buttonExists) {
        // This starts the looping simulation if there's no simbutton
        sim.start();
        sim.paused = false;
    } else {
        // It starts paused because there is a visible play button
        sim.paused = true;
    }
    
    sim.reset = function(btn) {
        if (timerId != 0) {
            clearInterval(timerId);
        }
        sim.t = 0;
        sim.refreshDynamic();
        $(".simbutton").prop("disabled", false).html("<i class='fas fa-play'>");
        $(".simResetButton").prop("disabled", true);
        $(".simStepBackBtn").prop("disabled", true);
        $(".simStepFwdBtn").prop("disabled", false);
    }

    // Set up watcher for dyndropdownchanges
    $(destination).on('change', ".dyndropdown", function () {

        // Reset old-style simulate buttons (not the time-based ones)
        // this feature is functionally deprecated as of June 2024 but we have to keep this for backward compatibility
        if ($(this).attr('id') != "dyndropdown_simulate") {
            $("#dyndropdown_simulate").val("0");
        }

        // Reset the simulation time and any time simulation buttons
        sim.reset();

        sim.refreshDynamic();

    });

    return teacherNotifications;
}

function SimObject() {
    this.t = 0; // current time
    this.final = null; // final time
    this.interval = null; // simulation interval
    this.speedx = null; // speed multiplier
    this.buttonExists = false; // sim controls exists (loop if false)
    // this.timerId = 0;
    this.paused = false;
}
SimObject.prototype.getTimeVarsFromMathVars = function(vars) {
    let time = vars.get("time") || null;
    if (time) {
        this.final = time.final || null;
        this.interval = time.interval || 0.1; // default interval is 1/10 second
        this.speedx = time.speedx || 1; // default speed is 1x
    }
}
SimObject.prototype.stepSimForward = function() {
    this.t = this.t + this.interval;
    $(".simStepBackBtn").prop("disabled", false);
    if (this.t*1.000001 > this.final) {
        if (!this.buttonExists) {
            this.t = 0;
        } else {
            // when time limit reached, stop the simulation
            this.t = this.final;
            this.paused = true;
            
            // button statuses 
            $(".simbutton").prop("disabled", true);
            $(".simStepFwdBtn").prop("disabled", true);
        }
    }
    this.refreshDynamic();
}
SimObject.prototype.stepSimBackward = function() {
    if (this.t == this.final) {
        // We want t to be an exact multiple of interval and this forces that in the case we are reversing from the end
        this.t = Math.floor ( (this.t - .00001*this.interval)/this.interval ) * this.interval;
    } else {
        this.t = this.t - this.interval;
    }
    $(".simStepFwdBtn").prop("disabled", false);
    $(".simbutton").prop("disabled", false);
    if (this.t < this.t*.000001) {
        console.log("t is less than zero, setting to zero");
        this.t = 0;
        
        // button statuses 
        $(".simbutton").prop("disabled", false);
        $(".simStepBackBtn").prop("disabled", true);
    }
    this.refreshDynamic();
}

function getDynDropDownStatements(destination) {
    let return_array = [];

    $(destination).find(".dyndropdown").each(function (index) {
        let value_representation = $(this).val();
        if (isNaN(value_representation)) {
            value_representation = '"'+value_representation+'"';
        }
        return_array.push($(this).data("var_name") + " = " + value_representation);
    });

    return return_array;
}

function renderContainer(destination, custom_math, only_randoms, custom_rounding, dyndropdown_statements, vars, answerValues, sim) {
    console.log(destination)
    // Default is a dummy which is really only used for simulation rerendering
    console.log(answerValues)
    answerValues = answerValues || [];

    // ID incrementer
    var next_id = 0;
    function get_next_answer_id() {
        next_id = next_id + 1;
        return "pp-ans-" + next_id;
    }

    // Determine if there are any supermc tags in the html
    var hasSuperMc = false;
    if (destination.find('supermc').length > 0) {
        hasSuperMc = true;
    }
    
    // This is the old simulation button (not time based) that Jack has deprecated
    destination.find('simbtn').each(function (index) {
        var contents = cleanContents($(this).html());

        // Actually replace the item with a span that we will populate in a minute with the correct numbers
        let newNode = $("<button class='simbtn'></button>").replaceAll($(this));
        newNode.html(contents);
        let hiddenDyndropdown = $('<select style="display: none;" class="dyndropdown" id="dyndropdown_simulate"><option value="0">No</option><option value="1">Yes</option></select>');
        // let hiddenDyndropdown = $('<select class="dyndropdown" id="dyndropdown_simulate"><option value="0">No</option><option value="1">Yes</option></select>');
        hiddenDyndropdown.data("var_name", "simulate");
        hiddenDyndropdown.insertAfter(newNode);

        newNode.on("click", function() {
            $("#dyndropdown_simulate").val("1");
            $("#dyndropdown_simulate").change();
        });
    });

    // Search for and handle all v elements, replacing them with the appropriate div
    destination.find('simbutton').each(function (index) {
        // Actually replace the item with a span that we will populate in a minute with the correct numbers
        let newNode = $("<span class='simcontrols'><button class='simbutton'><i class='fas fa-play'></i></button><button disabled class='simResetButton'><i class='fas fa-redo'></i></button><button disabled class='simStepBackBtn'><i class='fas fa-step-backward'></i></button><button class='simStepFwdBtn'><i class='fas fa-step-forward'></i></button></span>").replaceAll($(this));

        newNode.find(".simbutton").on("click", function() {
            $(".simResetButton").prop("disabled", false);
            $(".simStepBackBtn").prop("disabled", false);
            if (!sim.paused) {
                sim.paused = true;
                newNode.find(".simbutton").html("<i class='fas fa-play'>");
            } else if (sim.paused) {
                sim.paused = false;
                sim.start();
                newNode.find(".simbutton").html("<i class='fas fa-pause'></i>");
            }
        });

        newNode.find(".simResetButton").on("click", function() {
            sim.reset();
        });

        newNode.find(".simStepFwdBtn").on("click", function() {
            $(".simResetButton").prop("disabled", false);
            sim.paused = true;
            sim.start();
            newNode.find(".simbutton").html("<i class='fas fa-play'>");
            sim.stepSimForward();
        });

        newNode.find(".simStepBackBtn").on("click", function() {
            sim.paused = true;
            newNode.find(".simbutton").html("<i class='fas fa-play'>");
            sim.stepSimBackward();
        });
    });

    // Search for and handle all dyndropdown elements, replacing them with select elements
    destination.find('dyndropdown').each(function (index) {
        // Do cleanContents but also replace all nbsp with a regular space for good measure
        const re = new RegExp(String.fromCharCode(160), "g");
        var contents = cleanContents($(this).html()).replace(re, " ");

        if (contents.split(/\r?\n/).length > 1) {
            let newNode = $("<span class='pp-tag-v'></span>").replaceAll($(this));
            newNode.html("Error: multi-line dyndropdown tags are not allowed.");
        } else {
            let tag_split_on_colon = contents.split(":");
            if (tag_split_on_colon.length == 2) {
                let var_name = tag_split_on_colon[0].trim();
                // let default_value = firsthalf_split_on_equal[1].trim();
                let select_id = "dyndropdown_" + var_name;

                // Actually replace the item with a select
                let newNode = $('<select class="dyndropdown" id="' + select_id + '">').replaceAll($(this));

                // Split the second half of the tag on commas
                let choices = tag_split_on_colon[1].split(",");
                // for loop for choices
                for (let j = 0; j < choices.length; j += 1) {
                    let isDefaultOption = false;

                    // Regex to parse the first part from the [second] part of each dropdown option
                    const match = choices[j].match(/([^\[]*)(?:\[(.*)\])?/);
                    if (match) {
                        const displaytext = match[1].trim();
                        let valuetext = "";
                        if (typeof match[2] !== 'undefined') {
                            valuetext = match[2].trim();
                            // Detect default option like in "DisplayText [*10]"
                            if (valuetext.startsWith("*")) {
                                isDefaultOption = true;
                                valuetext = valuetext.slice(1);
                            }
                        } else {
                            valuetext = match[1].trim();
                        }
                        
                        // Add option using .text() as a way to automatically add escapes to the html
                        let opt = $('<option/>').attr({ 'value': valuetext }).text(displaytext).appendTo(newNode);
                        if (isDefaultOption) {
                            // Mark option as selected
                            opt.prop('selected', true);
                        }
                    }
                }
                newNode.data("var_name", var_name);

            } else {
                //Poorly formatted tag as there should be one and only one colon
                let newNode = $("<span class='pp-tag-v'></span>").replaceAll($(this));
                newNode.html("Please correctly format the tag... variable : display1 [optional_corresponding_value_1], display2 [optional_corresponding_value_2] ...");
            }

        }
    });


    // Fill variables for dyndropdown values
    // Use the currently generated defaults dropdown options unless dyndropdown_statements was passed in
    if (dyndropdown_statements == null) {
        // These two lines should only run at the initial render but not on the dynamic refresh renders
        dyndropdown_statements = getDynDropDownStatements(destination);
        dyndropdown_statements.push("tSim = 0");
    }
    dyndropdown_statements.forEach(function (statement) {
        try {
            math.evaluate(statement, vars);
        } catch (e) {
            console.log("Error evaluating dyndropdown statement: " + statement);
        }
    });

    // Make an array of DOM objects and math statements that we will populate as we encounter them
    // Later we will evaluate all these statements in the correct order (like desmos) and then possibly place the values into the DOM
    var statements = [];
    if (hasSuperMc) {
        statements.push([null, "superMcSeed = randomInt(999999)"]);
    }

    // Handle custom math, if any, and they make more sense being first
    var custom_maths = custom_math.split(/\r?\n/);
    for (let line of custom_maths) {
        if (line.length > 0 && line[0] != "#") {
            statements.push([null, cleanContents(line)]);
        }
    }

    // Search for and handle all v elements, replacing them with the appropriate div
    destination.find('v').each(function (index) {
        var contents = cleanContents($(this).html());

        // Actually replace the item with a span that we will populate in a minute with the correct numbers
        let newNode = $("<span class='pp-tag-v refreshable'></span>").replaceAll($(this));
        if (contents.split(/\r?\n/).length > 1) {
            newNode.html("Error: multi-line v tags are not allowed.");
        } else {
            statements.push([newNode, contents]);
        }
    });

    // Search for and handle all ans elements, replacing them with answer blanks (input tags)
    destination.find('ans').each(function (index) {
        var contents = cleanContents($(this).html());

        if (contents.split(/\r?\n/).length > 1) {
            let newNode = $("<span class='pp-tag-v'></span>").replaceAll($(this));
            newNode.html("Error: multi-line ans tags are not allowed.");
        } else {
            // Actually replace the item with an input
            let newNode = $('<input type="text" id="' + get_next_answer_id() + '" name="answer" class="allownegative"/>').replaceAll($(this));
            statements.push([newNode, contents]);
        }
    });

    // Zap all empty paragraphs because these are likely hangovers from <m> math expressions that didn't render or <lab> or similar
    // Also zap trailing whitespace and newlines for consistent styling
    destination.find('p').each(function () {
        const $this = $(this);
        if ($this.html().replace(/\s|&nbsp;/g, '').length === 0)
            $this.remove();
    });

    // Bring in arrays used for Chemistry problems
    vars.set("ptable_new", ptable_new);
    vars.set("polyIons_new", polyIons_new);

    // Create custom function that we will use for randoms
    math.evaluate("rand(x,y,z) = format(random(x,y),z)*1", vars);
    // Create custom function for appending random query strings to images
    math.evaluate('refreshgif(url) = concat(url,"?refresh=",string(round(random(10000))))', vars);
    // Create custom functions for accessing chem tables (not the prefered way but necessary for backwards compatibility of existing problems)
    math.evaluate("ptable(i,characteristic) = getTableVal(ptable_new,i,characteristic)", vars);
    math.evaluate("polyIons(i,characteristic) = getTableVal(polyIons_new,i,characteristic)", vars);
    math.evaluate("noComma(x) = x", vars);

    // Evaluate all the statements
    // console.log("pre",statements, vars, only_randoms);
    var evaluateReturn = evaluateStatements(statements, vars, only_randoms);
    var evaluatedStatements = evaluateReturn.evaluated;
    var teacherNotifications = evaluateReturn.teacherNotifications;

    // console.log(evaluatedStatements);
    // Populate all the numbers
    for (let i in evaluatedStatements) {
        let element = evaluatedStatements[i][0];
        let result = evaluatedStatements[i][1];
        let statement = evaluatedStatements[i][2];

        // Sometimes math.js returns a 1 x 1 matrix and we want just the single value from that if possible
        if (result instanceof math.Matrix) {
            let size = math.size(result); // returns e.g. [1,1] for a 1x1 matrix
            let sizeOfSize = math.size(size).get([0]);
            let elementCount = math.prod(size);
            if (elementCount == 1) {
                let idx = new Array(sizeOfSize).fill(0);
                result = result.get(idx);
            }
        }

        if (element !== null && element.hasClass("pp-tag-v")) {
            // newRoundNice follows custom_rounding rules unless statement includes more context for
            // a different number of sig figs
            $(element).html(newRoundNice(result, statement, custom_rounding));
            if (statement.includes("noComma")) {
                element.addClass("noComma");
            }
        } else if (element !== null && element.is("input")) {
            // see newRoundNice note above
            $(element).data("answer", newRoundNice(result, statement, custom_rounding));
        }
    }

    var superMcSeed = vars.get("superMcSeed");

    destination.find('supermc').each(function (index) {
        let contents = cleanContents($(this).html());
        let split = contents.split("\n");
        // split the splits on the first equal sign in each one and also trailing ampersands
        // used to indicate post sort concatenation of units
        let splitsplittrim = split.map(item => splitOnFirstEqualAndTrailingAmpersand(item));

        let correctFound = false;
        let correctAnswer;
        let allWrongAnswers = [];
        let order = "shuffle";
        let total = 26; // only 26 letters in the alphabet
        let error = "";

        // Process all the right hand sides of the equations using mathjs evaluate
        // put the stuff in the correct structures created above
        splitsplittrim.forEach(function (item) {
            if (item.length >= 2 && item[1] != "") {
                let rightHandSide = item[1];
                let leftHandSide = item[0];
                let unitPostSort = (item.length > 2) ? (" "+item[2]) : "";
                // try to evaluate the right hand side
                var result;
                try {
                    result = math.evaluate(rightHandSide, vars);
                } catch (e) {
                    error = error + "Error evaluating ' " + leftHandSide + " = " + rightHandSide + " '. ";
                }
        
                if (leftHandSide == "correct" && correctFound) {
                    error = error + "Multiple correct answers found—please fix this. ";
                } else if (leftHandSide == "correct" && !correctFound) {
                    correctFound = true;
                    // store as [mathjs result, mathjs result with post sort concatenation of units]
                    correctAnswer = [result,result+unitPostSort];
                } else if (leftHandSide == "order") {
                    order = result;
                } else if (leftHandSide == "total") {
                    total = result;
                } else if (leftHandSide.startsWith("wrong")) {
                    allWrongAnswers.push([result,result+unitPostSort]);
                }
            }
        });

        allWrongAnswers = deduplicateArray(allWrongAnswers);

        // Error checking before actually doing the work
        let newNode;
        if (correctFound == false) {
            error = error + "No correct answer found—please fix this. ";
        } else if (allWrongAnswers.length < 1) {
            error = error + "No incorrect answers found—please add some wrong answers. ";
        } else {
            let totalWrongAns = Math.min(total-1, allWrongAnswers.length);

            // Select the correct number of wrong answers
            shuffleArray(allWrongAnswers,superMcSeed);
            let selectedAnswers = allWrongAnswers.slice(0, totalWrongAns);
            selectedAnswers.push(correctAnswer);
            // Dedup again on the off chance that a distractor is equal to the correct answer
            selectedAnswers = deduplicateArray(selectedAnswers);


            if (order == "numerical") {
                // Sort selectedAnswers by the first element in each of the arrays
                selectedAnswers.sort(function(a, b) {
                    const aIsNumber = typeof a[0] === 'number';
                    const bIsNumber = typeof b[0] === 'number';
                
                    // Both are numbers
                    if (aIsNumber && bIsNumber) {
                        return a[0] - b[0];
                    }
                
                    // A is a number, B is a string
                    if (aIsNumber && !bIsNumber) {
                        return -1; // A comes first
                    }
                
                    // A is a string, B is a number
                    if (!aIsNumber && bIsNumber) {
                        return 1; // B comes first
                    }
                
                    // Both are strings
                    if (!aIsNumber && !bIsNumber) {
                        try {
                            return a[0].localeCompare(b[0]);
                        } catch (e) {
                            return -1;
                        }
                    }
                });
            } else {
                // Shuffle once again to ensure correct answer isn't always in the same spot
                shuffleArray(selectedAnswers,superMcSeed+1);
            }

            // Grab the final concatenated string values for each one since that is what we will use
            // we were only really retaining item[0] for sorting purposes!
            selectedAnswers = selectedAnswers.map(item => item[1]);

            // Logic done, now render the html!
            newNode = $("<div class='superMc'>")
            let olNode = $("<ol type='A'>").appendTo(newNode);
            selectedAnswers.forEach(function (item, index) {
                olNode.append($("<li>").html(item));
            });
            let dropdownNode = $('<select id="' + get_next_answer_id() + '" name="answer">').appendTo(newNode);
            // append default option of blank
            dropdownNode.append($('<option value="default"></option>'));
            for (let i = 0; i < selectedAnswers.length; i += 1) {
                let letter = intToCapitalLetter(i);
                dropdownNode.append($("<option>").attr("value", letter).html(letter));
            }
            dropdownNode.data("answer", intToCapitalLetter(selectedAnswers.indexOf(correctAnswer[1])));

        }

        if (error != "") {
            newNode = $("<div></div>").replaceAll($(this));
            newNode.html("<span class='pp-tag-v'>"+error+"</span>");
        } else {
            newNode.replaceAll($(this));
        }

        // bump it up a bit so the orders aren't reused if there's another supermc tag
        superMcSeed = superMcSeed + 2;
    });

    // Search for and handle all symbolicanswer elements, replacing them with answer blanks (input tags)
    destination.find('symbolicanswer').each(function (index) {
        $(this).find('span.pp-tag-v').contents().unwrap();
        var contents = cleanContents($(this).html());

        if (contents.split(/\r?\n/).length > 1) {
            let newNode = $("<span class='pp-tag-v'></span>").replaceAll($(this));
            newNode.html("Error: multi-line symbolicAnswer tags are not allowed.");
        } else {
            // Actually replace the item with an input
            let newNode = $('<input type="text" id="' + get_next_answer_id() + '" name="answer" class="symbolicanswer"/>').replaceAll($(this));
            newNode.data("answer", "sym:"+contents);
        }
    });

    destination.find('ppplot').each(function (index) {
        $(this).find('span.pp-tag-v').contents().unwrap();
        var contents = cleanContents($(this).html());
        let formatErrorText = "Plots must be of format x_start,x_end,optional_y_min,optional_y_max:formula,optional_additional_formula,... with optional :x_axis_title,y_axis_title at the end.";
        let colonsplit = contents.split(":");
        if (!(colonsplit.length >= 2 && colonsplit.length <= 3)) {
            let newNode = $("<span class='pp-tag-v'></span>").replaceAll($(this));
            newNode.html(formatErrorText);
        } else {

            // This next variable can be of the format 1,2 if only defining xmin, xmax
            // but it could also be 1,2,3,4 if defining xmin, xmax, ymin, ymax
            let x_and_optional_y_bounds = colonsplit[0].split(",");

            if (typeof Plotly === 'undefined') {
                let newNode = $("<span class='pp-tag-v'></span>").replaceAll($(this));
                newNode.html("Plotly is not loaded");
            } else if (x_and_optional_y_bounds.length != 2 && x_and_optional_y_bounds.length != 4) {
                let newNode = $("<span class='pp-tag-v'></span>").replaceAll($(this));
                newNode.html(formatErrorText);
            } else {
                let errorContext = "";
                try {
                    let x_start = math.evaluate(x_and_optional_y_bounds[0], vars);
                    let x_end = math.evaluate(x_and_optional_y_bounds[1], vars);

                    // Handle evaluation context stuff
                    // basically the same context... need to clone
                    // so as to not overwrite x in the main scope
                    // if it exists in the main evaluation scope
                    var varClone = new Map(vars);
                    var plotlyData = [];

                    // If the list of expressions is x, sin(x), (4,5)
                    // we only want to split on the first two commas but not a comma inside parentheses as that's a point separator
                    // We do this by temporarily converting commas inside parentheses to semicolons
                    errorContext = colonsplit[1];
                    let expressions = convertCommasInsideParenToSemicolons(colonsplit[1]).split(",");
                    expressions = expressions.map(function (expression) {
                        return expression.replace(/;/g, ",");
                    });
                    errorContext = "";

                    let ymin = null;
                    let ymax = null;
                    let xScatter = [];
                    let yScatter = [];
                    expressions.forEach(function (expression) {
                        errorContext = expression.trim();
                        // If then to determine if this entry is an ordered pair like (1,2) or a function like 3x^2 etc...
                        if (/^\(\s*[^,]+\s*,\s*[^,]+\s*\)$/.test(expression.trim())) {
                            // It's a point in the form (4, 5) so we should treat it as a point instead of an expression
                            let point = expression.trim().slice(1, -1).split(",");
                            // If length of point array is 2 then proceed
                            if (point.length == 2) {
                                // varClone not needed here
                                let x = math.evaluate(point[0], vars);
                                let y = math.evaluate(point[1], vars);
                                xScatter.push(x);
                                yScatter.push(y);
                                if (ymin === null) {
                                    ymin = y;
                                    ymax = y;
                                } else {
                                    ymin = Math.min(ymin, y);
                                    ymax = Math.max(ymax, y);
                                }
                            }
                            
                        } else {
                            // It's a function
                            let expr = math.compile(expression);
                            // By default we will plot it at something between about 35 and 350 steps
                            let stepSize = 10 ** (Math.round(Math.log10(x_end - x_start) - 2.1));
                            const xValues = math.range(x_start, x_end + stepSize, stepSize).toArray();


                            const yValues = xValues.map(function (x) {
                                varClone.set("x", x);
                                return expr.evaluate(varClone);
                            });
                            const trace = {
                                x: xValues,
                                y: yValues,
                                type: 'scatter'
                            };
                            plotlyData.push(trace);

                            // This finds situations where we get crazy high (almost infinite) values
                            // such as when plotting 1/x near 0 and you get a floating point artifact
                            // thats finite but HUGE!
                            let this_function_ymin = Math.min(...yValues);
                            let this_function_ymax = Math.max(...yValues);
                            let absOfyValues = yValues.map(Math.abs);
                            let maxAbsOfyValues = Math.max(...absOfyValues);
                            let secondMaxAbsOfyValues = Math.max(...absOfyValues.filter(val => val !== maxAbsOfyValues));
                            // if maxAbsOfyValues is more than 100x secondMaxAbsOfyValues, then we have a problem
                            if (maxAbsOfyValues > 100 * secondMaxAbsOfyValues) {
                                this_function_ymax = Math.max(Math.min(this_function_ymax, secondMaxAbsOfyValues), -secondMaxAbsOfyValues);
                                this_function_ymin = Math.min(Math.max(this_function_ymin, -secondMaxAbsOfyValues), secondMaxAbsOfyValues);
                            }

                            // Track overall ymin and ymax
                            if (ymin === null) {
                                ymin = this_function_ymin;
                                ymax = this_function_ymax;
                            } else {
                                ymin = Math.min(ymin, this_function_ymin);
                                ymax = Math.max(ymax, this_function_ymax);
                            }
                        }
                    });
                    errorContext = "";
                    if (xScatter.length > 0) {
                        plotlyData.push({ x: xScatter, y: yScatter, type: 'scatter', mode: 'markers' });
                    }

                    let newNode = $("<div>").replaceAll($(this));
                    newNode.addClass("refreshable");
                    // No legend
                    let layout = { showlegend: false, margin: { t: 20, r: 40, b: 80, l: 70 }};
                    // Handle axis titles if provided
                    if (colonsplit.length == 3) {
                        let axis_titles = colonsplit[2].split(",");
                        layout.xaxis = { title: { text: axis_titles[0] } };
                        if (axis_titles.length >= 2) {
                            layout.yaxis = { title: { text: axis_titles[1] } };
                        }
                    }

                    // don't handle infinity or negative infitiny well, maybe user can override y-axes later

                    //
                    // Y-AXIS CALCULATIONS
                    //

                    // Handle auto y scaling to include y=0 in some cases when it wouldn't otherwise
                    if (ymin == 0 & ymax == 0) {
                        var yamin = -10;
                        var yamax = 10;
                    } else if (ymin == ymax) {
                        if (ymin < 0) {
                            var yamin = 1.5 * ymax;
                            var yamax = 0;
                        } else {
                            var yamin = 0;
                            var yamax = 1.5 * ymax;
                        }
                    } else if (ymin >= 0 && ymax > 0 && (Math.abs(ymax - ymin) / Math.abs(ymax) > 0.20)) {
                        var yamin = 0;
                        var yamax = ymax;
                    } else if (ymin <= 0 && ymax < 0 && (Math.abs(ymax - ymin) / Math.abs(ymin) > 0.20)) {
                        var yamin = ymin;
                        yamax = 0;
                    } else {
                        var yamin = ymin;
                        var yamax = ymax;
                    }

                    // Override with user-definited ymin and ymax if x_and_optional_y_bounds has 4 elements
                    if (x_and_optional_y_bounds.length == 4) {
                        yamin = math.evaluate(x_and_optional_y_bounds[2], vars);
                        yamax = math.evaluate(x_and_optional_y_bounds[3], vars);
                    }

                    // Y-axis ticks
                    var yaRange = yamax - yamin;
                    var yaLog = Math.log10(yaRange);
                    var yaLogCeil = Math.ceil(yaLog);
                    var yaScale = Math.pow(10, yaLogCeil);
                    var yarDiv10 = yaRange / yaScale;

                    if (yarDiv10 <= .1) { var ytick = .1 * yaScale }
                    else if (yarDiv10 <= .249) { var ytick = .2 * yaScale / 10 }
                    else if (yarDiv10 <= .49) { var ytick = .5 * yaScale / 10 }
                    else if (yarDiv10 <= 1) { var ytick = 1 * yaScale / 10 }
                    else { var ytick = 7 }

                    var yamaxFinal = Math.ceil(yamax / ytick) * ytick;
                    var yaminFinal = Math.floor(yamin / ytick) * ytick;

                    // Put values into the yaxis layout	
                    layout.yaxis = layout.yaxis || {}; // create if not exists
                    layout.yaxis.range = [yaminFinal - .2 * ytick, yamaxFinal + .1 * ytick]
                    layout.yaxis.dtick = ytick;

                    //
                    // X-AXIS CALCULATIONS
                    //

                    // X-axis ticks
                    var xaRange = x_end - x_start;
                    var xaLog = Math.log10(xaRange);
                    var xaLogCeil = Math.ceil(xaLog);
                    var xaScale = Math.pow(10, xaLogCeil);
                    var xarDiv10 = xaRange / xaScale;
                    if (xarDiv10 <= .1) { var xtick = .1 * xaScale }
                    else if (xarDiv10 <= .249) { var xtick = .2 * xaScale / 10 }
                    else if (xarDiv10 <= .49) { var xtick = .5 * xaScale / 10 }
                    else if (xarDiv10 <= 1) { var xtick = 1 * xaScale / 10 }
                    else { var xtick = 7 };


                    // Put values into the xaxis layout	
                    layout.xaxis = layout.xaxis || {}; // create if not exists
                    layout.xaxis.range = [x_start - .2 * xtick, x_end + .1 * xtick]
                    layout.xaxis.dtick = xtick;

                    //
                    // AXIS CALCULATIONS DONE
                    //

                    // No display mode bar
                    let config = { displayModeBar: false };
                    let plot = Plotly.newPlot(newNode[0], plotlyData, layout, config);

                } catch (err) {
                    console.error(err);
                    // let errMsg = err.toString();
                    let newNode = $("<span class='pp-tag-v'></span>").replaceAll($(this));
                    if (errorContext.trim() != "") {
                        errorContext = "'"+errorContext.trim()+"' ";
                    }
                    newNode.html("Unable to plot. While processing "+errorContext+"this occurred: "+err.toString());
                }
            }

        }
    });

    destination.find('pplatex').each(function (index) {
        // $(this).find('span.pp-tag-v').text("{" + $(this).find('span.pp-tag-v').text() + "}")
        $(this).find('span.pp-tag-v').each(function (i, elem) {
            $(elem).text("{" + $(elem).text() + "}");
        });
        let pptagv_count = $(this).find('span.pp-tag-v').length;
        $(this).find('span.pp-tag-v').contents().unwrap();
        let newNode = $("<span>$$" + $(this).text() + "$$</span>")
        if (pptagv_count > 0) {
            newNode.addClass("pp-tag-v");
        }
        newNode.replaceAll($(this));
    });

    destination.find('bar').each(function (index) {
        const pp_tag_v_count = $(this).find('span.pp-tag-v').length;
        $(this).find('span.pp-tag-v').contents().unwrap();
        var contents = cleanContents($(this).html());
        let formatErrorText = "Bar charts should be of the format firstbar, 10; secondbar, 15 : x-axis-label, y-axis-label";
        let colonsplit = contents.split(":");
        if (colonsplit.length != 2) {
            let newNode = $("<span class='pp-tag-v'></span>").replaceAll($(this));
            newNode.html(formatErrorText);
        } else {
            let axis_titles = colonsplit[1].split(",");
            let item_list = colonsplit[0].split(";");
            if (typeof Plotly === 'undefined') {
                let newNode = $("<span class='pp-tag-v'></span>").replaceAll($(this));
                newNode.html("Plotly is not loaded");
            } else if (axis_titles.length != 2 || item_list.length == 0) {
                let newNode = $("<span class='pp-tag-v'></span>").replaceAll($(this));
                newNode.html(formatErrorText);
            } else {
                try {
                    var plotlyData = [{ x: [], y: [], type: 'bar' }];
                    var ymax = 0; //this will be iteratively updated as we loop so we end up with a true ymax
                    item_list.forEach(function (item) {
                        let item_split = item.split(",");
                        let item_label = item_split[0].trim();
                        if (isNumber(item_label)) {
                            // Using a U+00AD SOFT HYPHEN
                            // which is an invisible character to force
                            // plotly.js to treat numbers as strings
                            item_label = item_label.trim() + "­";
                        }
                        plotlyData[0].x.push(item_label);
                        if (item_split.length > 1) {
                            let item_value = parseFloat(item_split[1]);
                            plotlyData[0].y.push(item_value);
                            // bump up the ymax if a new highest value is discovered
                            ymax = Math.max(ymax, item_value)
                        } else {
                            plotlyData[0].y.push(0);
                        }
                    });

                    let newNode = $("<div>").replaceAll($(this));
                    if (pp_tag_v_count > 0) {
                        newNode.addClass("refreshable");
                    }
                    // No legend, axis titles
                    let xLabel = axis_titles[0].trim();
                    let yLabel = axis_titles[1].trim();
                    let layout = { showlegend: false, margin: { t: 20, r: 40, b: 80, l: 70 }, xaxis: { title: { text: xLabel } }, yaxis: { title: { text: yLabel } } };

                    //
                    // Y-AXIS CALCULATIONS
                    //

                    // If everything is zero at least we have a default ymax
                    if (ymax == 0) {
                        ymax = 10;
                    }
                    // For consistency with the variables used in the other plot
                    var yamin = 0;
                    var yamax = ymax;

                    // Y-axis ticks
                    var yaRange = yamax - yamin;
                    var yaLog = Math.log10(yaRange);
                    var yaLogCeil = Math.ceil(yaLog);
                    var yaScale = Math.pow(10, yaLogCeil);
                    var yarDiv10 = yaRange / yaScale;

                    if (yarDiv10 <= .1) { var ytick = .1 * yaScale }
                    else if (yarDiv10 <= .249) { var ytick = .2 * yaScale / 10 }
                    else if (yarDiv10 <= .49) { var ytick = .5 * yaScale / 10 }
                    else if (yarDiv10 <= 1) { var ytick = 1 * yaScale / 10 }
                    else { var ytick = 7 }

                    var yamaxFinal = Math.ceil(yamax / ytick) * ytick;
                    var yaminFinal = Math.floor(yamin / ytick) * ytick;

                    // Put values into the yaxis layout	
                    layout.yaxis = layout.yaxis || {}; // create if not exists
                    layout.yaxis.range = [yaminFinal - .2 * ytick, yamaxFinal + .1 * ytick]
                    layout.yaxis.dtick = ytick;

                    // No display mode bar
                    let config = { displayModeBar: false };
                    let plot = Plotly.newPlot(newNode[0], plotlyData, layout, config);

                } catch (err) {
                    console.error(err);
                    let newNode = $("<span class='pp-tag-v'></span>").replaceAll($(this));
                    newNode.html("Unable to plot. Error message: "+err.toString());
                }
            }

        }
    });

    // Search for and handle all mc elements, replacing them with select elements
    destination.find('mc').each(function (index) {
        $(this).find('span.pp-tag-v').contents().unwrap();
        // Do cleanContents but also replace all nbsp with a regular space to ensure
        // accurate checking of answers in case the answer choice is an identical-looking variant
        // of the stated correct answer
        const re = new RegExp(String.fromCharCode(160), "g");
        var contents = cleanContents($(this).html()).replace(re, " ");

        if (contents.split(/\r?\n/).length > 1) {
            let newNode = $("<span class='pp-tag-v'></span>").replaceAll($(this));
            newNode.html("Error: multi-line mc tags are not allowed.");
        } else {
            let tag_split_on_colon = contents.split(":");
            if (tag_split_on_colon.length == 2) {
                // Actually replace the item with a select
                let newNode = $('<select id="' + get_next_answer_id() + '" name="answer">').replaceAll($(this));

                let correct_choice = tag_split_on_colon[0];
                newNode.data("answer", correct_choice.trim());

                // Split the second half of the tag on commas
                let choices = tag_split_on_colon[1].split(",");
                // for loop for choices
                for (let j = 0; j < choices.length; j += 1) {
                    // If the first option starts with *, it's not actually an option it's just the default selection
                    if (j == 0 && choices[j].trim().charAt(0) == "*") {
                        // Add option using .text() as a way to automatically add escapes to the html
                        $('<option/>').attr({ 'value': 'default' }).text(choices[j].trim().substring(1)).appendTo(newNode);
                    } else {
                        if (j == 0) {
                            // If it's not starting with a * then we need to insert a blank option as the default option
                            $('<option value="default"></option>').appendTo(newNode);
                        }
                        // Add option using .text() as a way to automatically add escapes to the html
                        $('<option/>').attr({ 'value': choices[j].trim() }).text(choices[j].trim()).appendTo(newNode);
                    }
                }

            } else {
                //Poorly formatted tag as there should be one and only one colon
                let newNode = $("<span class='pp-tag-v'></span>").replaceAll($(this));
                newNode.html("Please correctly format the multiple choice tag... correct : option1, option2, option3");
            }

        }
    });

    // Search for and handle all ppmedia elements, replacing them with select elements
    let ppmedia_count = 0;
    destination.find('ppmedia').each(function (index) {
        let isFirstImage = false;

        // Grab the <lab> style labels and detach them, this is a separate method of labels from the 
        // custom_math overlay labels
        var labels = $(this).find('lab').detach();

        // Evaluate all the v tags and substitute them in before we proceed
        const pp_tag_v_count = $(this).find('span.pp-tag-v').length;
        $(this).find('span.pp-tag-v').contents().unwrap();

        var contents = cleanContents($(this).html());
        var isImage = false;
        var newNode = null;

        if (contents.includes("youtube.com/") || contents.includes("youtu.be/")) {
            var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
            var match = contents.match(regExp);
            var videoID = (match && match[7].length == 11) ? match[7] : false;
            newNode = $('<div class="video-container"><iframe allow="fullscreen;" src="https://www.youtube.com/embed/' + videoID + '"></iframe></div>').replaceAll($(this));
        } else if (contents.includes("vimeo.com/")) {
            var match = contents.match(/(https?:\/\/)?(www\.)?(player\.)?vimeo\.com\/?(showcase\/)*([0-9))([a-z]*\/)*([0-9]{6,11})[?]?.*/);
            if (match && match.length == 7) {
                let videoID = match[6];
                newNode = $('<div class="video-container"><iframe src="https://player.vimeo.com/video/' + videoID + '"></iframe></div>').replaceAll($(this));
            }
            else {
                newNode = $("<span class='pp-tag-v'></span>").replaceAll($(this));
                newNode.html("That vimeo link doesn't work, try again.");
            }
        } else if (contents.includes("://")) {
            // They can't just enter some random url!
            newNode = $("<span class='pp-tag-v'></span>").replaceAll($(this));
            newNode.html("You can't embed from that site yet.");
        } else {
            // It's not a URL so we will proceed assuming it's an image hosted in our s3 bucket
            newNode = $('<div class="image-container"><img src="https://www.positivephysics.org/s3_customimages/' + contents + '"></div>').replaceAll($(this));
            newNode.parent("p").css("text-align", "center");
            isImage = true;
            ppmedia_count++;
            if (ppmedia_count == 1) {
                newNode.addClass("first_ppmedia");
                isFirstImage = true;
            }
        }
        if (pp_tag_v_count > 0) {
            newNode.addClass("refreshable");
        }

        // <lab> style overlay handling (older ones are anchored to upper left in css, newer ones are centered in css using .label-overlay-center)
        if (isImage && labels.length > 0) {
            labels.each(function (index) {
                // The first node will be the text node and should include the x,y: part
                let firstNode = $(this).contents().first();
                // Ensure first node is a textNode (=3)
                if (firstNode.get(0) && firstNode.get(0).nodeType != 3) {
                    //Poorly formatted tag
                    let errNode = $("<div class='label-overlay pp-tag-v' style='top: 50%; left: 50%;'></div>");
                    errNode.html("The label tag should start with regular text (not formatted in any way) E.g. x,y:content");
                    newNode.append(errNode);
                } else {
                    let tag_split_on_colon = firstNode.text().split(":");
                    if (tag_split_on_colon.length == 2) {
                        // Zap the part before the colon as it won't be used in the label
                        firstNode.get(0).textContent = tag_split_on_colon[1];
                        // let labelContentHTML = tag_split_on_colon[1];
                        // Split on commas
                        let xy = tag_split_on_colon[0].split(",");
                        if (xy.length == 2) {
                            let x = parseFloat(xy[0]) || 0;
                            let y = parseFloat(xy[1]) || 0;
                            let contentNode = $("<div class='label-overlay' style='top: " + y + "%; left: " + x + "%;'></div>");
                            if ($(this).hasClass("centered")) {
                                contentNode.addClass("label-overlay-center");
                            }
                            contentNode.append($(this).contents());
                            newNode.append(contentNode);
                        } else {
                            //Poorly formatted tag as there should be one and only one comma before the colon
                            let errNode = $("<div class='label-overlay pp-tag-v' style='top: 50%; left: 50%;'></div>");
                            errNode.html("The label tag should have one and only one comma before the colon. E.g. x,y:content");
                            newNode.append(errNode);
                        }
                    } else {
                        //Poorly formatted tag as there should be one and only one colon
                        let errNode = $("<div class='label-overlay pp-tag-v' style='top: 50%; left: 50%;'></div>");
                        errNode.html("The label tag should have one and only one colon. E.g. x,y:content");
                        newNode.append(errNode);
                    }
                }

            })
        }

        // New overlay code which derives from custom math objects like overlay1, overlay2, etc.
        if (isFirstImage) {
            let imageScaling = vars.get("image") || null;
            let xmin = 0;
            let xmax = 100;
            let ymin = 0;
            let ymax = 100;
            if (imageScaling && imageScaling.x && imageScaling.y) {
                if (imageScaling.x.min != -999) {xmin = imageScaling.x.min;}
                if (imageScaling.x.max != -999) {xmax = imageScaling.x.max;}
                if (imageScaling.y.min != -999) {ymin = imageScaling.y.min;}
                if (imageScaling.y.max != -999) {ymax = imageScaling.y.max;}
            }
            // for i in range(1, 10):
            for (let i = 1; i <= 100; i++) {
                let overlay = vars.get("overlay" + i) || null;
                if (overlay) {
                    // If no position, put it in the middle
                    if (!(overlay.position && overlay.position._data && Array.isArray(overlay.position._data) && overlay.position._data.length == 2)) {
                        overlay.position = { _data: [(xmax+xmin)/2, (ymax+ymin)/2] };
                    }
                    let x = 100*((overlay.position._data[0] || 0)-xmin)/(xmax-xmin);
                    let y = 100 - 100*((overlay.position._data[1] || 0)-ymin)/(ymax-ymin); // flip the y axis so positive is up instead of html standard of down
                    let styles = {"top": y + "%", "left": x + "%"};
                    if ((typeof overlay.display !== undefined) && (overlay.display*1 == 0)) {
                        styles["visibility"] = "hidden";
                    } else {
                        styles["visibility"] = "visible";
                    }
                    let contentNode;
                    if (overlay.hasOwnProperty('text')) {
                        var textToDisplay = "";
                        if (typeof overlay.text != "string") {
                            // convert numeric to string
                            textToDisplay = newRoundNice(overlay.text, "", custom_rounding)
                        } else {
                            textToDisplay = overlay.text;
                        }
                        contentNode = $("<div class='overlay-new'></div>");
                        contentNode.html(textToDisplay);
                    } else if (typeof overlay.image == "string") {
                        contentNode = $("<img class='overlay-new' src='https://www.positivephysics.org/s3_customimages/" + overlay.image + "' >");
                        if (overlay.size && typeof overlay.size == "number") {
                            styles["width"] = overlay.size/Math.abs(xmax-xmin)*100 + "%";
                        } else if (overlay.size && overlay.position._data && Array.isArray(overlay.size._data) && overlay.size._data.length == 2) {
                            styles["width"] = overlay.size._data[0]/Math.abs(xmax-xmin)*100 + "%";
                            styles["height"] = overlay.size._data[1]/Math.abs(ymax-ymin)*100 + "%";
                        } else {
                            // no size defined so default to 20% of width of image
                            styles["width"] = "20%";
                        }
                    } else {
                        // No text or image so don't create a contentNode
                        contentNode = null;
                    }
                    if (contentNode) {
                        // Get the list of keys in object named overlay.styles
                        let transformString = 'translate(-50%, -50%) ';
                        if (overlay.style) {
                            Object.keys(overlay.style).forEach(function(key) {

                                // Check if it's a special css transform
                                if (validCssTransforms.includes(key)) {
                                    if (key === "rotate") {
                                        transformString += `${key}(${overlay.style[key]}rad) `;
                                    } else {
                                        transformString += `${key}(${overlay.style[key]}) `;
                                    }
                                } else {
                                    // Not a css transform so add it to the styles object
                                    // but zindex is renamed as z-index
                                    if (key === "zindex") {
                                        styles["z-index"] = overlay.style[key];
                                    } else {
                                        // key = key but replacing all _ with - so that it's valid css
                                        styles[key.replace(/_/g, "-")] = overlay.style[key];
                                    }
                                }
                            });
                        }
                        try {
                            transformString += `translate(${50-overlay.anchor._data[0]}%, ${-50+overlay.anchor._data[1]}%)`;
                        } catch (e) {
                            // Fail silently if the syntax is bad
                        }
                        
                        styles["transform"] = transformString;

                        contentNode.addClass("refreshable");
                        contentNode.css(styles);
                        contentNode.data("styles", styles)
                        newNode.append(contentNode);
                    }
                }
            }
            
        }

    });

    // Iterate to find all the input and select tags and grab the values out of them so we can populate answerValues
    // TODO: Ultimately, someday it would really be best to replace the whole answerValues.push business where all of this
    // is only stored as a sequential list of answers but instead do an id-based system that won't blow up
    // anytime a teacher adds a new question in the middle of the existing questions.
    // That having been said since we check for accuracy of the stored answers each time using a hash to check that the
    // latest calculated answers are the same as what's on the server, it probably doesn't matter.
    $("[name=answer]", destination).each(function (index) {
        console.log(this)
        answerValues.push($(this).data("answer"));
        // Now zero it out so students don't dig for it in the JS developer console
        
        // we won't have to dig around if we literally reroute the js file
        // sorry bros
        console.log(answerValues)
        console.log($(this).data("answer"));
    });


    // Store unique ids on the refreshable items to make it easy to refresh them later from dyndropdown changes
    let refreshable_id = 0; // counter
    $(".refreshable", destination).each(function (index) {
        $(this).data("refreshable_id", refreshable_id);
        refreshable_id = refreshable_id + 1; // increment counter
    });

    return teacherNotifications;
}

// First converts <br> and similar to newline characters, then strips out all tags
// (helpful in case some had like a <b> or <i> accidentally on part of their equation)
// Finally remove all leading and trailing whitespace
const cleanContents = function(html) {
    // Handle escape characters like for example &nbsp; and turn them into normal un-escaped characters
    html = convertHtmlEscapeChars(html);

    // <br> to /n
    html = html.replace(/<br\s*[\/]?>/gi, "\n");
    // Zap internal tags
    // html = html.replace(/<\/?[^>]+(>|$)/g, ""); // old version
    html = html.replace(/<[a-z_][^>]*>/g, ""); // new version
    // Zap leading and trailing whitespace
    html = html.replace(/^\s+/g, "");
    html = html.replace(/\s+$/g, "");
    return html;
}

// Utility function to convert html escape characters
const convertHtmlEscapeChars = function(str) {
    // check if string contains an ampersand
    if (str.indexOf("&") == -1) {
        return str;
    } else {
        return $('<textarea />').html(str).text();
    }
}

// Iteratively goes through the statements skipping ones it can't yet compute
// then looping through again until all are computed
const evaluateStatements = function(statements, vars, only_randoms) {
    // shallow copy so we don't mess with the original array
    statements = [...statements];
    // Place to store evaluated statements when we pop them off the statements
    var evaluated = [];
    // Pass counter out of curiousity
    var passes = 0;
    // Initialize
    var continueLooping = true;
    // Teacher notifications are problems or issues that teachers should be told about but hidden from students
    // It starts as an empty array
    var teacherNotifications = [];

    // These are sim variables that we will autocreate if for example time.___ is
    // referenced before the object exists in mathjs vars...
    // The key is the variable name and the value is the string that will be evaluated with some
    // initial object structure included in it
    const varsToAutoCreate = new Map();
    varsToAutoCreate.set("image", "{x: {min: -999, max: -999}, y: {min: -999, max: -999}}");
    varsToAutoCreate.set("time", "{}");
    // overlay1 through overlay100
    for (let i = 1; i <= 100; i++) {
        varsToAutoCreate.set("overlay" + i, "{anchor: [50,50], style: {}}");
    }

    // Loop until done
    while (continueLooping && passes < 100) {
        // We will change this if we have success in evaluating at least one statement this loop
        continueLooping = false;

        // Mostly for debugging purposes
        passes = passes + 1;
        //console.log("eval pass "+passes+":"); // uncomment for debugging

        // Try to evaluate all the statements that remain unevaluated
        for (let i in statements) {
            var statement = statements[i][1];

            // Handle problems that arise when a nonbreaking space or zero width space (etc.) somehow appears in the statement
            if (statement) {
                statement = statement.replace(/[\u00A0\u1680​\u180e\u2000-\u2009\u200a​\u200b​\u202f\u205f​\u3000]/g, ' ');
            }

            if (statement !== null) {
                // We need to see if there's an equals sign because this is part of how
                // we guarantee immutability of variables: once set, never changed
                // But first we pull out the == and replace with unicode ⩵ so they don't match
                // in the regex.
                let splitStatementOnEquals = statement.replaceAll("==", "⩵").split(/=([^=].*)/s, 2);
                // if (splitStatementOnEquals.length > 2) {
                //     console.log("error: too many = signs in a single statement");
                // } else {
                var rightHandSide = null; // this will always be the part that's being evaluated
                var leftHandSide = null; // optionally what is the left hand side if there's an = sign
                if (splitStatementOnEquals.length == 2) {
                    rightHandSide = splitStatementOnEquals[1].replaceAll("⩵", "==").trim();
                    leftHandSide = splitStatementOnEquals[0].replaceAll("⩵", "==").trim();
                } else {
                    rightHandSide = splitStatementOnEquals[0].replaceAll("⩵", "==").trim();
                }

                // does the right hand side match rand___( or pickRandom( for inclusion of a random function?
                var isRandStatement = false;
                if (/rand\w*? *\(/g.test(rightHandSide) || /pickRandom *\(/g.test(rightHandSide)) {
                    isRandStatement = true;
                }

                // Part of immutability code, we need to see if the left hand side already matches something in the vars map
                var variableIsAlreadySet = vars.has(leftHandSide);

                // Begin immutability code plus override of randoms received from the server
                if (variableIsAlreadySet && !isRandStatement) {
                    // console.log("error: immutability violation for statement '" + statement + "': you cannot change a variable that's already set.");
                    teacherNotifications.push("Error: immutability violation for statement '" + statement + "': you cannot change a variable that's already set. Check to make sure you set each variable only ONCE throughout the whole problem.");
                } else if (!variableIsAlreadySet) {
                    try {
                        let evalResult;
                        try {
                            // Short circuit math.evaluate for speed purposes whenever possible
                            if (statement.length > 0 && statement[0] == '"' && statement.match(/^\"[^\"]*\"$/)) {
                                // just a simple string
                                evalResult = statement.slice(1, -1);
                            } else {
                                evalResult = math.evaluate(statement, vars);
                            }
                        } catch (error) {
                            // if error.toString is like "Error: Undefined symbol ___" then get a variable containing ___ and check if it's one
                            // of the objects that we want to autocreate
                            let errorString = error.toString();
                            let match = errorString.match(/Error: Undefined symbol (\S+)/);
                            if (match) {
                                let varName = match[1];
                                // if varName in varsToAutoCreate then proceed
                                if (varsToAutoCreate.has(varName) && (new RegExp(varName+"\..*=").test(statement))) {
                                    math.evaluate(varName+" = "+varsToAutoCreate.get(varName), vars);
                                    evalResult = math.evaluate(statement, vars);
                                    if (evalResult === undefined) {
                                        throw error;
                                    }
                                } else {
                                    throw error;
                                }
                            } else {
                                throw error;
                            }  
                        }
                        // 1. Check to make sure it doesn't come back as just a unit without a value
                        // this matters in case you have "t" for time as a variable but it thinks it might interpret it as ___tons
                        // or just a unit without a value
                        // 2. also make sure it doesn't come back as a function reference without completion
                        if (!(typeof evalResult === 'object' && evalResult.isUnit) &&
                            !(typeof evalResult === 'function')) {
                            // We found at least one numeric answer this loop so we should possibly keep going
                            continueLooping = true;
                            // Push to the evaluated list
                            // [HTML element, result, statement]
                            evaluated.push([statements[i][0], evalResult, statement]);
                            // Null it out from the unevaluated list
                            statements[i][1] = null;
                            // If it's got rand___( on the right hand side, store it in one additional map
                            // so we know what to keep on the server for the next time it's visited
                            if (isRandStatement) {
                                let val = vars.get(leftHandSide);
                                // Unwrap a math.js Dense Matrix into an array for server-side storage
                                if (typeof val === 'object' && val !== null) {
                                    if (val.isDenseMatrix) {
                                        val = val.toArray();
                                    }
                                }
                                only_randoms.set(leftHandSide, val);
                            }
                        } else if (typeof evalResult === 'function' && passes == 1) {
                            // We owe it another chance through the eval loop because perhaps the function now being defined
                            // will make everything work on the second pass
                            continueLooping = true;
                        } else if (typeof evalResult === 'object' && evalResult.isUnit) {
                            if (leftHandSide) {
                                // If the result is a unit json instead of just a number, and if there is a leftHandSide,
                                // we should zap that entry from the vars
                                vars.delete(leftHandSide);
                            }
                        }
                    } catch (error) {
                        // These errors are no problem and can be ignored! They are raised because math.js wasn't **yet** able to evaluate
                        // but give it time and it'll work out on a subsequent loop.
                        // Uncomment the following line to debug
                        // console.log("passing on statement: "+statement + " - " + error);
                        // console.log(error);
                    }
                } else if (variableIsAlreadySet && isRandStatement) {
                    // Do nothing and just skip this one! The server already sent a random and we leave it as is.
                    evaluated.push([statements[i][0], vars.get(leftHandSide), statement]);
                    // Mark as complete
                    statements[i][1] = null;
                }
            }
        }

        // This is a fancy bit of code that injects g = gravm and vvar = vvar
        // but only once it's solved as far as it can, and only if they remain undefined
        // this allows users to override g and vvar, but if mathjs can't solve for them
        // then we put in the defauls here and let it continue solving
        if (!continueLooping) {
            if (!vars.has("g")) {
                if (gravm) {
                    vars.set("g", gravm);
                } else {
                    console.log("using default for g instead of gravm");
                    vars.set("g", 9.81);
                }
                continueLooping = true;
            }
            if (!vars.has("vvar")) {
                // vvar is a global
                if (vvar) {
                    vars.set("vvar", vvar);
                } else {
                    console.log("using default for vvar instead of custom");
                    vars.set("vvar", 1);
                }
                continueLooping = true;
            }
        }
    }
    // console.log(evaluated.length + " statements successfully evaluated and " + (statements.length - evaluated.length) + " unsuccessful due to missing information or immutability conflict")

    // Deduplicate teacher notifications
    teacherNotifications = Array.from(new Set(teacherNotifications));

    return {
        evaluated: evaluated,
        teacherNotifications: teacherNotifications
    };
}

const isNumber = function(str) {
    if (typeof str != "string") return false
    return !isNaN(str) && !isNaN(parseFloat(str))
}

const convertCommasInsideParenToSemicolons = function(str) {
    let depth = 0;
    let result = '';
    for (let i = 0; i < str.length; i++) {
        if (str[i] === '(') {
            depth++;
        } else if (str[i] === ')') {
            depth--;
            if (depth < 0) {
                throw new Error('Unmatched closing parenthesis');
            }
        }
        if (str[i] === ',' && depth > 0) {
            result += ';';
        } else {
            result += str[i];
        }
    }
    if (depth > 0) {
        throw new Error('Unmatched opening parenthesis');
    }
    return result;
}

const validCssTransforms = [
    'matrix',
    'translate',
    'translateX',
    'translateY',
    'scale',
    'scaleX',
    'scaleY',
    'rotate',
    'skewX',
    'skewY',
    'matrix3d',
    'translate3d',
    'translateZ',
    'scale3d',
    'rotate3d',
    'rotateX',
    'rotateY',
    'rotateZ',
    'perspective'
];

// Function to shuffle an array a seed (copilot generated)
const shuffleArray = function(array, seed) {
    let random = seededRandom(seed);
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Seeded random generator function (copilot generated)
const seededRandom = function(seed) {
    var m = 0x80000000,
        a = 1103515245,
        c = 12345;
    seed = seed & (m - 1);
    return function() {
        seed = (a * seed + c) % m;
        return seed / m;
    };
}

// 0 => A, 1 => B, 2 => C, etc.
const intToCapitalLetter = function(int) {
    return String.fromCharCode(65 + int);
}

const deduplicateArray = function(array) {
    let retVal = [];
    let toStrings = [];
    array.forEach(function(item){
        let str = item.toString();
        if (!toStrings.includes(str)) {
            toStrings.push(str);
            retVal.push(item);
        }
    });
    return retVal;
}

const splitOnFirstEqualAndTrailingAmpersand = function(str) {
    let index = str.indexOf('=');
    if (index === -1) return [str]; // Return the original string in an array if '=' is not found

    let firstPart = str.substring(0, index);
    let secondPart = str.substring(index + 1);

    // Now try to split on a trailing ampersand without any quotes after it
    let secondSplit = secondPart.split(/&([^'"]+)$/s);
    if (secondSplit.length > 1) {
        return [firstPart.trim(), secondSplit[0].trim(), secondSplit[1].trim()];
    }

    return [firstPart.trim(), secondPart.trim()];
}

const simpRules = [...(math.simplify.rules)];
// for some reason, the current version of mathjs is missing this very simple rule!
simpRules.push('sqrt(n1) -> n1^0.5');

const checkSymbolicEquality = function(a, b) {
    let aStr = insertAssumedMultiplication(a);
    let bStr = insertAssumedMultiplication(b);
    try {
        return math.symbolicEqual(math.simplify(aStr,simpRules), math.simplify(bStr,simpRules));
    } catch (e) {
        console.log("symbolic equality error: " + e);
        return false;
    }
}

// This has to be ordered such that longer function names come first!! otherwise the match will be wrong
const mathjs_function_list_regex = /(derivative|factorial|expm1|floor|log10|log1p|round|sqrtm|gamma|acosh|acoth|acsch|asech|asinh|atan2|atanh|cbrt|ceil|log2|sign|sqrt|expm|acos|acot|acsc|asec|asin|atan|cosh|coth|csch|sech|sinh|tanh|abs|exp|fix|gcd|lcm|log|mod|pow|cos|cot|csc|sec|sin|tan)\(/;

const insertAssumedMultiplication = function(str) {
    return insertAssumedMultiplicationWithFunctions(str).replace(/(\))(?=[a-z])/gi, '$1*');
}

// this is a recursive function!
const insertAssumedMultiplicationWithFunctions = function(str) {
    // find first matching function
    const match = str.match(mathjs_function_list_regex);
    if (!match) {
        return insertAssumedMultiplicationNoFunctions(str);
    } else {
        const index = match.index;
        const length = match[0].length;
        return insertAssumedMultiplicationNoFunctions(str.substring(0, index)) + match[0] + insertAssumedMultiplicationWithFunctions(str.substring(index + length));
    }
}

const insertAssumedMultiplicationNoFunctions = function(str) {
    // temporarily replace sqrt
    // Any time there are two letters in a row in the str, insert an asterisk between them
    return str.replace(/([a-z])(?=[a-z])/gi, '$1*');
}