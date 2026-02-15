/**
 * Samriddhi Solves MCQ — Quiz game logic
 */

(function () {
  const POINTS_PER_CORRECT = 10;
  const SECONDS_PER_QUESTION = 30;
  const FEEDBACK_DELAY_MS = 1200;

  const data = window.SAMRIDDHI_QUIZ_DATA;
  if (!data) {
    console.error("Quiz data not loaded.");
    return;
  }

  const subjectLabels = {
    english: "English",
    hindi: "Hindi",
    mathematics: "Mathematics",
    science: "Science",
    evs: "EVS"
  };

  const screens = {
    subjects: document.getElementById("screen-subjects"),
    quiz: document.getElementById("screen-quiz"),
    results: document.getElementById("screen-results")
  };

  const subjectGrid = document.getElementById("subjectGrid");
  const quizSubjectName = document.getElementById("quizSubjectName");
  const quizProgress = document.getElementById("quizProgress");
  const quizScore = document.getElementById("quizScore");
  const quizTimer = document.getElementById("quizTimer");
  const questionText = document.getElementById("questionText");
  const optionsList = document.getElementById("optionsList");
  const btnBackToSubjects = document.getElementById("btnBackToSubjects");
  const resultsSubject = document.getElementById("resultsSubject");
  const resultsScore = document.getElementById("resultsScore");
  const resultsMax = document.getElementById("resultsMax");
  const resultsMessage = document.getElementById("resultsMessage");
  const btnPlayAgain = document.getElementById("btnPlayAgain");
  const btnPickAnother = document.getElementById("btnPickAnother");

  let state = {
    subject: null,
    questions: [],
    currentIndex: 0,
    score: 0,
    timerId: null,
    secondsLeft: SECONDS_PER_QUESTION,
    answered: false
  };

  function showScreen(name) {
    Object.keys(screens).forEach(function (key) {
      screens[key].hidden = key !== name;
    });
  }

  function startQuiz(subjectKey) {
    const questions = (data[subjectKey] || []).slice();
    if (questions.length === 0) {
      alert("No questions available for this subject.");
      return;
    }

    state = {
      subject: subjectKey,
      questions: questions,
      currentIndex: 0,
      score: 0,
      timerId: null,
      secondsLeft: SECONDS_PER_QUESTION,
      answered: false
    };

    quizSubjectName.textContent = subjectLabels[subjectKey] || subjectKey;
    updateScoreDisplay();
    showScreen("quiz");
    runQuestion();
  }

  function clearTimer() {
    if (state.timerId) {
      clearInterval(state.timerId);
      state.timerId = null;
    }
  }

  function updateTimerDisplay() {
    if (quizTimer) {
      quizTimer.textContent = state.secondsLeft;
      quizTimer.classList.toggle("warning", state.secondsLeft <= 10 && state.secondsLeft > 0);
    }
  }

  function startTimer() {
    clearTimer();
    state.secondsLeft = SECONDS_PER_QUESTION;
    updateTimerDisplay();
    state.timerId = setInterval(function () {
      state.secondsLeft--;
      updateTimerDisplay();
      if (state.secondsLeft <= 0) {
        clearTimer();
        handleTimeUp();
      }
    }, 1000);
  }

  function handleTimeUp() {
    if (state.answered) return;
    state.answered = true;
    // Mark as wrong (0 points), show correct answer in red-ish, move on
    highlightWrongAndCorrect();
    setTimeout(nextOrResults, FEEDBACK_DELAY_MS);
  }

  function updateScoreDisplay() {
    if (quizScore) quizScore.textContent = "Score: " + state.score;
  }

  function updateProgressDisplay() {
    const total = state.questions.length;
    const current = state.currentIndex + 1;
    if (quizProgress) quizProgress.textContent = "Question " + current + " of " + total;
  }

  function getMaxScore() {
    return state.questions.length * POINTS_PER_CORRECT;
  }

  function runQuestion() {
    const q = state.questions[state.currentIndex];
    if (!q) {
      showResults();
      return;
    }

    state.answered = false;
    updateProgressDisplay();
    if (questionText) questionText.textContent = q.question;

    optionsList.innerHTML = "";
    q.options.forEach(function (opt, index) {
      const li = document.createElement("div");
      li.setAttribute("role", "listitem");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "option-btn";
      btn.textContent = opt;
      btn.dataset.index = String(index);
      btn.addEventListener("click", function () {
        onOptionClick(index);
      });
      li.appendChild(btn);
      optionsList.appendChild(li);
    });

    startTimer();
  }

  function onOptionClick(clickedIndex) {
    if (state.answered) return;
    state.answered = true;
    clearTimer();

    const q = state.questions[state.currentIndex];
    const correct = clickedIndex === q.correctIndex;

    if (correct) {
      state.score += POINTS_PER_CORRECT;
      updateScoreDisplay();
    }

    highlightOptions(clickedIndex, q.correctIndex, correct);
    setTimeout(nextOrResults, FEEDBACK_DELAY_MS);
  }

  function highlightOptions(clickedIndex, correctIndex, wasCorrect) {
    const buttons = optionsList.querySelectorAll(".option-btn");
    buttons.forEach(function (btn, i) {
      btn.classList.add("disabled");
      if (i === correctIndex) {
        btn.classList.add("correct");
      } else if (i === clickedIndex && !wasCorrect) {
        btn.classList.add("wrong");
      }
    });
  }

  function highlightWrongAndCorrect() {
    const q = state.questions[state.currentIndex];
    const buttons = optionsList.querySelectorAll(".option-btn");
    buttons.forEach(function (btn, i) {
      btn.classList.add("disabled");
      if (i === q.correctIndex) {
        btn.classList.add("correct");
      }
    });
  }

  function nextOrResults() {
    state.currentIndex++;
    if (state.currentIndex >= state.questions.length) {
      showResults();
    } else {
      runQuestion();
    }
  }

  function showResults() {
    clearTimer();
    const maxScore = getMaxScore();
    if (resultsSubject) resultsSubject.textContent = subjectLabels[state.subject] || state.subject;
    if (resultsScore) resultsScore.textContent = state.score;
    if (resultsMax) resultsMax.textContent = " / " + maxScore;

    let message = "Great effort! Keep practicing.";
    const ratio = maxScore > 0 ? state.score / maxScore : 0;
    if (ratio >= 1) message = "Perfect! You're a star!";
    else if (ratio >= 0.8) message = "Excellent! You know your stuff!";
    else if (ratio >= 0.5) message = "Good job! Try again to score even higher.";
    if (resultsMessage) resultsMessage.textContent = message;

    showScreen("results");
  }

  function goBackToSubjects() {
    clearTimer();
    showScreen("subjects");
  }

  // Event listeners
  if (subjectGrid) {
    subjectGrid.addEventListener("click", function (e) {
      const card = e.target.closest(".subject-card");
      if (!card) return;
      const subject = card.getAttribute("data-subject");
      if (subject) startQuiz(subject);
    });
  }

  if (btnBackToSubjects) {
    btnBackToSubjects.addEventListener("click", goBackToSubjects);
  }

  if (btnPlayAgain) {
    btnPlayAgain.addEventListener("click", function () {
      if (state.subject) startQuiz(state.subject);
    });
  }

  if (btnPickAnother) {
    btnPickAnother.addEventListener("click", goBackToSubjects);
  }

  if (document.getElementById("year")) {
    document.getElementById("year").textContent = new Date().getFullYear();
  }
})();
