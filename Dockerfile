FROM ruby:3.4.1-alpine

WORKDIR /usr/src/app

RUN apk --update add build-base libsodium git tzdata imagemagick imagemagick-dev imagemagick-libs

RUN bundle config --global frozen 1

COPY Gemfile Gemfile.lock ./
COPY script/setup ./script/setup

ARG VERSION=unknown
ENV VERSION=${VERSION}
RUN script/setup

COPY . .

CMD ["script/run"]
