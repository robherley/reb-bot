# frozen_string_literal: true

require 'bundler'

ENV['BUNDLE_GEMFILE'] ||= File.expand_path('../Gemfile')
Bundler.require(:default)

Dotenv.load
