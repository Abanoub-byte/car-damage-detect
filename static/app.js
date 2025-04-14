document.getElementById("uploadForm").addEventListener("submit", function (event) {
    event.preventDefault();

    const formData = new FormData();
    formData.append("image", document.getElementById("image").files[0]);

    // Send the image to the classification model
    fetch("/predict_damage", {
        method: "POST",
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        const prediction = data.prediction;

        // Display the classification result
        document.getElementById("result").innerHTML = `<h2>Classification Result: ${prediction}</h2>`;

        if (prediction === "Damaged") {
            // Fetch segmented image
            fetch("/predict_segmented_damage", {
                method: "POST",
                body: formData
            })
            .then(response => response.blob())
            .then(blob => {
                const imgURL = URL.createObjectURL(blob);
                document.getElementById("segmentationResult").innerHTML = `
                    <h2>Segmented Image:</h2>
                    <img src="${imgURL}" alt="Segmented Output" style="width: 400px; height: auto;">
                `;

                // Show and activate the PDF download button
                document.getElementById("pdfButtonContainer").style.display = "block";
                const downloadBtn = document.getElementById("downloadPdfBtn");

                // Remove any previous handlers to avoid duplicates
                downloadBtn.onclick = null;

                // Attach new handler
                downloadBtn.onclick = function () {
                    fetch("/download_pdf", {
                        method: "POST",
                        body: formData
                    })
                    .then(response => response.blob())
                    .then(blob => {
                        const pdfURL = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = pdfURL;
                        a.download = "car_damage_report.pdf";
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                    })
                    .catch(error => {
                        alert("Failed to download PDF: " + error);
                    });
                };
            })
            .catch(error => {
                document.getElementById("segmentationResult").innerHTML = `<h2>Error: ${error}</h2>`;
            });
        } else {
            // Hide the PDF button if car is not damaged
            document.getElementById("pdfButtonContainer").style.display = "none";
            document.getElementById("segmentationResult").innerHTML = "";
        }
    })
    .catch(error => {
        document.getElementById("result").innerHTML = `<h2>Error: ${error}</h2>`;
    });
});

// Location handling
document.getElementById('getLocation').addEventListener('click', function () {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
            var lat = position.coords.latitude;
            var lon = position.coords.longitude;

            var container = document.getElementById('workshopContainer');
            container.classList.add('show');
            searchNearbyPlaces(lat, lon);
        }, function () {
            alert("Error: Unable to retrieve your location. Defaulting to Moscow.");
            var container = document.getElementById('workshopContainer');
            container.classList.add('show');
            searchNearbyPlaces(55.7558, 37.6173);
        });
    } else {
        alert("Geolocation is not supported by this browser.");
    }
});

// Workshop API logic
function searchNearbyPlaces(lat, lon) {
    var query = "workshop";
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
    resultsDiv.innerHTML = '';

    if (places && places.length > 0) {
        places.forEach(place => {
            resultsDiv.innerHTML += createPlaceElement(place);
        });
    } else {
        resultsDiv.innerHTML = 'No workshops found nearby.';
    }
}

function openIn2GIS(placeId) {
    var url = `https://2gis.ru/moscow/search/${placeId}`;
    window.open(url, '_blank');
}
