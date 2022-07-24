FROM ruby:3.1.1-alpine

RUN bundle config --global frozen 1

WORKDIR /usr/src/app

RUN apk --update add build-base libsodium

COPY Gemfile Gemfile.lock ./
RUN bundle install

COPY . .

CMD ["ruby", "./run.rb"]