const http = require("http"); 

http.createServer((req, res) => { 
  // Create an array of 100 cookies with random values and expiry dates
  const cookies = Array.from({length: 100}, (_, i) => {
    // Generate random value
    const randomValue = Math.random().toString(36).substring(7);
    
    // Set expiry date (30 days from now)
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    
    // Two ways to set expiry:
    if (i % 2 === 0) {
      // Method 1: Using Expires attribute
      return `cookie${i}=${randomValue}; Path=/; Expires=${expiryDate.toUTCString()}`;
    } else {
      // Method 2: Using Max-Age attribute (in seconds)
      return `cookie${i}=${randomValue}; Path=/; Max-Age=${60 * 60 * 24 * 30}`; // 30 days
    }
  }); 
  
  res.writeHead(200, {"Set-Cookie": cookies}); 
  res.end("Cookies set with expiry dates!"); 
}).listen(8080);
