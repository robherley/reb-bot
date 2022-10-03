FROM ruby:3.1.1-alpine

WORKDIR /usr/src/app

RUN apk --update add build-base libsodium git

RUN bundle config --global frozen 1

COPY Gemfile Gemfile.lock ./
COPY script/setup ./script/setup

RUN script/setup

COPY . .

CMD ["script/run"]