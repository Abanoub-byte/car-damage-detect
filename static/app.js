document.getElementById("uploadForm").addEventListener("submit", function(event) {
    event.preventDefault();

    const formData = new FormData();
    formData.append("image", document.getElementById("image").files[0]);

    // Send the image to the classification model for prediction
    fetch("/predict_damage", {
        method: "POST",
        body: formData
    })
    .then(response => response.json())  
    .then(data => {
        const prediction = data.prediction;

        // Display the classification result
        document.getElementById("result").innerHTML = `<h2>Classification Result: ${prediction}</h2>`;

        // If the car is damaged, fetch the segmented image
        if (prediction === "Damaged") {
            fetch("/predict_segmented_damage", {
                method: "POST",
                body: formData
            })
            .then(response => response.blob())  // Expecting a PNG image blob
            .then(blob => {
                const imgURL = URL.createObjectURL(blob);
                // Display the segmented image
                document.getElementById("segmentationResult").innerHTML = `<h2>Segmented Image:</h2><img src="${imgURL}" alt="Segmented Output" style="width: 400px; height: auto;">`;
            })
            .catch(error => {
                document.getElementById("segmentationResult").innerHTML = `<h2>Error: ${error}</h2>`;
            });
        }
    })
    .catch(error => {
        document.getElementById("result").innerHTML = `<h2>Error: ${error}</h2>`;
    });
});
document.getElementById('getLocation').addEventListener('click', function () {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
            var lat = position.coords.latitude;
            var lon = position.coords.longitude;

            // Show the container with animation
            var container = document.getElementById('workshopContainer');
            container.classList.add('show'); // Add 'show' class to make it visible with animation

            // Perform the search for nearby workshops
            searchNearbyPlaces(lat, lon);
        }, function () {
            alert("Error: Unable to retrieve your location. Defaulting to Moscow.");
            var container = document.getElementById('workshopContainer');
            container.classList.add('show'); // Add 'show' class to make it visible with animation
            searchNearbyPlaces(55.7558, 37.6173); // Default to Moscow if geolocation fails
        });
    } else {
        alert("Geolocation is not supported by this browser.");
    }
});

// Function to search for workshops near a location using 2GIS API
function searchNearbyPlaces(lat, lon) {
    var query = "workshop"; // Search for "workshop" (you can change this to any category like "car repair")
    var url = `https://catalog.api.2gis.com/3.0/items?q=${query}&location=${lon},${lat}&key=314f8042-93f7-4fc3-b34e-3124b2e61c44`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            displayResults(data.result.items);
        })
        .catch(error => {
            console.error('Error fetching data from 2GIS:', error);
            alert('An error occurred while fetching data.');
        });
}

function createPlaceElement(place) {
    return `
        <div class="d-flex text-body-secondary pt-3">
            <svg class="bd-placeholder-img flex-shrink-0 me-2 rounded" width="32" height="32" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Placeholder: 32x32" preserveAspectRatio="xMidYMid slice">
                <title>Placeholder</title>
                <rect width="100%" height="100%" fill="#007bff"></rect>
                <text x="50%" y="50%" fill="#007bff" dy=".3em">32x32</text>
            </svg>
            <div class="pb-3 mb-0 small lh-sm border-bottom w-100">
                <div class="d-flex justify-content-between">
                   <strong class="text-gray-dark flex-shrink-0" style="flex-basis: 50%; overflow-wrap: break-word;">${place.name}</strong>
                    <a href="#" onclick="openIn2GIS('${place.address_name}')">View on map</a>
                </div>
                <span class="d-block">${place.address_name} ${place.address_comment}</span>
            </div>
        </div>
    `;
}

function displayResults(places) {
    var resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '';  // Clear previous results

    if (places && places.length > 0) {
        places.forEach(place => {
            var placeHTML = createPlaceElement(place);
            resultsDiv.innerHTML += placeHTML; // Append the new content to results div
        });
    } else {
        resultsDiv.innerHTML = 'No workshops found nearby.';
    }
}

// Function to open the place on 2GIS Maps when the button is clicked
function openIn2GIS(placeId) {
    var url = `https://2gis.ru/moscow/search/${placeId}`;
    window.open(url, '_blank');
}
