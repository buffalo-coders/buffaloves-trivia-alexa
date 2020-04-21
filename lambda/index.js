const Alexa = require('alexa-sdk');
const questions = require('./questions');

const ANSWER_COUNT = 4;
const GAME_LENGTH = 5;
const GAME_STATES = {
  TRIVIA: '_TRIVIAMODE',
  START: '_STARTMODE',
  HELP: '_HELPMODE',
};
const APP_ID = 'amzn1.ask.skill.e2d9e7ed-a321-449a-a68f-63f5d5d876c0';

const languageString = {
  'en': {
    'translation': {
      'QUESTIONS': questions,
      'GAME_NAME': 'BuffaLoves Trivia',
      'HELP_MESSAGE': 'I will ask you %s multiple choice questions. Respond with the number of the answer. ' +
        'For example, say one, two, three, or four. To start a new game at any time, say, start over. ',
      'REPEAT_QUESTION_MESSAGE': 'To repeat the last question, say, repeat. ',
      'ASK_MESSAGE_START': 'Would you like to start playing?',
      'HELP_REPROMPT': 'To give an answer to a question, respond with the number of the answer. ',
      'STOP_MESSAGE': 'Would you like to keep playing?',
      'CANCEL_MESSAGE': 'Ok, let\'s play again soon.',
      'NO_MESSAGE': 'Ok, we\'ll play another time. Goodbye!',
      'TAKE_A_GUESS': 'Go ahead, say a number between 1 and %s',
      'TRIVIA_UNHANDLED': 'Try saying a number between 1 and %s',
      'HELP_UNHANDLED': 'Say yes to continue, or no to end the game.',
      'START_UNHANDLED': 'Say start over to start a new game.',
      'NEW_GAME_MESSAGE': 'Welcome to %s. ',
      'WELCOME_MESSAGE': 'I will ask you %s questions, try to get as many right as you can. ' +
        'Just say the number of the answer. Let\'s begin. ',
      'NOT_VALID_GUESS': 'That\'s not a number between 1 and %s. Please try again.',
      'ANSWER_CORRECT_MESSAGE': 'correct. ',
      'ANSWER_WRONG_MESSAGE': 'wrong. ',
      'CORRECT_ANSWER_MESSAGE': 'The correct answer is %s: %s. ',
      'ANSWER_IS_MESSAGE': 'That answer is ',
      'TELL_QUESTION_MESSAGE': '<break time="1s"/>Question %s: %s ',
      'GAME_OVER_MESSAGE': 'Your final score is %s out of %s. Thank you for playing! If you play again, I\'ll give you a new set of questions.',
      'SCORE_IS_MESSAGE': 'Your score is %s out of %s. ',
    },
  },
};

const newSessionHandlers = {
  'LaunchRequest': function () {
    this.handler.state = GAME_STATES.START;
    this.emitWithState('StartGame', true);
  },
  'AMAZON.StartOverIntent': function () {
    this.handler.state = GAME_STATES.START;
    this.emitWithState('StartGame', true);
  },
  'AMAZON.HelpIntent': function () {
    this.handler.state = GAME_STATES.HELP;
    this.emitWithState('helpTheUser', true);
  },
  'AMAZON.FallbackIntent': function () {
    const speechOutput = this.t('START_UNHANDLED');
    this.response.speak(speechOutput).listen(speechOutput);
    this.emit(':responseReady');
  },
  'Unhandled': function () {
    const speechOutput = this.t('START_UNHANDLED');
    this.response.speak(speechOutput).listen(speechOutput);
    this.emit(':responseReady');
  },
};

function populateGameQuestions(translatedQuestions) {
  const gameQuestions = [];
  const indexList = [];
  let index = translatedQuestions.length;

  if (GAME_LENGTH > index) {
    throw new Error('Invalid Game Length.');
  }

  for (let i = 0; i < translatedQuestions.length; i++) {
    indexList.push(i);
  }


  for (let j = 0; j < GAME_LENGTH; j++) {
    const rand = Math.floor(Math.random() * index);
    index -= 1;

    const temp = indexList[index];
    indexList[index] = indexList[rand];
    indexList[rand] = temp;
    gameQuestions.push(indexList[index]);
  }

  return gameQuestions;
}

function populateRoundAnswers(gameQuestionIndexes, correctAnswerIndex, correctAnswerTargetLocation, translatedQuestions) {
  const answers = [];
  const answersCopy = translatedQuestions[gameQuestionIndexes[correctAnswerIndex]][Object.keys(translatedQuestions[gameQuestionIndexes[correctAnswerIndex]])[0]].slice();
  let index = answersCopy.length;

  if (index < ANSWER_COUNT) {
    throw new Error('Not enough answers for question.');
  }

  for (let j = 1; j < answersCopy.length; j++) {
    const rand = Math.floor(Math.random() * (index - 1)) + 1;
    index -= 1;

    const swapTemp1 = answersCopy[index];
    answersCopy[index] = answersCopy[rand];
    answersCopy[rand] = swapTemp1;
  }

  for (let i = 0; i < ANSWER_COUNT; i++) {
    answers[i] = answersCopy[i];
  }
  const swapTemp2 = answers[0];
  answers[0] = answers[correctAnswerTargetLocation];
  answers[correctAnswerTargetLocation] = swapTemp2;
  return answers;
}

function isAnswerSlotValid(intent) {
  const answerSlotFilled = intent && intent.slots && intent.slots.answer && intent.slots.answer.value;
  const answerSlotIsInt = answerSlotFilled && !isNaN(parseInt(intent.slots.answer.value, 10));
  return answerSlotIsInt &&
    parseInt(intent.slots.answer.value, 10) < (ANSWER_COUNT + 1) &&
    parseInt(intent.slots.answer.value, 10) > 0;
}

function handleUserGuess(userGaveUp) {
  var userGuess = this.event.request.intent.slots.answer.value;
  const answerSlotValid = isAnswerSlotValid(this.event.request.intent);
  let speechOutput = '';
  let speechOutputAnalysis = '';
  const gameQuestions = this.attributes.questions;
  let correctAnswerIndex = parseInt(this.attributes.correctAnswerIndex, 10);
  let currentScore = parseInt(this.attributes.score, 10);
  let currentQuestionIndex = parseInt(this.attributes.currentQuestionIndex, 10);
  const correctAnswerText = this.attributes.correctAnswerText;
  const translatedQuestions = this.t('QUESTIONS', {
    keySeparator: '#'
  });

  if (parseInt(this.event.request.intent.slots.answer.value, 10) > 0 && parseInt(this.event.request.intent.slots.answer.value, 10) < (ANSWER_COUNT + 1)) {
    if (answerSlotValid && parseInt(this.event.request.intent.slots.answer.value, 10) === this.attributes['correctAnswerIndex']) {
      currentScore++;
      speechOutputAnalysis = this.t('ANSWER_CORRECT_MESSAGE');
    } else {
      if (!userGaveUp) {
        speechOutputAnalysis = this.t('ANSWER_WRONG_MESSAGE');
      }

      speechOutputAnalysis += this.t('CORRECT_ANSWER_MESSAGE', correctAnswerIndex, correctAnswerText);
    }
  } else {
    const speechOutput = this.t('NOT_VALID_GUESS', ANSWER_COUNT.toString());
    this.response.speak(speechOutput).listen(speechOutput);
    this.emit(':responseReady');
  }

  if (this.attributes['currentQuestionIndex'] === (GAME_LENGTH - 1)) {
    speechOutput = 'You guessed ' + userGuess + '. ';
    speechOutput += userGaveUp ? '' : this.t('ANSWER_IS_MESSAGE');
    speechOutput += speechOutputAnalysis + this.t('GAME_OVER_MESSAGE', currentScore.toString(), GAME_LENGTH.toString());

    this.response.speak(speechOutput);
    this.emit(':responseReady');
  } else {
    currentQuestionIndex += 1;
    correctAnswerIndex = Math.floor(Math.random() * (ANSWER_COUNT));
    const spokenQuestion = Object.keys(translatedQuestions[gameQuestions[currentQuestionIndex]])[0];
    const roundAnswers = populateRoundAnswers.call(this, gameQuestions, currentQuestionIndex, correctAnswerIndex, translatedQuestions);
    const questionIndexForSpeech = currentQuestionIndex + 1;
    const regex = /(<([^>]+)>)/ig;
    let repromptText = this.t('TELL_QUESTION_MESSAGE', questionIndexForSpeech.toString(), spokenQuestion);

    for (let i = 0; i < ANSWER_COUNT; i++) {
      repromptText += `${i + 1}) ${roundAnswers[i]}, `;
    }

    speechOutput += 'You guessed ' + userGuess + '. ';
    speechOutput += userGaveUp ? '' : this.t('ANSWER_IS_MESSAGE');
    speechOutput += speechOutputAnalysis + this.t('SCORE_IS_MESSAGE', currentScore.toString(), GAME_LENGTH.toString()) + repromptText;

    Object.assign(this.attributes, {
      'speechOutput': repromptText,
      'repromptText': repromptText,
      'currentQuestionIndex': currentQuestionIndex,
      'correctAnswerIndex': correctAnswerIndex + 1,
      'questions': gameQuestions,
      'score': currentScore,
      'correctAnswerText': translatedQuestions[gameQuestions[currentQuestionIndex]][Object.keys(translatedQuestions[gameQuestions[currentQuestionIndex]])[0]][0],
    });

    this.response.speak(speechOutput).listen(repromptText);
    this.response.cardRenderer(this.t('GAME_NAME'), repromptText.replace(regex, ""));
    this.emit(':responseReady');
  }
}

const startStateHandlers = Alexa.CreateStateHandler(GAME_STATES.START, {
  'StartGame': function (newGame) {
    let speechOutput = newGame ? this.t('NEW_GAME_MESSAGE', this.t('GAME_NAME')) + this.t('WELCOME_MESSAGE', GAME_LENGTH.toString()) : '';

    const translatedQuestions = this.t('QUESTIONS', {
      keySeparator: '#'
    });
    const gameQuestions = populateGameQuestions(translatedQuestions);
    const correctAnswerIndex = Math.floor(Math.random() * (ANSWER_COUNT));
    const roundAnswers = populateRoundAnswers(gameQuestions, 0, correctAnswerIndex, translatedQuestions);
    const currentQuestionIndex = 0;
    const spokenQuestion = Object.keys(translatedQuestions[gameQuestions[currentQuestionIndex]])[0];

    var regex = /(<([^>]+)>)/ig;
    let repromptText = this.t('TELL_QUESTION_MESSAGE', '1', spokenQuestion);

    for (let i = 0; i < ANSWER_COUNT; i++) {
      repromptText += `${i + 1}. ${roundAnswers[i]}. `;
    }

    speechOutput += repromptText;

    Object.assign(this.attributes, {
      'speechOutput': repromptText,
      'repromptText': repromptText,
      'currentQuestionIndex': currentQuestionIndex,
      'correctAnswerIndex': correctAnswerIndex + 1,
      'questions': gameQuestions,
      'score': 0,
      'correctAnswerText': translatedQuestions[gameQuestions[currentQuestionIndex]][Object.keys(translatedQuestions[gameQuestions[currentQuestionIndex]])[0]][0],
    });

    this.handler.state = GAME_STATES.TRIVIA;
    this.response.speak(speechOutput).listen(repromptText);
    this.response.cardRenderer(this.t('GAME_NAME'), repromptText.replace(regex, ""));
    this.emit(':responseReady');
  },
});

const triviaStateHandlers = Alexa.CreateStateHandler(GAME_STATES.TRIVIA, {
  'AnswerIntent': function () {
    handleUserGuess.call(this, false);
  },
  'DontKnowIntent': function () {
    const speechOutput = this.t('TAKE_A_GUESS', ANSWER_COUNT.toString());
    this.response.speak(speechOutput).listen(speechOutput);
    this.emit(':responseReady');
  },
  'AMAZON.StartOverIntent': function () {
    this.handler.state = GAME_STATES.START;
    this.emitWithState('StartGame', false);
  },
  'AMAZON.RepeatIntent': function () {
    this.response.speak(this.attributes['speechOutput']).listen(this.attributes['repromptText']);
    this.emit(':responseReady');
  },
  'AMAZON.HelpIntent': function () {
    this.handler.state = GAME_STATES.HELP;
    this.emitWithState('helpTheUser', false);
  },
  'AMAZON.StopIntent': function () {
    this.handler.state = GAME_STATES.HELP;
    const speechOutput = this.t('STOP_MESSAGE');
    this.response.speak(speechOutput).listen(speechOutput);
    this.emit(':responseReady');
  },
  'AMAZON.CancelIntent': function () {
    this.response.speak(this.t('CANCEL_MESSAGE'));
    this.emit(':responseReady');
  },
  'AMAZON.FallbackIntent': function () {
    const speechOutput = this.t('TRIVIA_UNHANDLED', ANSWER_COUNT.toString());
    this.response.speak(speechOutput).listen(speechOutput);
    this.emit(':responseReady');
  },
  'Unhandled': function () {
    const speechOutput = this.t('TRIVIA_UNHANDLED', ANSWER_COUNT.toString());
    this.response.speak(speechOutput).listen(speechOutput);
    this.emit(':responseReady');
  },
  'SessionEndedRequest': function () {
    console.log(`Session ended in trivia state: ${this.event.request.reason}`);
  },
});

const helpStateHandlers = Alexa.CreateStateHandler(GAME_STATES.HELP, {
  'helpTheUser': function (newGame) {
    const askMessage = newGame ? this.t('ASK_MESSAGE_START') : this.t('REPEAT_QUESTION_MESSAGE') + this.t('STOP_MESSAGE');
    const speechOutput = this.t('HELP_MESSAGE', GAME_LENGTH) + askMessage;
    const repromptText = this.t('HELP_REPROMPT') + askMessage;

    this.response.speak(speechOutput).listen(repromptText);
    this.emit(':responseReady');
  },
  'AMAZON.StartOverIntent': function () {
    this.handler.state = GAME_STATES.START;
    this.emitWithState('StartGame', false);
  },
  'AMAZON.RepeatIntent': function () {
    const newGame = !(this.attributes['speechOutput'] && this.attributes['repromptText']);
    this.emitWithState('helpTheUser', newGame);
  },
  'AMAZON.HelpIntent': function () {
    const newGame = !(this.attributes['speechOutput'] && this.attributes['repromptText']);
    this.emitWithState('helpTheUser', newGame);
  },
  'AMAZON.YesIntent': function () {
    if (this.attributes['speechOutput'] && this.attributes['repromptText']) {
      this.handler.state = GAME_STATES.TRIVIA;
      this.emitWithState('AMAZON.RepeatIntent');
    } else {
      this.handler.state = GAME_STATES.START;
      this.emitWithState('StartGame', false);
    }
  },
  'AMAZON.NoIntent': function () {
    const speechOutput = this.t('NO_MESSAGE');
    this.response.speak(speechOutput);
    this.emit(':responseReady');
  },
  'AMAZON.StopIntent': function () {
    const speechOutput = this.t('STOP_MESSAGE');
    this.response.speak(speechOutput).listen(speechOutput);
    this.emit(':responseReady');
  },
  'AMAZON.CancelIntent': function () {
    this.response.speak(this.t('CANCEL_MESSAGE'));
    this.emit(':responseReady');
  },
  'AMAZON.FallbackIntent': function () {
    const speechOutput = this.t('HELP_UNHANDLED');
    this.response.speak(speechOutput).listen(speechOutput);
    this.emit(':responseReady');
  },
  'Unhandled': function () {
    const speechOutput = this.t('HELP_UNHANDLED');
    this.response.speak(speechOutput).listen(speechOutput);
    this.emit(':responseReady');
  },
  'SessionEndedRequest': function () {
    console.log(`Session ended in help state: ${this.event.request.reason}`);
  },
});

exports.handler = function (event, context) {
  const alexa = Alexa.handler(event, context);
  alexa.appId = APP_ID;
  alexa.resources = languageString;
  alexa.registerHandlers(newSessionHandlers, startStateHandlers, triviaStateHandlers, helpStateHandlers);
  alexa.execute();
};
