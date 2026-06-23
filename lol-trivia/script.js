document.addEventListener('DOMContentLoaded', () => {
    // Configuration
    const targetWord = "YASUO";
    const bgImageUrl = "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Yasuo_0.jpg";
    
    // Distractor letters to mix with target letters
    const distractorLetters = "KMRETLCD".split('');
    const allLettersArray = [...targetWord.split(''), ...distractorLetters].slice(0, 12);
    
    // Shuffle the array
    const shuffledLetters = allLettersArray.sort(() => Math.random() - 0.5);

    // DOM Elements
    const championImage = document.getElementById('championImage');
    const wordContainer = document.getElementById('wordContainer');
    const lettersPool = document.getElementById('lettersPool');
    const resultModal = document.getElementById('resultModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const fullChampionImage = document.querySelector('.full-champion-image');

    // Set Images
    championImage.style.backgroundImage = `url('${bgImageUrl}')`;
    fullChampionImage.style.backgroundImage = `url('${bgImageUrl}')`;

    let filledSlots = new Array(targetWord.length).fill(null);
    let activeLetterBtns = [];

    // Initialize UI
    initGame();

    function initGame() {
        // Create Word Slots
        for (let i = 0; i < targetWord.length; i++) {
            const slot = document.createElement('div');
            slot.classList.add('slot');
            slot.dataset.index = i;
            slot.addEventListener('click', () => handleSlotClick(i));
            wordContainer.appendChild(slot);
        }

        // Create Letter Buttons
        shuffledLetters.forEach((letter, i) => {
            const btn = document.createElement('div');
            btn.classList.add('letter-btn');
            btn.innerText = letter;
            btn.dataset.poolIndex = i;
            btn.addEventListener('click', () => handleLetterClick(btn, letter, i));
            lettersPool.appendChild(btn);
            activeLetterBtns.push(btn);
        });
    }

    function handleLetterClick(btn, letter, poolIndex) {
        // Find first empty slot
        const emptyIndex = filledSlots.findIndex(slot => slot === null);
        
        if (emptyIndex !== -1) {
            // Fill slot state
            filledSlots[emptyIndex] = { letter, poolIndex };
            
            // Update DOM Slot
            const slot = wordContainer.children[emptyIndex];
            slot.innerText = letter;
            slot.classList.add('filled');

            // Hide pool button
            btn.classList.add('hidden');

            // Check win condition if full
            if (!filledSlots.includes(null)) {
                checkWinCondition();
            }
        }
    }

    function handleSlotClick(slotIndex) {
        const slotData = filledSlots[slotIndex];
        if (slotData !== null) {
            // Unhide pool button
            const btn = activeLetterBtns[slotData.poolIndex];
            btn.classList.remove('hidden');

            // Clear slot state
            filledSlots[slotIndex] = null;
            
            // Update DOM Slot
            const slot = wordContainer.children[slotIndex];
            slot.innerText = '';
            slot.classList.remove('filled', 'error');
        }
    }

    function checkWinCondition() {
        const currentWord = filledSlots.map(s => s.letter).join('');
        
        if (currentWord === targetWord) {
            // Correct
            championImage.style.backgroundSize = "cover";
            championImage.style.backgroundPosition = "center 15%";
            
            setTimeout(() => {
                showModal(true);
            }, 800);
        } else {
            // Incorrect
            Array.from(wordContainer.children).forEach(slot => {
                slot.classList.add('error');
            });

            setTimeout(() => {
                showModal(false);
            }, 1000);
        }
    }

    function showModal(isVictory) {
        if (isVictory) {
            modalTitle.innerText = "Victory!";
            modalTitle.className = "";
            modalMessage.innerHTML = `You correctly guessed <strong>${targetWord}</strong>!`;
        } else {
            modalTitle.innerText = "Almost!";
            modalTitle.className = "wrong";
            modalMessage.innerHTML = `The correct answer was <strong>${targetWord}</strong>.`;
        }
        
        resultModal.classList.add('show');
    }
});
