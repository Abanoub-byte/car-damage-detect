// 🔁 Handle image upload, prediction, segmentation & PDF download

let userLocation = "";
document.getElementById("uploadForm").addEventListener("submit", function (event) {
    event.preventDefault();

    const formData = new FormData();
    formData.append("image", document.getElementById("image").files[0]);
    formData.append("location", userLocation);
    fetch("/predict_damage", {
        method: "POST",
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        const prediction = data.prediction;
        document.getElementById("result").innerHTML = `<h2>Classification Result: ${prediction}</h2>`;

        if (prediction === "Damaged") {
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

                document.getElementById("pdfButtonContainer").style.display = "block";
                const downloadBtn = document.getElementById("downloadPdfBtn");
                downloadBtn.onclick = null;

                downloadBtn.onclick = function () {
                    const newFormData = new FormData();
                    newFormData.append("image", document.getElementById("image").files[0]);
                    newFormData.append("location", userLocation);
                
                    fetch("/download_pdf", {
                        method: "POST",
                        body: newFormData
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
            document.getElementById("pdfButtonContainer").style.display = "none";
            document.getElementById("segmentationResult").innerHTML = "";
        }
    })
    .catch(error => {
        document.getElementById("result").innerHTML = `<h2>Error: ${error}</h2>`;
    });
});

// 📍 Location Logic

// Reusable function to get location
function getLocationAndSearch(showErrorIfDenied = false) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function (position) {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                userLocation = `${lat}, ${lon}`;
                document.getElementById('workshopContainer').classList.add('show');
                searchNearbyPlaces(lat, lon);
            },
            function (error) {
                if (showErrorIfDenied) {
                    alert("You need to enable the location to find near workshops.");
                } else {
                    console.warn("Location permission denied silently on page load.");
                }
            }
        );
    } else {
        alert("Geolocation is not supported by this browser.");
    }
}

// 📌 Request location immediately on page load
window.addEventListener("load", function () {
    getLocationAndSearch(false); // Try silently
});

// 📍 Location button click
document.getElementById('getLocation').addEventListener('click', function () {
    getLocationAndSearch(true); // Try again and alert if denied
});

// 🛠 Search workshops using 2GIS API
function searchNearbyPlaces(lat, lon) {
    const query = "workshop";
    const url = `https://catalog.api.2gis.com/3.0/items?q=${query}&location=${lon},${lat}&key=314f8042-93f7-4fc3-b34e-3124b2e61c44`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            displayResults(data.result.items);
        })
        .catch(error => {
            console.error('Error fetching data from 2GIS:', error);
            alert('An error occurred while fetching workshop data.');
        });
}

// 🔍 Format workshop result <text x="50%" y="50%" fill="#ffffff" dy=".3em">32x32</text>
function createPlaceElement(place) {
    return `
        <div class="d-flex text-body-secondary pt-3">
            <svg class="bd-placeholder-img flex-shrink-0 me-2 rounded" width="32" height="32" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Placeholder: 32x32" preserveAspectRatio="xMidYMid slice">
                <title>Placeholder</title>
                <rect width="100%" height="100%" fill="#007bff"></rect>
            </svg>
            <div class="pb-3 mb-0 small lh-sm border-bottom w-100">
                <div class="d-flex justify-content-between">
                    <strong class="text-gray-dark wrap-text">${place.name}</strong>
                    <a href="#" onclick="openIn2GIS('${place.address_name}')">View on map</a>
                </div>
                <span class="d-block">${place.address_name} ${place.address_comment || ''}</span>
            </div>
        </div>
    `;
}

// 🖥 Show search results
function displayResults(places) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '';

    if (places && places.length > 0) {
        places.forEach(place => {
            resultsDiv.innerHTML += createPlaceElement(place);
        });
    } else {
        resultsDiv.innerHTML = 'No workshops found nearby.';
    }
}

// 📍 Open map link
function openIn2GIS(placeId) {
    const url = `https://2gis.ru/moscow/search/${placeId}`;
    window.open(url, '_blank');
}
