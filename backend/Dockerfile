FROM node:16-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY src/ ./src/

# Порт, который будет прослушивать приложение
EXPOSE 8080

# Команда для запуска приложения
CMD ["node", "src/index.js"]