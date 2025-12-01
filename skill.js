/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

/* global answerValues */ 
/* global vvar */
/* global gravm */
/* global answerids */
/* global tolerance */

//set global default variables
gravm = 9.8;
chat_messages = [];
most_recent_prob_markdown = "";
successfully_stored_answers = true;
unsuccessfully_stored_answers = "";

const pkzz = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEApN6bE6R63n6tTYiiFyKn
nK1KH+UW7ukzwBhVVJgRGzptmlXyhIomUfhPWyh//qr49es+F4RedS8AEp0h9koG
GkaVprkLcuH+o+cXALv/5wc5ouDSKPIl7+cqWXh3ncE0sqpPW3nEpXvI16ofXAJe
EUSmOl6F/gIYuxInR4nHRakFgJxqLmwfuVXziLhMvODZNmZ7+vAVAHLc2I5IG7wu
bY9qDmakH7WTcooO7G1IAl2BBjWrfYpybRhj4hAUqaK9dKP4ByVE89nSanGjqrpW
aiditMTWqoDy7n7MKv0eJsoY6FnbhuXeVIQVG81rOgwBSn3f+9+1tVXW7AV/k1RQ
6QIDAQAB
-----END PUBLIC KEY-----`;

var nameSpace = {
};

var turndownService;

function ppplanExt() {
    return [
        {
            type: 'output',
            regex: /<p><ppplan>/g,
            replace: '<ppplan><p>'
        },
        {
            type: 'output',
            regex: /<\/ppplan>/g,
            replace: '</p></ppplan><p>'
        }
    ];
}

$(document).ready(function() {
    turndownService = new TurndownService();
    
    // Table handling rules
    // Cannot do standard GFM table handling because we typically have no thead
    turndownService.addRule('tablewrapping', {
        filter: ['table'],
        replacement: function (content) {
            return 'TABLE ROWS:' + content + 'END TABLE'
        }
    })
    turndownService.addRule('diagramDivWrapping', {
        filter: function (node, options) {
            // return whether node is a div#diagramDiv
            return node.nodeName === 'DIV' && node.id === 'diagramDiv';
        },
        replacement: function (content) {
            return 'START OF IMG/DIAGRAM/OVERLAY SECTION:' + content + 'END OF IMG/DIAGRAM/OVERLAY\n';
        }
    })

    turndownService.addRule('aionlyWrapping', {
        filter: function (node, options) {
            // return whether node is a span.aionly
            return node.nodeName === 'SPAN' && node.classList.contains('aionly');
        },
        replacement: function (content) {
            return 'END OF PROBLEM, START OF INSTRUCTIONS TO THE HOMEWORK AI ASSISTANT (invisible to the user/learner):\n' + content + '\nEND OF AI-ONLY INSTRUCTIONS\n\n';
        }
    })

    turndownService.keep(['sub','sup','question']);

	$("#restartProblemButton").attr("title", "Only available after completing 100% of corrections");
	
	//allow user to hit enter to check answers, go to next problem or return to the dashboard
    $(document).keypress(function (event) {
        var key = event.which;
        
        // Allow normal enter key behavior in textarea elements
        if ($(event.target).is('textarea')) {
            return true;
        }
        
        if((key === 13) && ($("#problemHTML").length )){
            if($("#checkAnswersButton").css("display") === "inline-block"){
                if(!$("#checkAnswersButton").prop("disabled")){
                    $("#checkAnswersButton").click();
                }
            }
            else if($("#nextProblemButton").css("display") === "inline-block"){
                $("#nextProblemButton").click();
            }
            else if($("#dashboardButton").css("display") === "inline-block"){
                $("#dashboardButton").click();
            }
            return false;  
        }
    });

	//control the type of input allows for specific problems
    //returns true or false as a way of allowing or disallowing the input
    $("#problemHTML").on("keypress", "input[name=answer]", function (event) {

    	//remove incorrectAnswer class for incorrect answers regardless once they start typing
    	$(this).removeClass("incorrectAnswer");

        if($(this).hasClass("symbolicanswer")) {
            // ALLOW ALL CHARACTERS
            return true;
        }
            	
        // THE REMAINDER OF THIS FUNCTION IS DETERMINING WHETHER THE PRESSED KEY IS ALLOWED
        var charCode = (event.which) ? event.which : event.keyCode;
        
        //if input is a period/decimal point
        if (charCode === 46) {
            return true;
        }

        //negative sign or the letter e or capital E
        else if (charCode === 45 || charCode === 101 || charCode === 69){
            if($(this).hasClass("allownegative")){
                return true;
            }
            else if(($(this).attr("data-type")) && ($(this).attr("data-type") === "vector") && (nameSpace.vector === "vector_traditional")){
                return true;
            }
            else{
                return false;
            }
        }

        //if a letter, exclude
        else if (charCode > 31 && (charCode < 48 || charCode > 57)) {
            return false;
        }

        else {
            //else must be a number
            return true;
        }
    });
    
    // Styling upon entering something into input field
    $("#problemHTML").on("keydown", "input[name=answer]", function () {
    	$(this).css("webkit-text-fill-color","black");
    	$(this).removeClass("incorrectAnswer");
    });
    
    // Styling upon selecting something in select field
    $("#problemHTML").on("change", "select[name=answer]", function () {
    	$(this).css("webkit-text-fill-color","black");
    });

    // Code to handle automatic injection of commas as thousands separators
    $("#problemHTML").on("keyup", "input[name=answer]", function () {
        // Check to see if commas are needing to be added
        addCommaSeparatorsToInput(this);
    });
    
    //lesson list on header
    $("#skillLesson").click(function() {
         $("#skillReference, [name=barProblem]").removeClass("selected");
         $(this).addClass("selected");
         $("#mainContainer, #referenceContainer").css("display", "none");
         $("#noteContainer, #proceedFooterContainer").css("display", "block");
         updateHistoryState(0); 
         
         //$("#removedProblemBannerContainer").addClass("d-none");
    });
    
    //reference on header
    $("#skillReference").click(function() {
         $("#skillLesson, [name=barProblem]").removeClass("selected");
         $(this).addClass("selected");
         $("#mainContainer, #noteContainer").css("display", "none");
         $("#referenceContainer, #proceedFooterContainer").css("display", "block");
         updateHistoryState(0);  
         
       //stop active videos from playing
         if($(".youtubeVideo").length > 0){
         	$(".youtubeVideo")[0].contentWindow.postMessage('{"event":"command","func":"' + 'pauseVideo' + '","args":""}', '*');
         }
         
    });
	                 
    //bar list on header
    $("#barProblemContainer").on("click", "[name=barProblem]", function() {    	
        var problemID = parseInt($(this).attr("data-problem-id"));
        var skillID = parseInt($(this).attr("data-skill-id"));
        $("#skillLesson, #skillReference, [name=barProblem]").removeClass("selected");
        $(this).addClass("selected");
        $("#mainContainer").css("display", "block");
        $("#noteContainer, #proceedFooterContainer, #referenceContainer").css("display", "none");
        
        if (nameSpace.problemID != problemID) {
            getProblemData(problemID, skillID);
        }
        
        //stop active videos from playing
        if($(".youtubeVideo").length > 0){
        	$(".youtubeVideo")[0].contentWindow.postMessage('{"event":"command","func":"' + 'pauseVideo' + '","args":""}', '*');
        }
    });
        
    $("#proceedToQuestionButton").click(function() {
    	var barProblems = $('[name=barProblem]');
    	if(barProblems.length > 0){
    		$(barProblems[0]).click();
    	}
    });
     
    //restart skill
    $("#restartProblemButton, #restartAllSkillButton").click(function () {
		$("#restartSkillModal").modal("show");
    });
    
     //restart skill
    $("#confirmRestartSkillButton").click(function () {                    
        restartProblems();
    });
    
    //finalize skill
    $('#finalizeButton').click(async function () {

        var finalize = await showCustomConfirm("Are you sure you have finished all questions and want to finalize?  After finalizing you will be able to make corrections, but they will only count towards your corrections score.");
        if(finalize){
            // Turn off the assessment monitoring
            stopAssessmentMonitoring();

            var unitID = nameSpace.unitID;
            var skillID = nameSpace.skillID;
            var modeType = nameSpace.skillType;
            
            var dataObject = {
				modeType: modeType,
	            skillID: skillID,
	            unitID: unitID, 
	            finalizationInd: 1
	        };
	        updateFinalizationStatusByUser(dataObject, modeType);
        }
    });
    
    //check user answers
    $('#checkAnswersButton').click(function () {
        var answers = $("#problemHTML [name=answer]");
        var answerMap = {};
        for(var i = 0; i < answers.length; i++){
            var value = $(answers[i]).val();
            // Remove comma separators from the value if it's a number input
            // The server doesn't want to see commas in what we send it!
            if (answers[i].type === "text") {
                value = value.replace(/,/g, '');
            }
            
            //check if value is null
            if(value === null){
            	value = "";
            }
            //change cannot to cbd
            else if(value === "cannot"){
                value = "cbd";
            }
            answerMap[i] = value;
        }
        checkAnswers(answerMap, false);
    });
    
    //when the user clicks cannot be determined
    $('#cannotBeDeterminedButton').click(async function () {
        
        var cbd = await showCustomConfirm("Are you sure this problem cannot be solved?");
        
        if(cbd){
            var answers = $("#problemHTML [name=answer]");
            var answerMap = {};
            for(var i = 0; i < answers.length; i++){
                var value = $(answers[i]).val();
                if(value === "cannot"){
                    value = "cbd";
                }
                answerMap[i] = value;
            }
            checkAnswers(answerMap, true);
        }
    });
    
    //next problem button
    $("#nextProblemButton").click(function () {
        
        var problemID = parseInt($(this).attr("data-problem-id")); 
        var skillID = parseInt($(this).attr("data-skill-id")); 
        
        $("[name=barProblem]").removeClass("selected");
        $("[name=barProblem][data-problem-id=" + problemID + "]").addClass("selected");
        
        getProblemData(problemID, skillID);

    });
    
    //go to dashboard button
    $("#dashboardButton").click(function () {
    	goToDashboard();
    });
    
    //show hints for user
    $("#hintButton").click(async function () {

    	var problemHintIndicator = nameSpace.problemHintIndicator;
        let proceedWithHint = 1;
    	
        if (problemHintIndicator === 1) {

            proceedWithHint = 0;

            var hint = await showCustomConfirm("Are you sure you want to use the hint? Any unanswered questions will be marked incorrect.");
            if(hint){
                var answers = $("#problemHTML [name=answer]");
                var answerMap = {};
                for(var i = 0; i < answers.length; i++){
                    var value = $(answers[i]).val();
                    //change cannot to cbd
                    if(value === "cannot"){
                        value = "cbd";
                    }
                    answerMap[i] = value;
                }
                checkAnswers(answerMap, false);
                proceedWithHint = 1;
            }
        }
        
        if (proceedWithHint === 1) {
            //
            // IF AI TURNED ON AT SCHOOL
            //
            if (nameSpace.ai_allowed_by_teacher == 1) {
                $(".chat-content").empty();
                chat_messages = [];

                // If there's at least one incorrect answer, generate an initial hint
                // otherwise just show a generic conversation starter / prompt that doesn't require LLM generation
                if ($("#problemHTML .incorrectAnswer").length > 0) {
                    let markdown_plus_hint_and_refsheet = getProblemMarkdownWithContext();

                    let calculatorRecent = getRecentCalculations();
                    if (calculatorRecent) {
                        calculatorRecent = "\n\nThe user has entered the following recent calculations into their calculator (most recent is last): " + calculatorRecent;
                    } else {
                        calculatorRecent = "";
                    }

                    let msg = "The user has started the problem but already made at least one mistake. \n" + markdown_plus_hint_and_refsheet + calculatorRecent + "\n\nOkay now, please generate an initial hint that addresses the mistake(s) so far. Remember to start your response with <ppplan>...</ppplan> and remember that since this is your initial interaction you should include a complete solution in your thinking/planning area inside ppplan tags.";
                    chat_messages = [{"role":"user","parts":[{"text": msg}]}];
                    // console.log(chat_messages[0].parts[0].text);

                    initialWaitingHtml = "<div class='message-container'><div class='llm-message'>I'm working on a hint for you based on what is incorrect... please wait just a minute.</div></div>";
                    let newChat = chatAppend(initialWaitingHtml);

                    getLLMResponse(msg, chat_messages, function(htmlResponse, logID) {
                        // replace .llm-message with an updated version
                        let newLLMmessage = $("<div class='llm-message'>"+htmlResponse+"</div><div class='ai-thumbs-updown' data-logid='"+logID+"' ><i title='Helpful' class='far fa-smile helpful'></i><i title='Not Helpful' class='far fa-meh nothelpful'></i><i title='Wrong/Incorrect' class='far fa-times-circle incorrect'></i></div>");
                        if (logID === -1) {
                            newLLMmessage.find(".ai-thumbs-updown").hide();
                        }
                        $(newChat).find(".llm-message").replaceWith(newLLMmessage);
                    });
                }
                // // FOR NOW WE TURN THE existing HANDWRITTEN HINTS OFF
                // else if ($("#hintBody").html().length > 0) {
                //     // Add handwritten existing html hint to the chat
                // }
                else {
                    // Generic conversation starter
                    chatAppend('<div class="message-container"><div class="llm-message">Please let me know how I can help\!</div></div>');
                }

                $(".chat-overlay").css("display", "flex");

                // Need to still show the old hint modal if there is an image
                if ($("#hintBody img").length > 0) {
                    $("#hintModal").modal("show");
                }

                $(".chat-input #chatInputExpandable").focus();
            }
            //
            // IF AI TURNED OFF AT SCHOOL (show old hint modal)
            //
            else {
                $("#hintModal").modal("show");
            }
        }
    });
    
    //show answers button
    $("#showAnswerButton").click(function(){
        problemAnswers();
    });
    
    $("#copyProblemNameButton").tooltip({
	    		title: "Copied to clipboard", 
	    		placement: "top",
	    		animated: 'fade',
    			trigger: 'click'
	    	});
    
    $("#copyProblemNameButton").click(function(){

		var problemName = nameSpace.problem.problem_name;
		  navigator.clipboard.writeText(problemName);		
		  
		  setTimeout(() => {
			  $(this).tooltip('hide')  ;
		}, "1000");
    });
    
     $("#copyProblemURLButton").tooltip({
	    		title: "Copied to clipboard", 
	    		placement: "top",
	    		animated: 'fade',
    			trigger: 'click'
	    	});
    
    $("#copyProblemURLButton").click(function(){

		var problemURL = window.location.href;
		problemURL += "&requirelogin=true";
		
		  navigator.clipboard.writeText(problemURL);		
		  
		  setTimeout(() => {
			  $(this).tooltip('hide')  ;
		}, "1000");
    });
    
    $("#editProblemButton").click(function(){
        var problem = nameSpace.problem;
        
        if (!problem.html && problem.markup_text) {
        	var win = window.open("/customproblemcreator?problemID=" + problem.problem_id, '_blank');
        	win.focus();
        }
        else{
        	var win = window.open("/problemeditor?problemID=" + problem.problem_id, '_blank');
        	win.focus();
        }
    });
    
    $("#printLessonButton").click(function(){
    	getAllUserProblemData();
    });
    
    $("#printLessonWithoutAnswerButton, #printLessonWithAnswerButton").click(function(){
    	
    	var answerKey = parseInt($(this).attr("data-answer-key"));
    	var problemType = nameSpace.problemType;
		
		var skillArray = nameSpace.skillArray;
		
		getUserPrintProblemData(problemType, skillArray, true, answerKey);
    });
    
    $("#addRemoveProblemButton").click(function(){
        $("#addRemoveProblemModal").modal("show");
    });
        
    $("#addRemoveProblemModal").on('show.bs.modal', function () {
//    	getAddRemoveProblemData();
	});
    
    $('#addRemoveProblemModal').on('hidden.bs.modal', function () {
    	location.reload();
    });
	
	$("#addRemoveProblemTable").on("click", "[name=addRemoveButton]", function() {
		
        var problemID = nameSpace.problemID;
        var skillID = nameSpace.skillID;
        var status = $(this).attr("data-status");
        var skillType = $(this).attr("data-type");
        var sectionID = parseInt($(this).attr("data-section-id"));
        
        var dataArray = [];
        var object = {
            problemID: problemID,
            skillID: skillID,
            skillType: skillType,
            sectionID: sectionID
        };
        
        if(status === "active"){
            $(this).removeClass("greenTableCellButton").addClass("lightGrayTableCellButton");
            $(this).attr("data-status", "inactive");
            object.flag = 0;
        }
        else{
            $(this).removeClass("lightGrayTableCellButton").addClass("greenTableCellButton");
            $(this).attr("data-status", "active");
            object.flag = 1;
        }
        
        dataArray.push(object);
        addRemoveProblem(dataArray);        
    });
	
	$("#addAllProblemsButton").click(function(){
        var problemID = nameSpace.problemID;
        var skillID = nameSpace.skillID;
        var dataArray = [];
        var buttons = $("[name=addRemoveButton]");
        for(var i = 0; i < buttons.length; i ++){
            if($(buttons[i]).attr("data-status") === "inactive"){
                var skillType = $(buttons[i]).attr("data-type");
                var sectionID = parseInt($(buttons[i]).attr("data-section-id"));
                var object = {
                    problemID: problemID,
                    skillID: skillID,
                    skillType: skillType,
                    sectionID: sectionID,
                    flag: 1
                };
                dataArray.push(object);
                $(buttons[i]).removeClass("lightGrayTableCellButton").addClass("greenTableCellButton");
                $(buttons[i]).attr("data-status", "active");
            }
        }
        addRemoveProblem(dataArray);
    });
	
	$("#removeAllProblemsButton").click(function(){
        var problemID = nameSpace.problemID;
        var skillID = nameSpace.skillID;
        var dataArray = [];
        var buttons = $("[name=addRemoveButton]");
        for(var i = 0;i < buttons.length; i ++){
            if($(buttons[i]).attr("data-status") === "active"){
                var skillType = $(buttons[i]).attr("data-type");
                var sectionID = parseInt($(buttons[i]).attr("data-section-id"));
                var object = {
                    problemID: problemID,
                    skillID: skillID,
                    skillType: skillType,
                    sectionID: sectionID,
                    flag: 0
                };
                dataArray.push(object);
                $(buttons[i]).removeClass("greenTableCellButton").addClass("lightGrayTableCellButton");
                $(buttons[i]).attr("data-status", "inactive");
                
            }
        }
        addRemoveProblem(dataArray); 
    });
	
	$("#assignmentModalButton").click(function(){
		getLMSScoreDetails();
	});
	
	$("#submitScoreButton").click(function(){
		var lmsProvider = nameSpace.lmsProvider ;
		if(lmsProvider === "google"){
			sendGoogleScores();
		}
		else if(lmsProvider === "canvas"){
			sendCanvasScores();
		}
		else if(lmsProvider === "schoology"){
			sendSchoologyScores();
		}
	});

    setSkillAttributes(); //set attributes
    getAuxiliaryProblemData(); //get problem auxiliary data
    getSkillScores(); //skill scores
    updateDashboardHREF(); //found in header.js
    getSectionSkillData();
    getSectionUnitData();
    updateUserSectionByDefaultCourse();
    
    var userRole = $("#userRole").val() 
    if(userRole === "admin" || userRole === "teacher"){
		getActiveSections();
	}

    nameSpace.origin = window.location.origin;
    nameSpace.pathName = window.location.pathname;
    nameSpace.search = window.location.search;

});

setSkillAttributes = function(){
	
	nameSpace.skillID = parseInt($("#skillID").val());
	nameSpace.unitID = parseInt($("#unitID").val());
	nameSpace.courseID = parseInt($("#courseID").val());
    
    // Require that these three be integers and not NaN, otherwise display alert and then throw a JS error
    if (isNaN(nameSpace.skillID) || isNaN(nameSpace.unitID) || isNaN(nameSpace.courseID)) {
        showCustomAlert("Error: Had trouble getting the Skill, Unit, or Course ID. Try refreshing the page otherwise please contact support.");
        throw new Error("Invalid Skill, Unit, or Course ID during setSkillAttributes");
    }

    var mode = $("#mode").val();
    
    //set defaults for header
    $("#scoreContainer").css("display", "flex");
    $("#headerScoreContainer").css("display", "block");
    $("[name=scoreDiv]").css("display", "none");
    
    setUpPopupCalculator();
    
	///set values depending on the mode of skill
    switch(mode){
        case "work":
            nameSpace.skillType = "work";
            nameSpace.problemType = "work";
            $("[name=scoreDiv][data-type=completion]").css("display", "block");
            $("[name=scoreDiv][data-type=accuracy]").css("display", "block");
            $("#addRemoveProblemButtonContainer").css("display", "block");
            break;
        case "extrapractice":
            nameSpace.skillType = "extrapractice";
            nameSpace.problemType = "extrapractice";
            $("#positivePhysicsNavbar").addClass("extraPracticeHeaderBar");
            $("[name=scoreDiv]").css("display", "none");
            $("[name=scoreDiv][data-type=score]").css("display", "block");
            break;  
        case "extrapracticecorrections":
            nameSpace.skillType = "extrapracticecorrections";
            nameSpace.problemType = "extrapractice";
            $("#positivePhysicsNavbar").addClass("correctionHeaderBar");
            $("[name=scoreDiv][data-type=score]").css("display", "block");
            $("[name=scoreDiv][data-type=correction]").css("display", "block");
            break;
        case "assessment":
            nameSpace.skillType = "assessment";
            nameSpace.problemType = "assessment";
            $("#positivePhysicsNavbar").addClass("assessmentHeaderBar");
            $("[name=scoreDiv]").css("display", "none");
            $("[name=scoreDiv][data-type=score]").css("display", "block");
            $("#assessmentBanner").removeClass("d-none");

            // Increase rate of messagePing polling to ensure we log students out quickly if someone else logs in for them
            // every 30 seconds, but only in assessment mode
            assessmentIntervalId = setInterval(checkValidSession, 1000*30);

            break;  
        case "assessmentcorrections":
            nameSpace.skillType = "assessmentcorrections";
            nameSpace.problemType = "assessment";
            $("#positivePhysicsNavbar").addClass("correctionHeaderBar");
            $("[name=scoreDiv][data-type=score]").css("display", "block");
            $("[name=scoreDiv][data-type=correction]").css("display", "block");
            $("#assessmentBanner").removeClass("d-none");
            break;
         default:
        	nameSpace.skillType = "work";
         	nameSpace.problemType = "work";
         	$("[name=scoreDiv][data-type=completion]").css("display", "block");
            $("[name=scoreDiv][data-type=accuracy]").css("display", "block");
        	break;
    }
};

//
// Pop up calculator section
//

// const trigfns = ['sin', 'cos', 'tan', 'sec', 'cot', 'csc', 'asin', 'acos', 'atan', 'atan2', 'acot', 'acsc', 'asec']
// var newTrigfns = {}

// function setupTrigFunctionsForCalculator() {
//     trigfns.forEach(function (name) {
//         const fn = math[name];
//         newTrigfns[name+'_deg'] = math.typed(name+'_deg', {
//             'number': function (x) {
//                 if (name.startsWith('a')) {
//                     return fn(x) / Math.PI * 180
//                 } else {
//                     let result = fn(x / 180 * Math.PI)
//                     // if it's less than 10^-10, return 0
//                     result = Math.abs(result) < 1e-10 ? 0 : result
//                     // if it's greater than 1e10, return undefined
//                     result = Math.abs(result) > 1e10 ? undefined : result
//                     return result
//                 }
//             }
//         })
//     });
// }

// var calculatorVars = new Map();
var elt;
var calculator;

setUpPopupCalculator = function () {
    // // if newTrigfuns is empty, then we need to set it up
    // if (Object.keys(newTrigfns).length === 0) {
    //     setupTrigFunctionsForCalculator();
    //     math.import(newTrigfns);
    // }

    // Popup Calculator functionality
    $("#popupCalcLink").click(function (e) {
        e.preventDefault();
        if (elt === null || elt === undefined) {
            elt = document.getElementById('popupCalcContainer2');
            calculator = Desmos.ScientificCalculator(elt, {degreeMode: true});
        }
        $("#popupCalcContainer").toggle();
    });

    $("#popupCalcClose").click(function () {
        $("#popupCalcContainer").hide();
    });

    // $("#popupCalcInput").keypress(function (e) {
    //     if (e.which === 13) { // Enter key
    //         e.preventDefault();
    //         let expression = $(this).val().trim();
    //         if (expression) {
    //             try {
    //                 // If the number of opening and closing parentheses are not equal, add extra closing parentheses
    //                 const openParenCount = (expression.match(/\(/g) || []).length;
    //                 const closeParenCount = (expression.match(/\)/g) || []).length;
    //                 const extraCloseParens = openParenCount - closeParenCount;
    //                 if (extraCloseParens > 0) {
    //                     expression += ')'.repeat(extraCloseParens);
    //                 }

    //                 // convert each instance of sin, cos, tan, etc. to their deg versions
    //                 // which basically means replace each "func(" with "func_deg("
    //                 const regex = new RegExp(`(${trigfns.join('|')})\\(`, 'g');
    //                 const modifiedExpression = expression.replace(regex, (match) => {
    //                     return match.replace('(', '_deg(');
    //                 });
                    
    //                 // Evaluate the expression
    //                 const result = math.evaluate("ans="+modifiedExpression, calculatorVars);
    //                 // Round result to 5 significant figures
    //                 const roundedResult = math.format(result, { precision: 5 });

    //                 // Add to history
    //                 const historyItem = $("<div class='popupCalcItem'></div>");
    //                 historyItem.append($("<div class='popupCalcExpression'></div>").text(expression));
    //                 historyItem.append($("<div class='popupCalcResult'></div>").text("= " + roundedResult));

    //                 $("#popupCalcHistory").append(historyItem);

    //                 // Scroll to the bottom of history
    //                 $("#popupCalcHistory").scrollTop($("#popupCalcHistory")[0].scrollHeight);

    //                 // Clear input
    //                 $(this).val("");
    //             } catch (error) {
    //                 // Handle error
    //                 const historyItem = $("<div class='popupCalcItem'></div>");
    //                 historyItem.append($("<div class='popupCalcExpression'></div>").text(expression));
    //                 historyItem.append($("<div class='popupCalcResult' style='color: red;'></div>").text("Error: " + error.message));

    //                 $("#popupCalcHistory").append(historyItem);
    //                 $("#popupCalcHistory").scrollTop($("#popupCalcHistory")[0].scrollHeight);
    //             }
    //         }
    //     }
    // });
    
    // // Add math function buttons
    // const mathButtons = [
    //     { display: "+", insert: "+" },
    //     { display: "-", insert: "-" },
    //     { display: "×", insert: "*" },
    //     { display: "÷", insert: "/" },
    //     { display: "x<sup>y</sup>", insert: "^" },
    //     { display: "√", insert: "sqrt(" },
    //     { display: "sin", insert: "sin(" },
    //     { display: "cos", insert: "cos(" },
    //     { display: "tan", insert: "tan(" },
    //     { display: "sin<sup>-1</sup>", insert: "asin(" },
    //     { display: "cos<sup>-1</sup>", insert: "acos(" },
    //     { display: "tan<sup>-1</sup>", insert: "atan(" },
    //     { display: "π", insert: "pi" },
    //     { display: "prior answer", insert: "ans" }
    //     // { display: "ln", insert: "log(" },
    //     // { display: "log", insert: "log10(" }
    // ];
    
    // // Create button container
    // const mathButtonsContainer = $("<div id='popupCalcButtons'></div>").css({
    //     "display": "flex",
    //     "flex-wrap": "wrap",
    //     "margin-top": "5px",
    //     "gap": "5px",
    //     "justify-content": "center"
    // });
    
    // // Create and add buttons
    // mathButtons.forEach(btn => {
    //     const button = $("<button></button>")
    //         .html(btn.display)
    //         .css({
    //             "padding": "3px 8px",
    //             "border-radius": "3px",
    //             "background-color": "#f0f0f0",
    //             "border": "1px solid #ccc",
    //             "cursor": "pointer"
    //         })
    //         .click(function() {
    //             const input = $("#popupCalcInput");
    //             const startPos = input[0].selectionStart;
    //             const endPos = input[0].selectionEnd;
    //             const currentValue = input.val();
    //             const newValue = currentValue.substring(0, startPos) + btn.insert + currentValue.substring(endPos);
                
    //             // Set the new value
    //             input.val(newValue);
                
    //             // Set cursor position after the inserted function
    //             // For functions with opening parenthesis, place cursor inside the parentheses
    //             let newPosition = startPos + btn.insert.length;
    //             if (btn.insert.endsWith("(")) {
    //                 // Don't adjust cursor position - leave it inside parentheses
    //             } else {
    //                 // For non-function buttons like pi or ^, move cursor all the way after
    //                 newPosition = startPos + btn.insert.length;
    //             }
                
    //             // Set focus back to input and position cursor
    //             input.focus();
    //             input[0].setSelectionRange(newPosition, newPosition);
    //         });
            
    //     mathButtonsContainer.append(button);
    // });
    
    // // Insert the buttons after the input field
    // $("#popupCalcInput").after(mathButtonsContainer);
}

getCourseData = function(){
    
    var courseID = nameSpace.courseID;
    
    $.ajax({
        url: "/course/coursedata",
        type: 'GET',
        dataType: 'json',
        data: {
        	courseID: courseID
        }
    })
    .done(function(responseText) {
        var data = responseText.data;
       nameSpace.courseVisibility = data.visibility;
       getUnitData();
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
    	logError(window.location.href, jqXHR);
    })
    .always(function() {
        //nothing
    }); 
};

getUnitData = function(){
        
    var unitID = nameSpace.unitID;
    
    $.ajax({
        url: "/unit/unitdata",
        type: 'GET',
        dataType: 'json',
        data: {
            unitID: unitID
        }
    })
    .done(function(responseText) {
        var data = responseText.data;
        $("#unitNumberDesc").html(data.unit_number);
        $("#unitNameDesc").html(data.unit_name);
        nameSpace.unitNumber = data.unit_number;
        nameSpace.unitName = data.unit_name;
        nameSpace.unitFreeAccess = data.free_access;
        getSkillData(); //skill display data
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
    	logError(window.location.href, jqXHR);
    })
    .always(function() {
        //nothing
    }); 
};

checkValidSession = function () {

    $.ajax({
        url: '/user/checkstillvalidsession',
        type: 'GET',
        dataType: 'json'
    })
        .done(function (responseText) {
            // nothing to do
        })
        .fail(function (jqXHR, textStatus, errorThrown) {
            if (jqXHR.status === 401) {
                $(".assessmentHeaderBar").removeClass("assessmentHeaderBar");
                clearInterval(assessmentIntervalId);
                // set timeout .5 seconds
                setTimeout(function () {
                    showCustomAlert("Your session has expired or you've been logged in somewhere else.");
                    sessionTimeOut();
                },500);
            }
        })
};

getSkillData = function(){
    
    var skillID = nameSpace.skillID;
    
    $.ajax({
        url: "/skill/skilldata",
        type: 'GET',
        dataType: 'json',
        data: {
            skillID: skillID
        }
    })
    .done(function(responseText) {
        var data = responseText.data;
        var skillName = (data.skill_name);
        $("#skillNameDesc").html(skillName);
        nameSpace.skillName = skillName;
        updateDynamicTitle();
        
        
        //set up skill display
        
        $("#skillDisplay").css("display", "inline-block");
        var mode = $("#mode").val();
        var skillDisplayText;
        //skillDisplayText
        if(mode === "work"){
			skillDisplayText = nameSpace.unitNumber + "." + data.skill_number + " Work";
		}
		else if(mode === "extrapractice" || mode === "extrapracticecorrections"){
			skillDisplayText = nameSpace.unitNumber + "." + data.skill_number + " Extra Practice";
		}
		else if(mode === "assessment" || mode === "assessmentcorrections"){
			skillDisplayText = "Unit " + nameSpace.unitNumber + " Assessment";
		}
		$("#skillDisplayText").html(skillDisplayText);
                        
        if((data.reference_display) || (nameSpace.problemType === "assessment")){
		       if((data.course_reference) && (data.course_reference !== "none")){
				   $("#skillReference").css("display", "inline-block");
					if(data.course_reference === "custom"){
						getCustomCourseReferenceDataByName(data.course_reference_custom_name);
					}
					else{
						getCustomCourseReferenceDataByName(data.course_reference);
					}
				}
		}
		
		//cbd display
		if(!data.cbd_visibility){
			$("#cannotBeDeterminedButton").remove();
		}
        
        //skill notes
        var skillNote = data.skill_note;
        var scalarNote = data.scalar_note;
        var problemType = nameSpace.problemType;
        var notation = nameSpace.vector;
        
        if(problemType === "work"){
        	if(scalarNote !== undefined && scalarNote !== null && scalarNote !== "" && notation === "scalar"){
        		$("#skillLesson").attr("title", scalarNote);
            	$("#skillLesson").attr("data-skill-note", scalarNote);
            	getNoteBaseData(scalarNote);
        	}
        	else if(skillNote !== ""){
        		$("#skillLesson").attr("title", skillNote);
            	$("#skillLesson").attr("data-skill-note", skillNote);
            	getNoteBaseData(skillNote);
        	}
        	
        	if((skillNote === "" || skillNote === undefined) && (scalarNote === "" || scalarNote === undefined)){
        		nameSpace.lesson = false;
        	}
        	else{
        		nameSpace.lesson = true;
        	}
        }
        getUserProblems();
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
    	logError(window.location.href, jqXHR);
    })
    .always(function() {
        //nothing
    }); 
};

updateDynamicTitle = function(){
	var title = "Positive Physics - Unit " + nameSpace.unitNumber + ": " + nameSpace.unitName  + ", " + nameSpace.skillName;
	$(document).prop("title", title);
};

getAuxiliaryProblemData = function(){
    
    $.ajax({
        url: "/problem/auxiliaryproblemdata",
        type: 'GET',
        dataType: 'json'
    })
    .done(function(responseText) {
        var data = responseText.data;
        
        gravm = data.gravm;
        
        $("#footerGValue").html(gravm);
        nameSpace.vector = data.vector;
        // This has to run immediately to set the vvar global before problemRender runs but it will run again...
        setVectorSettings(nameSpace.vector);

        nameSpace.baseURL = data.image_base_url;
        nameSpace.problemHintIndicator = data.problem_hint;
        nameSpace.referenceDisplay = data.reference_manipulation_display;
        nameSpace.ai_allowed_by_teacher = data.ai_allowed_by_teacher;
        nameSpace.lms_submission_reminder_ind = data.lms_submission_reminder_ind;
        nameSpace.fullscreen_assessment = data.fullscreen_assessment;
        nameSpace.pause_after_incorrect = data.pause_after_incorrect;
        
        if(data.extra_practice_restart_ind === 0){
            $("#restartButtonContainer").remove();
        }

        if ($("#mode").val() === "assessment") {
            if (nameSpace.fullscreen_assessment > 0) {
                setupAssessmentMonitoring();
            }
        }

        getCourseData(); //unit display data
//        getUnitData(); //unit display data
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        if(jqXHR.status === 401){
            sessionTimeOut();
        }
        else{
            logError(window.location.href, jqXHR);
        }
    })
    .always(function() {
        //nothing
    });
};

getScores = function(){
    
    var unitID = nameSpace.unitID;
    var skillID = nameSpace.skillID;
    var skillType = nameSpace.skillType;
    var problemType = nameSpace.problemType;
    
    $.ajax({
        url: "/skill/skillscores",
        type: 'GET',
        dataType: 'json',
        data: {
            unitID: unitID,
            skillID: skillID,
            skillType: skillType,
            problemType: problemType
        }
    })
    .done(function(responseText) {
        var data = responseText.data;
    
        switch(skillType){
            case "work":
                $("[name=completionPercentage]").html(data.completion_skill_score);
                $("[name=accuracyPercentage]").html(data.accuracy_skill_score);
                break;
            case "bonus":
                $("[name=completionPercentage]").html(data.completion_skill_score);
                $("[name=accuracyPercentage]").html(data.accuracy_skill_score);
                break;
            case "extrapractice":
                $("[name=scorePercentage]").html(data.skill_score);
                $("#restartProblemButton").removeClass("d-none");
                $("#restartProblemButton").attr("title", "only available after completing 100% of corrections");
                break;  
            case "extrapracticecorrections":
                $("[name=scorePercentage]").html(data.skill_score);
                $("[name=correctionPercentage]").html(data.correction_skill_score);
                $("#restartProblemButton").removeClass("d-none");
                if(data.correction_skill_score === 100){
                    $("#restartProblemButton").removeClass("disabledButton");
                    $("#restartProblemButton").attr("data-active", "true");
                    $("#restartProblemButton").attr("title", "");
                }
                else{
                    $("#restartProblemButton").attr("title", "only available after completing 100% of corrections");
                }
                break;
            case "assessment":
                $("[name=scorePercentage]").html(data.skill_score);
                break;  
            case "assessmentcorrections":
                $("[name=scorePercentage]").html(data.skill_score);
                $("[name=correctionPercentage]").html(data.correction_skill_score);
                break;
        }
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        if(jqXHR.status === 401){
            sessionTimeOut();
        }
        else{
            logError(window.location.href, jqXHR);
        }
    })
    .always(function() {
        //nothing
    });
};

getUserProblems = function(){
	
	var skillID = nameSpace.skillID;
    var unitID = nameSpace.unitID;
    var skillType = nameSpace.skillType;
    var problemType = nameSpace.problemType;
    

    $("#barProblemContainer [name=barProblem]").empty();
        
    $.ajax({
        url: "/skill/userproblems",
        type: 'GET',
        dataType: 'json',
        data: {
        	unitID: unitID,
            skillID: skillID,
            skillType: skillType,
            problemType: problemType
        }
    })
    .done(function(responseText) {
    	       
        var data = responseText.data; 
        
        nameSpace.skillArray = [];
        nameSpace.problemArray = [];
        nameSpace.problemMap = {};
        var skillArray = [];
        var problemArray = [];
        var problemMap = {};
        
        var counter = 1;
        for(var i = 0; i < data.length; i++){
            var problemDiv = '<div data-problem-id="' +data[i].problem_id + '">' + counter + '</div>';
            $("#barProblemContainer").append(problemDiv);
            $("[data-problem-id=" + data[i].problem_id + "]").addClass("barProblem")
                .attr("name", "barProblem")
                .attr("data-problem-id", data[i].problem_id)
                .attr("data-skill-id", data[i].skill_id)
                .attr("problem_status", data[i].problem_status)
                .attr("score", data[i].problem_score)
                .attr("accuracy_score", data[i].accuracy_problem_score)
                .attr("completion_score", data[i].completion_problem_score)
                .attr("correction_score", data[i].correction_problem_score)
                .attr("completion_status", data[i].problem_completion_status)
                .attr("problem_exclusion", data[i].problem_exclusion)
                .attr("translate","no")
                .attr("title", data[i].problem_name);
                
           //change width based on weight
           if(data[i].weight){
			   if(data[i].weight <= 1){
				   $("[data-problem-id=" + data[i].problem_id + "]").css("width", "35px");
			   }
			   else if(data[i].weight == 2){
				   $("[data-problem-id=" + data[i].problem_id + "]").css("width", "35px");
			   }
			   else if(data[i].weight >= 3){
				   $("[data-problem-id=" + data[i].problem_id + "]").css("width", "35px");
			   }
		   }
            
            if(data[i].problem_exclusion === true){
            	$("[data-problem-id=" + data[i].problem_id + "]").addClass("removedProblem");
            }
            
            var skillID = data[i].skill_id;
			if(skillArray.indexOf(skillID) == -1){
				skillArray.push(skillID);
			}
            problemArray.push(data[i]);
            problemMap[data[i].problem_id] = data[i];
            counter++;
        }
        
        nameSpace.skillArray = skillArray;
        nameSpace.problemArray = problemArray;
        nameSpace.problemMap = problemMap;
        
        setBarProblemColor();
                
        if(nameSpace.lesson){
        	$("#skillLesson").css("display", "inline-block");
        	var problemID = getURLParameter("problemID"); //in header.js   
        	if(problemID !== null){
	            problemID = parseInt(problemID);
	            if(!problemMap[problemID]){
	            	$("#skillLesson").click();
		        	return;
	            }
        	}
        	else{
        		$("#skillLesson").click();
	        	return;
        	}
        }
        else{
        	$("#skillLesson").css("display", "none");
        }
        
         
        if(data[0]){
        	var skillID;
        	var problemID = getURLParameter("problemID"); //in header.js   
	        if(problemID !== null){
	        	problemID = parseInt(problemID);
	            if(problemMap[problemID]){
	            	skillID = problemMap[problemID].skill_id;
	            }
	            else{
	            	problemID = data[0].problem_id;
	            	skillID = data[0].skill_id;
	            }
	        }
	        else{
	        	problemID = data[0].problem_id;
	        	skillID = data[0].skill_id;
	        }
	        
	        $('[name=barProblem][data-problem-id="' + problemID + '"]').click();
        }        
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        if(jqXHR.status === 401){
            sessionTimeOut();
        }
        else{
            logError(window.location.href, jqXHR);
        }
    })
    .always(function() {
        //nothing
    });   
};

var getProblemDataInProgress = false;

getProblemData = function(problemID, skillID){
    
    // Prevent multiple simultaneous calls
    if (getProblemDataInProgress) {
        return;
    }
    
    getProblemDataInProgress = true;

    // Reset chat history and hide the chat overlay
    $(".chat-content").empty();
    chat_messages = [];
    $(".chat-overlay").css("display", "none");

    // // Reset calculator
    // calculatorVars.clear();
    // $("#popupCalcInput").val("");
    // $("#popupCalcHistory").empty();
    
    var problemData = nameSpace.problemMap[problemID];
    var problemExclusion = problemData.problem_exclusion;
    var userRole = $("#userRole").val();
    if((problemExclusion) && (userRole === "student")){
        $("#problemHTML").empty();
        var html = '<div class="mt-5 mb-5" style="text-align: center;font-size: 30px;"><span>This problem has been removed by your teacher and will not affect your score.</span></div>';
        $("#problemHTML").html(html);
        
        removedProblemUpdate(problemID);
        updateHistoryState(problemID);
        getProblemDataInProgress = false;
        return;
    }
        
    nameSpace.skillID = skillID;
    
    var skillID = nameSpace.skillID;
    var unitID = nameSpace.unitID;
    var problemType = nameSpace.problemType;

    $.ajax({
        url: "/skill/userproblemdata",
        type: 'GET',
        dataType: 'json',
        data: {
            problemID: problemID,
            problemType: problemType,
            skillID: skillID,
            unitID: unitID
        }
    })
    .done(function(responseText) {
        var data = responseText.data; 
        displayProblem(data);
        updateHistoryState(problemID);
        checkProblemValidity(problemID);
        
        //check for edit access
        var userID = parseInt($("#userID").val());
        if(data.user_id === userID){
            $("#editProblemButtonContainer").css("display", "block");
        }
        else{
            $("#editProblemButtonContainer").css("display", "none");
        }
        
        // Additional tool tip for all free accounts
        var upgradeStatus = parseInt($("#upgradeStatus").val());    	
    	//if a free account
        if(upgradeStatus === 0){
            $("[name=randSpan]").tooltip({
                title: "This value is randomized.", 
                placement: "bottom"
            });
        }
        
        var skillType = nameSpace.skillType;
        if(skillType === "work"){
            getAddRemoveProblemData(problemID);
        }
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        if(jqXHR.status === 405){
            var responseText = JSON.parse(jqXHR.responseText);
            if(responseText.errorReason === "openDateNotPassed"){
                displayProblemNotAllowed();
            }
            else{
                // assessment is unlocked and not finalized so do not allow the student to see their work or extra practice
                displayProblemNotAllowed();
            }
        }
        else{
            logError(window.location.href, jqXHR);
        }
    })
    .always(function() {
        getProblemDataInProgress = false;
    });   
};

getProblemDataByName = function(problemName){
	            
    $.ajax({
        url: "/auxiliary/getstaticpage",
        type: 'GET',
        dataType: 'json',
        data: {
            problemName: problemName
        }
    })
    .done(function(responseText) {
    	var data = responseText.data; 
        displayProblem(data);
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        logError(window.location.href, jqXHR);
    })
    .always(function() {
        //nothing
    });   
};

getCustomCourseReferenceDataByName = function(problemName){
	            
    $.ajax({
        url: "/auxiliary/getstaticpage",
        type: 'GET',
        dataType: 'json',
        data: {
            problemName: problemName
        }
    })
    .done(function(responseText) {
        var data = responseText.data;

        if (!data.html && data.markup_text) {

            var parentContainer = $("#referenceContainer");

            parentContainer.html(`<div id="referenceHTMLContainer" class="createTotalContainerClass row ml-2 mr-2"></div>`);

            problemRender(data.markup_text, data.custom_math, "#referenceHTMLContainer", data.only_randoms, data.custom_rounding);
            $("#referenceHTMLContainer").css({
                "padding-left": "5px",
                "padding-right": "5px",
                "padding-top": "120px"
            });

            // This is for LaTeX rendering
            renderMathInElement($("#referenceHTMLContainer", parentContainer).get(0));

        }
        else {
            $("#referenceContainer").html(data.html);
        }

        var userRole = $("#userRole").val();
        if (userRole === "admin" || userRole === "teacher") {
            $("#teacherReferenceTip").css("display", "block");
        }

        if ($("a[data-reference]")[0]) {
            $("a[data-reference]")[0].click();
        }
        getUnitReferenceData(nameSpace.unitID);
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        logError(window.location.href, jqXHR);
    })
    .always(function() {
        //nothing
    });   
};

getUnitReferenceData = function(unitID){
        
    $.ajax({
        url: "/unit/unitreferencedata",
        type: 'GET',
        dataType: 'json',
        data: {
            unitID: unitID
        }
    })
    .done(function(responseText) {
        var data = responseText.data;
        var unitReference = data.unit_reference;
        if(unitReference !== ""){
        	$("a[data-reference=" + unitReference + "]").click();
        }
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
    	logError(window.location.href, jqXHR);
    })
    .always(function() {
        //nothing
    }); 
};

getActiveSections = function(){
    
    $.ajax({
        url: "/school/getactivesectionsbyschool",
        type: 'GET',
        dataType: 'json'
    })
    .done(function(responseText) {
    	
    	$("#addRemoveProblemTable tbody").empty();
    	
        var data = responseText.data;
        for(var i = 0; i < data.length; i++){
            var row = '<tr>';
            if(data[i].section_name === ''){
                row += '<td class="p-0" style="border:none;vertical-align: middle;min-width: 80px;">section ' + data[i].section + ':&nbsp;</td>';
            }
            else{
                row += '<td class="p-0" style="border:none;vertical-align: middle;min-width: 80px;">' + data[i].section_name + ':&nbsp;</td>';
            }
            row += '<td class="p-0" nowrap><button name="addRemoveButton" class="greenTableCellButton" data-type="work" data-section-id="' + data[i].section_id + '" data-status="active">work</button></td>';
            row += '<td class="p-0" nowrap><button name="addRemoveButton" class="greenTableCellButton" data-type="extrapractice" data-section-id="' + data[i].section_id + '" data-status="active">extra practice*</button></td>';
            row += '<td class="p-0" nowrap><button name="addRemoveButton" class="greenTableCellButton" data-type="assessment" data-section-id="' + data[i].section_id + '" data-status="active">assessment*</button></td>';
            row += '<tr>';
            
            $("#addRemoveProblemTable tbody").append(row);
        }
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        if(jqXHR.status === 401){
            sessionTimeOut();
        }
        else{
            //found in header.js
            logError(window.location.href, jqXHR);
        }
    })
    .always(function() {
        //nothing
    });
};

getSectionSkillData = function(){
	
	var skillID = nameSpace.skillID;
	var unitID = nameSpace.unitID;
    
    $.ajax({
        url: "/school/getsectionskilldata",
        type: 'GET',
        dataType: 'json',
        data: {
        	skillID: skillID,
        	unitID: unitID
        }
    })
    .done(function(responseText) {
    	var data = responseText.data;
    	
    	var skillType = nameSpace.skillType;
    	
    	if(skillType === "work"){
			if(data.work_lms_course_work_id !== undefined){
	    		$("#submitScoreHeaderContainer").removeClass("d-none");
	    		nameSpace.lmsScoringType = data.work_lms_scoring_type;
		    	nameSpace.lmsCourseWorkID = data.work_lms_course_work_id;
		    	nameSpace.lmsProvider = data.work_lms_provider;
    		}
	    }
	    else if(skillType === "extrapractice" || skillType === "extrapracticecorrections"){
			if(data.extra_practice_lms_course_work_id !== undefined){
	    		$("#submitScoreHeaderContainer").removeClass("d-none");
	    		nameSpace.lmsScoringType = data.extra_practice_lms_scoring_type;
		    	nameSpace.lmsCourseWorkID = data.extra_practice_lms_course_work_id;
		    	nameSpace.lmsProvider = data.extra_practice_lms_provider;
    		}
	    }
	    else if(skillType === "assessment" || skillType === "assessmentcorrections"){
			if(data.assessment_lms_course_work_id !== undefined){
	    		$("#submitScoreHeaderContainer").removeClass("d-none");
	    		nameSpace.lmsScoringType = data.assessment_lms_scoring_type;
		    	nameSpace.lmsCourseWorkID = data.assessment_lms_course_work_id;
		    	nameSpace.lmsProvider = data.assessment_lms_provider;
    		}
	    }
	    
	    if(nameSpace.lmsProvider === "google"){
			$("[name=googleClassroomComponent]").removeClass("d-none");
		}
		else if(nameSpace.lmsProvider === "canvas"){
			$("[name=canvasComponent]").removeClass("d-none");
		}
		else if(nameSpace.lmsProvider === "schoology"){
			$("[name=schoologyComponent]").removeClass("d-none");
		}		
		getUserLMSSubmissionData();
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        if(jqXHR.status === 401){
            sessionTimeOut();
        }
        else{
            //found in header.js
            logError(window.location.href, jqXHR);
        }
    })
    .always(function() {
        //nothing
    });
};

getSectionUnitData = function(){
	
	var unitID = nameSpace.unitID;
    
    $.ajax({
        url: "/school/getsectionunitdata",
        type: 'GET',
        dataType: 'json',
        data: {
        	unitID: unitID
        }
    })
    .done(function(responseText) {
    	var data = responseText.data;

    	var skillType = nameSpace.skillType;
    	
    	if(skillType === "work"){
			if(data.work_lms_course_work_id !== undefined){
	    		nameSpace.unitLmsScoringType = data.work_lms_scoring_type;
		    	nameSpace.unitLmsCourseWorkID = data.work_lms_course_work_id;
		    	nameSpace.unitLmsProvider = data.work_lms_provider;
    		}
	    }
	    else if(skillType === "extrapractice" || skillType === "extrapracticecorrections"){
			if(data.extra_practice_lms_course_work_id !== undefined){
	    		nameSpace.unitLmsScoringType = data.extra_practice_lms_scoring_type;
		    	nameSpace.unitLmsCourseWorkID = data.extra_practice_lms_course_work_id;
		    	nameSpace.unitLmsProvider = data.extra_practice_lms_provider;
    		}
	    }    	
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        if(jqXHR.status === 401){
            sessionTimeOut();
        }
        else{
            //found in header.js
            logError(window.location.href, jqXHR);
        }
    })
    .always(function() {
        //nothing
    });
};

updateUserSectionByDefaultCourse = function(){
    
	var courseID = parseInt($("#courseID").val());
        
	 $.ajax({
	        url: "/user/updateusersectionbydefaultcourse",
	        type: 'PUT',
	        dataType: 'json',
	        data: JSON.stringify({
	        	courseID: courseID
	        })
	    })
    .done(function() {
    	//getAllUnits();
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        if(jqXHR.status === 401){
            sessionTimeOut();
        }
        else{
            logError(window.location.href, jqXHR);
        }
    })
    .always(function() {

    });
};

getUserLMSSubmissionData = function(){
	
	var skillID = nameSpace.skillID;
	var unitID = nameSpace.unitID;
    
    $.ajax({
        url: "/user/lmssubmissiondata",
        type: 'GET',
        dataType: 'json',
        data: {
        	skillID: skillID,
        	unitID: unitID
        }
    })
    .done(function(responseText) {
    	var data = responseText.data;

    	var submissionStatus;
    	var skillType = nameSpace.skillType;
    	
    	if(nameSpace.lmsScoringType !== undefined){
			if(skillType === "work"){
				if(data.work_lms_submission_ind === 0){
					submissionStatus = false;
				}
				else{
					submissionStatus = true;
				}
			}
			else if(skillType === "extrapractice" || skillType === "extrapracticecorrections"){
				if(data.extra_practice_lms_submission_ind === 0){
					submissionStatus = false;
				}
				else{
					submissionStatus = true;
				}
			}
			else if(skillType === "assessment" || skillType === "assessmentcorrections"){
				if(data.assessment_lms_submission_ind === 0){
					submissionStatus = false;
				}
				else{
					submissionStatus = true;
				}
			}
		}
		updateSubmissionStatusDisplay(submissionStatus);
		
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        if(jqXHR.status === 401){
            sessionTimeOut();
        }
        else{
            //found in header.js
            logError(window.location.href, jqXHR);
        }
    })
    .always(function() {
        //nothing
    });
};

sendGoogleScores = function(){
	
	$("#sendScoreButton").attr("disabled", true);
		
	var courseWorkID = nameSpace.lmsCourseWorkID;
	var score = nameSpace.lmsScore;
	
    $.ajax({
        url: "/google/submitgrade",
        type: 'POST',
        data: JSON.stringify({
        	courseWorkID: courseWorkID,
        	score: score
        })
    })
    .done(function(responseText) {
    	responseText =JSON.parse(responseText);
		lateWorkMessage(responseText.lateWorkFlag);  
		updateLMSSubmissionStatus(1);	
    	$("#assignmentModal").modal("hide");
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
		if(jqXHR.status === 400){
			var responseText =JSON.parse(jqXHR.responseText);
					showCustomAlert(responseText.message);
		}
        if(jqXHR.status === 401){
            sessionTimeOut();
        }
        else{
            //found in header.js
            logError(window.location.href, jqXHR);
        }
    })
    .always(function() {
    	$("#sendScoreButton").attr("disabled", false);
    });  
};

sendSchoologyScores = function(){
	
	$("#sendScoreButton").attr("disabled", true);
		
	var courseWorkID = nameSpace.lmsCourseWorkID;
	var score = nameSpace.lmsScore;
	
    $.ajax({
        url: "/schoology/submitgrade",
        type: 'POST',
        data: JSON.stringify({
        	courseWorkID: courseWorkID,
        	score: score
        })
    })
    .done(function(responseText) {		
		responseText =JSON.parse(responseText);
		lateWorkMessage(responseText.lateWorkFlag);    
		updateLMSSubmissionStatus(1);	
    	$("#assignmentModal").modal("hide");
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
		if(jqXHR.status === 400){
	  		var responseText =JSON.parse(jqXHR.responseText);
			showCustomAlert(responseText.message);
		}
        if(jqXHR.status === 401){
            sessionTimeOut();
        }
        else{
            //found in header.js
            logError(window.location.href, jqXHR);
        }
    })
    .always(function() {
    	$("#sendScoreButton").attr("disabled", false);
    });  
    
};

sendCanvasScores = function(){
	
	$("#sendScoreButton").attr("disabled", true);
		
	var courseWorkID = nameSpace.lmsCourseWorkID;
	var score = nameSpace.lmsScore;
	
    $.ajax({
        url: "/canvas/submitgrade",
        type: 'POST',
        data: JSON.stringify({
        	courseWorkID: courseWorkID,
        	score: score,
        	skillType: "skill"
        })
    })
    .done(function(responseText) {
    	responseText =JSON.parse(responseText);
		lateWorkMessage(responseText.lateWorkFlag); 
		updateLMSSubmissionStatus(1);	 
    	$("#assignmentModal").modal("hide");
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
		if(jqXHR.status === 400){
			var responseText =JSON.parse(jqXHR.responseText);
		    showCustomAlert(responseText.message);
		}
        else if(jqXHR.status === 401){
            sessionTimeOut();
        }
        else{
            //found in header.js
            logError(window.location.href, jqXHR);
			showCustomAlert(jqXHR.responseText);
        }
    })
    .always(function() {
    	$("#sendScoreButton").attr("disabled", false);
    });  
    
};

showAssignmentScoreModal = function(scoreData){
	
		var problemType = nameSpace.problemType;
	
		var scoringType;
		if(nameSpace.lmsScoringType === "score"){
			scoringType = "original";
		}
		else{
			scoringType = nameSpace.lmsScoringType;
		}
		
		var firstLetter = scoringType.charAt(0)
		var firstLetterCap = firstLetter.toUpperCase()
		var remainingLetters = scoringType.slice(1)
		var capitalizedWord = firstLetterCap + remainingLetters
		$("#assignmentScoringDisplay").html(capitalizedWord);

		
		$("[name=lmsScoreRow]").remove();
		var totalScore = 0;
		if(problemType === "work" || problemType === "extrapractice"){
			for(var i = 0; i < scoreData.length; i++){
				var scores = scoreData[i];
				var percentage = getAssignmentPercentage(scores);
				totalScore += percentage;	                                    
				var row = '<tr name="lmsScoreRow">';
				row += '<td class="text-left"><span>' + nameSpace.unitNumber + "." + scoreData[i].skill_number + ' - ' + scoreData[i].skill_name + ':</span></td>';
				row += '<td class="text-left"><span>' + percentage + '%</span></td>';
				row += '</tr>';
				$("#assignmentTable tbody").append(row);
			}
		}
		else{
				var scores = scoreData[0];
				var percentage = getAssignmentPercentage(scores);
				totalScore += percentage;	                                    
				var row = '<tr name="lmsScoreRow">';
				row += '<td class="text-left"><span>Unit ' + nameSpace.unitNumber + " - " + nameSpace.unitName + ':</span></td>';
				row += '<td class="text-left"><span>' + percentage + '%</span></td>';
				row += '</tr>';
				$("#assignmentTable tbody").append(row);
		}
		
		
		totalScore = Math.round(totalScore / scoreData.length);
		var row = '<tr name="lmsScoreRow">';
		row += '<td class="text-left"><span><b>Total Score</b></span></td>';
		row += '<td class="text-left"><span><b>' + totalScore + '%</b></span></td>';
		row += '</tr>';
		$("#assignmentTable tbody").append(row);
				
		nameSpace.lmsScore = totalScore;
		
		$("#assignmentModal").modal("show");
}

getLMSScoreDetails = function(){
	
	 var unitID = nameSpace.unitID;
	var lmsCourseWorkID = nameSpace.lmsCourseWorkID;
	var problemType = nameSpace.problemType;
    
    $.ajax({
        url: "/lms/getlmsassignmentdata",
        type: 'GET',
        dataType: 'json',
        data: {
			unitID: unitID,
            lmsCourseWorkID: lmsCourseWorkID,
            problemType: problemType
        }
    })
    .done(function(responseText) {
        var data = responseText.data;
       showAssignmentScoreModal(data);
        
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        if(jqXHR.status === 401){
            sessionTimeOut();
        }
        else{
            logError(window.location.href, jqXHR);
        }
    })
    .always(function() {
        //nothing
    }); 
};

updateLMSSubmissionStatus = function(submissionIndicator){
	
	//if the assignment is linked with an lms
	if(nameSpace.lmsScoringType !== undefined){
		
		var problemType = nameSpace.problemType;
	    var unitID = nameSpace.unitID;
	    var lmsCourseWorkID = nameSpace.lmsCourseWorkID
	    
		$.ajax({
			    url: "/user/updatelmssubmissionstatus",
		        type: 'POST',
		        data: JSON.stringify({
		        	submissionIndicator: submissionIndicator,
		        	problemType, problemType, 
		        	unitID: unitID,
		        	lmsCourseWorkID: lmsCourseWorkID
		        })
		    })
		    .done(function(responseText) {
				if(submissionIndicator == 1){
					updateSubmissionStatusDisplay(true);
				}
				else{
					updateSubmissionStatusDisplay(false);
				}
		    })
		    .fail(function(jqXHR, textStatus, errorThrown) {
		        logError(window.location.href, jqXHR);
		    })
		    .always(function() {
		        //nothing
		    });
	}
};


updateUnitLMSSubmissionStatus = function(submissionIndicator){
	
	//if the assignment is linked with an lms (unit)
	if(nameSpace.unitLmsScoringType !== undefined){
		
		var problemType = nameSpace.problemType;
	    var unitID = nameSpace.unitID;
	     var lmsCourseWorkID = nameSpace.unitLmsCourseWorkID
	    
		$.ajax({
			    url: "/user/updateunitlmssubmissionstatus",
		        type: 'POST',
		        data: JSON.stringify({
		        	submissionIndicator: submissionIndicator,
		        	problemType, problemType, 
		        	unitID: unitID,
		        	lmsCourseWorkID: lmsCourseWorkID
		        })
		    })
		    .done(function() {
				//do nothing
		    })
		    .fail(function(jqXHR, textStatus, errorThrown) {
		        logError(window.location.href, jqXHR);
		    })
		    .always(function() {
		        //nothing
		    });
	}
};

updateSubmissionStatusDisplay = function(submissionStatus){
	
	$("[name=lmsSubmissionIcon]").remove();
		var title, lmsSystem;
		var lmsProvider = nameSpace.lmsProvider ;
		if(lmsProvider === "google"){
			lmsSystem = "Google Classroom"
		}
		else if(lmsProvider === "canvas"){
			lmsSystem = "Canvas"
		}
		else if(lmsProvider === "schoology"){
			lmsSystem = "Schoology"
		}
		
		if(!submissionStatus){
			title = "Your latest work has not been submitted to " + lmsSystem + ".";
			$("#assignmentModalButton").append('<img src="https://positivephysics.s3.us-east-2.amazonaws.com/images/various/not_synched.png" name="lmsSubmissionIcon" style="height: 15px;margin-top: -3px;margin-left: 3px" title="' + title + '">');
		}
		else{
			title = "Your latest work is synched with " + lmsSystem + ".";
			$("#assignmentModalButton").append('<img src="https://positivephysics.s3.us-east-2.amazonaws.com/images/various/synched.png" name="lmsSubmissionIcon" style="height: 15px;margin-top: -3px;margin-left: 3px;" title="' + title + '">');
		}
};

lateWorkMessage = function(flag){
	if(flag !== undefined){
		if(flag === true){
				showCustomAlert("Score submitted successfully, but after the due date.  A late penalty may have been applied");
		}
		else{
				showCustomAlert("Score sent successfully!");
		}
	}
	else{
		showCustomAlert("Score sent successfully!");
	}
}

getAssignmentPercentage = function(scores){
	
	var percentage = 0;
	
	var skillType = nameSpace.skillType;
	var scoringType = nameSpace.lmsScoringType;
	

	if(skillType === "work"){
		switch(scoringType){
			case "completion":
				percentage = scores.completion_skill_score;
				break;
			case "accuracy":
				percentage = scores.accuracy_skill_score;
				break;
			case "average":
				percentage = Math.round((scores.completion_skill_score + scores.accuracy_skill_score) / 2);
				break;
			default:
				percentage = 0;
				break;
		}
	}
	else if(skillType === "extrapractice" || skillType === "extrapracticecorrections"){
		switch(scoringType){
			case "score":
				percentage = scores.skill_score;
				break;
			case "corrections":
				percentage = scores.correction_skill_score;
				break;
			case "average":
				percentage = Math.round((scores.skill_score + scores.correction_skill_score) / 2);
				break;
			default:
				percentage = 0;
				break;
		}
	}
	else if(skillType === "assessment" || skillType === "assessmentcorrections"){
		switch(scoringType){
			case "score":
				percentage = scores.skill_score;
				break;
			case "corrections":
				percentage = scores.correction_skill_score;
				break;
			case "average":
				percentage = Math.round((scores.skill_score + scores.correction_skill_score) / 2);
				break;
			default:
				percentage = 0;
				break;
		}
	}
	return percentage;
}

getAddRemoveProblemData = function(problemID){
	
	var skillID = nameSpace.skillID;
//    var problemID = nameSpace.problemID;
    
    $("[name=addRemoveButton]").removeClass("lightGrayTableCellButton").addClass("greenTableCellButton");
    $("[name=addRemoveButton]").attr("data-status", "active");
    
    $.ajax({
        url: "/skill/activeproblemdata",
        type: 'GET',
        dataType: 'json',
        data: {
            problemID: problemID,
            skillID: skillID
        }
    })
    .done(function(responseText) {
        var data = responseText.data;
        if(data.length > 0){
            $("#addRemovalFlag").removeClass("d-none");
            for(var i = 0; i < data.length; i ++){
                $("[name=addRemoveButton][data-type='" + data[i].skill_type + "'][data-section-id='" + data[i].section_id + "']").removeClass("greenTableCellButton").addClass("lightGrayTableCellButton");
                $("[name=addRemoveButton][data-type='" + data[i].skill_type + "'][data-section-id='" + data[i].section_id + "']").attr("data-status", "inactive");
            } 
        }
        else{
            $("#addRemovalFlag").addClass("d-none");
        }
        
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        if(jqXHR.status === 401){
            sessionTimeOut();
        }
        else{
            logError(window.location.href, jqXHR);
        }
    })
    .always(function() {
        //nothing
    }); 
};

addRemoveProblem = function(dataArray){
		
    $.ajax({
        url: "/skill/addremoveproblemfromskill",
        type: 'POST',
        data: JSON.stringify({
            dataArray: dataArray
        })
    })
    .done(function(responseText) {
        if($("[name=addRemoveButton][data-status=inactive]").length > 0){
            $("#addRemovalFlag").removeClass("d-none");
        }
        else{
            $("#addRemovalFlag").addClass("d-none");
        }
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        if(jqXHR.status === 401){
            sessionTimeOut();
        }
        else{
            logError(window.location.href, jqXHR);
        }
    })
    .always(function() {
        //nothing
    }); 
    
};

checkProblemValidity = function(problemID){
	
	var problemData = nameSpace.problem;		
	var skillType = nameSpace.skillType;
	var freeAccess = nameSpace.unitFreeAccess;
	var courseVisibility = nameSpace.courseVisibility;
	var upgradeStatus = parseInt($("#upgradeStatus").val());
	var problemData = nameSpace.problem;
	var userID = parseInt($("#userID").val());
	var validProblemBoolean = false;
	var originalCreatorID = 1;
	
	//if the account is free, the course is private, and it is an original problem being used in a content creators skill
	if((upgradeStatus === 0) && (courseVisibility === "private") && (problemData.user_id === originalCreatorID) && (problemData.user_id !== userID)){
		validProblemBoolean = false;
	}
	
	//if a free account
	else if(upgradeStatus === 0){
		
		if(!freeAccess){
					
			if(skillType === "extrapractice" || skillType === "assessment"){
				$("#problemHTML [name=answer]").css("background", "#dee2e6");
				$("#problemHTML [name=answer]").attr("disabled", true);		
				validProblemBoolean = false;
			}
			else {
								
				var problemArray = nameSpace.problemArray;
				var problemCount = Math.ceil(problemArray.length / 4);
				
				//push the allotted number of problems into an array
				var tempArray = [];
				for(var i = 0; i < problemCount; i++){
					tempArray.push(problemArray[i]);
				}
				
				//check to see if the problem to be checked is in new array
				for(var i = 0; i < tempArray.length; i++){
					if(tempArray[i].problem_id === problemID){
						validProblemBoolean = true;
						break;
					} 
				}
			}
		}
		else{
			validProblemBoolean = true;
		}
	}
	else{
		validProblemBoolean = true;
	}
	
	if(!validProblemBoolean){
		$("#problemHTML [name=answer]").css("background", "#dee2e6");
		$("#problemHTML [name=answer]").addClass("nohover");
		$("#problemHTML [name=answer]").wrap("<div data-type='answerContainer' style='display:initial'></div>");
		$("[data-type=answerContainer]").tooltip({
    		title: "Trial users may check answers on free units and first 25% of Work questions on other units.  Please upgrade for full access.", 
    		placement: "top"
    	});
	}
	
	nameSpace.problemValidity = validProblemBoolean;
};

var checkAnswersPaused = false;

// set a recurring timer to reset the checkAnswersPaused flag every 2 seconds and ensure it's set back to false
// this in theory shouldn't be necessary but it might help in some edge cases where we are seeing the flag get stuck on true
// this is a hack to potentially get rid of a bug
setInterval(function() {
    checkAnswersPaused = false;
}, 2000);

checkAnswers = function(answerMap, cbdFlag){
	var problemValidity = nameSpace.problemValidity;
    // return if answerMap is empty (answerMap is just {})
    if (Object.keys(answerMap).length === 0) {
        showCustomAlert("There aren't any questions to be checked.");
        return;
    }
	if(!problemValidity){
		showCustomAlert("For security purposes, trial users may only check answers on first 25% of work questions after trial units.");
		return;
	}

    if (!successfully_stored_answers) {
        showCustomAlert("It seems the server had a problem storing your problem. Wait 10 seconds, try submitting again, and if it still doesn't work, try refreshing the page. Otherwise, please ask your teacher to contact support.");
        // Throw an error to log the issue
        throw new Error("Problem answers not yet stored on server by time of answer check. Telemetry: " + unsuccessfully_stored_answers + ".");
    }

    if(checkAnswersPaused){
        // showCustomAlert("You must wait at least half a second between answer checks.");
        return;
    }
    checkAnswersPaused = true;

    var problemID = nameSpace.problemID;
    var problemType = nameSpace.problemType;
    var skillID = nameSpace.skillID;
    var skillType = nameSpace.skillType;
    var unitID = nameSpace.unitID;
    var answerString = JSON.stringify(answerMap);
    
    $.ajax({
        url: "/skill/checkuseranswers",
        type: 'POST',
        timeout: 15000,
        dataType: 'json',
        data: JSON.stringify({
        	userAnswers: answerString,
            problemID: problemID,
            unitID: unitID,
            skillID: skillID,
            skillType: skillType,
            problemType: problemType,
            cbdFlag: cbdFlag,
            lateWorkWarningVisible: nameSpace.lateWorkWarningMessageIsVisible
        })
    })
    .done(function(responseText) {
        
        var data = responseText.data; 
    
        setSkillScores(data);
        checkLMSSkillCompletion(data);
        updateLMSSubmissionStatus(0);
        updateUnitLMSSubmissionStatus(0);
        
        if(cbdFlag){
            if(!data.cbd){
                $("#cannotBeDeterminedButton").addClass("d-none");
                $("#canBeDeterminedButton").removeClass("d-none");
            }
        }

        var statusJSON = JSON.parse(data.status);
        var attemptJSON = JSON.parse(data.attempts);
        var answerData = JSON.parse(data.answers);
        var answerJSON = JSON.parse(data.user_answers);

        pauseIfIncorrect(statusJSON);
        
        populateUserInputs(answerData);
        setBarProblemColor();
        adjustUserAnswers(answerJSON); //make the user answers rounded to the correct answers
        updateAnswerStatus(statusJSON, attemptJSON);
        focusToActiveElement(statusJSON);

        // update the FRQ feedback if data.feedback is an array of greater than 0 length
        if (data.feedback && Array.isArray(data.feedback) && data.feedback.length > 0) {
            // find all the ppFrqGrading elements
            var frqGradingElements = $(".ppFrqGrading");

            let i = 0;
            data.feedback.forEach(function(feedback1) {
                var frqGradingElement = $(frqGradingElements[i]);
                i++;
                var frqFeedbackElements = frqGradingElement.find(".ppFrqFeedback")

                let j = 0;
                feedback1.forEach(function(feedback) {
                    // find the corresponding feedback element
                    var frqFeedbackElement = $(frqFeedbackElements[j]);
                    j++;
                    
                    // set the text of the feedback element
                    frqFeedbackElement.text(feedback);
                });

            });
        }
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        var responseText = jqXHR.responseJSON;
        switch(jqXHR.status){
            case 400:
                showCustomAlert(responseText.message);
                break;
            case 401:
                sessionTimeOut();
                break;
            case 405:
                if(responseText.skill_status === "locked" || responseText.skill_status === "due_date"){
                    displayProblemNotAllowed();
                }
                if(responseText.skill_status === "due_date_resubmit_warning"){
                    document.getElementById("lateWorkWarningMessage").style.visibility = 'visible';
                    nameSpace.lateWorkWarningMessageIsVisible = true;
                }
                else if(responseText.skill_status === "finalized"){
                    currenturl = window.location.href;
                    var newurl = currenturl.replace(/mode=assessment/, "mode=assessmentcorrections");
                    window.location = newurl;
                }
                break;
            default:
                // if there's a message in the responseText, use that, otherwise use a generic error message
                if(responseText && responseText.message){
                    showCustomAlert(responseText.message);
                } else {
                    alertAndThrowError("Error has occurred",jqXHR.status,errorThrown,this.url);
                }
                break;
        }
    })
    .always(function() {
        setTimeout(function(){
            checkAnswersPaused = false;
        }, 300);
    });  
};

pauseIfIncorrect = function(status){
    var pause_after_incorrect = nameSpace.pause_after_incorrect;
    // For key, value pairs in status object, check if the value is "incorrect".
    // If any are incorrect, then pause.
    var at_least_one_incorrect = false;
    for (var key in status) {
        if (status[key] === "incorrect") {
            at_least_one_incorrect = true;
        }
    }
    let mode = $("#mode").val();
    // Should not run in assessment or extra practice modes
    if (at_least_one_incorrect && pause_after_incorrect > 0 && mode !== "assessment" && mode !== "extrapractice") {
        $("#checkAnswersButton").css("background-color", "#aaaaaa");
        $("#checkAnswersButton").html("Checking paused for " + pause_after_incorrect + " seconds");

        // make the button unclickable
        $("#checkAnswersButton").attr("disabled", true);
        $("#checkAnswersButton").css("pointer-events", "none");

        // Also grey out any specific answers that are incorrect.
        var answers = $("#problemHTML [name=answer]");
        for(var i in status) {
            if (status[i] === "incorrect") {
                $(answers[i]).addClass("disabledIncorrectAnswer");
                $(answers[i]).css("pointer-events", "none");
                $(answers[i]).attr("disabled", true);
            }
        }

        setTimeout(function() {
            $("#checkAnswersButton").css("background-color", "#2989d8");
            $("#checkAnswersButton").html("Check Answers");

            // make the button clickable again
            $("#checkAnswersButton").attr("disabled", false);
            $("#checkAnswersButton").css("pointer-events", "auto");

            $(".disabledIncorrectAnswer").css("pointer-events", "auto");
            $(".disabledIncorrectAnswer").attr("disabled", false);
            $(".disabledIncorrectAnswer").removeClass("disabledIncorrectAnswer");
        }, pause_after_incorrect*1000 + 100);
    }
}

checkLMSSkillCompletion = function(data){
	//new code to check for lms completion
	var userRole = $("#userRole").val();
	var lmsSubmissionInd = nameSpace.lms_submission_reminder_ind;

    if (userRole === "student" && lmsSubmissionInd == 1) {
		
		if(nameSpace.lmsCourseWorkID){
			//work
			if(data.completion_skill_score === 100){
				getLMSScoreDetails();
			}
			//extra practice and assessment
			else if(data.correction_skill_score === 100){
				getLMSScoreDetails();
			}
		}
	}	
}

getSkillScores = function(){
    
    var unitID = nameSpace.unitID;
    var skillID = nameSpace.skillID;
    var skillType = nameSpace.skillType; 
    var problemType = nameSpace.problemType;
    
    $.ajax({
        url: "/skill/skillscores",
        type: 'GET',
        dataType: 'json',
        data: {
            unitID: unitID,
            skillID: skillID,
            skillType: skillType,
            problemType: problemType
        }
    })
    .done(function(responseText) {
        var data = responseText.data;
        setSkillScores(data);
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        if(jqXHR.status === 401){
            sessionTimeOut();
        }
        else{
            logError(window.location.href, jqXHR);
        }
    })
    .always(function() {
        //nothing
    });
};

setSkillScores = function(data){
	
	var skillType = nameSpace.skillType;
	var problemID = nameSpace.problemID;
	
	nameSpace.skillScores = data;
	
	switch(skillType){
	    case "work":
	    case "bonus":
	        $("[name=completionPercentage]").html(data.completion_skill_score);
	        $("[name=accuracyPercentage]").html(data.accuracy_skill_score);
	        $("[name=barProblem][data-problem-id=" + problemID + "]").attr("accuracy_score", data.accuracy_problem_score);
	        $("[name=barProblem][data-problem-id=" + problemID + "]").attr("completion_score", data.completion_problem_score);
	        break;
	    case "extrapractice":
	        $("[name=scorePercentage]").html(data.skill_score);
	        $("[name=barProblem][data-problem-id=" + problemID + "]").attr("score", data.problem_score);
	        $("[name=barProblem][data-problem-id=" + problemID + "]").attr("completion_status", data.problem_completion_status);
	        break;  
	    case "extrapracticecorrections":
	        $("[name=scorePercentage]").html(data.skill_score);
	        $("[name=correctionPercentage]").html(data.correction_skill_score);
	        $("[name=barProblem][data-problem-id=" + problemID + "]").attr("score", data.problem_score);
	        $("[name=barProblem][data-problem-id=" + problemID + "]").attr("correction_score", data.correction_problem_score);
	        $("[name=barProblem][data-problem-id=" + problemID + "]").attr("completion_status", data.problem_completion_status);
	        break;
	    case "assessment":
	        $("[name=scorePercentage]").html(data.skill_score);
	        $("[name=barProblem][data-problem-id=" + problemID + "]").attr("score", data.problem_score);
	        $("[name=barProblem][data-problem-id=" + problemID + "]").attr("completion_status", data.problem_completion_status);
	        break;  
	    case "assessmentcorrections":
	        $("[name=scorePercentage]").html(data.skill_score);
	        $("[name=correctionPercentage]").html(data.correction_skill_score);
	        $("[name=barProblem][data-problem-id=" + problemID + "]").attr("score", data.problem_score);
	        $("[name=barProblem][data-problem-id=" + problemID + "]").attr("correction_score", data.correction_problem_score);
	        $("[name=barProblem][data-problem-id=" + problemID + "]").attr("completion_status", data.problem_completion_status);
	        break;
	}
	
	if(skillType === "extrapractice" || skillType === "extrapracticecorrections"){
		$("#restartButtonContainer").removeClass("d-none");
	}
	
	if(data.correction_skill_score === 100){
	    $("#restartProblemButton").removeClass("disabledButton");
	    $("#restartProblemButton").attr("title", "Click to restart");
	}
};

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

    //
    // CREATE PROBLEM STRUCTURE
    // 

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

    var sendOrResendNewStyleProblemData = checkIfAnswerValuesCorrectlyStored(problem);
    // var sendOrResendNewStyleProblemData = true;
    
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

    // Check if this is the first time we've visited the problem
    if(problem.javascript || sendOrResendNewStyleProblemData){
        // First time problem has been visited, so now we have to go through and generate all the randoms
        var dataObject = createProblemDataObject(problem);

        successfully_stored_answers = false;
        unsuccessfully_stored_answers = "";
        storeProblemGeneratedData(dataObject);
    } 
    else if (problem.newStyleProblem) {
        send()
        successfully_stored_answers = true;
    } else {
        send()
        successfully_stored_answers = true;
        // If old-style problem with stored html and js, but the js isn't included
        // assume it's the second time we've visited and grab all the randoms and
        // populate all the elements.
        if(isJson(problem.randoms)){
            var randomData = JSON.parse(problem.randoms);

            var randoms = $("[name=randSpan]");
            for(var i = 0; i < randoms.length; i++){
                $(randoms[i]).html(randomData[i]);
            }
        }
    }
	    
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

    //
    // END CREATE PROBLEM STRUCTURE
    //
    
    //check whether the problem has been credited
    var problemMap = nameSpace.problemMap;
    var problemStatus = problemMap[problem.problem_id].problem_status;

    if (problemStatus === 1) {
        defaultProblemFooter();
    }
    else if(problemStatus === 2) {
        creditedProblemFooter();
    }
    
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
    
    var skillType = nameSpace.skillType;
    if (nameSpace.problemHintIndicator === 3) {
        // '3' is 'No' which means the teacher has set hints to never be shown
        $("#hintButtonContainer").hide();
    }
    else if (skillType !== "extrapractice" && skillType !== "assessment") {
        //check if the problem has a hint
        if(problem.hint && problem.hint !== "" && (nameSpace.ai_allowed_by_teacher != 1) ){

            var hint = problem.hint;
            $("#hintBody").html(hint);
            $("#hintButton").text("Hint!");

            var hintImages = $("#hintBody img");
            for(var i = 0; i < hintImages.length; i++){
                var source = $(hintImages[i]).attr("src");
                var new_source = baseURL + source;
                createImageUrl(hintImages[i], new_source); //in problemconfig.js
            }

            $("#hintButtonContainer").css("display", "block");
        } else if (nameSpace.ai_allowed_by_teacher == 1) {
            var hint = "";
            if (problem.hint && problem.hint !== "") {
                hint = problem.hint;
            }

            $("#hintBody").html(hint);
            $("#hintButton").html("AI Tutor BETA");

            var hintImages = $("#hintBody img");
            for(var i = 0; i < hintImages.length; i++){
                var source = $(hintImages[i]).attr("src");
                var new_source = baseURL + source;
                createImageUrl(hintImages[i], new_source); //in problemconfig.js
            }

            $("#hintButtonContainer").css("display", "block");
        }
        else{
            $("#hintButtonContainer").css("display", "none");
        }
    } else {
        $("#hintButtonContainer").css("display", "none");
    }

    // reformat randSpans with commas if appropriate
    $("[name=randSpan], .pp-tag-v:not(.noComma)").each(function() {
        var text = $(this).text();
        // If text is numeric, add commas
        if (!isNaN(parseFloat(text)) && isFinite(text) && ($(this).html() == text)) {
            var newText = addCommaSeparatorsMin10000(text);
            $(this).text(newText);
        }
    });

    // Mark things with translate="no" as appropriate
    addNoTranslationAttributes("#problemHTML");

    
};

getProblemMarkdownWithContext = function() {
    // Get the problem in LLM markdown format
    most_recent_prob_markdown = getProblemMarkdown();
    let markdown_plus_hint_and_refsheet = "START OF PROBLEM that the user needs help with: \n" + most_recent_prob_markdown + "\nEND OF PROBLEM\n";
    if ($("#hintBody").html().length > 0) {
        markdown_plus_hint_and_refsheet += "\n\nGOLDEN DIRECTIONS: <golden>\n" + turndownService.turndown($("#hintBody").html()) + "\n</golden>\n";
    }

    // Don't provide the conversions reference as it's the default and the LLM already has that
    // stuff mastered in its mind!
    if ($("#referenceContent .topicRow:not(#conversionsRef)").length > 0) {
        let refText = turndownService.turndown($("#referenceContent .topicRow").html());
        markdown_plus_hint_and_refsheet = "FORMULA REFERENCE (may or may not be useful):\n" + refText + "\nEND OF FORMULA REFERENCE\n\n" + markdown_plus_hint_and_refsheet;
    }

    // Import the lesson
    let lessonText = turndownService.turndown($("#noteContent").html());
    markdown_plus_hint_and_refsheet = "LESSON PRECEDING PROBLEM:\n" + lessonText + "\nEND OF LESSON\n\n" + markdown_plus_hint_and_refsheet;

    // Include the value for g
    markdown_plus_hint_and_refsheet = "If it's needed, the value for gravity (g) that is used is "+gravm+" m/s^2.\n\n" + markdown_plus_hint_and_refsheet;

    // Include the value for tolerance
    markdown_plus_hint_and_refsheet = "The tolerance for determining correct answers is ± "+ nameSpace.problem.tolerance*100 +"%. The answers that are provided include ± error bounds for checking if close enough.\n" + markdown_plus_hint_and_refsheet;                

    // Add the answers on the server side so the student can't see them
    markdown_plus_hint_and_refsheet += "\n\n" + "[insertanswers]";
    // console.log(markdown_plus_hint_and_refsheet);

    return markdown_plus_hint_and_refsheet;
}

getProblemMarkdown = function() {
    var additionalInstructions = "";
    // Gather text for AI hints
    var problemTextClone = $("#problemHTML").clone(true);

    // Replace all the <span translate="no"> elements with their contents
    problemTextClone.find("span[translate='no']").replaceWith(function() {
        return $(this).contents();
    });

    // Final all the <span class="aionly"> elements and move them to the end of the problem
    // this keeps them from being mixed up with the problem itself
    var aionly = problemTextClone.find("span.aionly");
    if (aionly.length > 0) {
        aionly.each(function() {
            $(this).remove();
            problemTextClone.append($(this));
        });
    }

    // SELECT TAGS: Iterate through elements matching the selector select.correctAnswerMulti inside #problemHTML in order.
    // In each case we find the corresponding element within problemTextClone and replace it with a placeholder.
    let selectedOptions = [];
    $("#problemHTML select.correctAnswerMulti, #problemHTML select.correctAnswer").each(function(index) {
        let selected = $(this).find("option:selected").text();
        selectedOptions.push(selected);
    });
    problemTextClone.find("select.correctAnswerMulti, select.correctAnswer").each(function(index) {
        $(this).replaceWith('<question type="select" status="correct">' + selectedOptions.shift() + "</question>");
    });

    // SELECT TAGS: Same thing again but for incorrect answers
    selectedOptions = [];
    $("#problemHTML select.incorrectAnswer").each(function(index) {
        let selected = $(this).find("option:selected").text();
        selectedOptions.push(selected);
    });
    problemTextClone.find("select.incorrectAnswer").each(function(index) {
        $(this).replaceWith('<question type="select" status="incorrect">' + selectedOptions.shift() + "</question>");
    });

    // Screen reader stuff just gets in the way
    problemTextClone.find(".sr-only").remove();

    // We aren't ready to render simulation-related stuff into markdown yet (or probably ever)
    problemTextClone.find(".dyndropdown").remove();
    if (problemTextClone.find(".simcontrols").length > 0) {
        additionalInstructions = additionalInstructions + " (NOTE TO AI: There is a time-based simulation visible to the user. They have the ability to hit play or move time forward and back with step buttons and see how the numbers and/or images change.) ";
    }
    problemTextClone.find(".simcontrols").remove();

    // Within complicated image containers that may have multiple overlays etc, we only want the first image
    // TODO/FIXME: might need to preserve any answer blanks and/or labels that are in the image container
    problemTextClone.find(".image-container").each(function() {
        $(this).children("img:first").siblings().remove();
    });

    // Images without an informative alt text
    missingimages = problemTextClone.find('img[alt="Image showing situation described in the problem"]');
    if (missingimages.length > 0) {
        missingimages.replaceWith('image-without-alt-text');
        additionalInstructions = additionalInstructions + " (NOTE TO AI: There is an image without alt text. Please admit that your hints may be wrong if the image contains important information, or ask the user to describe.) ";
    }

    // Replace answer entry locations one by one with blanks or placeholders as appropriate
    // Matches most specific first
    problemTextClone.find('input[name=answer]').each(function() {
        var inputValue = $(this).val();
        if ($(this).hasClass("incorrectAnswer")) {
            $(this).replaceWith('<question type="input" status="incorrect">' + inputValue + "</question>");
        } else if (($(this).hasClass("correctAnswer") || $(this).hasClass("correctAnswerMulti") ) && (inputValue.trim() !== "")) {
            // Replace the input with a span containing the input's value
            $(this).replaceWith('<question type="input" status="correct">' + inputValue  + "</question>");
        }
    });

    problemTextClone.find('[name="answer"][id*="unit"]').replaceWith('<question type="select" status="unattempted" what="units">__</question>');
    problemTextClone.find('select[name=answer]').replaceWith(function() {
        // Get the list of options and concatenate them with | in between them
        var options = $(this).find('option:not(:empty)').map(function() {
            option = "'"+$(this).text()+"'"
            if ($(this).text() != $(this).val()) {
                option = '('+$(this).val()+') ' + option;
            }
            return option;
        }).get().join(' | ');
        if (options.length < 150) {
            return '<question type="select" status="unattempted" options="'+options+'">__</question>';
        } else {
            return '<question type="select" status="unattempted">__</question>';
        }
        
    });
    problemTextClone.find("[name=answer]").replaceWith('<question type="input" status="unattempted">__</question>');

    // Go through all elements of node type "question" in problemTextClone and add an id="1", id="2", etc. to them
    problemTextClone.find('question').each(function(index) {
        $(this).attr("id", index + 1);
    });

    problemTextClone.find('tr').each(function() {
        var combinedText = '';
        $(this).find('td').each(function() {
            combinedText += turndownService.turndown(this) + '&nbsp;&nbsp;&nbsp;&nbsp;';
        });
        // Remove all existing tds
        $(this).find('td').remove();
        // Append a single td with the combined text
        $(this).append('<td>' + combinedText.trim().replace(/\\=/g, '=') + '</td>');
        // console.log(combinedText);
    });

    // console.log("Problem text clone: " + problemTextClone.get(0));

    var problemText = turndownService.turndown(problemTextClone.get(0));
    problemText = problemText.replace(/\\=/g, '=');

    return problemText + additionalInstructions;
}

// if the assessment is open and not finalized, block them from seeing completed answers
displayProblemNotAllowed = function(){
    answerIds = [];
    // answerValues = [];

    $("#problemHTML").empty();
    $("#problemHTML").html("<br><br>This question cannot be viewed.  Please return to the dashboard to see the reason.<br><br>");

    $("#footerContainer").hide();

    $("#problemscript").remove();

    //fix chemistry problems
    if($("#diagramDiv").children().length === 0){
        $("#diagramDiv").css({
            "width": "0px",
            "height": "1px"
        });
    }

    setContentHeight(); //found in header
};

//if the problem is old style and has not been visited before, the javascript is included and processed
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
        // imgui.elements = [];
        // imgui.staticText("Answers:")
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

//get problem answers
problemAnswers = function(){
    
	var problemID = nameSpace.problemID;
    var skillID = nameSpace.skillID;
    var problemType = nameSpace.problemType;
    
    $.ajax({
        url: "/skill/problemanswers",
        type: 'GET',
        dataType: 'json',
        data: {
            problemID: problemID,
            skillID: skillID,
            problemType: problemType,
            userID: null
        }
    })
    .done(function(responseText) {
        var data = responseText.data; 
        var answerData = JSON.parse(data.answers);
        populateUserInputs(answerData);
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        var responseText = jqXHR.responseJSON;
        switch(jqXHR.status){
            case 400:
                showCustomAlert(responseText.message);
                break;
            case 401:
                sessionTimeOut();
                break;
            case 405:
                showCustomAlert(responseText.message);
                break;
            default:
                alertAndThrowError("Error has occurred",jqXHR.status,errorThrown,this.url);
                break;
        }
    })
    .always(function() {
        //nothing
    }); 
};

//restart problems in the skill
restartProblems = function(){
    
    var courseID = nameSpace.courseID;
    var unitID = nameSpace.unitID;
    var skillID = nameSpace.skillID;
    var problemID = nameSpace.problemID;
    if(!problemID){
        showCustomAlert("Problem ID is undefined. Cannot restart problem. Try refreshing the page and waiting for it to fully load.");
        return;
    }

    var skillType = nameSpace.skillType;
    var problemType = nameSpace.problemType;
    
   var restartType = $('input[name="restartType"]:checked').val();

    
    // Ask server to delete the user problem data
    $.ajax({
        url: "/skill/restartuserproblems",
        type: 'POST',
        dataType: 'json',
        data: JSON.stringify({
            unitID: unitID,
            skillID: skillID,
            skillType: skillType,
            problemType: problemType,
            restartType: restartType
        })
    })
    .done(function(responseText) {
        // reload the page, which ultimately will regenerate the problem
        if(skillType === "extrapracticecorrections"){
            window.location = "?courseID=" + courseID + "&unitID=" + unitID + "&skillID=" + skillID + "&mode=extrapractice&problemID=" + problemID;
        }
        else if(skillType === "assessmentcorrections"){
            window.location = "?courseID=" + courseID + "&unitID=" + unitID + "&skillID=" + skillID + "&mode=assessment&problemID=" + problemID;
        }
        else{
            window.location = "?courseID=" + courseID + "&unitID=" + unitID + "&skillID=" + skillID + "&mode=" + skillType + "&problemID=" + problemID;
        }
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        var responseText = jqXHR.responseJSON;
        switch(jqXHR.status){
            case 400:
                showCustomAlert(responseText.message);
                break;
            case 403:
                showCustomAlert(responseText.message);
                break;
            default:
                alertAndThrowError("Error has occurred",jqXHR.status,errorThrown,this.url);
                break;
        }
    })
    .always(function() {
        //nothing
    });  
};

//update extra practice skill status by user
/*
updateExtraPracticeSkillStatusByUser = function(dataObject){
	 
    $.ajax({
        url: "/skill/updateextrapracticeskillstatusbyuser",
        type: 'PATCH',
        dataType: 'json',
        data: JSON.stringify(dataObject)

    })
    .done(function(responseText) {
        var url = new URL(window.location.href);
        url.searchParams.set("mode", "extrapracticecorrections");
        window.location = url;
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        if(jqXHR.status === 401){
            sessionTimeOut();
        }
        else{
            logError(window.location.href, jqXHR);
        }
    })
    .always(function() {
        //nothing
    });  
};
*/

updateFinalizationStatusByUser = function(dataObject, modeType){

        $.ajax({
            url: "/skill/updatefinalizationstatusbyuser",
            type: 'PATCH',
            dataType: 'json',
            data: JSON.stringify(dataObject)
        })
        .done(function() {
			  if(modeType === "extrapractice"){
				  var url = new URL(window.location.href);
		         url.searchParams.set("mode", "extrapracticecorrections");
		         window.location = url;
			  }
			 else  if(modeType === "assessment"){
				  var url = new URL(window.location.href);
		         url.searchParams.set("mode", "assessmentcorrections");
		         window.location = url;
			  }
        })
        .fail(function(jqXHR, textStatus, errorThrown) {
            if(jqXHR.status === 401){
                sessionTimeOut();
            }
            else{
                logError(window.location.href, jqXHR);
            }
        })
        .always(function() {
        //nothing
        });
};

//populate the inputs with the user answers
populateUserInputs = function(answerData){
    
    var answers = $("#problemHTML [name=answer]");
    
    for(var i = 0; i < answers.length; i++){
        if($(answers[i]).prop("nodeName").toLowerCase() === 'input' ) {
            if(answerData[i] === "cbd"){
                $(answers[i]).val("cannot");
            }
            else{
                let ad = answerData[i];
                // if ad is a string and starts with "sym:" then replace "sym:" with ""
                if (typeof ad === 'string' && ad.startsWith("sym:")) {
                    ad = ad.replace("sym:", "");
                }
                $(answers[i]).val(ad);
                // If answerData[i] is numeric, add comma separators
                if(!isNaN(ad)) {
                    addCommaSeparatorsToInput(answers[i]);
                }
            }
        }
        else if($(answers[i]).prop("nodeName").toLowerCase() === 'select' ) {
            if(answerData[i] === "x"){
                $(answers[i]).append(new Option("x", "x"));
            }
            else if(answerData[i] === "cbd"){
                $(answers[i]).append(new Option("cannot", "cbd"));
            }
            $(answers[i]).val(answerData[i]);
        }
        else if($(answers[i]).prop("nodeName").toLowerCase() === 'textarea' ) {
            let ad = answerData[i];
            if (typeof ad === 'string' && ad.startsWith("ppfrq:")) {
                // split on \n and take the line that starts with exemplar
                exemplar_line = ad.split("\n").find(line => line.startsWith("exemplar"));
                // take everything in exemplar ?= ?"(.*?)" and put it into the textarea
                if (exemplar_line) {
                    exemplar = exemplar_line.match(/exemplar ?= ?"?([^"]*)"?/);
                    $(answers[i]).val(exemplar[1]);
                }
            } else {
                $(answers[i]).val(ad);
            }
        }
    }
};

//update the answer status when answers have been checked
updateAnswerStatus = function(statusJSON, attemptJSON){

	var problem = nameSpace.problem;
	var problemArray = nameSpace.problemArray;
	
	var skillType = nameSpace.skillType;
	
	var correctAnswerCount = 0;
    var totalAnswersCount = 0;
    var frqAnsIndex = 0;
	
	var answers = $("#problemHTML [name=answer]");
    for(var i in statusJSON){
    	
    	// keep track of inputs that allow negatives or letters
    	var negativeInputs = $("#problemHTML [name=answer].allownegative");
        var letterInputs = $("#problemHTML [name=answer].symbolicanswer");
        var disabledIncorrectAnswers = $("#problemHTML [name=answer].disabledIncorrectAnswer");
        // remove classes
    	$(answers[i]).removeClass();
        // re-add the two that we don't want removed
    	$(negativeInputs).addClass("allownegative");
        $(letterInputs).addClass("symbolicanswer");
        $(disabledIncorrectAnswers).addClass("disabledIncorrectAnswer");

        // Free response handling
        let isFrq = $(answers[i]).is("textarea") && $(answers[i]).parent().hasClass("ppFrq");
        // console.log("isFrq: " + isFrq);
        if(isFrq){
            frqAnsIndex = 0;
        }
        let isFrqDummy = $(answers[i]).is("input") && $(answers[i]).parent().hasClass("ppFrq");
        // console.log("isFrqDummy: " + isFrqDummy);
        if(isFrqDummy){
            frqAnsIndex++;
        }
    	    	
        switch(statusJSON[i]){
            case "correct":
            	if (isFrq || isFrqDummy) {
                    var widget = $(answers[i]).closest(".ppFrq").data("frqWidget");
                    if (attemptJSON[i] >= 2) {
                        widget.updatePointStatus(frqAnsIndex, "correct_on_resubmit");
                    } else {
                        widget.updatePointStatus(frqAnsIndex, "correct");
                    }
                    // widget.updateFeedback(frqAnsIndex, "Correct Answer");
                } else {
                    if(attemptJSON[i] >= 2){
                        $(answers[i]).addClass("correctAnswerMulti");
                        $(answers[i]).attr("aria-label", "Corrected Answer");
                    }
                    else{
                        $(answers[i]).addClass("correctAnswer");
                        $(answers[i]).attr("aria-label", "Correct Answer");
                    }
                    $(answers[i]).prop('disabled', true);
                }
                correctAnswerCount ++;
                totalAnswersCount ++;
                break;
            case "incorrect":     
            	if (isFrq || isFrqDummy) {
                    var widget = $(answers[i]).closest(".ppFrq").data("frqWidget");
                    widget.updatePointStatus(frqAnsIndex, "incorrect");
                    if((skillType === "extrapractice") || (skillType === "assessment")){
                        $(answers[i]).prop('disabled', true);
                        $(answers[i]).addClass("incorrectAnswerDisabled");
                        $(answers[i]).attr("aria-label", "Incorrect Answer (Locked until finalized)");
                    }
                } else {      	
                    if((skillType === "extrapractice") || (skillType === "assessment")){
                        $(answers[i]).prop('disabled', true);
                        $(answers[i]).addClass("incorrectAnswerDisabled");
                        $(answers[i]).attr("aria-label", "Incorrect Answer (Locked until finalized)");
                    }
                    else{
                        $(answers[i]).addClass("incorrectAnswer");
                        $(answers[i]).attr("aria-label", "Incorrect Answer");
                    }
                }
                totalAnswersCount ++;
                break;
            case "default":
            	$(answers[i]).addClass("defaultAnswer");
                break;
        }
    }
    
    var answerCount = 0;
    if(skillType === "extrapractice" || skillType === "assessment"){
        answerCount = totalAnswersCount;
    }
    else{
        answerCount = correctAnswerCount;
    }
    
    if(answers.length === answerCount){
        
        var counter = 0;
        for(var i = 0; i < problemArray.length; i++){
            if(problemArray[i].problem_id === problem.problem_id){
                break;
            }
            counter ++;
        }
        
        if(counter === problemArray.length - 1){
        	var problemID = problemArray[counter].problem_id;
        	var skillID = problemArray[counter].skill_id;
            updateProblemFooter(problemID, skillID, "dash");
        }
        else{
        	counter ++;
        	var problemID = problemArray[counter].problem_id;
        	var skillID = problemArray[counter].skill_id;
            updateProblemFooter(problemID, skillID, "next");
        }
    }
};

//update bottom bar for removed problem
removedProblemUpdate = function(currentProblemID){

	var problemArray = nameSpace.problemArray;
	
	var counter = 0;
    for(var i = 0; i < problemArray.length; i++){
        if(problemArray[i].problem_id === currentProblemID){
            break;
        }
        counter ++;
    }
    
    if(counter === problemArray.length - 1){
    	var problemID = problemArray[counter].problem_id;
    	var skillID = problemArray[counter].skill_id;
    	removedProblemFooter(problemID, skillID, "dash");
    }
    else{
    	counter ++;
    	var problemID = problemArray[counter].problem_id;
    	var skillID = problemArray[counter].skill_id;
    	removedProblemFooter(problemID, skillID, "next");
    }    
};

adjustUserAnswers = function(answerJSON){
    var answers = $("#problemHTML [name=answer]");
    for(var i = 0; i < answers.length; i++){
        if(answerJSON[i]){
            if(answerJSON[i] !== "cbd"){
                $(answers[i]).val( addCommaSeparatorsMin10000(answerJSON[i]) );
            }
        }
    }
};

//move focus to next active element
focusToActiveElement = function(statusJSON){
	
	var allCorrectAnswers = true;
	var answers = $("#problemHTML [name=answer]");
	
	for(var i = 0; i < answers.length; i ++){
        if(statusJSON[i]){
            if(statusJSON[i] === "default"){
                //$(answers[i]).focus();
                allCorrectAnswers = false;
                break;
            }
        }
    }
	
	if(allCorrectAnswers){
        if($("#nextProblemButton").css("display") === "inline-block"){
            $("#nextProblemButton").focus();
        }
        else if($("#dashboardButton").css("display") === "inline-block"){
            $("#dashboardButton").focus();
        }
    }
};

setBarProblemColor = function(){
    
    var problems = $("[name=barProblem]");
    var skillType = nameSpace.skillType;
    
    if(skillType=== "work"){
    
        for(var i = 0; i < problems.length; i++){
            var accuracyScore = parseInt($(problems[i]).attr("accuracy_score"));
            var completionScore = parseInt($(problems[i]).attr("completion_score"));
            var status = parseInt($(problems[i]).attr("problem_status"));

            if(status === 1){
                if(completionScore === 100){
                    if(accuracyScore === 100){
                        $(problems[i]).css("background", "#18FC54").css("color", "black");
                        $(problems[i]).attr("aria-label", "Completed Question with 100% Accuracy");
                    }
                    else{
                        $(problems[i]).css("background", "#d8fee2").css("color", "darkgreen");
                        $(problems[i]).attr("aria-label", "Completed Question");
                    }
                }
                else if(completionScore < 100 && completionScore >= 50){
                    $(problems[i]).css("background", "#ffff94").css("color", "black");
                    $(problems[i]).attr("aria-label", "Partially Completed Question");
                }
            }
            else if(status === 2){
                $(problems[i]).css("background", "#845BFF").css("color", "white");
                $(problems[i]).attr("aria-label", "Removed Question");
            }
        }
    }
    else if(skillType === "extrapractice" || skillType === "assessment"){
        for(var i = 0; i < problems.length; i++){
            var score = parseInt($(problems[i]).attr("score"));
            var status = parseInt($(problems[i]).attr("problem_status"));
            var completionStatus = $(problems[i]).attr("completion_status");

            if(status === 1){
                if(completionStatus === 'true'){

                    if(score === 100){
                        $(problems[i]).css("background", "#18FC54").css("color", "black");
                        $(problems[i]).attr("aria-label", "Completed Question with 100% Accuracy");
                    }
                    else if(score < 100 && score >= 50){
                        $(problems[i]).css("background", "#ffff94").css("color", "black");
                        $(problems[i]).attr("aria-label", "Completed Question with Medium Accuracy");
                    }
                    else if(score < 50){
                        $(problems[i]).css("background", "#b6b6b6").css("color", "#c00000");
                        $(problems[i]).attr("aria-label", "Completed Question with Low Accuracy");
                    }
                }
            }
        }
    }
    else if(skillType === "extrapracticecorrections" || skillType === "assessmentcorrections"){
        for(var i = 0; i < problems.length; i++){
            var score = parseInt($(problems[i]).attr("score"));
            var status = parseInt($(problems[i]).attr("problem_status"));
            var correctionScore = parseInt($(problems[i]).attr("correction_score"));
            var completionStatus = $(problems[i]).attr("completion_status");
            var problemExclusion = $(problems[i]).attr("problem_exclusion");

            if(status === 1){
                if(completionStatus === 'true'){

                    if(score === 100){
                        $(problems[i]).css("background", "#18FC54").css("color", "black");
                        $(problems[i]).attr("aria-label", "Completed Question with 100% Original Score");
                    }
                    else if(correctionScore === 100){
                        $(problems[i]).css("background", "#d8fee2").css("color", "darkgreen");
                        $(problems[i]).attr("aria-label", "Corrected Question");
                    }
                    else if(score < 100 && score >= 50){
                        $(problems[i]).css("background", "#ffff94").css("color", "black");
                        $(problems[i]).attr("aria-label", "Question still requiring Corrections");
                    }
                    else if(score < 50){
                        $(problems[i]).css("background", "#dee2e6").css("color", "black");
                        $(problems[i]).attr("aria-label", "Question requiring Corrections");
                    }
                }
            }
        }
    }
};

//default footer
defaultProblemFooter = function(){
    var late_work = nameSpace.lateWorkInProgress;
    if(late_work === true){
        document.getElementById("lateWorkWarningMessage").style.visibility = 'visible';
        nameSpace.lateWorkWarningMessageIsVisible = true;
    }
    else{
        document.getElementById("lateWorkWarningMessage").style.visibility = 'hidden';
        nameSpace.lateWorkWarningMessageIsVisible = false;
    }

    $("[name=footerButton]").addClass("d-none");
    $("#checkAnswersButton, #cannotBeDeterminedButton").removeClass("d-none");
    $("#footerBar").addClass("grayFooter").removeClass("greenFooter purpleFooter");
    
    var skillType = nameSpace.skillType;
    if(skillType === "extrapractice" || skillType === "assessment"){
        $("#finalizeButton").removeClass("d-none");
    }

};

//credited footer
creditedProblemFooter = function(){
    $("[name=footerButton]").addClass("d-none");
    $("#checkAnswersButton, #cannotBeDeterminedButton, #creditedButton").removeClass("d-none");
    $("#footerBar").addClass("purpleFooter").removeClass("greenFooter grayFooter");
};

//show when problem has been removed
removedProblemFooter = function(problemID, skillID, footerType){
	
    $("[name=footerButton]").addClass("d-none");
    
    if(footerType === "next"){
		$("#nextProblemButton").removeClass("d-none");
	    $("#nextProblemButton").attr("data-problem-id", problemID);
	    $("#nextProblemButton").attr("data-skill-id", skillID);
	}
	else if(footerType === "dash"){
		 $("#dashboardButton").removeClass("d-none");
	}
    $("#footerBar").addClass("purpleFooter").removeClass("greenFooter grayFooter");
};

//update footer
updateProblemFooter = function(problemID, skillID, footerType){
		
	$("[name=footerButton]").addClass("d-none");	
	//$("#footerSectionOne").addClass("col-md-4");
	//$("#footerSectionTwo, #footerSectionThree").removeClass("d-none");
	
	if(footerType === "next"){
		$("#nextProblemButton").removeClass("d-none");
	    $("#nextProblemButton").attr("data-problem-id", problemID);
	    $("#nextProblemButton").attr("data-skill-id", skillID);
	}
	else if(footerType === "dash"){
		var skillType = nameSpace.skillType;
		if(skillType === "assessment"){
			//$("#footerSectionTwo, #footerSectionThree").addClass("d-none");
		 	//$("#footerSectionOne").removeClass("col-md-4");
		 }
		 else{
			 $("#dashboardButton").removeClass("d-none");
		 }
	}
	
    var skillType = nameSpace.skillType;
    
    if(skillType === "extrapractice" || skillType === "assessment"){
        var problem = nameSpace.problem;
        var score = parseInt($("#" + problem.problem_id).attr("score"));
        if(score === 100){
            $("#correctInfoButton").removeClass("d-none");
            $("#footerBar").addClass("greenFooter").removeClass("grayFooter purpleFooter");
            $("#nextProblemButton").html("Next problem!");
        }
        else{
            $("#nextProblemButton").html("Next problem");
        }
        $("#finalizeButton").removeClass("d-none");
    }
    else{
        $("#correctInfoButton").removeClass("d-none");
        $("#footerBar").addClass("greenFooter").removeClass("grayFooter purpleFooter");
    }
};

addTargetAttributeToLinks = function () {
	  $("#createTotalContainer a").attr("target", "_blank");
}

/*new code from printing problems*/

//get all user problem data needed for generated data
//currently only used for printing lessons!
getAllUserProblemData = function(){
        
    var skillArray = nameSpace.skillArray;

    var problemType = nameSpace.problemType;
    
    $.ajax({
        url: "/skill/alluserproblemdata",
        type: 'GET',
        dataType: 'json',
        traditional: true,
        data: {
            problemType: problemType,
            skillArray: skillArray
        }
    })
    .done(function(responseText) {
        var data = responseText.data; 
        updateUserProblemDataForSkill(data);
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        var responseText = jqXHR.responseJSON;
        switch(jqXHR.status){
            case 400:
                showCustomAlert(responseText.message);
                break;
            case 401:
                sessionTimeOut();
                break;
            case 405:
                showCustomAlert(responseText.message);
                break;
            default:
                alertAndThrowError("Error has occurred",jqXHR.status,errorThrown,this.url);
                break;
        }
    })
    .always(function() {
        //nothing
    }); 
};

updateUserProblemDataForSkill = function(problemArray){
	
	var promises = [];

	for(var i = 0; i < problemArray.length; i ++){
		
		var problem = problemArray[i];
		// This has to be an empty map even if rendering an old-style problem.
	    // If it's a new editor problem it'll have data, otherwise it's just blank.
	    if (!problem.only_randoms) {
	        problem.only_randoms = new Map();
	    } 
	    else {
	        problem.only_randoms = new Map(Object.entries(problem.only_randoms))
	    }
	    
	    problem.newStyleProblem = false; // assume old style problem
	    //code to generate the answer values for the new problem types
	    if (!problem.html && problem.markup_text) {
	        // New custom problem creator (html not stored, only the markup_text is stored)
	        // problem is rendered from markup_text each and every time
	        problem.newStyleProblem = true;

	        problemRender(problem.markup_text, problem.custom_math, "#printProblemHTML", problem.only_randoms, problem.custom_rounding);
	    } else {
	        // Old style problem & old custom problem creator
	        //do nothing
	    }
	    	
	    var sendOrResendNewStyleProblemData = checkIfAnswerValuesCorrectlyStored(problem);
	    // var sendOrResendNewStyleProblemData = true;
	    
	    // Check if this is the first time we've visited the problem
	    if(problem.javascript || sendOrResendNewStyleProblemData){
	        // First time problem has been visited, so now we have to go through and generate all the randoms
	    
	    	problem = replaceProblemText(problem);
            $("#printProblemHTML").html(problem.html);
            var dataObject = createProblemDataObject(problem);
                        
            promises.push( $.ajax({
                url: "/problem/storeproblemgenerateddata",
                type: 'POST',
                data: JSON.stringify(dataObject)
            }) );
	    }
        console.log(answerValues)
	    //$("#printProblemHTML").empty();
        //$("#problemscript").remove();
	}
		
	$.when.apply($, promises).then(function() {
		
		$("#printLessonModal").modal("show");
    });
};

checkIfAnswerValuesCorrectlyStored = function(problem){
    // This code is only used for the new custom editor problems
    // Makes sure only_randoms hasn't changed and makes sure that
    // the answers hash still matches... if it doesn't we need to update it!
    var sendOrResendNewStyleProblemData = false;
    
    if (problem.newStyleProblem) {
        // Clear indication we haven't visited it yet!
        if (!problem.problem_answer_status) {
            sendOrResendNewStyleProblemData = true;
        }

        // Check to see if answer hashes match
        let answerMap = {};
        for(var i = 0; i < answerValues.length; i++){
            answerMap[i] = answerValues[i];
        }
        let jsonAnswerString = JSON.stringify((answerMap));
    
        if (problem.problem_answers_hash != hashCode(jsonAnswerString)) {
            sendOrResendNewStyleProblemData = true;
        }
    }
    return sendOrResendNewStyleProblemData;
};


$(window).on("load", function() {
    
    
});

//
// AI CHAT SECTION
//

$(document).ready(function() {
    // On load, create listener for enter key on .chat-input
    $(".chat-input #chatInputExpandable").keypress(function(event) {
        // If chatInputExpandable has class disabled on it, don't do anything
        // as this means you shouldn't be able to do anything right now, we don't want multiple LLM requests in flight at the same time!
        if ($(".chat-input #chatInputExpandable").hasClass("disabled")) {
            return;
        }
        
        if ($(".chat-input #chatInputExpandable").text() == "") {
            return;
        }

        if (event.keyCode === 13 && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
            event.preventDefault();
            event.stopPropagation();

            current_problem_markdown = getProblemMarkdown();
            
            // Now need to get the response from the AI
            // get the text from inside the textarea
            let input = $(".chat-input #chatInputExpandable").text();
            $(".chat-input #chatInputExpandable").html("");
            let htmlToAdd = '<div class="message-container"><div class="user-message">' + input + '</div></div>';
            
            // Add student question as new content at the end of the chat-messages div (also scroll to bottom)
            chatAppend(htmlToAdd);

            // shallow clone of chat_messages array
            let chat_messages_clone = chat_messages.slice();

            let concise_message = "";

            // if len of chat_messages array is zero, prepopulate it
            if (chat_messages.length === 0) {
                markdown_plus_hint_and_refsheet = getProblemMarkdownWithContext();

                let calculatorRecent = getRecentCalculations();
                if (calculatorRecent) {
                    calculatorRecent = "\n\nThe user has entered the following recent calculations into their calculator (most recent is last): " + calculatorRecent;
                } else {
                    calculatorRecent = "";
                }

                concise_message = markdown_plus_hint_and_refsheet + calculatorRecent + "\n\nUser's question: " + input + "\n\nRemember to start your response with <ppplan>...</ppplan> and remember that since this is your initial interaction you should include a complete solution in your thinking/planning area inside ppplan tags.";
                chat_messages = [{"role":"user","parts":[{"text": concise_message}]}];
                chat_messages_clone = chat_messages;
                // console.log(markdown_plus_hint_and_refsheet);
                $(".chat-content").scrollTop($(".chat-content")[0].scrollHeight);
            } else {
                // append object to chat_messages
                user_message = "The user says: " + input + "\n\nRemember to start your response with <ppplan>...</ppplan> but this is not the initial interaction and you do not need to regenerate the plaintext solution.";
                if (current_problem_markdown != most_recent_prob_markdown) {
                    user_message = "Updated problem text with user's current entries:\n" + current_problem_markdown + "\n\n" + user_message;
                    most_recent_prob_markdown = current_problem_markdown;
                } else {
                    user_message = "The user has not entered anything additional for checking answers. " + user_message;
                }

                let calculatorRecent = getRecentCalculations();
                if (calculatorRecent) {
                    user_message = "The user has entered the following recent calculations into their calculator (most recent is last): " + calculatorRecent + "\n\n" + user_message;
                }                

                chat_messages.push({"role":"user","parts":[{"text": user_message}]});
                chat_messages_clone.push({"role":"user","parts":[{"text": "Remember you are the homework assistant who follows the rules above. You are talking to the user, so refer to the user as 'you'. " + user_message}]});
                // console.log(user_message);

                concise_message = user_message;
            }

            // The clone is identical to the original chat_messages array, except the last message contains a role reminder to the AI to
            // prevent students hacking or switching up roles/instructions/identities
            getLLMResponse(concise_message, chat_messages_clone, function(htmlResponse, logID) {
                htmlToAdd = $('<div class="message-container"><div class="llm-message">' + htmlResponse + "</div><div class='ai-thumbs-updown' data-logid='"+logID+"' ><i title='Helpful' class='far fa-smile helpful'></i><i title='Not helpful' class='far fa-meh nothelpful'></i><i title='Wrong/Incorrect' class='far fa-times-circle incorrect'></i></div></div>");
                if (logID === -1) {
                    htmlToAdd.find(".ai-thumbs-updown").hide();
                }
                chatAppend(htmlToAdd);  
            });
        }
    });

    // On load, create listener for thumbs up and thumbs down buttons
    $(".chat-content").on("click", ".ai-thumbs-updown svg", function() {
        let icon = $(this);
        let logID = $(this).parent().attr("data-logid");
        let vote = 0 + $(this).hasClass("helpful")*1 - $(this).hasClass("nothelpful")*1 - $(this).hasClass("incorrect")*2;
        // console.log(vote);

        $(this).parent().find("svg").removeClass("voted-for");

        icon.addClass("voted-for");

        // ajax call (post) to /ai/feedback with logID and thumbs
        $.ajax({
            url: "/ai/vote",
            type: 'POST',
            data: JSON.stringify({
                "logID": logID,
                "vote": vote
            })
        }).done(function(response) {
            // console.log("Feedback sent: " + thumbs);
        }).fail(function(jqXHR, textStatus, errorThrown) {
            console.log("Error in sending feedback: " + errorThrown);
        });
    });

});

function getRecentCalculations() {
    try {
        let exp = calculator.getState().expressions.list;
        let recent_calculations = exp.map(item => item.latex).filter(item => item !== undefined && item !== null && item !== "").slice(-3);
        return recent_calculations.toString();
    } catch (error) {
        return null;
    }
}

function chatAppend(htmlToAdd) {
    let jq_elem = $(htmlToAdd);
    $(".chat-content").append(jq_elem);
    $(".chat-content").scrollTop($(".chat-content")[0].scrollHeight);
    return jq_elem;
}

function getLLMResponse(most_recent_message, chat_messages_to_send, callback) {
    // last member in chat_messages_to_send is the student's question
    let most_recent_user_msg = chat_messages_to_send[chat_messages_to_send.length - 1].parts[0].text;
    console.log(most_recent_user_msg);
    console.log("THE ABOVE HAS BEEN SENT TO THE LLM");

    // add disabled class
    $(".chat-input #chatInputExpandable").addClass("disabled");

    // ajax call (post) to /ai/completion with messages as json data
    $.ajax({
        url: "/ai/completion",
        type: 'POST',
        dataType: 'json',
        data: JSON.stringify({
            "messages": chat_messages_to_send,
            "unitID": nameSpace.unitID,
            "skillID": nameSpace.skillID,
            "problemID": nameSpace.problemID,
            "problemType": nameSpace.problemType,
            "mostRecentUserMessage": most_recent_message
        })
    }).done(function(response) {
        let llmtext;
        // try catch
        try {
            llmtext = response.candidates[0].content.parts[0].text;
        } catch (error) {
            // This primarily happens when the safety filters were activated (perhaps erroneously)
            llmtext = "It appears that you have activated our safety filters and I cannot respond.  If you think you have reached this message in error, please ask your question a different way.";
        }

        // check if the llm text contains the words "terminate conversation" because the student was hacking/abusing the system
        if (llmtext.toLowerCase().includes("terminate conversation")) {
            // disable the chat input
            $(".chat-input #chatInputExpandable").attr("contenteditable", "false");
            llmtext = "Unfortunately, I cannot respond to that and must end this conversation.  Please refresh the page and start over if you have questions about the work.";
        }

        // Check that chat history hasn't somehow been cleared by the student relaunching AI chat while we were waiting for a response.
        // Basically the model response should never be the first item in the chat_messages because
        // it'll always be a user message containing problem definition.
        if (chat_messages.length > 0) {
            chat_messages.push({"role":"model","parts":[{"text": llmtext}]});
            showdown.extension('ppplan', ppplanExt);
            const converter = new showdown.Converter({
                extensions: ['ppplan'],
                simpleLineBreaks: true
            });
            let html = converter.makeHtml(llmtext);
            callback(html, response.logID);
        } else {
            console.log("Chat history was cleared while waiting for response");
        }
        
    }).fail(function(jqXHR, textStatus, errorThrown) {
        // console.log("Error in getting LLM response: " + errorThrown);
        callback("Oh no! Our AI Service Provider is struggling right now. Please try again in 30 seconds.",-1);
    }).always(function() {
        // remove disabled class
        $(".chat-input #chatInputExpandable").removeClass("disabled");
    });
}

// Enable dragging of the chat window
document.addEventListener('DOMContentLoaded', function() {
    var chatOverlay = document.querySelector('.chat-overlay');
    var chatHeader = document.querySelector('.chat-header');
    var closeButton = document.querySelector('.chat-close-button');

    closeButton.addEventListener('click', function() {
        chatOverlay.style.display = 'none';
    });

    chatHeader.onmousedown = function(event) {
        event.preventDefault();

        var shiftX = event.clientX - chatOverlay.getBoundingClientRect().left;
        var shiftY = event.clientY - chatOverlay.getBoundingClientRect().top;

        document.onmousemove = function(event) {
            chatOverlay.style.left = event.clientX - shiftX + 'px';
            chatOverlay.style.top = event.clientY - shiftY + 'px';
        };

        document.onmouseup = function() {
            document.onmousemove = null;
            document.onmouseup = null;
        };
    };

    chatHeader.ondragstart = function() {
        return false;
    };
});

// Enable dragging of the calculator window
document.addEventListener('DOMContentLoaded', function() {
    var calcOverlay = document.querySelector('#popupCalcContainer');
    var calcHeader = document.querySelector('#popupCalcHeader');
    var closeButton = document.querySelector('#popupCalcClose');

    closeButton.addEventListener('click', function() {
        calcOverlay.style.display = 'none';
    });

    calcHeader.onmousedown = function(event) {
        event.preventDefault();

        var shiftX = event.clientX - calcOverlay.getBoundingClientRect().left;
        var shiftY = event.clientY - calcOverlay.getBoundingClientRect().top;

        document.onmousemove = function(event) {
            calcOverlay.style.left = event.clientX - shiftX + 'px';
            calcOverlay.style.top = event.clientY - shiftY + 'px';
        };

        document.onmouseup = function() {
            document.onmousemove = null;
            document.onmouseup = null;
        };
    };

    calcHeader.ondragstart = function() {
        return false;
    };
});

//
// Assessment Behavior Monitoring and Logging
//

// Monitor assessment mode requirements
function setupAssessmentMonitoring() {
    // Set up a fullscreenerror handler
    document.addEventListener("fullscreenerror", function() {
        showCustomAlert("Fullscreen mode had a problem.");
    });

    // Check if the OS is iOS
    var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    // Check if useragent includes the word Safari
    var isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (isSafari && !document.fullscreenEnabled) {
        isIOS = true; // this will only happen on iPad
    }

    if (document.fullscreenEnabled || isIOS) {
        var startDiv = $("<div id='startAssessmentOverlay'><button class='btn btn-primary'>Start Fullscreen Assessment</button><div>");
        $("body").prepend(startDiv);
        startDiv.find("button").on("click", async function() {
            logAssessmentBehavior("started_fullscreen");

            // request fullscreen and when that promise resolves, hide the button and show the content
            // and lock the keyboard
            if (!isIOS) {
                await document.documentElement.requestFullscreen();
            }

            if(isFullscreen() || isIOS) {
                startDiv.hide();
                makeNavbarUnclickable();

                $("#desmosNewTabLink").hide();

                // This stops keyboard shortcuts from working like Ctrl+W and esc for leaving the page so they can't make those mistakes accidentally
                // This only works in some browsers
                try {
                    navigator.keyboard.lock();
                } catch (e) {
                    //console.error("Keyboard lock failed:", e);
                }

                showCustomAlert("You are now in fullscreen assessment mode. Any attempt to leave this page will be logged and your assessment may be finalized.  When you have finished your assessment, click Finalize to exit fullscreen mode");

                // all 4 required for some old-browser support 
                document.addEventListener("fullscreenchange", handleFullscreenChange);
                document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
                document.addEventListener("mozfullscreenchange", handleFullscreenChange);
                document.addEventListener("MSFullscreenChange", handleFullscreenChange);

                window.addEventListener("blur", handleWindowBlur);
                document.addEventListener('visibilitychange', handleWindowBlur);

                window.addEventListener("beforeunload", handleBeforeUnload);
                window.addEventListener("pagehide", handleBeforeUnload);
                window.addEventListener("unload", handleBeforeUnload);

                logged_page_width = window.visualViewport.width;
                logged_page_height = window.visualViewport.height;
                window.visualViewport.addEventListener("resize", handleResize);

                setupExitFullscreenWarningBar();

                // Disable all links with href attributes
                $("a[href]").each(function() {
                    let href = $(this).attr("href");
                    if (href && href !== "#") {
                        $(this).attr("data-original-href", href); // Store original href
                        $(this).removeAttr("href"); // Remove href to prevent navigation
                    }
                });

            } else {
                showCustomAlert("Failed to enter fullscreen mode. Please try again or try a different browser.");
            }
        });
    } else {
        showCustomAlert("Your browser does not fully support fullscreen mode. Please use a different browser.");
        return;
    }
}

function stopAssessmentMonitoring() {
    // Remove event listeners
    document.removeEventListener("fullscreenchange", handleFullscreenChange);
    document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
    document.removeEventListener("MSFullscreenChange", handleFullscreenChange);

    window.removeEventListener("blur", handleWindowBlur);
    document.removeEventListener('visibilitychange', handleWindowBlur);

    window.removeEventListener("beforeunload", handleBeforeUnload);
    window.removeEventListener("pagehide", handleBeforeUnload);
    window.removeEventListener("unload", handleBeforeUnload);

    window.visualViewport.removeEventListener("resize", handleResize);

    stopExitFullscreenWarningBar();
    makeNavbarClickable();
    $("#desmosNewTabLink").show();

    // Restore all links with href attributes
    $("a[data-original-href]").each(function() {
        $(this).attr("href", $(this).attr("data-original-href")); // Restore original href
        $(this).removeAttr("data-original-href"); // Remove temporary attribute
    });
}

function isFullscreen() {
    return document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
}

function getMySQLDateTime() {
    const now = new Date();
  
    const pad = (n) => n.toString().padStart(2, '0');
  
    const year = now.getFullYear();
    const month = pad(now.getMonth() + 1); // Months are 0-indexed
    const day = pad(now.getDate());
  
    const hours = pad(now.getHours());
    const minutes = pad(now.getMinutes());
    const seconds = pad(now.getSeconds());
  
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Function to log assessment behavior violations
function logAssessmentBehavior(behaviorType) {
    //
    // Makes it so that it silently drops all log events if an identical behaviorType is logged multiple times within 15 seconds
    //
    if (!logAssessmentBehavior.lastLogged) {
        logAssessmentBehavior.lastLogged = {};
    }
    const now = Date.now();
    if (logAssessmentBehavior.lastLogged[behaviorType] && (now - logAssessmentBehavior.lastLogged[behaviorType] < 15000)) {
        // Silently drop the log event if it's within 15 seconds of the last identical event
        return;
    }
    logAssessmentBehavior.lastLogged[behaviorType] = now;
    //
    // Finish repeated behaviorType filtering
    //

    // Get local datetime string in client computer's timezone
    var localdatetime = getMySQLDateTime();

    // Log to console and to sql
    console.log("Assessment behavior logged:", behaviorType, localdatetime);
    navigator.sendBeacon("/skill/logassessmentviolation", new Blob([JSON.stringify({
        unitID: nameSpace.unitID,
        type: behaviorType,
        localdatetime: localdatetime
    })], {type: 'application/json'}));

    // Finalize if that is the setting for it (2 means immediate finalization)
    // but only if it's not a "started_fullscreen" behaviorType
    if(nameSpace.fullscreen_assessment == 2){
        var unitID = nameSpace.unitID;
        var skillID = nameSpace.skillID;
        var modeType = nameSpace.skillType;
        var dataObject = {
            modeType: modeType,
            skillID: skillID,
            unitID: unitID,
            finalizationInd: 1
        };
        if (behaviorType != "started_fullscreen") {
            // Necessary to not get tons of overlapping and interacting errors / warnings
            stopAssessmentMonitoring();
            // immediately finalize the assessment
            updateFinalizationStatusByUser(dataObject, modeType);
        }
    }
}

function handleFullscreenChange() {
    if (nameSpace.skillType !== "assessment") {
        return;
    }

    if (!isFullscreen()) {
        logAssessmentBehavior("exited_fullscreen");
        
        showCustomAlert("Warning: You have exited fullscreen mode. This action has been logged and your assessment may be finalized.  If this was done accidentally please notify your teacher immediately.  Then click refresh to re-enter full-screen mode.");
    }
}

var logged_page_width = window.visualViewport.width;
var logged_page_height = window.visualViewport.height;
var cancellable_change_windows_log = null;

function handleResize(event) {
    if (nameSpace.skillType == "assessment") {
        if (logged_page_width == window.visualViewport.width || logged_page_height > window.visualViewport.height) {
            // It turns out that the window.blur is actually likely just a result of hiding the on screen keyboard so ignore the violation!
            if (cancellable_change_windows_log) {
                clearTimeout(cancellable_change_windows_log);
                cancellable_change_windows_log = null;
            }
        }
    }

    logged_page_width = window.visualViewport.width;
    logged_page_height = window.visualViewport.height;
}

function handleWindowBlur() {
    if (document.visibilityState === 'visible' && exit_attempt) {
        logAssessmentBehavior("stayed_on_page_ignore_previous");
        exit_attempt = false;
    } else {
        //
        // Makes it so that it silently ignore (return) anytime it is the second (or third etc.) time this function is called within 2 seconds
        //
        if (!handleWindowBlur.lastLogged) {
            handleWindowBlur.lastLogged = {};
        }
        const now = Date.now();
        if (handleWindowBlur.lastLogged["blur"] && (now - handleWindowBlur.lastLogged["blur"] < 2000)) {
            // Silently drop the log event if it's within 2 seconds of the last identical event
            return;
        }
        handleWindowBlur.lastLogged["blur"] = now;

        // check focus
        if ($('iframe').is(':focus')) {
            // it's okay they are probably using an integrated calculator or the translation features
        } else {
            
            if (nameSpace.skillType !== "assessment") {
                return;
            }
            
            // after short cancellable delay, log the assessment behavior
            cancellable_change_windows_log = setTimeout(function() {
                logAssessmentBehavior("change_windows");
                setTimeout(function() {
                    showCustomAlert("Warning: You switched to another window or application. This action has been logged and may affect your assessment.");
                }, 100);
            }, 200);
        }
    }
}

var exit_attempt = false;

function handleBeforeUnload(event) {
    if (nameSpace.skillType !== "assessment") {
        return;
    }

    // if event type is beforeunload, launch a fullscreen warning that says "Assessment not yet finalized-this will be logged!"
    // and then prevent default / return value = ""
    if (event.type === "beforeunload") {
        showCustomAlert("Please finalize your assessment before leaving. Thanks!");
        exit_attempt = true;
        event.preventDefault();
        event.returnValue = "";
    }

    logAssessmentBehavior("left_page");
}

function makeNavbarUnclickable() {
    $("#positivePhysicsNavbar").find("*").css("pointer-events", "none");
    $("#google_translate_element").css("pointer-events", "auto");
    $("#google_translate_element").find("*").css("pointer-events", "auto");
    $("a[name=dashboardLink]").hide();
    $("a[name=teacherLink]").hide();
    $("a[name=advancedLink]").hide();
    $("#messageIcon").hide();

    $("#navbarUsernameDropdownWrapper").css("pointer-events", "auto");
    $("#navbarUsernameDropdownWrapper").attr("title", "You must finalize before exiting assessment.");
    $("#navbarUsernameDropdownWrapper").tooltip({
        trigger: 'hover',
    });
}
function makeNavbarClickable() {
    $("#positivePhysicsNavbar").find("*").css("pointer-events", "auto");
    $("a[name=dashboardLink]").show();
    $("a[name=teacherLink]").show();
    $("a[name=advancedLink]").show();
    $("#messageIcon").show();

    $("#navbarUsernameDropdownWrapper").removeAttr("title");
    $("#navbarUsernameDropdownWrapper").tooltip('dispose'); // Remove the tooltip
}

function setupExitFullscreenWarningBar() {
    let hideBlockerTimeout; // Track the timeout ID

    // Show assessmentTopBlocker when mouse moves over assessmentTopSensor
    $("#assessmentTopSensor").on("mousemove", function(event) {
        if (!("ontouchstart" in window || navigator.maxTouchPoints)) { // Exclude touch or tablet events
            $("#assessmentTopBlocker").show();
            clearTimeout(hideBlockerTimeout); // Cancel any existing timeout
        }
    });

    // Mouseout on assessmentTopSensor should start a timer and then hide the assessmentTopBlocker
    $("#assessmentTopSensor").on("mouseout", function(event) {
        if (!("ontouchstart" in window || navigator.maxTouchPoints)) { // Exclude touch or tablet events
            hideBlockerTimeout = setTimeout(function() {
                $("#assessmentTopBlocker").hide();
            }, 1700);
        }
    });
}

function stopExitFullscreenWarningBar() {
    // Hide assessmentTopBlocker and remove the mousemove event listener
    $("#assessmentTopBlocker").hide();
    $("#assessmentTopSensor").off("mousemove");
    $("#assessmentTopSensor").off("mouseout");
}

//
// END Assessment Behavior Monitoring and Logging
//
