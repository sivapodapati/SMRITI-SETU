import { useEffect, useState } from "react";

const BACKEND_URL = "http://127.0.0.1:8000";

const PATIENT_ID = 2;
const GAME_ID = 2;

// ==========================================
// GAME CARDS
// ==========================================

const CARD_VALUES = [
  {
    id: 1,
    name: "Tea",
    emoji: "🍵",
  },
  {
    id: 2,
    name: "Rice",
    emoji: "🍚",
  },
  {
    id: 3,
    name: "Flower",
    emoji: "🌺",
  },
  {
    id: 4,
    name: "Tea",
    emoji: "🍵",
  },
  {
    id: 5,
    name: "Rice",
    emoji: "🍚",
  },
  {
    id: 6,
    name: "Flower",
    emoji: "🌺",
  },
];


// ==========================================
// SHUFFLE
// ==========================================

function shuffleCards(cards) {
  return [...cards]
    .sort(() => Math.random() - 0.5)
    .map((card, index) => ({
      ...card,
      position: index,
    }));
}


// ==========================================
// GAME COMPONENT
// ==========================================

function FamiliarPictureMatching({ onExit }) {

  const [cards, setCards] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);
  const [matchedCards, setMatchedCards] = useState([]);

  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);

  const [gameStarted, setGameStarted] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);

  const [timeLeft, setTimeLeft] = useState(90);
  const [startTime, setStartTime] = useState(null);

  const [message, setMessage] = useState(
    "Click two pictures to find the matching pair."
  );

  const [submitting, setSubmitting] = useState(false);


  // ==========================================
  // INITIALIZE GAME
  // ==========================================

  useEffect(() => {
    setCards(shuffleCards(CARD_VALUES));
  }, []);


  // ==========================================
  // TIMER
  // ==========================================

  useEffect(() => {

    if (!gameStarted || gameCompleted) {
      return;
    }

    if (timeLeft <= 0) {
      finishGame();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((previous) => previous - 1);
    }, 1000);

    return () => clearInterval(timer);

  }, [gameStarted, gameCompleted, timeLeft]);


  // ==========================================
  // START GAME
  // ==========================================

  const startGame = () => {

    setCards(shuffleCards(CARD_VALUES));

    setSelectedCards([]);
    setMatchedCards([]);

    setScore(0);
    setAttempts(0);
    setCorrectAnswers(0);

    setTimeLeft(90);

    setGameCompleted(false);
    setGameStarted(true);

    setStartTime(Date.now());

    setMessage(
      "Find all the matching picture pairs."
    );
  };


  // ==========================================
  // CARD CLICK
  // ==========================================

  const handleCardClick = (card) => {

    // Game not started
    if (!gameStarted) {
      return;
    }

    // Already selected
    if (selectedCards.includes(card.position)) {
      return;
    }

    // Already matched
    if (matchedCards.includes(card.position)) {
      return;
    }

    // Two cards already selected
    if (selectedCards.length === 2) {
      return;
    }

    const newSelectedCards = [
      ...selectedCards,
      card.position,
    ];

    setSelectedCards(newSelectedCards);

    // First card
    if (newSelectedCards.length === 1) {

      setMessage(
        "Good! Now select the matching picture."
      );

      return;
    }

    // ========================================
    // SECOND CARD
    // ========================================

    const firstCard = cards.find(
      (item) =>
        item.position === newSelectedCards[0]
    );

    const secondCard = card;

    const newAttempts = attempts + 1;

    setAttempts(newAttempts);


    // ========================================
    // MATCH
    // ========================================

    if (firstCard.name === secondCard.name) {

      setTimeout(() => {

        const newMatchedCards = [
          ...matchedCards,
          firstCard.position,
          secondCard.position,
        ];

        setMatchedCards(newMatchedCards);

        setSelectedCards([]);

        const newCorrectAnswers =
          correctAnswers + 1;

        setCorrectAnswers(newCorrectAnswers);

        setScore((previous) => previous + 10);

        setMessage(
          "🎉 Excellent! You found a matching pair."
        );

        // 3 pairs completed
        if (newMatchedCards.length === cards.length) {

          setTimeout(() => {
            finishGame(
              newCorrectAnswers,
              newAttempts
            );
          }, 500);
        }

      }, 500);

    } else {

      // ======================================
      // WRONG MATCH
      // ======================================

      setTimeout(() => {

        setSelectedCards([]);

        setMessage(
          "Try again. Look carefully for the matching picture."
        );

      }, 800);
    }
  };


  // ==========================================
  // FINISH GAME
  // ==========================================

  const finishGame = async (
    finalCorrectAnswers = correctAnswers,
    finalAttempts = attempts
  ) => {

    if (gameCompleted) {
      return;
    }

    setGameCompleted(true);
    setGameStarted(false);

    const responseTime = startTime
      ? (Date.now() - startTime) / 1000
      : 0;

    const engagementScore = Math.min(
      100,
      Math.round(
        (finalCorrectAnswers /
          CARD_VALUES.length) *
          200
      )
    );


    // ========================================
    // PREDICT DIFFICULTY
    // ========================================

    let predictedDifficulty = "easy";

    if (score >= 25) {
      predictedDifficulty = "medium";
    }

    if (score >= 50) {
      predictedDifficulty = "hard";
    }


    // ========================================
    // PERFORMANCE DATA
    // ========================================

    const performanceData = {
      patient_id: PATIENT_ID,
      game_id: GAME_ID,

      score:
        finalCorrectAnswers * 10,

      response_time:
        Math.round(responseTime * 100) / 100,

      attempts: finalAttempts,

      correct_answers:
        finalCorrectAnswers,

      difficulty: "easy",

      engagement_score:
        engagementScore,

      hints_used: 0,

      cognitive_support_level:
        "medium",

      previous_difficulty:
        "easy",

      predicted_difficulty:
        predictedDifficulty,

      status:
        "completed",
    };


    console.log(
      "Submitting performance:",
      performanceData
    );


    // ========================================
    // SAVE PERFORMANCE
    // ========================================

    try {

      setSubmitting(true);

      const response = await fetch(
        `${BACKEND_URL}/performance/`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(
            performanceData
          ),
        }
      );


      if (!response.ok) {

        const errorText =
          await response.text();

        console.error(
          "Performance API Error:",
          errorText
        );

        return;
      }


      const result =
        await response.json();

      console.log(
        "Performance saved:",
        result
      );

    } catch (error) {

      console.error(
        "Performance submission failed:",
        error
      );

    } finally {

      setSubmitting(false);
    }
  };


  // ==========================================
  // CARD VISIBILITY
  // ==========================================

  const isCardVisible = (card) => {

    return (
      selectedCards.includes(card.position) ||
      matchedCards.includes(card.position)
    );
  };


  // ==========================================
  // RESULT SCREEN
  // ==========================================

  if (gameCompleted) {

    const finalScore =
      correctAnswers * 10;

    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">

        <div className="w-full max-w-xl bg-white rounded-3xl shadow-xl p-8 text-center">

          <div className="text-7xl mb-5">
            🎉
          </div>

          <h1 className="text-4xl font-bold mb-3">
            Well Done!
          </h1>

          <p className="text-xl text-gray-600 mb-8">
            You completed the memory matching game.
          </p>


          {/* SCORE */}

          <div className="grid grid-cols-3 gap-4 mb-8">

            <div className="bg-blue-50 rounded-2xl p-5">

              <div className="text-3xl font-bold text-blue-600">
                {finalScore}
              </div>

              <div className="text-gray-600">
                Score
              </div>

            </div>


            <div className="bg-green-50 rounded-2xl p-5">

              <div className="text-3xl font-bold text-green-600">
                {correctAnswers}
              </div>

              <div className="text-gray-600">
                Matches
              </div>

            </div>


            <div className="bg-purple-50 rounded-2xl p-5">

              <div className="text-3xl font-bold text-purple-600">
                {attempts}
              </div>

              <div className="text-gray-600">
                Attempts
              </div>

            </div>

          </div>


          {submitting && (
            <p className="text-gray-500 mb-4">
              Saving your performance...
            </p>
          )}

          {!submitting && (
            <p className="text-green-600 font-semibold mb-5">
              ✓ Performance saved
            </p>
          )}


          <button
            onClick={startGame}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl text-xl font-bold hover:bg-blue-700"
          >
            🔄 Play Again
          </button>


          {onExit && (
            <button
              onClick={onExit}
              className="w-full mt-3 py-3 bg-gray-200 text-gray-700 rounded-2xl text-lg font-semibold hover:bg-gray-300"
            >
              ← Back
            </button>
          )}

        </div>

      </div>
    );
  }


  // ==========================================
  // GAME SCREEN
  // ==========================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-5">

      <div className="max-w-3xl mx-auto">


        {/* HEADER */}

        <div className="bg-white rounded-3xl shadow-lg p-6 mb-5">

          <div className="flex justify-between items-center">

            <div>

              <h1 className="text-3xl font-bold">
                🧠 Familiar Picture Matching
              </h1>

              <p className="text-gray-600 mt-2">
                Match the same pictures.
              </p>

            </div>


            {/* TIMER */}

            <div className="text-center bg-red-50 rounded-2xl px-5 py-3">

              <div className="text-sm text-gray-500">
                Time
              </div>

              <div className="text-3xl font-bold text-red-600">
                {timeLeft}s
              </div>

            </div>

          </div>

        </div>


        {/* STATS */}

        <div className="grid grid-cols-3 gap-4 mb-5">

          <div className="bg-white rounded-2xl p-4 text-center shadow">

            <div className="text-2xl font-bold text-blue-600">
              {score}
            </div>

            <div className="text-sm text-gray-500">
              Score
            </div>

          </div>


          <div className="bg-white rounded-2xl p-4 text-center shadow">

            <div className="text-2xl font-bold text-green-600">
              {correctAnswers}/3
            </div>

            <div className="text-sm text-gray-500">
              Matches
            </div>

          </div>


          <div className="bg-white rounded-2xl p-4 text-center shadow">

            <div className="text-2xl font-bold text-purple-600">
              {attempts}
            </div>

            <div className="text-sm text-gray-500">
              Attempts
            </div>

          </div>

        </div>


        {/* MESSAGE */}

        <div className="bg-white rounded-2xl shadow p-5 mb-5 text-center">

          <p className="text-xl font-semibold">
            {message}
          </p>

        </div>


        {/* CARDS */}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">

          {cards.map((card) => {

            const visible =
              isCardVisible(card);

            const matched =
              matchedCards.includes(
                card.position
              );

            return (
              <button
                key={card.position}
                onClick={() =>
                  handleCardClick(card)
                }
                disabled={
                  !gameStarted ||
                  matched
                }
                className={`
                  aspect-square
                  rounded-3xl
                  shadow-lg
                  flex
                  items-center
                  justify-center
                  transition-all
                  duration-300
                  border-4

                  ${
                    matched
                      ? "bg-green-100 border-green-400"
                      : visible
                      ? "bg-blue-100 border-blue-400"
                      : "bg-white border-gray-200 hover:border-blue-400 hover:scale-105"
                  }
                `}
              >

                {visible ? (

                  <div className="text-center">

                    <div className="text-7xl">
                      {card.emoji}
                    </div>

                    <div className="text-lg font-bold mt-2">
                      {card.name}
                    </div>

                    {matched && (
                      <div className="text-green-600 text-2xl mt-1">
                        ✓
                      </div>
                    )}

                  </div>

                ) : (

                  <div className="text-6xl">
                    ❓
                  </div>

                )}

              </button>
            );
          })}

        </div>


        {/* START BUTTON */}

        {!gameStarted && !gameCompleted && (

          <button
            onClick={startGame}
            className="w-full mt-7 py-5 bg-blue-600 text-white rounded-2xl text-2xl font-bold hover:bg-blue-700 shadow-lg"
          >
            🎮 Start Game
          </button>

        )}


        {/* GAME INSTRUCTIONS */}

        <div className="bg-white rounded-2xl shadow p-5 mt-5 text-center">

          <p className="text-gray-600">
            👆 Select two cards at a time.
            Find all 3 matching pairs.
          </p>

        </div>

      </div>

    </div>
  );
}


export default FamiliarPictureMatching;