# stage: 1
FROM node:20 as react-build
WORKDIR /app
COPY package.json package-lock.json ./
# RUN yarn install
# RUN yarn build
RUN npm install

COPY . ./
RUN npm run build

# intermediate stage - build CLI binaries
# for Windows, Mac, Linux - amd64
FROM golang:1.13 as cli-build
WORKDIR /go/bin
RUN go get github.com/Electrostatics/apbs-rest/cli/apbs \
    && go get github.com/Electrostatics/apbs-rest/cli/pdb2pqr \
    && rm apbs pdb2pqr \
    && GOOS=linux   GOARCH=amd64 go build -o apbs_amd64-linux github.com/Electrostatics/apbs-rest/cli/apbs \
    && GOOS=linux   GOARCH=amd64 go build -o pdb2pqr_amd64-linux github.com/Electrostatics/apbs-rest/cli/pdb2pqr \
    && GOOS=windows GOARCH=amd64 go build -o apbs_amd64-windows.exe github.com/Electrostatics/apbs-rest/cli/apbs \
    && GOOS=windows GOARCH=amd64 go build -o pdb2pqr_amd64-windows.exe github.com/Electrostatics/apbs-rest/cli/pdb2pqr \
    && GOOS=darwin  GOARCH=amd64 go build -o apbs_amd64-macOS github.com/Electrostatics/apbs-rest/cli/apbs \
    && GOOS=darwin  GOARCH=amd64 go build -o pdb2pqr_amd64-macOS github.com/Electrostatics/apbs-rest/cli/pdb2pqr
    # && GOOS=darwin  GOARCH=amd64 go build -o pdb2pqr_amd64-macOS github.com/Electrostatics/apbs-rest/cli/pdb2pqr \
    # && ls -la 
RUN apt update && apt install -y zip \
    && mkdir apbs-rest-cli_win && mv apbs_amd64-windows.exe pdb2pqr_amd64-windows.exe apbs-rest-cli_win/ \
    && mkdir apbs-rest-cli_linux && mv apbs_amd64-linux pdb2pqr_amd64-linux apbs-rest-cli_linux/ \
    && mkdir apbs-rest-cli_macOS && mv apbs_amd64-macOS pdb2pqr_amd64-macOS apbs-rest-cli_macOS/ \
    && zip -r apbs-rest-cli_macOS apbs-rest-cli_macOS \
    && zip -r apbs-rest-cli_win apbs-rest-cli_win \
    && tar -cvf apbs-rest-cli_linux.tar apbs-rest-cli_linux \
    && rm -r apbs-rest-cli_win apbs-rest-cli_linux apbs-rest-cli_macOS
    # && zip apbs-rest-cli_macOS *_amd64-macOS \
    # && zip apbs-rest-cli_win *_amd64-windows.exe \
    # && tar -cvf apbs-rest-cli_linux.tar *_amd64-linux \
    # && rm apbs_amd64-linux pdb2pqr_amd64-linux \
    # && rm apbs_amd64-macOS pdb2pqr_amd64-macOS \
    # && rm apbs_amd64-windows.exe pdb2pqr_amd64-windows.exe


# stage: 2 — the production environment
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=react-build /app/build /usr/share/nginx/html
EXPOSE 80

# Copy .env file and shell script to container
WORKDIR /usr/share/nginx/html
COPY ./env/env.sh .
COPY ./env/.env .

# Push date_of_build to .env file
# WORKDIR /usr/share/nginx/html/cli
COPY --from=cli-build /go/bin /usr/share/nginx/html/cli/download
RUN echo -e "\nBUILD_DATE=$(date -u)" >> .env
# RUN sed -i '1s/^/BUILD_DATE=$(date -u)\n/' .env
# WORKDIR /usr/share/nginx/html

# Add bash
RUN apk add --no-cache bash

# Make our shell script executable
RUN chmod +x env.sh


# CMD ["nginx", "-g", "daemon off;"]
CMD ["/bin/bash", "-c", "/usr/share/nginx/html/env.sh && nginx -g \"daemon off;\""]
