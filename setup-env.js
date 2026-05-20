// Setup script to create .env file from .env.example
const fs = require('fs');
const path = require('path');

const envExamplePath = path.join(__dirname, '.env.example');
const envPath = path.join(__dirname, '.env');

if (fs.existsSync(envExamplePath)) {
  const envContent = fs.readFileSync(envExamplePath, 'utf8');
  
  if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, envContent);
    console.log('.env file created successfully from .env.example');
    console.log('Please update the JWT_SECRET in .env before running the application.');
  } else {
    console.log('.env file already exists. Skipping creation.');
  }
} else {
  console.log('.env.example not found. Please create it manually.');
}
