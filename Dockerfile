# Multi-App Enterprise Developer Console Container
FROM node:20-alpine

WORKDIR /usr/src/app

RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

VOLUME [ "/usr/src/app/data" ]

EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

CMD [ "npm", "start" ]
