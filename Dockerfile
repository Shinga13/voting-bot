FROM node:lts-alpine
COPY ./ /
WORKDIR /
RUN npm install

CMD ["node", "--env-file=.env", "index.js"]