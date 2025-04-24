FROM node:18.20.8-alpine3.21

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5000

# Use the same command as your "start" script
CMD ["npm", "start"]