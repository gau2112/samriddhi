/**
 * Samriddhi Solves MCQ — Quiz game logic
 */

(function () {
  const POINTS_PER_CORRECT = 10;
  const SECONDS_PER_QUESTION = 30;
  const FEEDBACK_DELAY_MS = 1200;
  const CLAP_SOUND_PATH = "sounds/Claprecord.m4a";
  const CLAP_WRONG_PATH = "sounds/WrongAnswer.m4a";

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
    evs: "EVS",
    gk: "General Knowledge"
  };

  // GK: 10, 15, 20 questions. Others: 5, 10, 15 questions.
  const COUNT_OPTIONS = { gk: [10, 15, 20], default: [5, 10, 15] };

  const screens = {
    subjects: document.getElementById("screen-subjects"),
    options: document.getElementById("screen-options"),
    quiz: document.getElementById("screen-quiz"),
    results: document.getElementById("screen-results")
  };

  const subjectGrid = document.getElementById("subjectGrid");
  const optionsSubjectName = document.getElementById("optionsSubjectName");
  const questionCountButtons = document.getElementById("questionCountButtons");
  const btnStartQuiz = document.getElementById("btnStartQuiz");
  const btnOptionsBack = document.getElementById("btnOptionsBack");
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
    questionCount: null,
    questions: [],
    currentIndex: 0,
    score: 0,
    timerId: null,
    secondsLeft: SECONDS_PER_QUESTION,
    answered: false
  };

  function showScreen(name) {
    Object.keys(screens).forEach(function (key) {
      if (screens[key]) screens[key].hidden = key !== name;
    });
  }

  function getCountOptions(subjectKey) {
    return COUNT_OPTIONS[subjectKey] || COUNT_OPTIONS.default;
  }

  function shuffleArray(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function showOptionsScreen(subjectKey) {
    state.subject = subjectKey;
    var counts = getCountOptions(subjectKey);
    var available = (data[subjectKey] || []).length;
    if (available === 0) {
      alert("No questions available for this subject.");
      return;
    }
    state.questionCount = Math.min(counts[0], available);
    if (optionsSubjectName) optionsSubjectName.textContent = subjectLabels[subjectKey] || subjectKey;
    questionCountButtons.innerHTML = "";
    counts.forEach(function (count) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "count-btn";
      btn.textContent = String(count);
      btn.dataset.count = String(count);
      if (count === state.questionCount) btn.classList.add("selected");
      btn.addEventListener("click", function () {
        state.questionCount = Number(btn.dataset.count);
        questionCountButtons.querySelectorAll(".count-btn").forEach(function (b) { b.classList.remove("selected"); });
        btn.classList.add("selected");
      });
      questionCountButtons.appendChild(btn);
    });
    showScreen("options");
  }

  function startQuiz(subjectKey, questionCount) {
    var raw = (data[subjectKey] || []).slice();
    if (raw.length === 0) {
      alert("No questions available for this subject.");
      return;
    }
    var n = Math.min(questionCount || raw.length, raw.length);
    var questions = shuffleArray(raw).slice(0, n);

    state = {
      subject: subjectKey,
      questionCount: n,
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

  function startQuizFromOptions() {
    if (state.subject == null || state.questionCount == null) return;
    startQuiz(state.subject, state.questionCount);
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

  function playCorrectSound() {
    try {
      var audio = new Audio(CLAP_SOUND_PATH);
      audio.volume = 0.7;
      audio.play().catch(function () {
        playFallbackBeep();
      });
    } catch (e) {
      playFallbackBeep();
    }
  }

  function playWrongAnswerSound(){
    try {
      var audio = new Audio(CLAP_WRONG_PATH);
      audio.volume = 0.7;
      audio.play().catch(function () {
        playFallbackBeep();
      });
    } catch (e) {
      playFallbackBeep();
    }

  }

  function playFallbackBeep() {
    try {
      var C = window.AudioContext || window.webkitAudioContext;
      if (!C) return;
      var ctx = new C();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 523;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {}
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
      playCorrectSound();
    }
    else{
      //Answer is wrong
      playWrongAnswerSound();
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
      var card = e.target.closest(".subject-card");
      if (!card) return;
      var subject = card.getAttribute("data-subject");
      if (subject) showOptionsScreen(subject);
    });
  }

  if (btnOptionsBack) {
    btnOptionsBack.addEventListener("click", goBackToSubjects);
  }

  if (btnStartQuiz) {
    btnStartQuiz.addEventListener("click", startQuizFromOptions);
  }

  if (btnBackToSubjects) {
    btnBackToSubjects.addEventListener("click", goBackToSubjects);
  }

  if (btnPlayAgain) {
    btnPlayAgain.addEventListener("click", function () {
      if (state.subject != null && state.questionCount != null) {
        startQuiz(state.subject, state.questionCount);
      } else {
        showOptionsScreen(state.subject);
      }
    });
  }

  if (btnPickAnother) {
    btnPickAnother.addEventListener("click", goBackToSubjects);
  }

  if (document.getElementById("year")) {
    document.getElementById("year").textContent = new Date().getFullYear();
  }
})();
