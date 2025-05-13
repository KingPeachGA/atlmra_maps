// js/map.js

document.addEventListener('DOMContentLoaded', function () {
    console.log("map.js: DOMContentLoaded fired.");

    // Initialize the MapLibre GL map
    const map = new maplibregl.Map({
        container: 'map', // The ID of the div where the map will be rendered
        style: 'https://demotiles.maplibre.org/style.json', // Basic public demo style
        center: [-98.5795, 39.8283], // Approximate center of the USA
        zoom: 3.5 // Initial zoom level
    });

    // This global variable will hold our parsed CSV data.
    // It's set here so other scripts can access it if loaded after this.
    window.visitedStatesData = [];
    let usStatesGeoJSON = null; // To store the loaded GeoJSON data in the scope of map.js

    map.on('load', async function () {
        console.log('map.js: MapLibre map loaded, attempting to fetch data...');

        try {
            // 1. Load GeoJSON for US States
            console.log("map.js: Attempting to fetch GeoJSON...");
            const geojsonResponse = await fetch('data/us-states.geojson');
            if (!geojsonResponse.ok) {
                throw new Error(`HTTP error! status: ${geojsonResponse.status} while fetching GeoJSON`);
            }
            usStatesGeoJSON = await geojsonResponse.json(); // Assign to the module-scoped variable
            console.log('map.js: US States GeoJSON loaded:', usStatesGeoJSON);

            // Add GeoJSON source for the states
            if (usStatesGeoJSON && usStatesGeoJSON.type === "FeatureCollection") {
                map.addSource('states-source', {
                    'type': 'geojson',
                    'data': usStatesGeoJSON // Use the loaded GeoJSON directly
                });
                console.log("map.js: GeoJSON source 'states-source' added.");
            } else {
                console.error("map.js: Loaded GeoJSON is not a valid FeatureCollection:", usStatesGeoJSON);
                return; // Stop if GeoJSON is not valid
            }

            // 2. Load and Parse CSV data for visited states
            console.log("map.js: Attempting to fetch CSV...");
            const csvResponse = await fetch('data/visited_states.csv');
            if (!csvResponse.ok) {
                throw new Error(`HTTP error! status: ${csvResponse.status} while fetching CSV`);
            }
            const csvText = await csvResponse.text();

            Papa.parse(csvText, {
                header: true, // Uses the first row as keys
                skipEmptyLines: true,
                complete: function (results) {
                    window.visitedStatesData = results.data; // Set global variable
                    console.log('map.js: Visited States CSV parsed:', window.visitedStatesData);

                    // 3. Call the function to add or update the map layer
                    addOrUpdateStatesLayer(); // Initial layer draw

                    // 4. Initialize the Data Editor (from data-editor.js)
                    // This is called after both GeoJSON and CSV are loaded and parsed.
                    // It also checks for login status internally.
                    if (typeof window.initializeDataEditorWithGeoJSON === 'function') {
                        console.log("map.js: Calling initializeDataEditorWithGeoJSON...");
                        window.initializeDataEditorWithGeoJSON(usStatesGeoJSON); // Pass the loaded GeoJSON
                    } else {
                        console.warn("map.js: initializeDataEditorWithGeoJSON function not found. Edit form may not work.");
                    }
                },
                error: function(error, file) {
                    console.error("map.js: Error parsing CSV:", error, file);
                }
            });

        } catch (error) {
            console.error("map.js: Failed to load map data in map.on('load'):", error);
        }
    });

    map.on('error', function(e) {
        // Catch and log MapLibre specific errors
        console.error("map.js: MapLibre error:", e);
    });

    map.on('mouseenter', 'states-layer', function () {
        map.getCanvas().style.cursor = 'pointer';
    });

    // Change it back to a default cursor when it leaves.
    map.on('mouseleave', 'states-layer', function () {
        map.getCanvas().style.cursor = '';
    });

    // When a click event occurs on a feature in the 'states-layer'.
    map.on('click', 'states-layer', function (e) {
        if (e.features.length > 0) {
            const featureProperties = e.features[0].properties;
            // Assuming your GeoJSON property for state name is 'NAME'
            // This MUST match what you used in addOrUpdateStatesLayer's fillColorExpression
            const geojsonStateNameProperty = 'NAME';
            const stateName = featureProperties[geojsonStateNameProperty];

            // Find the corresponding state data from your CSV data
            const stateData = window.visitedStatesData.find(s => s.state_name === stateName);

            let popupContent = `<h5 class="mb-2" style="color: #333;">${stateName}</h5>`;

            if (stateData) {
                let statusDisplay = "Not Visited";
                    if (stateData.trip_status === 'visited') statusDisplay = '<span style="color: green; font-weight: bold;">Visited</span>';
                    if (stateData.trip_status === 'planned') statusDisplay = '<span style="color: #DAA520; font-weight: bold;">Planned</span>'; // Darker Yellow

                popupContent += `<p class="mb-1"><strong>Status:</strong> ${statusDisplay}</p>`;
                if (stateData.trip_status === 'visited') { // Only show visit details if actually visited
                    popupContent += `<p class="mb-1"><strong>Visit Count:</strong> ${stateData.visit_count || 0}</p>`;
                    popupContent += `<p class="mb-1"><strong>Last Visit:</strong> ${stateData.last_visit_date || 'N/A'}</p>`;
                    const allVisits = stateData.all_visit_dates ? stateData.all_visit_dates.split(';').join(', ') : 'N/A';
                    popupContent += `<p class="mb-0"><strong>All Visits:</strong> ${allVisits}</p>`;
                } else if (stateData.trip_status === 'planned') {
                                    // Optionally show planned date if you add that to your CSV/form
                     popupContent += `<p class="mb-1"><strong>Planned Visit Date:</strong> ${stateData.last_visit_date || 'N/A'}</p>`; // Assuming last_visit_date can be used for planned date
                }
            } else {
                popupContent += "<p class='mb-1'>No visit data recorded for this state.</p>";
            }

            // Add "Edit this State" button to popup if user is logged in
            if (sessionStorage.getItem('loggedIn') === 'true') {
                // Ensure stateName is properly escaped if it could contain quotes, though unlikely for US state names.
                // Using template literals for the onclick attribute value is fine here.
                popupContent += `<button class="btn btn-sm btn-outline-primary mt-2" onclick="window.selectStateInForm('${stateName.replace(/'/g, "\\'")}')">Edit State Data</button>`;
            }

            // Create a popup
            new maplibregl.Popup({ closeButton: true, maxWidth: '280px' })
                .setLngLat(e.lngLat)
                .setHTML(popupContent)
                .addTo(map);
        }
    });

    // Helper function (globally scoped) to select state in form from popup
    // This function will be called by the "Edit State Data" button in the popup.
    // It should be defined in a scope accessible from the onclick attribute.
    // Making it a property of window ensures this.
    window.selectStateInForm = function(stateName) {
        const stateSelect = document.getElementById('stateSelect');
        const editControlsContainer = document.getElementById('editControlsContainer');

        if (stateSelect && editControlsContainer) {
            stateSelect.value = stateName;
            // Trigger change event to make data-editor.js load the state's data into the form
            stateSelect.dispatchEvent(new Event('change'));
            // Scroll to the form for better UX
            editControlsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            console.warn("selectStateInForm: stateSelect or editControlsContainer not found.");
        }
    };

    // Function to add or update the states layer
    function addOrUpdateStatesLayer() {
        if (!map.getSource('states-source')) {
            console.error("map.js: 'states-source' not found. Cannot add/update layer.");
            return;
        }

        // If the layer already exists, remove it before re-adding with updated styles
        if (map.getLayer('states-layer')) {
            map.removeLayer('states-layer');
            console.log("map.js: Removed existing 'states-layer'.");
        }

        // IMPORTANT: Match GeoJSON property with CSV column.
        // The GeoJSON from eric.clst.org uses 'NAME' for the state name.
        // Your CSV uses 'state_name'. We will match based on these.
        const geojsonStateNameProperty = 'NAME'; // Adjust if your GeoJSON uses a different property

        const fillColorExpression = ['match', ['get', geojsonStateNameProperty]];

        window.visitedStatesData.forEach(stateDataFromCsv => {
            if (stateDataFromCsv.state_name) { // Ensure state_name exists in CSV row
                // Example: Darker green for multiple visits, lighter green for one, light gray for not visited
                let color = '#adadad'; // Default: LightGray (not visited)
                if (stateDataFromCsv.trip_status === 'visited') {
                    const visitCount = parseInt(stateDataFromCsv.visit_count, 10);
                    if (visitCount > 1) {
                        color = '#162e51'; // vads-button-color-text-secondary-active-on-light vads-color-primary-darkest (multiple visits)
                    } else if (visitCount === 1) {
                        color = '#58b4ff'; // vads-color-action-surface-default-on-dark blue-30v (single visit)
                    } else {
                        color = '#90EE90'; // LightGreen (visited but count is 0 or invalid, treat as visited)
                    } else if (stateDataFromCsv.trip_status === 'planned') {
            color = '#f3cf45'; // VA Gold
            // Alternatively, for patterned fills (more complex):
            // You might need to add a new layer for patterns or use advanced MapLibre styling.
            // For simplicity, let's stick to solid colors first.
        }
                }
                fillColorExpression.push(stateDataFromCsv.state_name, color);
            }
        });
        fillColorExpression.push('#ffbe2e'); // Fallback color for any states in GeoJSON not found in CSV or without a match

        map.addLayer({
            'id': 'states-layer',
            'type': 'fill',
            'source': 'states-source',
            'layout': {},
            'paint': {
                'fill-color': fillColorExpression,
                'fill-opacity': 0.75,
                'fill-outline-color': '#000000' // Black outline for states
            }
        });
        console.log("map.js: States layer added/updated.");
    }

    // Make refreshMapLayer globally accessible for data-editor.js to call
    window.refreshMapLayer = function() {
        console.log("map.js: refreshMapLayer called.");
        if (map && window.visitedStatesData && map.getSource('states-source')) {
            addOrUpdateStatesLayer(); // Re-applies styles based on current window.visitedStatesData
        } else {
            console.warn("map.js: Map, visitedStatesData, or states-source not ready for refreshMapLayer.");
        }
    };

    // --- Phase 6: Map Interactivity (Click Popups) ---
    // We'll add this later, but this is where it would go.
    // map.on('click', 'states-layer', function (e) { ... });
    // map.on('mouseenter', 'states-layer', function () { ... });
    // map.on('mouseleave', 'states-layer', function () { ... });

});
