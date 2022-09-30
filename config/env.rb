# frozen_string_literal: true

require 'bundler'

ENV['BUNDLE_GEMFILE'] ||= File.expand_path(File.join(__dir__, '..', 'Gemfile'))
Bundler.require(:default)

Dotenv.load
