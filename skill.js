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

var nameSpace = {
};
var assessmentIntervalId;

$(document).ready(function() {
	$("#restartProblemButton").attr("title", "Only available after completing 100% of corrections");
	
	//allow user to hit enter to check answers, go to next problem or return to the dashboard
    $(document).keypress(function (event) {
        var key = event.which;
        if((key === 13) && ($("#problemHTML").length )){
            if($("#checkAnswersButton").css("display") === "inline-block"){
                $("#checkAnswersButton").click();
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
	
	//set default answers to yellow background
    $("#problemHTML").on("focus", "[name=answer].incorrectAnswer", function() {
    	$(this).removeClass("incorrectAnswer");
    });

	//control the type of input allows for specific problems
    //returns true or false as a way of allowing or disallowing the input
    $("#problemHTML").on("keypress", "input[name=answer]", function (event) {

        if($(this).hasClass("symbolicanswer")) {
            return true;
        }
            	
    	//remove class for incorrect answers
    	$(this).removeClass("incorrectAnswer");
    	
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
    
   //control the type of input allows for specific problems
    $("#problemHTML").on("keydown", "input[name=answer]", function () {
    	$(this).css("webkit-text-fill-color","black");
    	$(this).removeClass("incorrectAnswer");
//    	if ($(this).parent().is( "label" ) ) {
//    		$(this).unwrap();
//    		$(this).focus();
//    	 }
    });
    
    //control the type of input allows for specific problems
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
        
        getProblemData(problemID, skillID);
        
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
    	var restart = confirm("Are you sure you want to restart?");
        if(restart){
            restartProblems();
        }
    });
    
    //finalize skill
    $('#finalizeButton').click(function () {

        var finalize = confirm("Are you sure you have finished all questions and want to finalize?  After finalizing you will be able to make corrections, but they will only count towards your corrections score.");
        if(finalize){
            var unitID = nameSpace.unitID;
            var skillID = nameSpace.skillID;
            var skillType = nameSpace.skillType;

            var dataObject = {
                unitID: unitID,
                skillID: skillID
            };

            if(skillType === "extrapractice"){
                dataObject.extraPracticeFinalizedInd = 1;
            }
            else if(skillType === "assessment"){
                dataObject.assessmentFinalizedInd = 1;
            }
    
            updateSkillStatusByUser(dataObject);
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
    $('#cannotBeDeterminedButton').click(function () {
        
        var cbd = confirm("Are you sure this problem cannot be solved?");
        
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
    $("#hintButton").click(function () {

    	var problemHintIndicator = nameSpace.problemHintIndicator;
    	
        if(problemHintIndicator === 1){
            var hint = confirm("Are you sure you want to use the hint? Any unanswered questions will be marked incorrect.");
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
                $("#hintModal").modal("show");
            }
        }
        else{
            $("#hintModal").modal("show");
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
		
		var percentage = getAssignmentPercentage();
		$("#assignmentPercentageDisplay").html(percentage);
		
		nameSpace.lmsScore = percentage;
		
		$("#assignmentModal").modal("show");
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
    getActiveSections();
    getSectionSkillData();
    
    nameSpace.origin = window.location.origin;
    nameSpace.pathName = window.location.pathname;
    nameSpace.search = window.location.search;
    
  //create album name
	var userID = $("#userID").val();
	var albumName = "User-" + userID;
	nameSpace.albumName = albumName;
	
});

setSkillAttributes = function(){
	
	nameSpace.skillID = parseInt($("#skillID").val());
	nameSpace.unitID = parseInt($("#unitID").val());
	nameSpace.courseID = parseInt($("#courseID").val());

    var mode = $("#mode").val();
    
    //set defaults for header
    $("#scoreContainer").css("display", "flex");
    $("#headerScoreContainer").css("display", "block");
    $("[name=scoreDiv]").css("display", "none");
    
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
        //nameSpace.unitReference = data.unit_reference;
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
                    alert("Your session has expired or you've been logged in somewhere else.");
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
        
        // console.log(data);
                
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
        
        if(data.extra_practice_restart_ind === 0){
            $("#restartButtonContainer").remove();
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
    var userRole = $("#userRole").val();

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
            
            if(data[i].problem_exclusion === true){
            	$("[data-problem-id=" + data[i].problem_id + "]").addClass("removedProblem");
            }
            
//            if(data[i].problem_exclusion === true){
//            	if(userRole === "student"){
//            		$("#" + data[i].problem_id).remove();
//            		counter--;
//            	}
//            	else{
//            		$("#" + data[i].problem_id).addClass("removedProblem");
//            	}
//            }
            
            
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

getProblemData = function(problemID, skillID){
	
	var problemData = nameSpace.problemMap[problemID];
	var problemExclusion = problemData.problem_exclusion;
	var userRole = $("#userRole").val();
	if((problemExclusion) && (userRole === "student")){
		$("#problemHTML").empty();
		var html = '<div class="mt-5 mb-5" style="text-align: center;font-size: 30px;"><span>This problem has been removed by your teacher and will not affect your score.</span></div>';
	    $("#problemHTML").html(html);
	    
	    removedProblemUpdate(problemID);
	    updateHistoryState(problemID);
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
        
        var upgradeStatus = parseInt($("#upgradeStatus").val());    	
    	//if a free account
    	if(upgradeStatus === 0){
	        $("[name=randSpan]").tooltip({
	    		title: "This value is randomized.", 
	    		placement: "bottom"
	    	});
    	}
//    	$("[name=randSpan]").css("color", "#2989d8");
        
        var skillType = nameSpace.skillType;
        if(skillType === "work"){
        	getAddRemoveProblemData(problemID);
        }
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        if(jqXHR.status === 405){
            // assessment is unlocked and not finalized so do not allow the student to see their work or extra practice
            displayProblemNotAllowed();
        }
        else{
            logError(window.location.href, jqXHR);
        }
    })
    .always(function() {
        //nothing
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
        url: "/school/getactivesectionsbyschoolid",
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

/*
getMaxPoints = function(){
	
	//$("#submitScoreButton").addClass("d-none");
		
	var courseWorkID = nameSpace.googleCourseWorkID;
	var courseID = nameSpace.googleCourseID;
	var score = getAssignmentPercentage();
	
    $.ajax({
        url: "/google/getassignmentpoints",
        type: 'GET',
        dataType: 'json',
        data: {
        	courseID: courseID,
        	courseWorkID: courseWorkID
        }
    })
     .done(function(responseText) {
    	var data = responseText.data;
    	var maxPoints = data.max_points;
    	
    	var scoringType = nameSpace.googleScoringType;
		var firstLetter = scoringType.charAt(0)
		var firstLetterCap = firstLetter.toUpperCase()
		var remainingLetters = scoringType.slice(1)
		var capitalizedWord = firstLetterCap + remainingLetters
		$("#assignmentScoringDisplay").html(capitalizedWord);
		
		var percentage = getAssignmentPercentage();
		$("#assignmentPercentageDisplay").html(percentage);
		
    
		$("#assignmentPointPossibleDisplay").html(maxPoints);
		
		var studentScore = 0;
		if(parseFloat(maxPoints) > 10){
			studentScore = (percentage / 100 * maxPoints).toFixed(0);
		}
		else{
			studentScore = (percentage / 100 * maxPoints).toPrecision(2);
		}
		$("#assignmentYourScoreDisplay").html(studentScore);
		
		
		nameSpace.googleScore = percentage;
    	 
    	$("#submitScoreButton").removeClass("d-none");
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
    	$("#sendScoreButton").attr("disabled", false);
    });  
};*/

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
    	$("#assignmentModal").modal("hide");
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
		if(jqXHR.status === 400){
	  		var responseText =JSON.parse(jqXHR.responseText);
			alert(responseText.message);
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
        	score: score
        })
    })
    .done(function(responseText) {
    	responseText =JSON.parse(responseText);
		lateWorkMessage(responseText.lateWorkFlag);  
    	$("#assignmentModal").modal("hide");
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
		if(jqXHR.status === 400){
			var responseText =JSON.parse(jqXHR.responseText);
					alert(responseText.message);
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
    	$("#assignmentModal").modal("hide");
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
		if(jqXHR.status === 400){
			var responseText =JSON.parse(jqXHR.responseText);
					alert(responseText.message);
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

lateWorkMessage = function(flag){
	if(flag !== undefined){
		if(flag === true){
				alert("Score submitted successfully, but after the due date.  A late penalty may have been applied");
		}
		else{
				alert("Score sent successfully!");
		}
	}
	else{
		alert("Score sent successfully!");
	}
}

getAssignmentPercentage = function(){
	
	var percentage = 0;
	
	var skillType = nameSpace.skillType;
	var scoringType = nameSpace.lmsScoringType;
	var scores = nameSpace.skillScores;

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

checkAnswers = function(answerMap, cbdFlag){
	
	var problemValidity = nameSpace.problemValidity;
	if(!problemValidity){
		alert("For security purposes, trial users may only check answers on first 25% of work questions after trial units.");
		return;
	}

    // var lateWorkInProgress = nameSpace.lateWorkInProgress;
    // var lateWorkInProgressResponse;
    // lateWorkInProgress = false;
    // if(lateWorkInProgress === false){
    //     var problemType = nameSpace.problemType;
    //     var skillID = nameSpace.skillID;

    //     $.ajax({
    //         url: "/skill/lateworkinprogress",
    //         type: 'POST',
    //         dataType: 'json',
    //         async: false,
    //         data: JSON.stringify({
    //             problemType: problemType,
    //             skillID: skillID
    //         })
    //     })
    //     .done(function(responseText) {
    //         var data = responseText.data;
    //         lateWorkInProgressResponse = JSON.parse(data.late_work_in_progress);
    //     })
    //     .fail(function(jqXHR, textStatus, errorThrown) {
    //         if(jqXHR.status === 401){
    //             sessionTimeOut();
    //         }
    //         else{
    //             logError(window.location.href, jqXHR);
    //         }
    //     })
    //     .always(function() {
    //         //nothing
    //     });
    // }

    // // do a popup for check answers when late work is in progress and the late work warning message is not shown
    // if(lateWorkInProgressResponse === true && nameSpace.lateWorkWarningMessageIsVisible === false){
    //     var confirmationPhrase = "The due date has now passed. Checking answers now will mark the assignment late. Are you sure you want to proceed?";
    //     var confirmation = confirm(confirmationPhrase);
    //     if(confirmation === false){
    //         return;
    //     }
    // }

    var problemID = nameSpace.problemID;
    var problemType = nameSpace.problemType;
    var skillID = nameSpace.skillID;
    var skillType = nameSpace.skillType;
    var unitID = nameSpace.unitID;
    var answerString = JSON.stringify(answerMap);
    
    $.ajax({
        url: "/skill/checkuseranswers",
        type: 'POST',
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
        
        populateUserInputs(answerData);
        setBarProblemColor();
        adjustUserAnswers(answerJSON); //make the user answers rounded to the correct answers
        updateAnswerStatus(statusJSON, attemptJSON);
        focusToActiveElement(statusJSON);
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        var responseText = jqXHR.responseJSON;
        switch(jqXHR.status){
            case 400:
                alert(responseText.message);
                break;
            case 401:
                sessionTimeOut();
                break;
            case 405:
                alert(responseText.message);
                if(responseText.skill_status === "locked" || responseText.skill_status === "due_date"){
                    window.location = "/dashboard?unitID=" + unitID;
                }
                if(responseText.skill_status === "due_date_resubmit_warning"){
                    document.getElementById("lateWorkWarningMessage").style.visibility = 'visible';
                    nameSpace.lateWorkWarningMessageIsVisible = true;
                }
                else if(responseText.skill_status === "finalized"){
                    window.location = "skill?skillID=" + skillID + "&unitID=" + unitID + "&type=assessmentcorrections";
                }
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
    $("#problemscript").remove();
    
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
    answerValues = [];

    $("#problemHTML").empty();
    $("#problemHTML").html("<br><br>This question cannot be viewed at this time because the assignment is locked.  Please contact your teacher.<br><br><br><br>");

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
           
    //add images
    var images = $("#problemHTML img");
    for (var i = 0; i < images.length; i++) {
        var source = images[i].name;
        
        if(source && source !== ""){
	        var newSource = baseURL + source;
	        createImageUrl(images[i], newSource);
        }

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
        if(problem.image_description){
        	$(images[i]).attr("alt", problem.image_description);
		}
		else{
        	$(images[i]).attr("alt", "Image showing situation described in the problem");
		}
    };    
    createDynamicHTMLElements();
};

generateProblemData = function(problem){
	
    var sendOrResendNewStyleProblemData = checkIfAnswerValuesCorrectlyStored(problem);
    
    // Check if this is the first time we've visited the problem
    if(problem.javascript || sendOrResendNewStyleProblemData){
        // First time problem has been visited, so now we have to go through and generate all the randoms
        var dataObject = createProblemDataObject(problem);
        
        storeProblemGeneratedData(dataObject);
    } 
    else if (problem.newStyleProblem) {
        // Do nothing
    } else {

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

createProblemDataObject = function(problem){
    //if the problem is old style and has not been visited before, the javascript is included and processed
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
            
    return dataObject;
};

storeProblemGeneratedData = function(dataObject){    
        
    $.ajax({
        url: "/problem/storeproblemgenerateddata",
        type: 'POST',
        data: JSON.stringify(dataObject)
    })
    .done(function() {
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
                alert(responseText.message);
                break;
            case 401:
                sessionTimeOut();
                break;
            case 405:
                alert(responseText.message);
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
    var skillType = nameSpace.skillType;
    var problemType = nameSpace.problemType;

    // Ask server to delete the user problem data
    $.ajax({
        url: "/skill/restartuserproblems",
        type: 'POST',
        dataType: 'json',
        data: JSON.stringify({
            unitID: unitID,
            skillID: skillID,
            skillType: skillType,
            problemType: problemType
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
                alert(responseText.message);
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

//update skill status by user
updateSkillStatusByUser = function(dataObject){
	
	var skillID = nameSpace.skillID;
    var unitID = nameSpace.unitID;
    var skillType = nameSpace.skillType;
	 
    $.ajax({
        url: "/skill/updateskillstatusbyuser",
        type: 'PATCH',
        dataType: 'json',
        data: JSON.stringify(dataObject)

    })
    .done(function(responseText) {
        var finalization;
        if(skillType === "extrapractice"){
            finalization = "extrapracticecorrections";
        }
        else if(skillType === "assessment"){
            finalization = "assessmentcorrections";
        }
        
        var url = new URL(window.location.href);
        url.searchParams.set("mode", finalization);
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
    }
};

//update the answer status when answers have been checked
updateAnswerStatus = function(statusJSON, attemptJSON){

	var problem = nameSpace.problem;
	var problemArray = nameSpace.problemArray;
	
	var skillType = nameSpace.skillType;
	
	var correctAnswerCount = 0;
    var totalAnswersCount = 0;
	
	var answers = $("#problemHTML [name=answer]");
    for(var i in statusJSON){
    	
    	// keep track of inputs that allow negatives or letters
    	var negativeInputs = $("#problemHTML [name=answer].allownegative");
        var letterInputs = $("#problemHTML [name=answer].symbolicanswer");
        // remove classes
    	$(answers[i]).removeClass();
        // re-add the two that we don't want removed
    	$(negativeInputs).addClass("allownegative");
        $(letterInputs).addClass("symbolicanswer");
    	    	
        switch(statusJSON[i]){
            case "correct":
            	                
                if(attemptJSON[i] >= 2){
                	$(answers[i]).addClass("correctAnswerMulti");
                }
                else{
                	$(answers[i]).addClass("correctAnswer");
                }
                $(answers[i]).prop('disabled', true);
                correctAnswerCount ++;
                totalAnswersCount ++;
                break;
            case "incorrect":            	
            	 if((skillType === "extrapractice") || (skillType === "assessment")){
            		 $(answers[i]).prop('disabled', true);
            		 $(answers[i]).addClass("incorrectAnswerDisabled");
            	 }
            	 else{
            		 $(answers[i]).addClass("incorrectAnswer");
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
                $(answers[i]).val(answerJSON[i]);
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
                    }
                    else{
                        $(problems[i]).css("background", "#d8fee2").css("color", "darkgreen");
                    }
                }
                else if(completionScore < 100 && completionScore >= 50){
                    $(problems[i]).css("background", "#ffff94").css("color", "black");
                }
            }
            else if(status === 2){
                $(problems[i]).css("background", "#845BFF").css("color", "white");
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
                    }
                    else if(score < 100 && score >= 50){
                        $(problems[i]).css("background", "#ffff94").css("color", "black");
                    }
                    else if(score < 50){
                        $(problems[i]).css("background", "#b6b6b6").css("color", "#c00000");
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
                    }
                    else if(correctionScore === 100){
                        $(problems[i]).css("background", "#d8fee2").css("color", "darkgreen");
                    }
                    else if(score < 100 && score >= 50){
                        $(problems[i]).css("background", "#ffff94").css("color", "black");
                    }
                    else if(score < 50){
                        $(problems[i]).css("background", "#dee2e6").css("color", "black");
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
	
	if(footerType === "next"){
		$("#nextProblemButton").removeClass("d-none");
	    $("#nextProblemButton").attr("data-problem-id", problemID);
	    $("#nextProblemButton").attr("data-skill-id", skillID);
	}
	else if(footerType === "dash"){
		 $("#dashboardButton").removeClass("d-none");
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
                alert(responseText.message);
                break;
            case 401:
                sessionTimeOut();
                break;
            case 405:
                alert(responseText.message);
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
	    $("#printProblemHTML").empty();
        $("#problemscript").remove();
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
