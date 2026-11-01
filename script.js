// EMERGENCY SOS BUTTON
function showEmergencyMessage() {
    alert("This is a student demo website. It does not contact emergency services. For a real emergency in India, call 112.");
}


// LIVE RESPONSE MAP FILTERS
const mapFilters = document.getElementById("mapFilters");

if (mapFilters) {
    const filterButtons = mapFilters.querySelectorAll(".filter");
    const markers = document.querySelectorAll(".map-marker");

    filterButtons.forEach(function(button) {
        button.addEventListener("click", function() {

            filterButtons.forEach(function(item) {
                item.classList.remove("active");
            });

            button.classList.add("active");

            const selectedType = button.getAttribute("data-filter");

            markers.forEach(function(marker) {

                if (
                    selectedType === "all" ||
                    marker.getAttribute("data-type") === selectedType
                ) {
                    marker.style.display = "block";
                } else {
                    marker.style.display = "none";
                }

            });
        });
    });


    // SHOW DETAILS WHEN A MAP MARKER IS CLICKED
    markers.forEach(function(marker) {
        marker.addEventListener("click", function() {

            document.getElementById("locationName").textContent =
                marker.getAttribute("data-name");

            document.getElementById("locationInfo").textContent =
                marker.getAttribute("data-info");

        });
    });
}


// MEDICAL SUPPLY SEARCH AND FILTERS
const supplyFilters = document.getElementById("supplyFilters");

if (supplyFilters) {

    const filterButtons = supplyFilters.querySelectorAll(".filter");
    const cards = document.querySelectorAll(".supply-card");
    const searchBox = document.getElementById("supplySearch");
    const noResults = document.getElementById("noResults");

    let selectedCategory = "all";


    // FUNCTION TO FILTER SUPPLY CARDS
    function updateSupplies() {

        let visibleCount = 0;

        const searchText = searchBox.value.toLowerCase();

        cards.forEach(function(card) {

            const category = card.getAttribute("data-category");
            const searchableText = card.getAttribute("data-search");

            const categoryMatches =
                selectedCategory === "all" ||
                category === selectedCategory;

            const textMatches =
                searchableText.includes(searchText);

            if (categoryMatches && textMatches) {

                card.classList.remove("hidden");
                visibleCount++;

            } else {

                card.classList.add("hidden");

            }

        });

        if (visibleCount === 0) {
            noResults.classList.remove("hidden");
        } else {
            noResults.classList.add("hidden");
        }
    }


    // FILTER BY CATEGORY
    filterButtons.forEach(function(button) {

        button.addEventListener("click", function() {

            filterButtons.forEach(function(item) {
                item.classList.remove("active");
            });

            button.classList.add("active");

            selectedCategory = button.getAttribute("data-filter");

            updateSupplies();

        });

    });


    // SEARCH WHILE TYPING
    searchBox.addEventListener("input", updateSupplies);

}