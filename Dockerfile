# Use an official Node.js runtime as a parent image (ARM64 version)
FROM arm64v8/node:16-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy your application's package.json and package-lock.json (if any)
COPY package*.json ./

# Install any dependencies
RUN apk add --no-cache curl \
    && npm install

# Copy the rest of the application code into the container
COPY . .

# Application and health-check ports
EXPOSE 3000 8080

CMD ["node", "app.js"]  # Adjust to the entry point of your app
