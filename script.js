// --- Global Variables & Mock Data ---
let map;
let heatmaps = {}; // Object to hold different heatmap layers
const KOTHAMANGALAM_COORDS = { lat: 10.0652, lng: 76.6291 };

// Mock data for buildings
const buildings = [
    { id: 1, name: "Kothamangalam Public Library", address: "Main Rd, Kothamangalam", rating: 4.5, features: [{ name: "Wheelchair Ramp", icon: "♿" }, { name: "Accessible Restrooms", icon: "🚻" }], position: { lat: 10.0655, lng: 76.6285 } },
    { id: 2, name: "City Hospital", address: "Park Ave, Kothamangalam", rating: 3.8, features: [{ name: "Wheelchair Ramp", icon: "♿" }, { name: "Braille Signage", icon: "📖" }], position: { lat: 10.0630, lng: 76.6310 } },
    { id: 3, name: "Grand Shopping Mall", address: "Bypass Rd, Kothamangalam", rating: 2.5, features: [], position: { lat: 10.0680, lng: 76.6250 } },
];

// DOM Elements
const buildingDetailsPanel = document.getElementById('building-details');
const closeDetailsButton = document.getElementById('close-details');
const buildingName = document.getElementById('building-name');
const buildingRating = document.getElementById('building-rating');
const buildingAddress = document.getElementById('building-address');
const accessibilityFeatures = document.getElementById('accessibility-features');
const rateBuildingBtn = document.getElementById('rate-building-btn');
const ratingModal = document.getElementById('rating-modal');
const modalStarRating = document.getElementById('modal-star-rating');
const cancelRatingBtn = document.getElementById('cancel-rating');
const submitRatingBtn = document.getElementById('submit-rating');
const sosButton = document.getElementById('sos-button');
const notification = document.getElementById('notification');
const notificationMessage = document.getElementById('notification-message');
const voiceReportButton = document.getElementById('voice-report-button');
const recordingIndicator = document.getElementById('recording-indicator');
const filterDropdown = document.getElementById('filter-accessibility');


// --- Map Initialization ---
// This function is called by the Google Maps script once it has loaded.
function initMap() {
    // Check for valid API key placeholder
    const apiKey = getApiKeyFromScript();
    if (apiKey === "YOUR_API_KEY") {
        document.getElementById('map').innerHTML = `
            <div class="h-full w-full flex items-center justify-center bg-red-100 text-red-700 p-4">
                <p class="text-center"><strong>Error:</strong> Google Maps could not load. <br> Please provide a valid API key.</p>
            </div>`;
        return;
    }

    map = new google.maps.Map(document.getElementById("map"), {
        center: KOTHAMANGALAM_COORDS,
        zoom: 15,
        mapId: 'AURA_MAP_STYLE' // Using a Map ID for advanced styling
    });

    // Add building markers
    buildings.forEach(building => {
        const marker = new google.maps.Marker({
            position: building.position,
            map: map,
            title: building.name,
            icon: {
                url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
            }
        });
        marker.addListener('click', () => {
            showBuildingDetails(building);
        });
    });

    // Initialize heatmap data for different disability types
    const heatmapData = {
        'Wheelchair Accessible': [
            { location: new google.maps.LatLng(10.0670, 76.6260), weight: 3 }, // Lack of ramps
            { location: new google.maps.LatLng(10.0672, 76.6265), weight: 2 },
        ],
        'Braille Signage': [
            { location: new google.maps.LatLng(10.0640, 76.6320), weight: 5 }, // Missing braille signs
            { location: new google.maps.LatLng(10.0641, 76.6322), weight: 4 },
        ],
        'Accessible Restrooms': [
             { location: new google.maps.LatLng(10.0685, 76.6295), weight: 4 }, // No accessible restrooms
        ]
    };
    
    // Create a heatmap layer for each disability type
    for (const type in heatmapData) {
        const layer = new google.maps.visualization.HeatmapLayer({
            data: heatmapData[type],
            map: null, // Initially hidden
            radius: 30
        });
        heatmaps[type] = layer;
    }
}

// --- UI Functions ---

function updateHeatmapVisibility() {
    const selectedFilter = filterDropdown.value;

    // Hide all heatmaps first
    for (const type in heatmaps) {
        heatmaps[type].setMap(null);
    }

    // Show the selected heatmap if it exists
    if (heatmaps[selectedFilter]) {
        heatmaps[selectedFilter].setMap(map);
    }
}


function showNotification(message, duration = 3000) {
    notificationMessage.textContent = message;
    notification.classList.remove('hidden');
    setTimeout(() => {
        notification.classList.add('hidden');
    }, duration);
}

function showBuildingDetails(data) {
    buildingName.textContent = data.name;
    buildingAddress.textContent = data.address;

    // Display star rating
    buildingRating.innerHTML = '';
    const starCount = Math.round(data.rating);
    for (let i = 0; i < 5; i++) {
        buildingRating.innerHTML += `<span class="${i < starCount ? 'text-yellow-500' : 'text-gray-300'} text-2xl">${i < starCount ? '★' : '☆'}</span>`;
    }
    buildingRating.innerHTML += `<span class="ml-2 text-gray-600 font-semibold">${data.rating.toFixed(1)}</span>`;

    // Display accessibility features
    accessibilityFeatures.innerHTML = '';
    if (data.features.length > 0) {
        data.features.forEach(feature => {
            accessibilityFeatures.innerHTML += `<div class="flex items-center bg-gray-100 p-2 rounded-md"><span class="text-2xl mr-3">${feature.icon}</span> <span>${feature.name}</span></div>`;
        });
    } else {
        accessibilityFeatures.innerHTML = `<p class="text-gray-500">No specific accessibility features reported.</p>`;
    }

    buildingDetailsPanel.classList.remove('translate-y-full');
}

function hideBuildingDetails() {
    buildingDetailsPanel.classList.add('translate-y-full');
}

// --- Rating Modal Logic ---
function setupRatingModal() {
    modalStarRating.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
        const star = document.createElement('span');
        star.innerHTML = '☆';
        star.className = 'text-4xl text-gray-300 cursor-pointer';
        star.dataset.value = i;
        modalStarRating.appendChild(star);
    }

    modalStarRating.addEventListener('mouseover', e => {
        if (e.target.tagName === 'SPAN') {
            highlightStars(e.target.dataset.value);
        }
    });

    modalStarRating.addEventListener('mouseout', () => {
        const selected = modalStarRating.querySelector('.selected');
        highlightStars(selected ? selected.dataset.value : 0);
    });

    modalStarRating.addEventListener('click', e => {
        if (e.target.tagName === 'SPAN') {
            const stars = modalStarRating.querySelectorAll('span');
            stars.forEach(s => s.classList.remove('selected'));
            e.target.classList.add('selected');
            highlightStars(e.target.dataset.value);
        }
    });
}

function highlightStars(value) {
    const stars = modalStarRating.querySelectorAll('span');
    stars.forEach((star, index) => {
        if (index < value) {
            star.innerHTML = '★';
            star.className = 'text-4xl text-yellow-500 cursor-pointer';
        } else {
            star.innerHTML = '☆';
            star.className = 'text-4xl text-gray-300 cursor-pointer';
        }
    });
}

// --- Voice Reporting (Web Speech API) ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';

    voiceReportButton.addEventListener('click', () => {
        recognition.start();
        recordingIndicator.classList.remove('hidden');
        showNotification("Listening... Please state the issue and location.", 4000);
    });

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        console.log("Voice input:", transcript);
        // In a real app, you would process this transcript to identify the location and issue,
        // then call a backend function to report it.
        showNotification(`Reported: "${transcript}". Thank you!`, 5000);
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        showNotification("Sorry, I couldn't understand. Please try again.", 3000);
    };
    
    recognition.onend = () => {
        recordingIndicator.classList.add('hidden');
    };

} else {
    voiceReportButton.disabled = true;
    console.warn("Speech Recognition not supported in this browser.");
}

// --- Helper function to get API key ---
function getApiKeyFromScript() {
    const scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
        const src = scripts[i].src;
        if (src.includes('maps.googleapis.com')) {
            const keyParam = src.match(/key=([^&]*)/);
            return keyParam ? keyParam[1] : null;
        }
    }
    return null;
}

// --- Event Listeners ---
closeDetailsButton.addEventListener('click', hideBuildingDetails);

rateBuildingBtn.addEventListener('click', () => {
    setupRatingModal();
    ratingModal.classList.remove('hidden');
});

cancelRatingBtn.addEventListener('click', () => {
    ratingModal.classList.add('hidden');
});

submitRatingBtn.addEventListener('click', () => {
    // In a real app, this would send the rating to the backend.
    const selectedStar = modalStarRating.querySelector('.selected');
    const ratingValue = selectedStar ? selectedStar.dataset.value : 0;
    console.log(`Rating submitted: ${ratingValue} stars`);
    ratingModal.classList.add('hidden');
    showNotification('Thank you for your rating!', 3000);
});

sosButton.addEventListener('click', () => {
    console.log('SOS Activated!');
    // In a real app, this would get the user's current location and call the backend SOS function.
    showNotification('SOS Activated! Notifying emergency contacts.', 5000);
});

// New event listener for the filter dropdown
filterDropdown.addEventListener('change', updateHeatmapVisibility);
