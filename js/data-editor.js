// js/data-editor.js

// This global variable was set in map.js after PapaParse: window.visitedStatesData
// This will store the GeoJSON features passed from map.js
let currentGeoJSONFeaturesForEditor = null;

// Function to populate the state select dropdown
function populateStateSelect() {
    const stateSelect = document.getElementById('stateSelect');
    if (!stateSelect || !currentGeoJSONFeaturesForEditor) {
        console.warn("State select dropdown or GeoJSON features not available for population.");
        stateSelect.innerHTML = '<option value="" selected disabled>-- Error Loading States --</option>';
        return;
    }

    stateSelect.innerHTML = '<option value="" selected disabled>-- Select a State --</option>'; // Clear existing and add placeholder

    // Assuming GeoJSON features have 'properties.NAME' for the state name.
    // This needs to match the property used in map.js for map coloring.
    const geojsonStateNameProperty = 'NAME';

    currentGeoJSONFeaturesForEditor.forEach(feature => {
        const stateName = feature.properties[geojsonStateNameProperty];
        if (stateName) {
            const option = document.createElement('option');
            option.value = stateName;
            option.textContent = stateName;
            stateSelect.appendChild(option);
        }
    });
}

// Function to load data into the form when a state is selected
function loadStateDataToForm(selectedStateName) {
    const visitedStatusCheckbox = document.getElementById('visitedStatus');
    const visitCountInput = document.getElementById('visitCount');
    const lastVisitDateInput = document.getElementById('lastVisitDate');
    const allVisitDatesTextarea = document.getElementById('allVisitDates');

    if (!selectedStateName) { // Clear form if no state is selected (e.g., "-- Select a State --")
        clearEditFormFields();
        return;
    }

    // Find the state in our global CSV data array
    // Ensure 'state_name' here matches the CSV header used in map.js
    const stateData = window.visitedStatesData.find(s => s.state_name === selectedStateName);

    if (stateData) {
        visitedStatusCheckbox.checked = stateData.visited_status === 'true';
        visitCountInput.value = stateData.visit_count || '0';
        lastVisitDateInput.value = stateData.last_visit_date || '';
        allVisitDatesTextarea.value = stateData.all_visit_dates || '';
    } else {
        // State not found in CSV (e.g., newly selected from GeoJSON but not yet in our data)
        // Default to unvisited
        visitedStatusCheckbox.checked = false;
        visitCountInput.value = '0';
        lastVisitDateInput.value = '';
        allVisitDatesTextarea.value = '';
    }
}

// Function to clear form fields
function clearEditFormFields() {
    document.getElementById('editStateForm').reset(); // Resets form elements to their initial state
    document.getElementById('stateSelect').value = ""; // Explicitly reset select if needed
    // Any other custom clearing logic if reset() isn't enough
}


// Main initialization function for the data editor
// This will be called from map.js after GeoJSON and CSV data are loaded and user is logged in
window.initializeDataEditorWithGeoJSON = function(geojsonData) {
    console.log("Attempting to initialize Data Editor...");
    if (sessionStorage.getItem('loggedIn') !== 'true') {
        console.log("Data Editor: User not logged in. Aborting initialization.");
        // Ensure edit controls are hidden if somehow this is called when not logged in
        const editControls = document.getElementById('editControlsContainer');
        if (editControls) editControls.style.display = 'none';
        return;
    }

    console.log("Data Editor: User logged in. Proceeding with initialization.");
    const editControls = document.getElementById('editControlsContainer');
    if (editControls) editControls.style.display = 'block'; // Explicitly show if logged in


    if (geojsonData && geojsonData.features) {
        currentGeoJSONFeaturesForEditor = geojsonData.features;
        populateStateSelect();
    } else {
        console.error("Data Editor: GeoJSON data not provided or invalid for editor initialization.");
        const stateSelect = document.getElementById('stateSelect');
        if(stateSelect) stateSelect.innerHTML = '<option value="" selected disabled>-- Error: GeoJSON Missing --</option>';
        return; // Stop if no GeoJSON
    }

    const editStateForm = document.getElementById('editStateForm');
    const stateSelect = document.getElementById('stateSelect');
    const clearFormButton = document.getElementById('clearEditFormButton');

    if (!editStateForm || !stateSelect || !clearFormButton || !window.visitedStatesData) {
        console.error("Data Editor: One or more critical form elements or global data (window.visitedStatesData) not found.");
        return;
    }

    // Event listener for state selection change
    stateSelect.addEventListener('change', function() {
        loadStateDataToForm(this.value);
    });

    // Event listener for form submission
    editStateForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const selectedStateName = stateSelect.value;
        if (!selectedStateName) {
            alert('Please select a state to update.');
            return;
        }

        // Find existing state data or prepare to add new if it doesn't exist in CSV
        let stateData = window.visitedStatesData.find(s => s.state_name === selectedStateName);
        const isNewStateInCsv = !stateData;

        if (isNewStateInCsv) {
            // If it's a state from GeoJSON not yet in our CSV data, create a new entry.
            // We need a unique 'id' - for now, using state name, but a more robust ID from GeoJSON (like FIPS code) would be better if available and consistent.
            // Let's assume GeoJSON features have 'properties.STATEFP' or similar for a unique ID.
            // And 'properties.NAME' for state_name.
            const geojsonFeature = currentGeoJSONFeaturesForEditor.find(f => f.properties.NAME === selectedStateName);
            const stateIdFromGeoJSON = geojsonFeature ? (geojsonFeature.properties.STATEFP || selectedStateName) : selectedStateName; // Example ID

            stateData = {
                id: stateIdFromGeoJSON, // Use this new ID
                state_name: selectedStateName,
                // Initialize other fields, they will be updated from form below
            };
            window.visitedStatesData.push(stateData);
            console.log(`Data Editor: Added new entry for ${selectedStateName} to local data.`);
        }

        // Update stateData object (which is a reference to an object in window.visitedStatesData array)
        stateData.visited_status = document.getElementById('visitedStatus').checked.toString();
        stateData.visit_count = document.getElementById('visitCount').value || '0';
        stateData.last_visit_date = document.getElementById('lastVisitDate').value || '';
        stateData.all_visit_dates = document.getElementById('allVisitDates').value.trim() || '';

        console.log(`Data Editor: ${selectedStateName} data updated locally:`, stateData);
        alert(`${selectedStateName} data has been updated locally. Remember to download the CSV to save your changes permanently.`);

        // Refresh map layer to reflect changes
        if (typeof window.refreshMapLayer === 'function') {
            window.refreshMapLayer();
        } else {
            console.warn("Data Editor: refreshMapLayer function not found to update map.");
        }
    });

    // Download CSV button functionality
    const downloadCsvButton = document.getElementById('downloadCsvButton');
    if (downloadCsvButton) {
        downloadCsvButton.addEventListener('click', function() {
            if (!window.visitedStatesData || window.visitedStatesData.length === 0) {
                alert("No data available to download.");
                return;
            }
            // Ensure all objects have the same headers in the same order for Papa.unparse
            const headers = ["id", "state_name", "visited_status", "visit_count", "last_visit_date", "all_visit_dates"];
            const csvString = Papa.unparse(window.visitedStatesData, {
                columns: headers, // Specify column order
                header: true
            });

            const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            if (link.download !== undefined) { // Check for download attribute support
                const url = URL.createObjectURL(blob);
                link.setAttribute("href", url);
                link.setAttribute("download", "updated_visited_states.csv");
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            } else {
                alert("CSV download not supported by your browser (or failed).");
            }
        });
    }

    // Clear Form button functionality
    clearFormButton.addEventListener('click', clearEditFormFields);

    console.log("Data Editor initialized successfully.");
};