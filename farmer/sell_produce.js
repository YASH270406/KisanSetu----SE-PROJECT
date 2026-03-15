document.getElementById('produce-form').addEventListener('submit', function(e) {
    e.preventDefault(); // Prevent page reload

    // Grab the values
    const crop = document.getElementById('cropName').value;
    const qty = document.getElementById('quantity').value;
    const unit = document.getElementById('unit').value;
    const price = document.getElementById('price').value;

    // Simulate saving the data (this is where we'd hit the Node.js API)
    alert(`Success! Your listing for ${qty} ${unit} of ${crop} at ₹${price}/${unit} has been published to the marketplace.`);

    // Redirect back to dashboard
    window.location.href = 'farmer_dashboard.html';
});