FROM ruby:3.1.3-alpine

WORKDIR /usr/src/app

RUN apk --update add build-base libsodium git

RUN bundle config --global frozen 1

COPY Gemfile Gemfile.lock ./
COPY script/setup ./script/setup

ARG VERSION=unknown
ENV VERSION=${VERSION}
RUN script/setup

COPY . .

CMD ["script/run"]