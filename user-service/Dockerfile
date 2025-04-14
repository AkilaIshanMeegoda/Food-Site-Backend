FROM node:16

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5000

# Use the same command as your "start" script
CMD ["npm", "start"]