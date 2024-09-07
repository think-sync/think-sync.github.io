// Initialize Firebase (replace with your own config)
const firebaseConfig = {
    apiKey: "AIzaSyApfECgXrNYrHTj0AyZpoDx9vjUEdy3o4Q",
    authDomain: "themind-a7977.firebaseapp.com",
    projectId: "themind-a7977",
    storageBucket: "themind-a7977.appspot.com",
    messagingSenderId: "277960103958",
    appId: "1:277960103958:web:710a7bc5f621d7c083bd37"
};
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let gameId = null;
let playerId = null;
let playerName = null;
let currentRound = 1;
let playerHand = [];
let isHost = false;
let lastPlayedCard = null;
let allPlayers = [];
let deck = [];
let gameInitialized = false;

const homeScreen = document.getElementById('home-screen');
const loadingScreen = document.getElementById('loading-screen');
const gameScreen = document.getElementById('game-screen');
const hostGameBtn = document.getElementById('host-game');
const joinGameBtn = document.getElementById('join-game-btn');
const startGameBtn = document.getElementById('start-game');
const gameCodeInput = document.getElementById('game-code');
const playerNameInput = document.getElementById('player-name');
const playerList = document.getElementById('player-list');
const lastPlayedCardElement = document.getElementById('last-played-card');
const playerHandElement = document.getElementById('player-hand');
const gameCodeDisplay = document.getElementById('game-code-display');
const displayedGameCode = document.getElementById('displayed-game-code');
const currentRoundElement = document.getElementById('current-round');

hostGameBtn.addEventListener('click', hostNewGame);
joinGameBtn.addEventListener('click', joinGame);
startGameBtn.addEventListener('click', startGame);

function generatePlayerName() {
    const adjectives = ['Happy', 'Lucky', 'Sunny', 'Clever', 'Swift', 'Brave', 'Bright', 'Cool'];
    const nouns = ['Panda', 'Tiger', 'Eagle', 'Dolphin', 'Lion', 'Fox', 'Wolf', 'Bear'];
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const number = Math.floor(Math.random() * 100);
    return `${adjective}${noun}${number}`;
}

function setPlayerName() {
    playerName = playerNameInput.value.trim();
    if (!playerName) {
        playerName = generatePlayerName();
    }
    return playerName;
}

function hostNewGame() {
    console.log("Hosting new game");
    gameId = generateGameId();
    playerId = generatePlayerId();
    isHost = true;
    setPlayerName();
    database.ref(`games/${gameId}/players/${playerId}`).set({
        name: playerName,
        isHost: true,
        ready: false
    }).then(() => {
        console.log("Host data set successfully");
        showLoadingScreen();
        displayGameCode(gameId);
        initializeGame();
    }).catch((error) => {
        console.error("Error hosting game: ", error);
        alert("Failed to host game. Please try again.");
    });
}

function joinGame() {
    console.log("Joining game");
    gameId = gameCodeInput.value.toUpperCase();
    playerId = generatePlayerId();
    isHost = false;
    setPlayerName();
    database.ref(`games/${gameId}/players/${playerId}`).set({
        name: playerName,
        isHost: false,
        ready: false
    }).then(() => {
        console.log("Join data set successfully");
        showLoadingScreen();
        initializeGame();
    }).catch((error) => {
        console.error("Error joining game: ", error);
        alert("Failed to join game. Please check the game code and try again.");
    });
}

function initializeGame() {
    console.log("Initializing game");
    handlePlayerDisconnect();
    listenForPlayers();
    listenForGameStart();
    listenForGameUpdates();
}

function handlePlayerDisconnect() {
    database.ref(`games/${gameId}/players/${playerId}`).onDisconnect().remove();
}

function startGame() {
    console.log("Starting game");
    database.ref(`games/${gameId}`).update({
        started: true,
        currentRound: 1,
        lastPlayedCard: null,
        deck: shuffleArray([...Array(100)].map((_, i) => i + 1)),
        roundLost: false
    }).then(() => {
        console.log("Game started successfully");
        // Remove this line as it's handled in listenForGameStart
        // showGameScreen();
        // dealCards();
    }).catch((error) => {
        console.error("Error starting game: ", error);
        alert("Failed to start the game. Please try again.");
    });
}

function showLoadingScreen() {
    console.log("Showing loading screen");
    homeScreen.classList.add('hidden');
    loadingScreen.classList.remove('hidden');
    gameScreen.classList.add('hidden');
}

function showGameScreen() {
    console.log("Showing game screen");
    homeScreen.classList.add('hidden');
    loadingScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
}

function displayGameCode(code) {
    displayedGameCode.textContent = code;
    gameCodeDisplay.classList.remove('hidden');
}

function listenForPlayers() {
    database.ref(`games/${gameId}/players`).on('value', (snapshot) => {
        playerList.innerHTML = '';
        allPlayers = [];
        snapshot.forEach((childSnapshot) => {
            const playerData = childSnapshot.val();
            allPlayers.push({ id: childSnapshot.key, ...playerData });
            const li = document.createElement('li');
            li.textContent = playerData.name + (playerData.isHost ? ' (Host)' : '');
            playerList.appendChild(li);
        });
        if (isHost) {
            startGameBtn.classList.remove('hidden');
        } else {
            startGameBtn.classList.add('hidden');
        }
    });
}

function listenForGameStart() {
    console.log("Setting up listener for game start");
    database.ref(`games/${gameId}`).on('value', (snapshot) => {
        const gameData = snapshot.val();
        if (gameData && gameData.started && !gameInitialized) {
            console.log("Game has started");
            gameInitialized = true;
            showGameScreen();
            currentRound = gameData.currentRound;
            updateRoundDisplay();
            deck = gameData.deck;
            dealCards();
        }
    }, (error) => {
        console.error("Error in game start listener:", error);
    });
}

function listenForGameUpdates() {
    database.ref(`games/${gameId}`).on('value', (snapshot) => {
        const gameData = snapshot.val();
        if (gameData) {
            currentRound = gameData.currentRound;
            updateRoundDisplay();
            renderPlayerHand();
            if (gameData.lastPlayedCard) {
                lastPlayedCard = gameData.lastPlayedCard;
                updateLastPlayedCard();
            }
            if (gameData.roundLost) {
                alert("Round lost! A card higher than someone's hand was played. Restarting the round.");
                if (isHost) {
                    restartRound();
                }
                
            }
        }
    });
}

function updateRoundDisplay() {
    currentRoundElement.textContent = currentRound;
}

function updateLastPlayedCard() {
    lastPlayedCardElement.textContent = lastPlayedCard ? `${lastPlayedCard.player} played: ${lastPlayedCard.card}` : 'No card played yet';
}


function dealCards() {
    console.log("Dealing cards");
    database.ref(`games/${gameId}`).once('value', (snapshot) => {
        const gameData = snapshot.val();
        if (gameData && Array.isArray(gameData.deck)) {
            const playerCount = allPlayers.length;
            const cardsPerPlayer = currentRound;
            const dealtCards = gameData.deck.slice(0, playerCount * cardsPerPlayer);
            const remainingDeck = gameData.deck.slice(playerCount * cardsPerPlayer);

            const updates = {};
            allPlayers.forEach((player, index) => {
                const playerCards = dealtCards.slice(index * cardsPerPlayer, (index + 1) * cardsPerPlayer);
                updates[`players/${player.id}/hand`] = playerCards;
            });
            updates['deck'] = remainingDeck;
            updates['roundLost'] = false;
            updates['lastPlayedCard'] = null;

            database.ref(`games/${gameId}`).update(updates).then(() => {
                console.log("Cards dealt successfully");
                renderPlayerHand();
            }).catch((error) => {
                console.error("Error dealing cards:", error);
            });
        } else {
            console.error("Game data or deck is missing or invalid:", gameData);
        }
    }, (error) => {
        console.error("Error fetching game data for dealing cards:", error);
    });
}

function renderPlayerHand() {
    console.log("Rendering player hand");
    database.ref(`games/${gameId}/players/${playerId}/hand`).once('value', (snapshot) => {
        playerHand = snapshot.val() || [];
        console.log("Player hand data:", playerHand);
        
        playerHandElement.innerHTML = '';
        playerHand.forEach((card, index) => {
            const cardElement = document.createElement('div');
            cardElement.classList.add('card');
            cardElement.textContent = card;
            cardElement.addEventListener('click', () => playCard(index));
            playerHandElement.appendChild(cardElement);
        });
    }).catch(error => {
        console.error("Error fetching player hand:", error);
    });
}

function playCard(index) {
    const card = playerHand[index];
    console.log("Attempting to play card:", card);
    database.ref(`games/${gameId}`).transaction((gameData) => {
        if (!gameData) {
            console.warn("Game data is null or undefined");
            return;
        }
        if (gameData.lastPlayedCard && card <= gameData.lastPlayedCard.card) {
            console.log("Invalid move: Card is not higher than the last played card");
            return;
        }
        gameData.lastPlayedCard = { player: playerName, card: card };
        return gameData;
    }, (error, committed, snapshot) => {
        if (error) {
            console.error("Error playing card:", error);
        } else if (!committed) {
            console.log("Play not committed: Either invalid move or conflict");
            alert("Invalid move! Your card must be higher than the last played card.");
        } else {
            console.log("Card played successfully");
            playerHand.splice(index, 1);
            database.ref(`games/${gameId}/players/${playerId}/hand`).set(playerHand)
                .then(() => {
                    console.log("Player hand updated in database");
                    renderPlayerHand();
                    checkRoundCompletion(card);
                })
                .catch(error => console.error("Error updating player hand:", error));
        }
    });
}
function checkRoundCompletion(playedCard) {
    console.log("Checking round completion for played card:", playedCard);
    database.ref(`games/${gameId}/players`).once('value', (snapshot) => {
        let roundLost = false;
        let allCardsPlayed = true;
        
        snapshot.forEach((childSnapshot) => {
            const playerData = childSnapshot.val();
            console.log("Raw player data:", playerData);
            
            if (playerData && typeof playerData === 'object') {
                const playerHand = playerData.hand || [];
                console.log("Player hand:", playerHand);
                
                // Check if the played card is LOWER than any card in the player's hand
                if (playerHand.some(card => playedCard > card)) {
                    roundLost = true;
                    console.log("Round lost: Played card is lower than a card in a player's hand");
                }
                if (playerHand.length > 0) {
                    allCardsPlayed = false;
                }
            } else {
                console.warn("Invalid player data encountered:", playerData);
                allCardsPlayed = false; // Assume not all cards played if we encounter invalid data
            }
        });

        console.log("Round lost:", roundLost, "All cards played:", allCardsPlayed);

        if (roundLost) {
            database.ref(`games/${gameId}/roundLost`).set(true)
                // .then(() => {
                //     console.log("Round marked as lost");
                //     alert("Round lost! A card lower than someone's remaining card was played. Restarting the round.");
                //     restartRound();
                // })
                .catch(error => console.error("Error marking round as lost:", error));
        } else if (allCardsPlayed) {
            advanceToNextRound();
        }
    }).catch(error => {
        console.error("Error checking round completion:", error);
    });
}

function restartRound() {
    console.log("Restarting round");
    currentRound = 1;
    database.ref(`games/${gameId}`).update({
        currentRound: currentRound,
        lastPlayedCard: null,
        roundLost: false,
        deck: shuffleArray([...Array(100)].map((_, i) => i + 1)) // Reshuffle the deck
    }).then(() => {
        console.log("Round restarted successfully");
        dealCards(); // This will deal new cards to all players
    }).catch(error => {
        console.error("Error restarting round:", error);
    });
}

function advanceToNextRound() {
    console.log("Advancing to next round");
    currentRound++;
    database.ref(`games/${gameId}`).update({
        currentRound: currentRound,
        lastPlayedCard: null,
        roundLost: false,
        deck: shuffleArray([...Array(100)].map((_, i) => i + 1)) // Reshuffle the deck for the next round
    }).then(() => {
        console.log("Advanced to next round successfully");
        dealCards(); // This will deal new cards to all players for the new round
    }).catch(error => {
        console.error("Error advancing to next round:", error);
    });
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    console.log(array)
    return array;
}

function generateGameId() {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
}

function generatePlayerId() {
    return Math.random().toString(36).substr(2, 9);
}

// Call these functions to set up listeners when the game initializes
listenForGameUpdates();
listenForPlayers();