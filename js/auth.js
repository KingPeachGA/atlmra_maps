document.addEventListener('DOMContentLoaded', function () {
    // --- Sign-in Page Logic (for sign-in.html) ---
    const signInForm = document.querySelector('#signInForm'); // Assuming your form has id="signInForm"

    // If on the sign-in page and the form exists
    if (signInForm && window.location.pathname.includes('sign-in.html')) {
        signInForm.addEventListener('submit', function (event) {
            event.preventDefault(); // Prevent actual form submission

            const emailInput = document.getElementById('floatingInput'); // Default ID from Bootstrap example
            const passwordInput = document.getElementById('floatingPassword'); // Default ID

            if (!emailInput || !passwordInput) {
                console.error("Email or password input field not found!");
                alert("Sign-in form error. Please check console.");
                return;
            }

            // VERY INSECURE: Password check is client-side and visible in code.
            // This is only for a personal project where security is not a concern for this feature.
            // Consider this a simple gate, not a real security measure.
            const MOCK_USER = 'atlmra@atlcra.com'; // Change this to your desired "username"
            const MOCK_PASS = '123456';    // Change this to your desired "password"

            if (emailInput.value === MOCK_USER && passwordInput.value === MOCK_PASS) {
                // "Login" successful
                sessionStorage.setItem('loggedIn', 'true'); // Use sessionStorage to "remember" login for this browser session
                window.location.href = 'index.html';   // Redirect to the main dashboard/map page
            } else {
                alert('Invalid username or password.');
                sessionStorage.removeItem('loggedIn'); // Ensure not marked as logged in
                passwordInput.value = ""; // Clear password field
                passwordInput.focus();
            }
        });
    }

    // --- Logic for Main Page (index.html) to check login status ---
    // This will run when index.html loads, and auth.js is also linked there (or will be).
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/' ||  window.location.pathname.endsWith('/atlmra_maps/')) { // Adjust for root path if needed
        const loggedIn = sessionStorage.getItem('loggedIn') === 'true';
        const signInLink = document.getElementById('signInLink'); // We'll add this to index.html
        const signOutLink = document.getElementById('signOutLink'); // We'll add this to index.html
        const editControlsContainer = document.getElementById('editControlsContainer'); // We'll add this in Phase 4

        if (loggedIn) {
            console.log("User is logged in.");
            if (signInLink) signInLink.style.display = 'none';
            if (signOutLink) signOutLink.style.display = 'inline-block'; // Or 'block' depending on element
            if (editControlsContainer) editControlsContainer.style.display = 'block'; // Show edit controls

            // Initialize data editor if function exists (will be created in Phase 4)
            // Ensure usStatesGeoJSON is available or passed if needed by the editor initializer
            // This part might be better called from map.js after data is loaded.
            // For now, we just check if the user is logged in.
            // The actual call to initializeDataEditorWithGeoJSON is already in map.js's Papa.parse callback.

        } else {
            console.log("User is not logged in. Edit features should be hidden.");
            if (signInLink) signInLink.style.display = 'inline-block';
            if (signOutLink) signOutLink.style.display = 'none';
            if (editControlsContainer) editControlsContainer.style.display = 'none'; // Hide edit controls
        }

        // Sign Out functionality
        if (signOutLink) {
            signOutLink.addEventListener('click', function(event) {
                event.preventDefault();
                sessionStorage.removeItem('loggedIn');
                alert('You have been signed out.');
                window.location.reload(); // Reload to reflect signed-out state
            });
        }
    }
});