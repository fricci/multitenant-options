FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY tsconfig.json nest-cli.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
COPY public ./public
ENV PORT=3102
EXPOSE 3102
CMD ["node", "dist/main.js"]
