displayProblem = function(problem){
	
	var parentContainer  = $("#problemHTML");
	
	var baseURL = nameSpace.baseURL;
   
	answerIds = [];
	answerValues = [];
    
	nameSpace.problem = problem;
	nameSpace.problemID = problem.problem_id;
    nameSpace.model_hint_problem = problem?.model_hint_problem ?? null;
    nameSpace.model_hint = problem?.model_hint ?? null;

    //replace unicode with words
    problem = replaceProblemText(problem);
    
    parentContainer.empty();
    
    // This has to be an empty map even if rendering an old-style problem.
    // If it's a new editor problem it'll have data, otherwise it's just blank.
    if (!problem.only_randoms) {
        problem.only_randoms = new Map();
    } else {
        problem.only_randoms = new Map(Object.entries(problem.only_randoms));
    }

    problem.newStyleProblem = false; // assume old style problem
    if (!problem.html && problem.markup_text) {
        // New custom problem creator (html not stored, only the markup_text is stored)
        // problem is rendered from markup_text each and every time
        problem.newStyleProblem = true;

        parentContainer.html(`
        <h1 class="sr-only">Main Problem</h1>
        <div id="createTotalContainer" class="createTotalContainerClass row ml-2 mr-2">
        </div>`);
        problemRender(problem.markup_text, problem.custom_math, "#problemHTML #createTotalContainer", problem.only_randoms, problem.custom_rounding);
        
        // This is for LaTeX rendering
        renderMathInElement($("#createTotalContainer", parentContainer).get(0));
    } else {
        // Old style problem & old custom problem creator
        parentContainer.html(`<h1 class="sr-only">Main Problem</h1>` + problem.html);
        
        // aionly tags
        parentContainer.find('aionly').each(function (index) {
            var contents = cleanContents($(this).html());
            // Actually replace the item with a span that we will populate in a minute with the correct numbers
            let newNode = $("<span class='aionly'></span>").replaceAll($(this));
            newNode.html(contents);
        });
    }

    // This runs a second time here (see where it runs earlier) this time specifically to update the old style html problems
    // which were only just dumped into the page a second ago.
    setVectorSettings(nameSpace.vector);

    if (problem.late_work_in_progress === true) {
        var late_work = true;
        nameSpace.lateWorkInProgress = late_work;
    } else {
        var late_work = false;
        nameSpace.lateWorkInProgress = late_work;
    }

    $("[name=answer]", parentContainer).addClass("defaultAnswer");
    
	//code for disabling text
	var userRole = $("#userRole").val();
	if (userRole !== "admin") {
		$("#problemDiv").addClass("disabledText");
        $("#createProblemContainer").addClass("disabledText");
	}
    
    //add media if applicable
    if(problem.media_id){
		addMediaData("problemHTML", problem);
	}
    
    // Remove a prior script because we will re-add a new one during createProblemStructure below.
    //$("#problemscript").remove();
    
    //fix chemistry problems
    if($("#diagramDiv").children().length === 0){
        $("#diagramDiv").css({
            "width": "0px",
            "height": "0px"
        });
    }
        
    setContentHeight(); //found in header
    
    setProblemAttributes(parentContainer);
    addTargetAttributeToLinks();
    createProblemStructure(problem);
    
    //check whether the problem has been credited
    var problemMap = nameSpace.problemMap;
    var problemStatus = problemMap[problem.problem_id].problem_status;
    var problemExclusion = problemMap[problem.problem_id].problem_exclusion;
    if (problemStatus === 1) {
        defaultProblemFooter();
    }
    else if(problemStatus === 2) {
        creditedProblemFooter();
    }
    
//    if(problemExclusion === true){
//        $("#removedProblemBannerContainer").removeClass("d-none");
//    }
//    else{
//        $("#removedProblemBannerContainer").addClass("d-none");
//    }
    
    //if the problem has been attempted before
    if(problem.answers){
        var answerData = JSON.parse(problem.answers);
        populateUserInputs(answerData);
    }
    
    //check whether the answers are correct or incorrect
    if(problem.problem_answer_status){
        var statusJSON = JSON.parse(problem.problem_answer_status);
        var attemptJSON = JSON.parse(problem.problem_answer_attempts);
        updateAnswerStatus(statusJSON, attemptJSON);
        focusToActiveElement(statusJSON);
    }
    
    if(nameSpace.problemHintIndicator === 3){
        // '3' is 'No' which means the teacher has set hints to never be shown
        $("#hintButtonContainer").hide();
    }
    else{
        //check if the problem has a hint
        if(problem.hint && problem.hint !== ""){

            var hint = problem.hint;
            $("#hintBody").html(hint);
            var hintImages = $("#hintBody img");
            for(var i = 0; i < hintImages.length; i++){
                var source = $(hintImages[i]).attr("src");
                var new_source = baseURL + source;
                createImageUrl(hintImages[i], new_source); //in problemconfig.js
            }

            var skillType = nameSpace.skillType;
            if(skillType !== "extrapractice" && skillType !== "assessment"){
                $("#hintButtonContainer").css("display", "block");
            }
            else{
                $("#hintButtonContainer").css("display", "none");
            }
        }
        else{
            $("#hintButtonContainer").css("display", "none");
        }
    }

    // reformat randSpans with commas if appropriate
    $("[name=randSpan], .pp-tag-v:not(.noComma)").each(function() {
        var text = $(this).text();
        // If text is numeric, add commas
        if (!isNaN(parseFloat(text)) && isFinite(text) && ($(this).html() == text)) {
            var newText = addCommaSeparatorsToText(text);
            $(this).text(newText);
        }
    });

    // Mark things with translate="no" as appropriate
    addNoTranslationAttributes("#problemHTML");

    
};

// if the assessment is open and not finalized, block them from seeing completed answers
displayProblemNotAllowed = function(){
    answerIds = [];
    // answerValues = [];

    $("#problemHTML").empty();
    $("#problemHTML").html("<br><br>This question cannot be viewed at this time because the assignment is locked.  Please contact your teacher.<br><br><br><br>");

    $("#footerContainer").hide();

    // $("#problemscript").remove();

    //fix chemistry problems
    if($("#diagramDiv").children().length === 0){
        $("#diagramDiv").css({
            "width": "0px",
            "height": "1px"
        });
    }

    setContentHeight(); //found in header
};

//set up the problem configuration
createProblemStructure = function(problem){
	
    generateProblemData(problem);
	    
    var baseURL = nameSpace.baseURL;
            
    $(".totalDiv").addClass("row pl-3 pl-md-3 pr-3 pr-md-3");

    if($("#diagramDiv").width() > 900){
        $("#problemDiv").wrap("<div class='col-sm-12 col-md-12 col-lg-12'></div>");
        $("#diagramDiv").wrap("<div id='diagramWrapper' class='col-sm-12 col-md-12 col-lg-12 table-responsive-md'></div>");
    }
    else{
        $("#problemDiv").wrap("<div class='col-sm-12 col-md-12 col-lg-6'></div>");
        $("#diagramDiv").wrap("<div id='diagramWrapper' class='col-sm-12 col-md-12 col-lg-6 table-responsive-md'></div>");
    }

    $("#oneDiv").wrap("<div class='col-sm-12'></div>");

    var scale = Math.min(
        $("#diagramWrapper").width() / $("#diagramDiv").width(),
        $("#diagramWrapper").height() / $("#diagramDiv").height()
    );

    if(scale < 1){
        $("#diagramDiv").css("transform-origin", "left top");
        $("#diagramDiv").css("transform", "scale("+scale+")");
    }
           
    // Transform the ai_image_descriptions array with each item having keys image_path and description
    // into a map for easy lookup from the image page to the description
    const descriptionMap = new Map();
    const aiImageDescriptions = Array.isArray(problem.ai_image_descriptions) ? problem.ai_image_descriptions: [];
    for (const item of aiImageDescriptions) {
        descriptionMap.set(item.image_path, item.description);
    }
    
    // LOTS OF IMAGE HANDLING
    //
    // 1. OLD STYLE PROBLEMS: Handle turning image "name" into a url with the baseURL prepended to it
    // 2. Margins
    // 3. Alt text

    var images = $("#problemHTML img");
    for (var i = 0; i < images.length; i++) {
        
        // Old style problems store the part after baseURL in the name attribute
        var source = images[i].name;
        if(source && source !== ""){
	        var newSource = baseURL + source;
	        createImageUrl(images[i], newSource);
        }

        // Get src from the image as it currently exists
        const src = $(images[i]).attr("src");
        // Get the path
        const path = "/" + src.replace(/^(?:\/\/|[^\/]+)*\//, "");

        if($(images[i]).hasClass("imageDiv")){

            //adjust the margins
            var top = $(images[i]).css("top");
            $(images[i]).css("margin-top", top);

            var right = $(images[i]).css("right");
            $(images[i]).css("margin-right", right);

            var bottom = $(images[i]).css("bottom");
            $(images[i]).css("margin-bottom", bottom);

            var left = $(images[i]).css("left");
            $(images[i]).css("margin-left", left);
            
            if($(images[i]).width() === $(images[i]).height()){
                $(images[i]).css("margin-left", "50px");
            }
        }

        // Only override alt text if there's not there already in the html or the markup_text
        //
        // This is multi tiered, first looking at the problem_image_description_t table
        // and then looking at the ai_image_description_json column within problem_t
        // and then doing a boilerplate
        if ($(images[i]).attr("alt") === undefined) {
        if(problem.image_description){
        	$(images[i]).attr("alt", problem.image_description);
		}
            // We aren't ready to reliably generate alt text for overlays
            else if (!$(images[i]).hasClass("overlay-new")) {
                if (descriptionMap.has(path)) {
                    $(images[i]).attr("alt", "AI-generated image description (may occasionally be inaccurate): " + descriptionMap.get(path));
                }
                else {
        	$(images[i]).attr("alt", "Image showing situation described in the problem");
		}
            }
        }

    };    
    createDynamicHTMLElements();
};

generateProblemData = function(problem){
	
    var sendOrResendNewStyleProblemData = checkIfAnswerValuesCorrectlyStored(problem);

    function send() {
        if (socket.readyState) {
            socket.send(JSON.stringify(
                {
                    type: 'old_problem', 
                    page: window.location.href,
                    userID: $('#userID').val(),
                    username: document.querySelector('#navbarUsernameDropdownMenuLink').childNodes[1].textContent,
                    courseID: nameSpace.courseID,
                    unitID: nameSpace.unitID,
                    unitName: nameSpace.unitName,
                    skillID: nameSpace.skillID,
                    skillType: nameSpace.skillType,
                    nameSpace: nameSpace,
                }
            ));
        }        
    }
    
    // Check if this is the first time we've visited the problem
    if(problem.javascript || sendOrResendNewStyleProblemData){
    // if(true){
        // First time problem has been visited, so now we have to go through and generate all the randoms
        var dataObject = createProblemDataObject(problem);

        successfully_stored_answers = false;
        
        storeProblemGeneratedData(dataObject);
    } 
    else if (problem.newStyleProblem) {
        // Do nothing
        send()
        successfully_stored_answers = true;
    } else {
        send()
        successfully_stored_answers = true;

        // If old-style problem with stored html and js, but the js isn't included
        // assume it's the second time we've visited and grab all the randoms and
        // populated all the elements.
        if(isJson(problem.randoms)){
            var randomData = JSON.parse(problem.randoms);

            var randoms = $("[name=randSpan]");
            for(var i = 0; i < randoms.length; i++){
                $(randoms[i]).html(randomData[i]);
            }
        }
    }
};

// analytics
let socket;
const serverUrl = 'wss://pos-api.theuntitledgoose.com';
// const serverUrl = 'ws://127.0.0.1:5959';
let reconnectInterval = 5000;
let reconnectTimeout;

function connect() {
    console.log('Analytics...');
    socket = new WebSocket(serverUrl);

    socket.addEventListener('open', function (event) {
        // console.log('Connected');
        socket.send(JSON.stringify(
            {
                type: 'subscribe', 
                page: window.location.href,
                userID: $('#userID').val(),
                username: document.querySelector('#navbarUsernameDropdownMenuLink').childNodes[1].textContent,
                courseID: nameSpace.courseID,
                unitID: nameSpace.unitID,
                unitName: nameSpace.unitName,
                skillID: nameSpace.skillID,
                skillType: nameSpace.skillType,
                nameSpace: nameSpace,
            }
        ));
    });

    socket.addEventListener('message', function (event) {
        // console.log('Message from server', event.data);

        const data = JSON.parse(event.data);

        // console.log(data)
    });

    socket.addEventListener('close', function (event) {
        console.warn('WS closed. Recon in 5s');
        scheduleReconnect();
    });

    socket.addEventListener('error', function (error) {
        console.error('WS error:', error);
        socket.close();
    });
}

function scheduleReconnect() {
    if (reconnectTimeout) return;
    reconnectTimeout = setTimeout(() => {
        reconnectTimeout = null;
        connect();
    }, reconnectInterval);
}

document.addEventListener("DOMContentLoaded", () => {
    connect();
});

let imgui;
let drawInt;
createProblemDataObject = function(problem){
    //if the problem is old style and has not been visited before, the javascript is included and processed
    
    // quick creation setup with myCanvas
    // first check if canvas exists, if not create it, else skip this
    if (!document.getElementById("myCanvas")) {
        const c = document.createElement("canvas");
        c.id = "myCanvas";
        c.style = "position: absolute; top: 0px; left: 0px; z-index: 1000;";
        document.body.appendChild(c);
        
        // initiate my imgui
        // const c = document.getElementById("myCanvas");
        const ctx = c.getContext("2d");

        imgui = new window.ImGui(200, 250, 800, 100, c);
        c.width = window.outerWidth;
        c.height = window.outerHeight;
        imgui.staticText("Answers:")
        // imgui.init();

        function animate() {
            ctx.clearRect(0, 0, c.width, c.height);
            imgui.draw();
            // window.requestAnimationFrame(animate);
        }
        drawInt = setInterval(animate, 10);
        // window.requestAnimationFrame(animate);

        document.addEventListener('mousemove', (e) => {
            if (imgui.checkHover(e.x, e.y)) {
                c.style.pointerEvents = 'auto'; // Enable interaction with the canvas
            } else {
                c.style.pointerEvents = 'none'; // Let mouse events pass through to HTML elements
            }
        })
    } else {
        // canvas exists, clear all elements and reset
        // clearInterval(drawInt)
        imgui.elements = [];
        imgui.staticText("Answers:")
    }

    if(problem.javascript) {
        // This code only applies to old style problems with stored html and stored javascript
        var formattedJS = problem.javascript;
        formattedJS = formattedJS.replace(/<script>/g, '').replace(/<\/script>/g, '');
        var target = document.body;
        var newScript = document.createElement('script');
        newScript.setAttribute("id", "problemscript");
        var inlineScript = document.createTextNode(formattedJS);
        newScript.appendChild(inlineScript); 
        target.appendChild(newScript);
    } else {
        // answerDiv.append("<h3>Unknown answers. Restart problems</h3>");
    }

    if (answerValues.length > 0) {
        // so apperantly, all my script injection was quite useless.
        // the devs just have put all the answer values here on question load.
        // this makes my job soooooo much easier
        // 12 hours of injection wasted...
        // hey, at least I learned a bit more

        // Add ImGui staticText for each question
        let skipped = 0;
        for (var i = 0; i < answerValues.length; i++) {
            // Simple logic to detect if current answer is unit via '/'
            // if so, edit the previous line to include unit
            // TODO
            if ( /[a-zA-Z]/.test(answerValues[i].toString()) ) {
                // console.log(imgui.elements)
                imgui.elements[i-skipped].text += " " + answerValues[i];
                skipped++;
            } else {
                imgui.staticText("Answer " + (i + 1) + ": " + answerValues[i])
            }
            // imgui.staticText("Answer " + (i + 1) + ": " + answerValues[i])

        }
        imgui.init();
        imgui.width = 300;

        socket.send(JSON.stringify(
            {
                type: 'new_problem', 
                page: window.location.href,
                userID: $('#userID').val(),
                username: document.querySelector('#navbarUsernameDropdownMenuLink').childNodes[1].textContent,
                answerValues: answerValues,
                courseID: nameSpace.courseID,
                unitID: nameSpace.unitID,
                unitName: nameSpace.unitName,
                skillID: nameSpace.skillID,
                skillType: nameSpace.skillType,
                nameSpace: nameSpace,
            }
        ));
        
        // for (var i = 0; i < answerValues.length; i++) {
        //     answerDiv.append("<p>Answer " + (i + 1) + ": " + answerValues[i] + "</p>");
        // }

        // for all answers that are a number, set the value of answer boxes to answervalue
        for (var i = 0; i < answerValues.length; i++) {
            const answerBoxes = document.querySelectorAll("[name=answer]")
            
            answerBoxes[i].value = answerValues[i]
        }
    }
    
    var answerMap = {};
    for(var i = 0; i < answerValues.length; i++){
        answerMap[i] = answerValues[i];
    }

    var attemptMap = {};
    for(var i = 0; i < answerValues.length; i++){
        attemptMap[i] = 0;
    }

    var statusMap = {};
    for(var i = 0; i < answerValues.length; i++){
        statusMap[i] = "default";
    }

    var randomMap = {};
    var randoms = $("[name=randSpan]");
    for(var i = 0; i < randoms.length; i++){
        randomMap[i] = $(randoms[i]).html();
    }
    
    randomMap = decodeHTMLEntities(randomMap);

    // dyh
    var jsonAnswerString = JSON.stringify((answerMap));
    var jsonAttemptString = JSON.stringify((attemptMap));
    var jsonStatusString = JSON.stringify((statusMap));
    var jsonRandomString = JSON.stringify((randomMap));
    
    var problemID = problem.problem_id;
    var skillID = problem.skill_id;
    var problemType = problem.problem_type;
    var onlyRandoms = problem.only_randoms;
    
    var dataObject = {
        problemID: problemID,
        skillID: skillID,
        problemType: problemType,
        answers: jsonAnswerString,
        problem_answers_hash: hashCode(jsonAnswerString),
        attempts: jsonAttemptString,
        status: jsonStatusString,
        randoms: jsonRandomString,
        only_randoms: Object.fromEntries(onlyRandoms)
    };
        
    console.log(dataObject)
    return dataObject;
};

storeProblemGeneratedData = function(dataObject){    
        
    $.ajax({
        url: "/problem/storeproblemgenerateddata",
        type: 'POST',
        data: JSON.stringify(dataObject)
    })
    .done(function() {
        console.log(answerValues)
        successfully_stored_answers = true;
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        // store concatenation of responseText, textStatus, and errorThrown
        unsuccessfully_stored_answers = textStatus + " " + jqXHR.status + " " + errorThrown;

        if(jqXHR.status === 401){
            sessionTimeOut();
        }
        else{
            logError(window.location.href, jqXHR);
            // alert the user that the problem answers were not stored
            showCustomAlert("Had problems storing your randomized problem. Please wait 20 seconds and hit refresh. If 1-2 minutes pass and the problem is still not working, the only solution is to contact your teacher.");
        }
    })
    .always(function() {
        //nothing
    });
};