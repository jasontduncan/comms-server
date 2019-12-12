FROM node:8.16-jessie

WORKDIR /usr/src/comms-server


# install deps
ADD package*.json ./
RUN npm install

COPY . .

EXPOSE 6313
CMD npm start